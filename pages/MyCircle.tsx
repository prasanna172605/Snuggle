import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, Sparkles, Heart } from 'lucide-react';
import { CircleService } from '../services/database';
import { User } from '../types';
import { auth } from '../services/firebase';

type CircleTab = 'inner' | 'close' | 'outer';

export default function MyCircle() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<CircleTab>('inner');
    const [innerCircle, setInnerCircle] = useState<User[]>([]);
    const [closeCircle, setCloseCircle] = useState<User[]>([]);
    const [outerCircle, setOuterCircle] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        if (!currentUserId) return;

        // Real-time subscription to circles
        const loadCircles = async () => {
            try {
                const circles = await CircleService.getMyCircles(currentUserId);
                setInnerCircle(circles.inner);
                setCloseCircle(circles.close);
                setOuterCircle(circles.outer);
            } catch (error) {
                console.error('Failed to load circles:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCircles();
    }, [currentUserId]);

    const getCurrentCircle = () => {
        switch (activeTab) {
            case 'inner':
                return innerCircle;
            case 'close':
                return closeCircle;
            case 'outer':
                return outerCircle;
        }
    };

    const filteredMembers = getCurrentCircle().filter(member =>
        member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTabIcon = (tab: CircleTab) => {
        switch (tab) {
            case 'inner':
                return Sparkles;
            case 'close':
                return Heart;
            case 'outer':
                return Users;
        }
    };

    const getTabColor = (tab: CircleTab) => {
        switch (tab) {
            case 'inner':
                return 'from-amber-400 to-orange-500';
            case 'close':
                return 'from-cyan-500 to-blue-600';
            case 'outer':
                return 'from-gray-500 to-gray-700';
        }
    };

    const getTabLabel = (tab: CircleTab) => {
        switch (tab) {
            case 'inner':
                return 'Inner';
            case 'close':
                return 'Close';
            case 'outer':
                return 'Outer';
        }
    };

    const getTabCount = (tab: CircleTab) => {
        switch (tab) {
            case 'inner':
                return innerCircle.length;
            case 'close':
                return closeCircle.length;
            case 'outer':
                return outerCircle.length;
        }
    };

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
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">My Circle</h1>
                        <p className="text-sm text-gray-500">Private connections</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex gap-2">
                    {(['inner', 'close', 'outer'] as CircleTab[]).map((tab) => {
                        const Icon = getTabIcon(tab);
                        const isActive = activeTab === tab;

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${isActive
                                        ? `bg-gradient-to-r ${getTabColor(tab)} text-white shadow-md`
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {getTabLabel(tab)}
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200'
                                    }`}>
                                    {getTabCount(tab)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search members..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                </div>
            </div>

            {/* Members Grid */}
            <div className="px-6">
                {filteredMembers.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchTerm ? 'No matches found' : `No ${getTabLabel(activeTab)} Circle members yet`}
                        </h3>
                        <p className="text-gray-500 text-sm">
                            {searchTerm ? 'Try a different search term' : 'Invite people to your circle'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <div
                                key={member.id}
                                onClick={() => navigate(`/profile/${member.id}`)}
                                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                            >
                                <img
                                    src={member.avatar}
                                    alt={member.fullName}
                                    className="w-full aspect-square rounded-xl object-cover mb-3"
                                />
                                <h3 className="font-semibold text-gray-900 text-sm truncate">
                                    {member.fullName}
                                </h3>
                                <p className="text-gray-500 text-xs truncate">
                                    @{member.username}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
