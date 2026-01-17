
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars BEFORE importing other modules that might use them
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (Global)
import './backend/config/firebase.js';

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

// Middleware Import (local file)
import { verifyToken, requireRole } from './middleware/auth.js';
import AppError from './utils/AppError.js';
import catchAsync from './utils/catchAsync.js';
import { globalErrorHandler } from './middleware/error.js';

// Route Imports
import authRouter from './backend/routes/auth.js';
import userRouter from './backend/routes/users.js';
import contentRouter from './backend/routes/content.js';

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Mount Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/content', contentRouter);

// Mimic Vercel Request/Response for the handler
// Apply verifyToken middleware to protect this route
app.post('/api/send-push', verifyToken, catchAsync(async (req, res, next) => {
    console.log(`[Local Server] POST /api/send-push - Authenticated User: ${req.user.uid}`);

    // Example: manually throwing an error if needed
    // if (!req.body.someField) throw new AppError('Missing field', 400);

    const { default: pushHandler } = await pushHandlerPromise;
    await pushHandler(req, res);
}));

// Handle 404 for undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
    console.log(`   - GET  http://localhost:${PORT}/api/health`);
    console.log(`   - POST http://localhost:${PORT}/api/v1/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/api/v1/users/me`);
    console.log(`   - POST http://localhost:${PORT}/api/send-push\n`);
});
