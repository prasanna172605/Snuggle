
import React, { useState, useEffect } from 'react';
import { User, Message } from '../types';
import { DBService } from '../services/database';
import { Search, Edit, Users, Loader2, ChevronRight, UserPlus, UserCheck } from 'lucide-react';

interface MessagesProps {
    currentUser: User;
    onChatSelect: (user: User) => void;
    onUserClick: (userId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, onChatSelect, onUserClick }) => {
    const [chatUsers, setChatUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastMessages, setLastMessages] = useState<Record<string, Message | null>>({});

    // State for deleting chats
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [chatToDelete, setChatToDelete] = useState<User | null>(null);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const loadData = async () => {
        // Try to load actual chats first (more accurate message history)
        const chats = await DBService.getUserChats(currentUser.id);

        if (chats.length > 0) {
            const users: User[] = [];
            const msgs: Record<string, Message | null> = {};

            chats.forEach(chat => {
                if (chat.otherUser) {
                    // Extract unread count for current user
                    const unreadMap = chat.unreadCounts || {};
                    const unreadCount = unreadMap[currentUser.id] || 0;

                    users.push({
                        ...chat.otherUser,
                        unreadCount // Add custom property
                    });

                    msgs[chat.otherUser.id] = {
                        id: 'latest', // Simplified for list view
                        text: chat.lastMessage,
                        timestamp: chat.lastMessageTimeValue || Date.now(),
                        senderId: chat.lastSenderId,
                        status: 'sent', // Placeholder
                        receiverId: currentUser.id, // Placeholder
                        type: 'text'
                    } as Message;
                }
            });
            setChatUsers(users);
            setLastMessages(msgs);
        } else {
            // Fallback: Load Friends (Mutual Follows) if no chats exist yet
            const allUsers = await DBService.getUsers();
            const mutualUsers = [];
            for (const u of allUsers) {
                if (u.id !== currentUser.id && await DBService.isMutualFollow(currentUser.id, u.id)) {
                    mutualUsers.push(u);
                }
            }
            setChatUsers(mutualUsers);

            // Load last messages for friends (fallback query)
            const msgs: Record<string, Message | null> = {};
            for (const u of mutualUsers) {
                const actualLastMsg = await DBService.getLastMessage(currentUser.id, u.id);
                msgs[u.id] = actualLastMsg;
            }
            setLastMessages(msgs);
        }

        setLoading(false);
    };

    useEffect(() => {
        // Real-time subscription for inbox - enables live updates without refresh
        const unsubscribe = DBService.subscribeToUserChats(currentUser.id, (chats) => {
            if (chats.length > 0) {
                const users: User[] = [];
                const msgs: Record<string, Message | null> = {};

                chats.forEach(chat => {
                    if (chat.otherUser) {
                        const unreadMap = chat.unreadCounts || {};
                        const unreadCount = unreadMap[currentUser.id] || 0;

                        users.push({
                            ...chat.otherUser,
                            unreadCount
                        });

                        msgs[chat.otherUser.id] = {
                            id: 'latest',
                            text: chat.lastMessage,
                            timestamp: chat.lastMessageTimeValue || Date.now(),
                            senderId: chat.lastSenderId,
                            status: 'sent',
                            receiverId: currentUser.id,
                            type: 'text'
                        } as Message;
                    }
                });
                setChatUsers(users);
                setLastMessages(msgs);
            }
            setLoading(false);
        });

        // Also load initial data for fallback (mutual friends without chats)
        loadData();

        const handleStorageChange = (e: StorageEvent | Event) => {
            if (
                e.type === 'local-storage-update' ||
                e.type === 'local-storage-presence' ||
                e.type === 'local-storage-relationships' ||
                (e instanceof StorageEvent && (e.key === 'snuggle_messages_v1' || e.key === 'snuggle_presence_v1' || e.key === 'snuggle_relationships_v1'))
            ) {
                loadData();
            }
        };

        window.addEventListener('local-storage-update', handleStorageChange);
        window.addEventListener('local-storage-presence', handleStorageChange);
        window.addEventListener('local-storage-relationships', handleStorageChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            unsubscribe(); // Cleanup real-time listener
            window.removeEventListener('local-storage-update', handleStorageChange);
            window.removeEventListener('local-storage-presence', handleStorageChange);
            window.removeEventListener('local-storage-relationships', handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [currentUser]);

    // Handle Search Logic
    useEffect(() => {
        const runSearch = async () => {
            if (!searchTerm.trim()) {
                setSearchResults([]);
                return;
            }

            const allUsers = await DBService.getUsers();
            const filtered = allUsers.filter(u =>
                u.id !== currentUser.id &&
                (u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setSearchResults(filtered);
        };

        const debounce = setTimeout(runSearch, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, currentUser.id]);

    const handleSearchResultClick = (user: User) => {
        // If we are friends (in chatUsers), go to chat
        const isFriend = chatUsers.some(u => u.id === user.id);

        if (isFriend) {
            onChatSelect(user);
        } else {
            // If not friends, go to profile to connect
            onUserClick(user.id);
        }
    };

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-snuggle-500" /></div>;



    const handleTouchStart = (user: User) => {
        const timer = setTimeout(() => {
            setChatToDelete(user);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleDeleteChat = async () => {
        if (!chatToDelete) return;

        try {
            // Optimistic update
            const userId = chatToDelete.id;
            setChatUsers(prev => prev.filter(u => u.id !== userId));

            const chatId = DBService.getChatId(currentUser.id, userId);
            await DBService.deleteChat(chatId);

            // Reload to ensure sync
            loadData();
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat');
            loadData(); // Revert on fail
        } finally {
            setChatToDelete(null);
        }
    };

    return (
        <div className="pb-24 pt-2 px-2 relative">
            {/* Delete Confirmation Modal */}
            {chatToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-card w-[85%] max-w-sm rounded-[32px] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Clear Chat?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                Are you sure you want to delete your conversation with <span className="font-bold text-gray-900 dark:text-white">{chatToDelete.fullName}</span>? This cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setChatToDelete(null)}
                                    className="flex-1 py-3.5 rounded-2xl font-bold bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteChat}
                                    className="flex-1 py-3.5 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bento Header Block */}
            <div className="bg-white dark:bg-dark-card rounded-bento p-6 mb-2 shadow-sm flex items-center justify-between border border-transparent dark:border-dark-border transition-colors">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Messages</h2>
                    <p className="text-gray-400 font-medium text-xs mt-1">
                        {searchTerm ? `Searching for "${searchTerm}"` : `${chatUsers.length} friends`}
                    </p>
                </div>
                <button className="w-12 h-12 bg-gray-100 dark:bg-dark-border rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-snuggle-100 dark:hover:bg-snuggle-900 hover:text-snuggle-600 transition-colors">
                    <Edit className="w-5 h-5" />
                </button>
            </div>

            {/* Search Block */}
            <div className="bg-white dark:bg-dark-card rounded-bento p-2 mb-2 shadow-sm border border-transparent dark:border-dark-border transition-colors">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for people..."
                        className="w-full bg-gray-50 dark:bg-black rounded-[24px] pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:bg-gray-100 dark:focus:bg-dark-border dark:text-white transition-colors"
                    />
                </div>
            </div>

            {/* List Block */}
            <div className="bg-white dark:bg-dark-card rounded-bento p-2 shadow-sm min-h-[300px] border border-transparent dark:border-dark-border transition-colors">
                {searchTerm ? (
                    // --- SEARCH RESULTS VIEW ---
                    searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <p className="text-gray-400 text-sm">No users found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <h3 className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Results</h3>
                            {searchResults.map(user => {
                                const isFriend = chatUsers.some(u => u.id === user.id);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => handleSearchResultClick(user)}
                                        className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-border rounded-[24px] cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-[18px] object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700" />
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-gray-900 dark:text-white truncate text-sm">{user.username}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.fullName}</p>
                                            </div>
                                        </div>

                                        {isFriend ? (
                                            <span className="text-xs font-bold text-gray-300 mr-2">Friend</span>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-snuggle-50 dark:bg-snuggle-900/30 flex items-center justify-center text-snuggle-500">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    // --- EXISTING CHATS VIEW ---
                    chatUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="bg-gray-50 dark:bg-dark-border p-6 rounded-full mb-4">
                                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-bold mb-2">No Connections</h3>
                            <p className="text-gray-400 text-sm">Use the search bar above to find new people!</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chatUsers.map(user => {
                                const lastMsg = lastMessages[user.id];
                                // Check unread status correctly
                                const unreadCount = (user as any).unreadCount || 0; // Requires passed down data or lookup
                                // We need to update loadData to pass unreadCount from chat doc or query it.
                                // TEMPORARY: relying on passed user object having it added in loadData

                                const timeString = lastMsg
                                    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '';

                                const isUnread = unreadCount > 0;

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => onChatSelect(user)}
                                        onContextMenu={(e) => { e.preventDefault(); setChatToDelete(user); }} // Desktop right click
                                        onTouchStart={() => handleTouchStart(user)}
                                        onTouchEnd={handleTouchEnd}
                                        onMouseDown={() => handleTouchStart(user)}
                                        onMouseUp={handleTouchEnd}
                                        onMouseLeave={handleTouchEnd}
                                        className={`group flex items-center p-3 hover:bg-gray-50 dark:hover:bg-dark-border rounded-[24px] cursor-pointer transition-colors relative ${isUnread ? 'bg-snuggle-50/50 dark:bg-snuggle-900/10' : ''}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={user.avatar} alt={user.username} className="w-14 h-14 rounded-[20px] object-cover border border-gray-100 dark:border-gray-700" />
                                            {user.isOnline && (
                                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-white dark:border-dark-card rounded-full"></span>
                                            )}
                                        </div>

                                        <div className="ml-4 flex-1 overflow-hidden pr-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className={`text-[15px] truncate ${isUnread ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-900 dark:text-white'}`}>{user.fullName}</h3>
                                                <span className={`text-[11px] font-bold ${isUnread ? 'text-snuggle-500' : 'text-gray-400'}`}>{timeString}</span>
                                            </div>
                                            <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {isUnread && unreadCount > 1
                                                    ? <span className="text-snuggle-500">{unreadCount > 4 ? '4+' : unreadCount} new messages</span>
                                                    : (lastMsg
                                                        ? (lastMsg.senderId === currentUser.id ? `You: ${lastMsg.text}` : lastMsg.text)
                                                        : <span className="text-snuggle-400">Start chatting...</span>)
                                                }
                                            </p>
                                        </div>

                                        {/* Unread Badge or Chevron */}
                                        {isUnread ? (
                                            <div className="w-6 h-6 rounded-full bg-snuggle-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-snuggle-200 ml-2">
                                                <span className="text-white text-[10px] font-bold leading-none">
                                                    {unreadCount > 4 ? '4+' : unreadCount}
                                                </span>
                                            </div>
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Messages;
