
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    serverTimestamp,
    QueryConstraint
} from 'firebase/firestore';
import { db, auth, storage, googleProvider, realtimeDb } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, deleteUser as deleteFirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { ref as rtdbRef, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

// Types
export interface User {
    id: string;
    username: string;
    fullName: string;
    avatar: string;
    bio?: string;
    isOnline?: boolean;
    email: string;
    password?: string;
    displayName: string;
    followers: string[];
    following: string[];
    createdAt: Timestamp;
}

export interface Post {
    id: string;
    userId: string;
    username: string;
    userAvatar?: string;
    caption: string;
    imageUrl?: string;
    likes: string[];
    commentCount: number;
    createdAt: Timestamp;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    username: string;
    text: string;
    createdAt: Timestamp;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    receiverId: string;
    text?: string;
    imageUrl?: string;
    timestamp: Timestamp;
    read: boolean;
}

export interface Story {
    id: string;
    userId: string;
    username: string;
    userAvatar?: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    views: string[];
}

export interface Notification {
    id: string;
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'message';
    senderId: string;
    text: string;
    read: boolean;
    createdAt: Timestamp;
    // Optional legacy fields if needed
    fromUsername?: string;
    fromUserAvatar?: string;
    postId?: string;
}

// Database Service Class
export class DBService {

    // ==================== USER OPERATIONS ====================

    static async createUser(userId: string, userData: Partial<User>): Promise<User> {
        const userRef = doc(db, 'users', userId);
        const newUser: User = {
            id: userId,
            username: userData.username || '',
            email: userData.email || '',
            password: userData.password || '',
            displayName: userData.displayName || userData.username || '',
            fullName: userData.fullName || userData.displayName || '',
            bio: userData.bio || '',
            avatar: userData.avatar || '',
            followers: [],
            following: [],
            createdAt: Timestamp.now()
        };

        await setDoc(userRef, newUser);
        return newUser;
    }

    static async getUserById(userId: string): Promise<User | null> {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? userSnap.data() as User : null;
    }

    static async getUserByUsername(username: string): Promise<User | null> {
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0].data() as User;
    }

    static async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updates);
    }

    static async searchUsers(searchTerm: string, maxResults: number = 20): Promise<User[]> {
        const q = query(
            collection(db, 'users'),
            where('username', '>=', searchTerm),
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(maxResults)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as User);
    }

    // ==================== AUTHENTICATION OPERATIONS ====================

    static async loginUser(identifier: string, password: string): Promise<User> {
        // Note: Firebase Auth handles password verification

        // Check if identifier is email or username
        let email = identifier;
        if (!identifier.includes('@')) {
            // It's a username, look up the email
            const user = await this.getUserByUsername(identifier);
            if (!user) throw new Error('User not found');
            email = user.email;
        }

        // Firebase Auth sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Get user data from Firestore
        const userData = await this.getUserById(userId);
        if (!userData) throw new Error('User data not found');

        // Save session
        await this.saveSession(userData);

        return userData;
    }

    static async loginWithGoogle(): Promise<{ user?: User; isNew: boolean; googleData?: any }> {

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userId = result.user.uid;

            // Check if user exists in Firestore
            let user = await this.getUserById(userId);

            if (!user) {
                // New user - extract Google data
                const displayName = result.user.displayName || '';
                const email = result.user.email || '';
                const avatar = result.user.photoURL || '';
                const username = email.split('@')[0]; // Generate username from email

                return {
                    isNew: true,
                    googleData: {
                        email,
                        fullName: displayName,
                        avatar
                    }
                };
            } else {
                // Existing user
                await this.saveSession(user);
                return {
                    user,
                    isNew: false
                };
            }
        } catch (error: any) {
            throw new Error(error.message || 'Google login failed');
        }
    }

    static async completeGoogleSignup(data: { username: string; fullName: string; email: string; avatar: string }): Promise<User> {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('No authenticated user found');
        const userId = currentUser.uid;

        // Check if username taken
        const existing = await this.getUserByUsername(data.username);
        if (existing) throw new Error('Username already taken');

        // Create user document in Firestore
        // Note: verify createUser signature in file, assuming it accepts Partial<User>
        const newUser = await this.createUser(userId, {
            username: data.username,
            email: data.email,
            fullName: data.fullName,
            displayName: data.fullName,
            avatar: data.avatar,
            bio: '',
            // No password for Google users
        });

        // Sync to Realtime Database
        try {
            const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
            await set(rtdbUserRef, {
                username: newUser.username,
                fullName: newUser.fullName,
                avatar: newUser.avatar,
                bio: newUser.bio,
                isOnline: true,
                createdAt: rtdbServerTimestamp()
            });
        } catch (error) {
            console.warn('RTDB user sync failed (likely permissions):', error);
        }

        // Save session
        await this.saveSession(newUser);
        return newUser;
    }

    static async registerUser(userData: { fullName: string; username: string; email: string; password: string }): Promise<User> {
        try {
            // Check if username already exists
            const existingUser = await this.getUserByUsername(userData.username);
            if (existingUser) {
                throw new Error('Username already taken');
            }

            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const userId = userCredential.user.uid;

            // Create user document in Firestore
            const newUser = await this.createUser(userId, {
                username: userData.username,
                email: userData.email,
                fullName: userData.fullName,
                displayName: userData.fullName,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`,
                bio: '',
                password: userData.password
            });

            // Sync to Realtime Database
            try {
                const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
                await set(rtdbUserRef, {
                    username: newUser.username,
                    fullName: newUser.fullName,
                    avatar: newUser.avatar,
                    bio: newUser.bio,
                    isOnline: true,
                    createdAt: rtdbServerTimestamp()
                });
            } catch (error) {
                console.warn('RTDB user sync failed (likely permissions):', error);
            }

            // Save session
            await this.saveSession(newUser);

            return newUser;
        } catch (error: any) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    static async saveSession(user: User): Promise<void> {
        // Save to localStorage for quick login
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');

        // Check if session already exists
        const existingIndex = savedSessions.findIndex((s: any) => s.id === user.id);
        if (existingIndex !== -1) {
            savedSessions[existingIndex] = user;
        } else {
            savedSessions.push(user);
        }

        localStorage.setItem('savedSessions', JSON.stringify(savedSessions));
    }

    static async getSavedSessions(): Promise<User[]> {
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
        return savedSessions;
    }

    static async removeSession(userId: string): Promise<void> {
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
        const filtered = savedSessions.filter((s: any) => s.id !== userId);
        localStorage.setItem('savedSessions', JSON.stringify(filtered));
    }

    static observeAuthState(callback: (user: User | null) => void): () => void {

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const user = await this.getUserById(firebaseUser.uid);
                callback(user);
                if (user) {
                    await this.updatePresence(user.id, true);
                }
            } else {
                callback(null);
            }
        });

        return unsubscribe;
    }

    static async loginInternal(user: User): Promise<void> {
        // This is for switching between saved sessions without re-authenticating
        await this.saveSession(user);
        await this.updatePresence(user.id, true);
    }

    static async logoutUser(userId: string): Promise<void> {

        await this.updatePresence(userId, false);
        await signOut(auth);
    }

    static async deleteUser(userId: string): Promise<void> {

        // Delete user from Firestore
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);

        // Remove session
        await this.removeSession(userId);

        // Delete Firebase Auth user
        if (auth.currentUser) {
            await deleteFirebaseUser(auth.currentUser);
        }
    }

    static async updatePresence(userId: string, isOnline: boolean): Promise<void> {
        // Update Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { isOnline });

        // Also update Realtime Database for real-time presence
        try {
            const presenceRef = rtdbRef(realtimeDb, `presence/${userId}`);
            if (isOnline) {
                await set(presenceRef, {
                    online: true,
                    lastSeen: rtdbServerTimestamp()
                });
                // Set up disconnect handler
                onDisconnect(presenceRef).set({
                    online: false,
                    lastSeen: rtdbServerTimestamp()
                });
            } else {
                await set(presenceRef, {
                    online: false,
                    lastSeen: rtdbServerTimestamp()
                });
            }
        } catch (error) {
            console.warn('RTDB presence update failed (likely permissions):', error);
        }
    }

    static async updateProfile(userId: string, updates: { fullName?: string; username?: string; bio?: string; avatar?: string }): Promise<User> {
        const userRef = doc(db, 'users', userId);

        // Update Firestore
        await updateDoc(userRef, {
            ...updates,
            displayName: updates.fullName || undefined
        });

        // Sync to Realtime Database for real-time access
        try {
            const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
            await set(rtdbUserRef, {
                ...updates,
                updatedAt: rtdbServerTimestamp()
            });
        } catch (error) {
            console.warn('RTDB profile sync failed (likely permissions):', error);
        }

        // Get and return updated user
        const updatedUserSnap = await getDoc(userRef);
        if (!updatedUserSnap.exists()) throw new Error('User not found');

        const updatedUser = updatedUserSnap.data() as User;

        // Update session storage
        await this.saveSession(updatedUser);

        return updatedUser;
    }

    static subscribeToNotifications(userId: string, callback: (notifications: import('../types').Notification[]) => void): () => void {

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                // Map Firestore data to application Notification type
                const notif: import('../types').Notification = {
                    id: doc.id,
                    userId: data.userId,
                    senderId: data.senderId || data.fromUserId,
                    type: data.type,
                    text: data.text || data.message,
                    timestamp: data.createdAt?.toMillis() || Date.now(),
                    read: data.read
                };
                return notif;
            });
            callback(notifications);
        });

        return unsubscribe;
    }


    // ==================== FOLLOW SYSTEM ====================

    static async followUser(followerId: string, followingId: string): Promise<void> {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        await updateDoc(followerRef, {
            following: arrayUnion(followingId)
        });

        await updateDoc(followingRef, {
            followers: arrayUnion(followerId)
        });

        // Create notification
        const follower = await this.getUserById(followerId);
        if (follower) {
            await this.createNotification({
                userId: followingId,
                type: 'follow',
                senderId: followerId,
                text: `${follower.username} started following you`
            });
        }
    }

    static async unfollowUser(followerId: string, followingId: string): Promise<void> {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        await updateDoc(followerRef, {
            following: arrayRemove(followingId)
        });

        await updateDoc(followingRef, {
            followers: arrayRemove(followerId)
        });
    }

    static async getFollowers(userId: string): Promise<User[]> {
        const user = await this.getUserById(userId);
        if (!user || !user.followers.length) return [];

        const followers: User[] = [];
        for (const followerId of user.followers) {
            const follower = await this.getUserById(followerId);
            if (follower) followers.push(follower);
        }
        return followers;
    }

    static async getFollowing(userId: string): Promise<User[]> {
        const user = await this.getUserById(userId);
        if (!user || !user.following.length) return [];

        const following: User[] = [];
        for (const followingId of user.following) {
            const followingUser = await this.getUserById(followingId);
            if (followingUser) following.push(followingUser);
        }
        return following;
    }

    static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const follower = await this.getUserById(followerId);
        if (!follower) return false;
        return follower.following.includes(followingId);
    }

    // ==================== POST OPERATIONS ====================

    static async createPost(postData: Omit<Post, 'id' | 'likes' | 'commentCount' | 'createdAt'>): Promise<Post> {
        const postRef = doc(collection(db, 'posts'));
        const newPost: Post = {
            id: postRef.id,
            ...postData,
            likes: [],
            commentCount: 0,
            createdAt: Timestamp.now()
        };

        await setDoc(postRef, newPost);
        return newPost;
    }

    static async getPost(postId: string): Promise<Post | null> {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        return postSnap.exists() ? postSnap.data() as Post : null;
    }

    static async getFeed(userId: string, maxPosts: number = 20): Promise<import('../types').Post[]> {
        const user = await this.getUserById(userId);
        if (!user) return [];

        // Get posts from users the current user follows
        const following = [...user.following, userId]; // Include own posts

        const q = query(
            collection(db, 'posts'),
            where('userId', 'in', following.slice(0, 10)), // Firestore limit
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post; // Local Post interface
            return {
                id: doc.id,
                userId: data.userId,
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                comments: data.commentCount,
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    static async getUserPosts(userId: string, maxPosts: number = 20): Promise<import('../types').Post[]> {
        const q = query(
            collection(db, 'posts'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return {
                id: doc.id,
                userId: data.userId,
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                comments: data.commentCount,
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    static async likePost(postId: string, userId: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            likes: arrayUnion(userId)
        });

        // Create notification
        const post = await this.getPost(postId);
        const liker = await this.getUserById(userId);
        if (post && liker && post.userId !== userId) {
            await this.createNotification({
                userId: post.userId,
                type: 'like',
                senderId: userId,
                text: `${liker.username} liked your post`,
                // @ts-ignore - Extra fields for consistency if needed, but senderId/text are core
                postId: postId
            });
        }
    }

    static async unlikePost(postId: string, userId: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            likes: arrayRemove(userId)
        });
    }

    static async deletePost(postId: string): Promise<void> {
        // Delete post document
        const postRef = doc(db, 'posts', postId);
        await deleteDoc(postRef);

        // Delete associated comments
        const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
        const commentsSnapshot = await getDocs(commentsQuery);
        const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    }

    // ==================== COMMENT OPERATIONS ====================

    static async addComment(commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
        const commentRef = doc(collection(db, 'comments'));
        const newComment: Comment = {
            id: commentRef.id,
            ...commentData,
            createdAt: Timestamp.now()
        };

        await setDoc(commentRef, newComment);

        // Increment post comment count
        const postRef = doc(db, 'posts', commentData.postId);
        await updateDoc(postRef, {
            commentCount: increment(1)
        });

        // Create notification
        const post = await this.getPost(commentData.postId);
        if (post && post.userId !== commentData.userId) {
            await this.createNotification({
                userId: post.userId,
                type: 'comment',
                senderId: commentData.userId,
                text: `${commentData.username} commented on your post`,
                // @ts-ignore
                postId: commentData.postId
            });
        }

        return newComment;
    }

    static async getPostComments(postId: string): Promise<Comment[]> {
        const q = query(
            collection(db, 'comments'),
            where('postId', '==', postId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Comment);
    }

    static async getPosts(): Promise<import('../types').Post[]> {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return {
                id: doc.id,
                userId: data.userId,
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                comments: data.commentCount,
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    // ==================== MESSAGE OPERATIONS ====================

    static getChatId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    }

    static async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'read' | 'chatId'>): Promise<Message> {
        const chatId = this.getChatId(messageData.senderId, messageData.receiverId);
        const messageRef = doc(collection(db, 'messages', chatId, 'messages'));

        const newMessage: Message = {
            id: messageRef.id,
            ...messageData,
            chatId,
            timestamp: Timestamp.now(),
            read: false
        };

        await setDoc(messageRef, newMessage);

        // Update chat metadata
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            participants: [messageData.senderId, messageData.receiverId],
            lastMessage: newMessage.text || 'Sent a photo',
            lastMessageTime: newMessage.timestamp,
            lastSenderId: messageData.senderId
        }, { merge: true });

        return newMessage;
    }

    static async getMessages(userId1: string, userId2: string, maxMessages: number = 50): Promise<Message[]> {
        const chatId = this.getChatId(userId1, userId2);
        const q = query(
            collection(db, 'messages', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(maxMessages)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Message).reverse();
    }

    static async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
        const q = query(
            collection(db, 'messages', chatId, 'messages'),
            where('receiverId', '==', userId),
            where('read', '==', false)
        );

        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(doc =>
            updateDoc(doc.ref, { read: true })
        );
        await Promise.all(updatePromises);
    }

    // ==================== STORY OPERATIONS ====================

    static async createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'expiresAt' | 'views'>): Promise<Story> {
        const storyRef = doc(collection(db, 'stories'));
        const now = Timestamp.now();
        const expiresAt = new Timestamp(now.seconds + 86400, now.nanoseconds); // 24 hours

        const newStory: Story = {
            id: storyRef.id,
            ...storyData,
            createdAt: now,
            expiresAt,
            views: []
        };

        await setDoc(storyRef, newStory);
        return newStory;
    }

    static async getUserStories(userId: string): Promise<Story[]> {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('userId', '==', userId),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'asc'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Story);
    }

    static async getFollowingStories(userId: string): Promise<Story[]> {
        const user = await this.getUserById(userId);
        if (!user || !user.following.length) return [];

        const now = Timestamp.now();
        const stories: Story[] = [];

        // Get stories from followed users
        for (const followingId of user.following) {
            const userStories = await this.getUserStories(followingId);
            stories.push(...userStories);
        }

        return stories.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }

    static async viewStory(storyId: string, userId: string): Promise<void> {
        const storyRef = doc(db, 'stories', storyId);
        await updateDoc(storyRef, {
            views: arrayUnion(userId)
        });
    }

    static async deleteExpiredStories(): Promise<void> {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('expiresAt', '<', now)
        );

        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    }

    // ==================== NOTIFICATION OPERATIONS ====================

    static async createNotification(notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<Notification> {
        const notificationRef = doc(collection(db, 'notifications'));
        const newNotification: Notification = {
            id: notificationRef.id,
            ...notificationData,
            read: false,
            createdAt: Timestamp.now()
        };

        await setDoc(notificationRef, newNotification);
        return newNotification;
    }

    static async getUserNotifications(userId: string, maxNotifications: number = 50): Promise<Notification[]> {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(maxNotifications)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Notification);
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(doc =>
            updateDoc(doc.ref, { read: true })
        );
        await Promise.all(updatePromises);
    }

    // ==================== STORAGE OPERATIONS ====================

    static async uploadImage(file: File, path: string): Promise<string> {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }

    static async deleteImage(imageUrl: string): Promise<void> {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    }

    // ==================== ADDITIONAL HELPER METHODS ====================

    static subscribeToPosts(callback: (posts: Post[]) => void): () => void {
        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => doc.data() as Post);
            callback(posts);
        }, (error) => {
            console.error('Error subscribing to posts:', error);
            // Return empty array on error to prevent crash
            callback([]);
        });

        return unsubscribe;
    }

    static async getUsers(): Promise<User[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            return querySnapshot.docs.map(doc => doc.data() as User);
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    static async getStories(): Promise<Story[]> {
        try {
            const now = Timestamp.now();
            const q = query(
                collection(db, 'stories'),
                where('expiresAt', '>', now),
                orderBy('expiresAt', 'asc'),
                limit(100)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Story);
        } catch (error) {
            console.error('Error getting stories:', error);
            // Return empty array if index is still building
            return [];
        }
    }

    static async isMutualFollow(userId1: string, userId2: string): Promise<boolean> {
        try {
            const user1 = await this.getUserById(userId1);
            const user2 = await this.getUserById(userId2);

            if (!user1 || !user2) return false;

            return user1.following.includes(userId2) && user2.following.includes(userId1);
        } catch (error) {
            console.error('Error checking mutual follow:', error);
            return false;
        }
    }

    static async getLastMessage(userId1: string, userId2: string): Promise<Message | null> {
        try {
            const chatId = this.getChatId(userId1, userId2);
            const q = query(
                collection(db, `chats/${chatId}/messages`),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;

            return querySnapshot.docs[0].data() as Message;
        } catch (error) {
            console.error('Error getting last message:', error);
            return null;
        }
    }


}
