'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { NodeWarning } from '@/components/warnings/warnings.rules.types';

type WarningContextType = {
    notifications: NodeWarning[];
    setNotifications: (data: NodeWarning[]) => void;
};

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export const WarningProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotificationsState] = useState<NodeWarning[]>([])

    const setNotifications = useCallback((data: NodeWarning[]) => {
        setNotificationsState(data);
    }, []);

    return (
        <WarningContext.Provider value={{ notifications, setNotifications }}>
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
