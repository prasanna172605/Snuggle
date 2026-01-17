import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { Settings, Grid, Edit3, Share2, MessageCircle } from 'lucide-react';
import { DBService } from '../services/database';

interface ProfileProps {
    user?: User;
    currentUser: User;
    isOwnProfile: boolean;
    onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user: propUser, currentUser, isOwnProfile, onLogout }) => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(propUser || null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(!propUser);

    useEffect(() => {
        const loadProfile = async () => {
            if (userId && !isOwnProfile) {
                const fetchedUser = await DBService.getUserById(userId);
                setUser(fetchedUser);
            } else if (isOwnProfile && currentUser) {
                setUser(currentUser);
            }

            const posts = await DBService.getPosts();
            const targetUserId = userId || currentUser.id;
            setUserPosts(posts.filter(p => p.userId === targetUserId));
            setLoading(false);
        };

        loadProfile();
    }, [userId, currentUser, isOwnProfile]);

    if (loading || !user) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
            </div>
        );
    }

    return (
        <div className="pb-28 pt-2 px-2 relative">
            <div className="grid grid-cols-2 gap-2">

                {/* Main Profile Card */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-colors border border-transparent dark:border-dark-border">
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 opacity-50" />

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

                    {isOwnProfile && (
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <button onClick={() => navigate('/settings')} className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full hover:bg-gray-100 dark:hover:bg-dark-border transition-colors shadow-sm">
                                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    )}
                </div>

                {/* My Circles Button - Only for Own Profile */}
                {isOwnProfile && (
                    <div
                        onClick={() => navigate('/circles')}
                        className="col-span-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-bento p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">My Circles</h3>
                                <p className="text-white/80 text-xs">Manage connections</p>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                )}

                {/* Action Bar */}
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
                            <button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-[24px] font-bold text-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Message
                            </button>
                        )}
                    </div>
                </div>

                {/* Posts Header */}
                <div className="col-span-2 mt-2 flex items-center justify-between px-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">Recent Snaps</h3>
                    <span className="text-xs font-bold text-gray-400 bg-white dark:bg-dark-card px-2 py-1 rounded-lg border border-transparent dark:border-dark-border">
                        {userPosts.length}
                    </span>
                </div>

                {/* Posts Grid */}
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
        </div>
    );
};

export default Profile;
