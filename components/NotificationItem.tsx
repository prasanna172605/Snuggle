import React from 'react';
import { Notification } from '../types';
import { Check, Info, AlertTriangle, XCircle, Heart, MessageCircle, UserPlus, AtSign, Trash2, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onDelete }) => {
    const navigate = useNavigate();

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return <Check className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'like': return <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />;
            case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
            case 'follow': return <UserPlus className="w-5 h-5 text-purple-500" />;
            case 'mention': return <AtSign className="w-5 h-5 text-indigo-500" />;
            case 'info':
            default: return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    const handleClick = () => {
        if (!notification.isRead) {
            onRead(notification.id);
        }

        // Navigation logic based on data or type
        if (notification.data?.url) {
            navigate(notification.data.url);
        } else if (notification.type === 'follow' && notification.senderId) {
            navigate(`/profile/${notification.senderId}`);
        }
    };

    const timeAgo = (date: any) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div
            className={`group relative p-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border/30 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
            onClick={handleClick}
        >
            <div className="flex gap-3">
                <div className={`mt-1 p-2 rounded-full ${!notification.isRead ? 'bg-white dark:bg-dark-bg shadow-sm' : 'bg-gray-100/50 dark:bg-dark-border/50'}`}>
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(notification.createdAt)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                    </p>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {!notification.isRead && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full group-hover:opacity-0 transition-opacity" />
            )}
        </div>
    );
};

export default NotificationItem;
