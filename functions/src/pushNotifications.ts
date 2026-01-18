import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Ensure app is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const messaging = admin.messaging();
const firestore = admin.firestore();
const rtdb = admin.database();

interface PushNotificationPayload {
    title: string;
    body: string;
    route?: string;
    entityId?: string;
    type?: string;
    icon?: string;
}

/**
 * Helper: Get valid FCM tokens from RTDB for a user
 */
async function getValidTokens(userId: string): Promise<string[]> {
    try {
        const snapshot = await rtdb.ref(`userDevices/${userId}`).once('value');
        if (!snapshot.exists()) return [];

        const devices = snapshot.val();
        // Extract unique tokens from all devices
        const tokens = Object.values(devices)
            .map((device: any) => device.token)
            .filter(token => typeof token === 'string' && token.length > 0);

        return [...new Set(tokens)]; // Unique tokens
    } catch (error) {
        console.error(`Error fetching tokens for ${userId}:`, error);
        return [];
    }
}

/**
 * Helper: Check if we should send notification based on preferences and checks
 */
async function shouldSendNotification(userId: string, type: string = 'system'): Promise<boolean> {
    try {
        // 1. Check Preferences in RTDB
        const prefSnap = await rtdb.ref(`notificationPreferences/${userId}`).once('value');

        let prefs = {
            messages: true,
            reactions: true,
            follows: true,
            calls: true,
            system: true
        };

        if (prefSnap.exists()) {
            prefs = { ...prefs, ...prefSnap.val() };
        }

        // Map notification type to preference key
        // Types: 'text', 'image', 'audio' -> 'messages'
        // 'reaction' -> 'reactions'
        // 'follow' -> 'follows'
        // 'call', 'missed_call' -> 'calls'

        let prefKey = 'system';
        if (['text', 'image', 'audio', 'video', 'location'].includes(type) || type === 'message') prefKey = 'messages';
        else if (type === 'reaction') prefKey = 'reactions';
        else if (type === 'follow') prefKey = 'follows';
        else if (type.includes('call')) prefKey = 'calls';

        // @ts-ignore
        if (prefs[prefKey] === false) {
            console.log(`Notification suppressed by user preference: ${prefKey}`);
            return false;
        }

        // 2. Future: Check Mute Settings (Firestore/RTDB)
        // const muteSnap = await ...

        return true;
    } catch (error) {
        console.error(`Error checking preferences for ${userId}:`, error);
        // Default to true on error to avoid missing important alerts? 
        // Or false to be safe? Let's say true for now.
        return true;
    }
}

/**
 * Helper: Send Multicast Push
 */
const sendToUser = async (userId: string, payload: PushNotificationPayload) => {
    const tokens = await getValidTokens(userId);
    if (tokens.length === 0) {
        console.log(`No tokens found for user ${userId}`);
        return;
    }

    const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: {
            route: payload.route || "/",
            entityId: payload.entityId || "",
            type: payload.type || "info",
        },
        webpush: {
            notification: {
                icon: payload.icon || '/vite.svg',
                badge: '/vite.svg',
                requireInteraction: true // For Web
            },
            fcmOptions: {
                link: payload.route || "/"
            }
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1
                }
            }
        }
    };

    try {
        const response = await messaging.sendEachForMulticast(message);
        console.log(`Sent push to ${userId}: ${response.successCount} success, ${response.failureCount} failed`);

        // Cleanup invalid tokens from RTDB if possible
        // Note: It's harder to map back to deviceId from just token without searching.
        // For now, we rely on client "App Reinstall" logic to refresh tokens.
        // Implementation of cleanup would require querying RTDB by token value.
    } catch (error) {
        console.error('Error sending multicast:', error);
    }
};

/**
 * Trigger: On Chat Message Created
 * Path: chats/{chatId}/messages/{messageId}
 */
export const onMessageCreate = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
        const message = snap.data();
        const { chatId } = context.params;

        if (!message) return;

        const senderId = message.senderId;
        const receiverId = message.receiverId;

        // 1. Validate
        if (!receiverId || !senderId) return;

        // 2. Check Preferences
        const shouldSend = await shouldSendNotification(receiverId, message.type || 'message');
        if (!shouldSend) return;

        // 3. Get Sender Details (for Title/Icon)
        let senderName = "New Message";
        let senderIcon = "";
        try {
            const userDoc = await firestore.collection('users').doc(senderId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                senderName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : (userData?.fullName || userData?.username || "Someone");
                senderIcon = userData?.avatar || userData?.photoURL || "";
            }
        } catch (e) {
            console.error('Error fetching sender profile:', e);
        }

        // 4. Determine Body Text
        let body = "Sent a message";
        if (message.type === 'text') body = message.text;
        else if (message.type === 'image') body = "📷 Sent a photo";
        else if (message.type === 'audio') body = "🎤 Sent a voice message";
        else if (message.type === 'video') body = "🎥 Sent a video";
        else if (message.type === 'call') body = "📞 Incoming Call";

        // 5. Send
        await sendToUser(receiverId, {
            title: senderName,
            body: body,
            route: `/messages`, // TODO: Deep link to specific chat? e.g. /messages?chatId=${chatId}
            entityId: chatId,
            type: message.type || 'message',
            icon: senderIcon
        });
    });

/**
 * Trigger: On Notification Created (Generic)
 * Path: notifications/{notificationId}
 */
export const onNotificationCreate = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot) => {
        const notif = snap.data();
        if (!notif) return;

        const { userId, title, message, data, type } = notif;
        if (!userId) return;

        // Check Preferences
        const shouldSend = await shouldSendNotification(userId, type || 'system');
        if (!shouldSend) return;

        await sendToUser(userId, {
            title: title || "New Notification",
            body: message || "",
            route: data?.route || "/notifications",
            entityId: data?.entityId,
            type: type || "system"
        });
    });
