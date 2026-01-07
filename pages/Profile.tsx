
import React, { useState, useEffect } from 'react';
import { User, ViewState, Post } from '../types';
import { Settings, Grid, Tag, UserPlus, UserCheck, MessageCircle, Search, X, Loader2, Edit3, Share2, ChevronRight } from 'lucide-react';
import { DBService } from '../services/database';

interface ProfileProps {
    user: User;
    currentUser: User;
    isOwnProfile: boolean;
    onLogout?: () => void;
    onNavigate?: (view: ViewState, userId?: string) => void;
    onStartChat?: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, currentUser, isOwnProfile, onLogout, onNavigate, onStartChat }) => {
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMutual, setIsMutual] = useState(false);

    // Modal State
    const [showListModal, setShowListModal] = useState(false);
    const [listTitle, setListTitle] = useState('');
    const [listedUsers, setListedUsers] = useState<User[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            const [f, fing, isF, posts, mutual] = await Promise.all([
                DBService.getFollowers(user.id),
                DBService.getFollowing(user.id),
                DBService.isFollowing(currentUser.id, user.id),
                DBService.getPosts(),
                DBService.isMutualFollow(currentUser.id, user.id)
            ]);
            setFollowers(f);
            setFollowing(fing);
            setIsFollowing(isF);
            setUserPosts(posts.filter(p => p.userId === user.id));
            setIsMutual(mutual);
            setLoading(false);
        };

        loadStats();

        const handleRelationshipChange = () => loadStats();
        window.addEventListener('local-storage-relationships', handleRelationshipChange);
        return () => window.removeEventListener('local-storage-relationships', handleRelationshipChange);
    }, [user.id, currentUser.id]);

    const handleFollowToggle = async () => {
        const previousIsFollowing = isFollowing;
        const previousFollowers = followers;

        // Optimistic UI Update
        setIsFollowing(!previousIsFollowing);

        if (previousIsFollowing) {
            // Unfollowing: Remove current user from followers list
            setFollowers(prev => prev.filter(u => u.id !== currentUser.id));
        } else {
            // Following: Add current user to followers list
            // Ensure we don't duplicate if already there (for safety)
            if (!followers.some(u => u.id === currentUser.id)) {
                setFollowers(prev => [...prev, currentUser]);
            }
        }

        try {
            if (previousIsFollowing) {
                await DBService.unfollowUser(currentUser.id, user.id);
            } else {
                await DBService.followUser(currentUser.id, user.id);
            }
        } catch (error) {
            console.error('Follow action failed:', error);
            // Revert on failure
            setIsFollowing(previousIsFollowing);
            setFollowers(previousFollowers);
        }
    };

    const handleShowList = (title: string, users: User[]) => {
        if (users.length === 0) return;

        setListTitle(title);
        setListedUsers(users);
        setShowListModal(true);
    };

    const handleUserClick = (userId: string) => {
        setShowListModal(false);
        if (onNavigate) {
            onNavigate(ViewState.USER_PROFILE, userId);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-snuggle-500" /></div>;

    return (
        <div className="pb-28 pt-2 px-2 relative">
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 gap-2">

                {/* 1. Main Profile Card (Spans 2 columns) */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-colors border border-transparent dark:border-dark-border">
                    {/* Decorative BG */}
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-snuggle-100 to-emerald-100 dark:from-emerald-900/40 dark:to-teal-900/40 opacity-50" />

                    <div className="relative z-10 mt-4">
                        <div className="w-28 h-28 rounded-[36px] p-1.5 bg-white dark:bg-dark-card shadow-sm mb-4">
                            <img src={user.avatar} alt={user.username} className="w-full h-full rounded-[30px] object-cover" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{user.fullName}</h2>
                        <p className="text-gray-400 font-medium text-sm">@{user.username}</p>
                        <div className="mt-3 bg-gray-50 dark:bg-dark-bg px-4 py-2 rounded-2xl inline-block max-w-xs">
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{user.bio}</p>
                        </div>
                    </div>

                    {isOwnProfile && onNavigate && (
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full hover:bg-gray-100 dark:hover:bg-dark-border transition-colors shadow-sm">
                                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Stats Cards (Individual Bento Blocks) */}
                <div
                    onClick={() => handleShowList('Followers', followers)}
                    className="bg-white dark:bg-dark-card rounded-bento p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border border-transparent dark:border-dark-border"
                >
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{followers.length}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Followers</span>
                </div>

                <div
                    onClick={() => handleShowList('Following', following)}
                    className="bg-white dark:bg-dark-card rounded-bento p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border border-transparent dark:border-dark-border"
                >
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{following.length}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Following</span>
                </div>

                {/* 3. Action Bar (Spans 2 columns) */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-2 shadow-sm transition-colors border border-transparent dark:border-dark-border">
                    <div className="flex gap-2">
                        {isOwnProfile ? (
                            <>
                                <button className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-[24px] font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Edit Profile
                                </button>
                                <button className="flex-1 bg-gray-100 dark:bg-dark-border text-gray-900 dark:text-white py-4 rounded-[24px] font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                    <Share2 className="w-4 h-4" /> Share
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleFollowToggle}
                                    className={`flex-1 py-4 rounded-[24px] font-bold text-sm flex items-center justify-center gap-2 transition-all ${isFollowing ? 'bg-gray-100 dark:bg-dark-border text-gray-900 dark:text-white' : 'bg-snuggle-500 text-white shadow-lg shadow-snuggle-200'}`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                                {isMutual && onStartChat && (
                                    <button
                                        onClick={() => onStartChat(user)}
                                        className="w-16 bg-black dark:bg-white text-white dark:text-black rounded-[24px] flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200"
                                    >
                                        <MessageCircle className="w-6 h-6" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 4. Posts Header */}
                <div className="col-span-2 mt-2 flex items-center justify-between px-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">Recent Snaps</h3>
                    <span className="text-xs font-bold text-gray-400 bg-white dark:bg-dark-card px-2 py-1 rounded-lg border border-transparent dark:border-dark-border">{userPosts.length}</span>
                </div>

                {/* 5. Posts Grid (Spans 2 columns, internal grid) */}
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    {userPosts.map(post => (
                        <div key={post.id} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-[24px] overflow-hidden relative group">
                            {post.mediaType === 'video' ? (
                                <video src={post.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-white font-bold flex items-center gap-1">
                                    <span className="text-lg">{post.likes}</span>
                                    <span className="text-2xl">❤️</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {userPosts.length === 0 && (
                        <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento py-12 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 transition-colors border border-transparent dark:border-dark-border">
                            <Grid className="w-12 h-12 mb-2" />
                            <p className="font-medium">No posts yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* User List Modal */}
            {showListModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
                    <div
                        className="bg-white dark:bg-dark-card w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 border border-transparent dark:border-dark-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="w-8" /> {/* Spacer */}
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{listTitle}</h3>
                            <button
                                onClick={() => setShowListModal(false)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-dark-border rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingList ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-snuggle-500" />
                                </div>
                            ) : listedUsers.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <p>No users found</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {listedUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => handleUserClick(u.id)}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-border rounded-2xl cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} alt={u.username} className="w-12 h-12 rounded-2xl object-cover border border-gray-100 dark:border-gray-700" />
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{u.username}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.fullName}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
