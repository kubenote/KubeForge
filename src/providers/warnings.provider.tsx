'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, WarningContextType } from '@/types';

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export const WarningProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotificationsState] = useState<Notification[]>([])
    const [suppressedKeys, setSuppressedKeys] = useState<Set<string>>(new Set())
    const [filterNodeId, setFilterNodeId] = useState<string | null>(null)

    const setNotifications = useCallback((data: Notification[]) => {
        setNotificationsState(data);
    }, []);

    const suppressWarning = useCallback((key: string) => {
        setSuppressedKeys(prev => {
            const next = new Set(prev)
            next.add(key)
            return next
        })
    }, [])

    const unsuppressWarning = useCallback((key: string) => {
        setSuppressedKeys(prev => {
            const next = new Set(prev)
            next.delete(key)
            return next
        })
    }, [])

    return (
        <WarningContext.Provider value={{ notifications, setNotifications, suppressedKeys, suppressWarning, unsuppressWarning, filterNodeId, setFilterNodeId }}>
            {children}
        </WarningContext.Provider>
    );
};

export const useWarning = () => {
    const context = useContext(WarningContext);
    if (!context) {
        throw new Error('useWarning must be used within a WarningProvider');
    }
    return context;
};
