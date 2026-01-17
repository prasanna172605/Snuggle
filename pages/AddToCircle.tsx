import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import { DBService, CircleService } from '../services/database';
import { User, CircleType } from '../types';
import { auth } from '../services/firebase';

export default function AddToCircle() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedCircle, setSelectedCircle] = useState<CircleType>('close');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const currentUserId = auth.currentUser?.uid;

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const users = await DBService.searchUsers(searchQuery);
            const filteredUsers = users.filter((u) => u.id !== currentUserId);
            setSearchResults(filteredUsers);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchQuery) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleSendInvite = async (memberId: string) => {
        if (!currentUserId) return;

        setSending(true);
        setSelectedUserId(memberId);

        try {
            await CircleService.sendCircleInvite({
                ownerId: currentUserId,
                memberId,
                circleType: selectedCircle,
            });

            alert('Circle invite sent!');
            setSearchQuery('');
            setSearchResults([]);
            navigate('/circles');
        } catch (error: any) {
            console.error('Failed to send invite:', error);
            alert(error.message || 'Failed to send invite');
        } finally {
            setSending(false);
            setSelectedUserId(null);
        }
    };

    const circleOptions: { value: CircleType; label: string; description: string; color: string }[] = [
        {
            value: 'inner',
            label: 'Inner Circle',
            description: 'Max 5 people • Highest trust',
            color: 'border-amber-500 bg-amber-50',
        },
        {
            value: 'close',
            label: 'Close Circle',
            description: 'Trusted friends',
            color: 'border-cyan-500 bg-cyan-50',
        },
        {
            value: 'outer',
            label: 'Outer Circle',
            description: 'General connections',
            color: 'border-gray-500 bg-gray-50',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/circles')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">Add to Circle</h1>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or username..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
            </div>

            <div className="px-6 py-6">
                {/* Circle Selection */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Circle</h3>
                    <div className="space-y-3">
                        {circleOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedCircle(option.value)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedCircle === option.value
                                        ? `${option.color} border-current`
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                                <div className="text-sm text-gray-600">{option.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Results */}
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
                    </div>
                )}

                {!loading && searchResults.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Search Results</h3>
                        <div className="space-y-3">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm"
                                >
                                    <img
                                        src={user.avatar}
                                        alt={user.fullName}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
                                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                    </div>
                                    <button
                                        onClick={() => handleSendInvite(user.id)}
                                        disabled={sending && selectedUserId === user.id}
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Invite
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No users found for "{searchQuery}"
                    </div>
                )}

                {!searchQuery && (
                    <div className="text-center py-16 text-gray-400">
                        <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Search for people to add to your {selectedCircle} circle</p>
                    </div>
                )}
            </div>
        </div>
    );
}
