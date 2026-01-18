import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { DBService } from '../services/database';
import { Notification } from '../types';
import { toast } from 'sonner';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = DBService.subscribeToNotifications(currentUser.id, (newNotifications) => {
            // Check for new notifications to trigger toast
            // Compare with previous state if needed, but for now simple toast on arrival of unread might be noisy
            // We can check if the newest notification is very recent (e.g. within last 5 seconds) and unread

            const latest = newNotifications[0];
            if (latest && !latest.isRead && Date.now() - latest.createdAt < 5000) {
                // Show toast
                toast(latest.title, {
                    description: latest.message,
                    action: {
                        label: 'View',
                        onClick: () => console.log('View notification', latest.id)
                    }
                });
            }

            setNotifications(newNotifications);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n));
        try {
            await DBService.markNotificationRead(id);
        } catch (error) {
            console.error('Failed to mark read', error);
            // Revert on error? Or simply re-fetch will fix it eventually
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        try {
            await DBService.markAllNotificationsRead();
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await DBService.deleteNotification(id);
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            isLoading
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
