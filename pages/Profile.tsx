import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { Settings, Grid, Edit3, Share2, MessageCircle, Users2, Users, UserPlus } from 'lucide-react';
import { DBService, CircleService } from '../services/database';

interface ProfileProps {
    user?: User;
    currentUser: User;
    isOwnProfile: boolean;
    onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user: propUser, currentUser, isOwnProfile, onLogout }) => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(isOwnProfile ? currentUser : null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingInvite, setPendingInvite] = useState<{ id: string; circleType: string } | null>(null);
    const [showCircleModal, setShowCircleModal] = useState(false);
    const [sendingInvite, setSendingInvite] = useState(false);

    const checkPendingStatus = async () => {
        if (!currentUser || !currentUser.id || !userId || isOwnProfile) return;

        try {
            const invites = await CircleService.getPendingInvitesSent(currentUser.id);
            const pendingToThisUser = invites.find((inv: any) => inv.membership.memberId === userId);

            if (pendingToThisUser) {
                setPendingInvite({
                    id: pendingToThisUser.membership.id,
                    circleType: pendingToThisUser.membership.circleType
                });
            } else {
                setPendingInvite(null);
            }
        } catch (error) {
            console.error("Error checking pending invites:", error);
        }
    };

    useEffect(() => {
        const loadProfile = async () => {
            try {
                if (userId && !isOwnProfile) {
                    const fetchedUser = await DBService.getUserById(userId);
                    setUser(fetchedUser);
                    await checkPendingStatus();
                } else if (isOwnProfile && currentUser) {
                    setUser(currentUser);
                }

                const posts = await DBService.getPosts();
                const targetUserId = userId || currentUser.id;
                setUserPosts(posts.filter(p => p.userId === targetUserId));
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [userId, currentUser, isOwnProfile]);

    const handleRevokeInvite = async () => {
        if (!pendingInvite || !currentUser) return;

        if (!confirm('Are you sure you want to revoke this invitation?')) return;

        try {
            await CircleService.revokeCircleInvite({
                membershipId: pendingInvite.id,
                currentUserId: currentUser.id
            });
            setPendingInvite(null);
        } catch (error: any) {
            alert(error.message || 'Failed to revoke invite');
        }
    };

    const handleSendInvite = async (circleType: string) => {
        if (!currentUser || !userId) return;

        setSendingInvite(true);
        try {
            await CircleService.sendCircleInvite({
                ownerId: currentUser.id,
                memberId: userId!, // Use userId from URL params
                circleType: circleType.toLowerCase() as any,
            });

            await checkPendingStatus();
            setShowCircleModal(false);
            alert(`Invited ${user?.fullName || 'user'} to your ${circleType} circle!`);
        } catch (error: any) {
            alert(error.message || 'Failed to send invite');
        } finally {
            setSendingInvite(false);
        }
    };

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

                {/* Action Bar */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-2 shadow-sm transition-colors border border-transparent dark:border-dark-border">
                    {isOwnProfile ? (
                        <div className="space-y-2">
                            {/* Circle Action Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => navigate('/circles/add')}
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Users2 className="w-4 h-4" />
                                    Expand Circle
                                </button>
                                <button
                                    onClick={() => navigate('/my-circle')}
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    My Circle
                                </button>
                            </div>

                            {/* Edit & Share Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit Profile
                                </button>
                                <button
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Profile
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {pendingInvite ? (
                                <>
                                    <button
                                        className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Message
                                    </button>
                                    <button
                                        onClick={handleRevokeInvite}
                                        className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Revoke Invite
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Message
                                    </button>
                                    <button
                                        onClick={() => setShowCircleModal(true)}
                                        className="bg-cyan-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Add to Circle
                                    </button>
                                </>
                            )}
                        </div>
                    )}
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

            {/* Circle Selection Modal */}
            {showCircleModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCircleModal(false)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add to Circle</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Choose where to add {user.fullName}</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            {[
                                { id: 'inner', label: 'Inner Circle', desc: 'Max 5 people • Highest trust', color: 'bg-amber-500 hover:bg-amber-600' },
                                { id: 'close', label: 'Close Circle', desc: 'Trusted friends', color: 'bg-cyan-500 hover:bg-cyan-600' },
                                { id: 'outer', label: 'Outer Circle', desc: 'General connections', color: 'bg-indigo-500 hover:bg-indigo-600' }
                            ].map((circle) => (
                                <button
                                    key={circle.id}
                                    onClick={() => handleSendInvite(circle.id)}
                                    disabled={sendingInvite}
                                    className={`${circle.color} w-full text-white p-4 rounded-2xl text-left transition-transform active:scale-95 flex flex-col disabled:opacity-50`}
                                >
                                    <span className="font-bold text-lg">{circle.label}</span>
                                    <span className="text-white/80 text-sm">{circle.desc}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowCircleModal(false)}
                            className="w-full p-4 text-gray-500 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
