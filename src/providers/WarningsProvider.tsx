'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { throwProviderError } from '@/lib/providerErrors';

type WarningContextType = {
    notifications: any;
    setNotifications: (data: any) => void;
};

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export const WarningProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotificationsState] = useState<
        { id: number; title: string; message: string; level: string; }[]
    >([])

    const setNotifications = useCallback((data: any) => {
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
        throwProviderError('useWarning', 'WarningProvider');
    }
    return context;
};
