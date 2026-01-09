
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars BEFORE importing other modules that might use them
dotenv.config({ path: '.env.local' });

console.log('Environment check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');

// Dynamic import to ensure process.env is populated first
const pushHandlerPromise = import('./api/send-push.js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mimic Vercel Request/Response for the handler
app.all('/api/send-push', async (req, res) => {
    console.log(`[Local Server] ${req.method} /api/send-push`);
    try {
        const { default: pushHandler } = await pushHandlerPromise;
        await pushHandler(req, res);
    } catch (error) {
        console.error('[Local Server] Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
    console.log(`   - POST http://localhost:${PORT}/api/send-push\n`);
});
