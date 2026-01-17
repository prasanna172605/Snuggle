
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { User, ViewState } from '../types';
import { DBService } from '../services/database';

interface ExploreProps {
    currentUser?: User;
    onNavigate?: (view: ViewState, userId?: string) => void;
}

const Explore: React.FC<ExploreProps> = ({ currentUser, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

    const categories = ['Nature', 'Art', 'Travel', 'Food', 'Style', 'Music'];

    // Generating pseudo-random grid items for default view
    const items = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        height: i % 3 === 0 ? 'h-64' : 'h-32', // Simple masonry logic
        image: `https://picsum.photos/300/${i % 3 === 0 ? 600 : 300}?random=${i + 100}`,
    }));

    useEffect(() => {
        const fetchUsers = async () => {
            const allUsers = await DBService.getUsers();

            let filtered = allUsers;
            if (searchTerm.trim()) {
                filtered = allUsers.filter(u =>
                    u.id !== currentUser?.id &&
                    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            } else {
                // Show nothing when not searching to keep focus on grid, or implement suggested users
                filtered = [];
            }

            setSearchResults(filtered);

            // DEPRECATED: Using Circles now - removed follow status check
            // if (currentUser && filtered.length > 0) {
            //     const newMap: Record<string, boolean> = {};
            //     const promises = filtered.map(async (u) => {
            //         const isFollowing = await DBService.isFollowing(currentUser.id, u.id);
            //         newMap[u.id] = isFollowing;
            //     });
            //     await Promise.all(promises);
            //     setFollowingMap(newMap);
            // }
        }

        const delayDebounceFn = setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, currentUser]);

    // DEPRECATED: Using Circles now
    // const handleFollowToggle = async (targetId: string) => {
    //     if (!currentUser) return;
    //     const isFollowing = followingMap[targetId];
    //     if (isFollowing) {
    //         await DBService.unfollowUser(currentUser.id, targetId);
    //         setFollowingMap(prev => ({ ...prev, [targetId]: false }));
    //     } else {
    //         await DBService.followUser(currentUser.id, targetId);
    //         setFollowingMap(prev => ({ ...prev, [targetId]: true }));
    //     }
    // };

    const handleUserClick = (userId: string) => {
        if (onNavigate) {
            onNavigate(ViewState.USER_PROFILE, userId);
        }
    };

    return (
        <div className="bg-white dark:bg-black min-h-full p-2 pb-24 transition-colors">
            {/* Search Bar */}
            <div className="mb-4 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur z-10 py-2">
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-gray-100 dark:bg-dark-card text-gray-800 dark:text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-snuggle-300 transition-all border border-transparent dark:border-dark-border"
                        autoFocus={false}
                    />
                </div>

                {/* Categories (Only show if not searching) */}
                {!searchTerm && (
                    <div className="flex overflow-x-auto gap-2 mt-3 pb-1 no-scrollbar">
                        {categories.map((cat) => (
                            <button key={cat} className="px-4 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap hover:bg-snuggle-50 dark:hover:bg-dark-border transition-colors">
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            {searchTerm ? (
                <div className="space-y-2">
                    {searchResults.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            No users found.
                        </div>
                    ) : (
                        searchResults.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-transparent dark:border-dark-border">
                                <div
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => handleUserClick(user.id)}
                                >
                                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" alt="" />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.username}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.fullName}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Default Grid */
                <div className="grid grid-cols-3 gap-1">
                    {items.map((item) => (
                        <div key={item.id} className={`relative bg-gray-200 dark:bg-gray-800 ${item.height} group overflow-hidden`}>
                            <img
                                src={item.image}
                                alt="Explore content"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Explore;
