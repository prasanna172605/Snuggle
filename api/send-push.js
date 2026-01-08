import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
// We need to use environment variables for the service account
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Handle newlines in private key which are often escaped in env vars
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
    // enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { receiverId, title, body, url, icon } = req.body;

        if (!receiverId || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Get Receiver Tokens
        const userDoc = await db.collection('users').doc(receiverId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        const fcmTokens = userData?.fcmTokens;

        if (!fcmTokens || !fcmTokens.length) {
            return res.status(200).json({ message: 'No tokens found for user' });
        }

        // 2. Prepare Payload
        const message = {
            tokens: fcmTokens,
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    icon: icon || '/vite.svg',
                    badge: '/vite.svg',
                    data: { url: url || '/' }
                },
                fcmOptions: {
                    link: url || '/'
                }
            },
        };

        // 3. Send
        const response = await messaging.sendMulticast(message);

        // 4. Cleanup Invalid Tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await db.collection('users').doc(receiverId).update({
                    fcmTokens: FieldValue.arrayRemove(...failedTokens)
                });
            }
        }

        return res.status(200).json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error('Push error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
