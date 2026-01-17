
export interface User {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  bio?: string;
  isOnline?: boolean;
  email?: string;
  password?: string; // In a real app, never store plain text passwords on frontend
  // followers and following REMOVED - replaced by Circles
}

export interface Story {
  id: string;
  userId: string;
  imageUrl: string;
  timestamp: number;
  viewed: boolean;
}

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  mediaType?: 'image' | 'video'; // Added for Reels support
  caption: string;
  likes: number;
  comments: number;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
  type: 'text' | 'image' | 'audio' | 'call';
  reactions?: Record<string, string>; // userId -> emoji
  // Call metadata (when type === 'call')
  callType?: 'audio' | 'video';
  callDuration?: number; // in seconds
  callStatus?: 'completed' | 'missed' | 'declined';
}

export interface ChatSession {
  userId: string;
  lastMessage: Message | null;
  unreadCount: number;
  isTyping?: boolean;
}

export interface Notification {
  id: string;
  userId: string; // The recipient
  senderId: string; // Who triggered it
  type: 'follow' | 'like' | 'comment' | 'circle_invite';
  text: string;
  timestamp: number;
  read: boolean;
}

// ========= SNUGGLE CIRCLES =========

export type CircleType = 'inner' | 'close' | 'outer';
export type MembershipStatus = 'pending' | 'approved';

export interface CircleMembership {
  id: string;
  ownerId: string;        // User who owns this circle
  memberId: string;       // User being added to circle
  circleType: CircleType;
  status: MembershipStatus;
  createdAt: number;
  updatedAt?: number;
}

// ====================================

export enum ViewState {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  GOOGLE_SETUP = 'GOOGLE_SETUP', // New view for setting username after Google auth
  FEED = 'FEED',
  CREATE = 'CREATE', // New view for creating content
  MESSAGES = 'MESSAGES',
  PROFILE = 'PROFILE',
  USER_PROFILE = 'USER_PROFILE', // Viewing someone else's profile
  CHAT = 'CHAT',
  SETTINGS = 'SETTINGS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  CIRCLES = 'CIRCLES',
  CIRCLE_INVITES = 'CIRCLE_INVITES',
  ADD_TO_CIRCLE = 'ADD_TO_CIRCLE'
}

export type CallType = 'audio' | 'video';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'end' | 'reject' | 'busy' | 'answered_elsewhere';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  senderId: string;
  receiverId: string;
  callType?: CallType;
  timestamp: number;
  // Device identification for multi-device support
  deviceId?: string;
  answeringDeviceId?: string;
  callerId?: string; // For answered_elsewhere signal
}
