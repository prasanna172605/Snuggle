import React from 'react';
import { Smartphone, Monitor, Globe, Clock, LogOut } from 'lucide-react';

interface Session {
    sessionId: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    location: string;
    lastActivity: { toMillis: () => number } | string | number; // Handle Firestore Timestamp or ISO string
    isCurrent?: boolean;
}

interface SessionCardProps {
    session: Session;
    onRevoke: (sessionId: string) => void;
    isRevoking: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onRevoke, isRevoking }) => {
    const isMobile = session.deviceType === 'mobile' || session.os.toLowerCase().includes('android') || session.os.toLowerCase().includes('ios');

    // Format last activity
    const getLastActivity = () => {
        try {
            let date: Date;
            if (typeof session.lastActivity === 'object' && 'toMillis' in session.lastActivity) {
                date = new Date(session.lastActivity.toMillis());
            } else {
                date = new Date(session.lastActivity as string | number);
            }

            // If invalid date
            if (isNaN(date.getTime())) return 'Unknown';

            const now = new Date();
            const diff = now.getTime() - date.getTime();

            // Less than 2 minutes
            if (diff < 120000) return 'Active now';

            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return 'Unknown';
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isMobile ? 'bg-purple-50 text-purple-500 dark:bg-purple-900/20' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'}`}>
                    {isMobile ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                        {session.browser} on {session.os}
                        {session.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-[10px] rounded-full uppercase tracking-wider">
                                Current
                            </span>
                        )}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {session.location || 'Unknown Location'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {getLastActivity()}
                        </span>
                    </div>
                </div>
            </div>

            {!session.isCurrent && (
                <button
                    onClick={() => onRevoke(session.sessionId)}
                    disabled={isRevoking}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors group"
                    title="Sign out device"
                >
                    <LogOut className="w-5 h-5 group-hover:scale-105 transition-transform" />
                </button>
            )}
        </div>
    );
};

export default SessionCard;
