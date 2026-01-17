import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users2, UserPlus, Bell, ChevronRight, Sparkles, Heart, Users } from 'lucide-react';
import { CircleService } from '../services/database';
import { User } from '../types';
import { auth } from '../services/firebase';

export default function Circles() {
    const navigate = useNavigate();
    const [innerCircle, setInnerCircle] = useState<User[]>([]);
    const [closeCircle, setCloseCircle] = useState<User[]>([]);
    const [outerCircle, setOuterCircle] = useState<User[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        if (!currentUserId) return;

        const loadCircles = async () => {
            try {
                const circles = await CircleService.getMyCircles(currentUserId);
                setInnerCircle(circles.inner);
                setCloseCircle(circles.close);
                setOuterCircle(circles.outer);

                const invites = await CircleService.getPendingInvites(currentUserId);
                setPendingCount(invites.length);
            } catch (error) {
                console.error('Failed to load circles:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCircles();
    }, [currentUserId]);

    const CircleSection = ({
        title,
        description,
        members,
        gradient,
        icon: Icon,
        maxSize
    }: {
        title: string;
        description: string;
        members: User[];
        gradient: string;
        icon: any;
        maxSize?: number;
    }) => (
        <div className={`relative overflow-hidden rounded-2xl p-5 mb-3 ${gradient}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-white" />
                    <div>
                        <h3 className="text-white font-bold text-base">{title}</h3>
                        <p className="text-white/70 text-xs">{description}</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <span className="text-sm font-bold text-white">
                        {members.length}{maxSize ? `/${maxSize}` : ''}
                    </span>
                </div>
            </div>

            {members.length === 0 ? (
                <div className="text-center py-4 bg-white/10 backdrop-blur-sm rounded-xl">
                    <Icon className="w-8 h-8 mx-auto mb-1 text-white/50" />
                    <p className="text-xs text-white/60">No one here yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {members.slice(0, 4).map((member) => (
                        <div
                            key={member.id}
                            onClick={() => navigate(`/profile/${member.id}`)}
                            className="cursor-pointer"
                        >
                            <img
                                src={member.avatar}
                                alt={member.fullName}
                                className="w-full aspect-square rounded-xl object-cover ring-2 ring-white/30 hover:ring-white/60 transition-all"
                            />
                            <p className="text-white text-xs font-medium text-center mt-1 truncate">
                                {member.fullName.split(' ')[0]}
                            </p>
                        </div>
                    ))}
                    {members.length > 4 && (
                        <div className="aspect-square bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">+{members.length - 4}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Circles</h1>
                        <p className="text-sm text-gray-500">Private connections</p>
                    </div>
                    {pendingCount > 0 && (
                        <button
                            onClick={() => navigate('/circles/invites')}
                            className="relative bg-cyan-500 hover:bg-cyan-600 p-3 rounded-xl transition-colors"
                        >
                            <Bell className="w-5 h-5 text-white" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                {pendingCount}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                {/* Privacy Notice */}
                <div className="bg-cyan-50 rounded-xl p-3 mb-4 border border-cyan-100">
                    <p className="text-sm text-gray-700 text-center">
                        🔒 Your circles are completely private
                    </p>
                </div>

                <CircleSection
                    title="Inner Circle"
                    description="Closest • Max 5"
                    members={innerCircle}
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    icon={Sparkles}
                    maxSize={5}
                />

                <CircleSection
                    title="Close Circle"
                    description="Trusted friends"
                    members={closeCircle}
                    gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
                    icon={Heart}
                />

                <CircleSection
                    title="Outer Circle"
                    description="General connections"
                    members={outerCircle}
                    gradient="bg-gradient-to-br from-gray-500 to-gray-700"
                    icon={Users}
                />
            </div>

            {/* Add Button */}
            <button
                onClick={() => navigate('/circles/add')}
                className="fixed bottom-24 right-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-full shadow-xl hover:shadow-cyan-500/50 transition-all z-20"
            >
                <UserPlus className="w-6 h-6" />
            </button>
        </div>
    );
}
