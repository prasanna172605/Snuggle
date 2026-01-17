import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowLeft, Users } from 'lucide-react';
import { CircleService } from '../services/database';
import { User } from '../types';
import { auth } from '../services/firebase';

export default function CircleInvites() {
    const navigate = useNavigate();
    const [invites, setInvites] = useState<Array<{ membership: any; sender: User | null }>>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        loadInvites();
    }, [currentUserId]);

    const loadInvites = async () => {
        if (!currentUserId) return;

        try {
            const pendingInvites = await CircleService.getPendingInvites(currentUserId);
            setInvites(pendingInvites);
        } catch (error) {
            console.error('Failed to load invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (membershipId: string) => {
        if (!currentUserId) return;

        setProcessingId(membershipId);
        try {
            await CircleService.approveCircleInvite({ membershipId, currentUserId });
            setInvites((prev) => prev.filter((inv) => inv.membership.id !== membershipId));
        } catch (error: any) {
            console.error('Failed to approve invite:', error);
            alert(error.message || 'Failed to approve invite');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (membershipId: string) => {
        if (!currentUserId) return;

        setProcessingId(membershipId);
        try {
            await CircleService.rejectCircleInvite({ membershipId, currentUserId });
            setInvites((prev) => prev.filter((inv) => inv.membership.id !== membershipId));
        } catch (error: any) {
            console.error('Failed to reject invite:', error);
            alert(error.message || 'Failed to reject invite');
        } finally {
            setProcessingId(null);
        }
    };

    const getCircleColor = (circleType: string) => {
        switch (circleType) {
            case 'inner':
                return 'bg-amber-100 text-amber-700';
            case 'close':
                return 'bg-cyan-100 text-cyan-700';
            case 'outer':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getCircleLabel = (circleType: string) => {
        switch (circleType) {
            case 'inner':
                return 'Inner Circle';
            case 'close':
                return 'Close Circle';
            case 'outer':
                return 'Outer Circle';
            default:
                return circleType;
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
                        onClick={() => navigate('/circles')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">Circle Invites</h1>
                        <p className="text-sm text-gray-500">{invites.length} pending</p>
                    </div>
                </div>
            </div>

            {/* Invites List */}
            <div className="px-6 py-6">
                {invites.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending invites</h3>
                        <p className="text-gray-500">When someone adds you to their circle, you'll see it here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invites.map(({ membership, sender }) => (
                            <div
                                key={membership.id}
                                className="bg-white rounded-2xl p-6 shadow-sm"
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    {sender && (
                                        <img
                                            src={sender.avatar}
                                            alt={sender.fullName}
                                            className="w-14 h-14 rounded-full object-cover"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 mb-1">
                                            {sender?.fullName || 'Unknown User'}
                                        </p>
                                        <p className="text-sm text-gray-500 mb-3">
                                            @{sender?.username || 'unknown'}
                                        </p>
                                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCircleColor(membership.circleType)}`}>
                                            {getCircleLabel(membership.circleType)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(membership.id)}
                                        disabled={processingId === membership.id}
                                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl font-medium hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(membership.id)}
                                        disabled={processingId === membership.id}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <X className="w-5 h-5" />
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
