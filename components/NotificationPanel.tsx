import React, { useRef, useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from './NotificationItem';
import { AnimatePresence, motion } from 'framer-motion';

const NotificationPanel: React.FC = () => {
    const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification, isLoading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePanel = () => setIsOpen(!isOpen);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={togglePanel}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-border text-gray-500 dark:text-gray-400 transition-colors"
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-gray-900 dark:text-white fill-gray-900 dark:fill-white' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-black rounded-full animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm sticky top-0 z-10">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full text-blue-500 transition-colors"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full text-gray-400 transition-colors md:hidden"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 overscroll-contain">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <NotificationItem
                                        key={notif.id}
                                        notification={notif}
                                        onRead={markAsRead}
                                        onDelete={deleteNotification}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationPanel;
