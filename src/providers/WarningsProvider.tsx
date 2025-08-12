'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
        throw new Error('useWarning must be used within a WarningProvider');
    }
    return context;
};
