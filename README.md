# Snuggle - Social Media Messaging App

A modern social media messaging application built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

### 🔐 Authentication
- Email/password authentication
- Google OAuth signin
- User profiles with avatars and bios

### 📱 Social Features
- **Posts**: Create posts with images and captions
- **Feed**: View posts from followed users
- **Likes & Comments**: Interact with posts
- **Follow System**: Follow/unfollow users
- **User Profiles**: View user profiles with their posts

### 💬 Messaging
- Real-time one-on-one chat
- Send text messages and images
- Read receipts
- Chat list with recent conversations

### 📖 Stories
- 24-hour expiring stories
- Image and video support
- View count tracking
- Auto-deletion after expiry

### 🔔 Notifications
- Like notifications
- Comment notifications
- Follow notifications
- Message notifications

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Firebase SDK** for backend integration

### Backend
- **Firebase Authentication**: User management
- **Firestore**: NoSQL database
- **Firebase Storage**: Media file storage
- **Firebase Hosting**: Web app deployment

## Project Structure

```
D:/snuggle/
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Feed.tsx
│   ├── Chat.tsx
│   ├── Messages.tsx
│   ├── Profile.tsx
│   ├── Create.tsx
│   ├── Explore.tsx
│   ├── Notifications.tsx
│   └── Settings.tsx
├── services/           # Backend services
│   ├── firebase.ts    # Firebase configuration
│   └── database.ts    # Firestore operations
├── components/         # Reusable components
├── context/            # React Context providers
├── types.ts            # TypeScript type definitions
├── firebase.json       # Firebase configuration
├── firestore.rules     # Firestore security rules
├── storage.rules       # Storage security rules
└── firestore.indexes.json  # Firestore indexes

```

## Database Structure

### Collections

- **users**: User profiles and metadata
- **posts**: User posts with images and captions
- **comments**: Post comments
- **messages/{chatId}/messages**: Chat messages
- **chats**: Chat metadata
- **stories**: 24-hour expiring content
- **notifications**: User notifications

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase account
- Firebase CLI: `npm install -g firebase-tools`

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd D:\snuggle
   npm install
   ```

2. **Firebase setup** (already configured):
   - Project ID: `snuggle-73465`
   - Firebase config in `services/firebase.ts`

3. **Deploy Firestore rules**:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   firebase deploy --only firestore:indexes
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Deploy to Firebase Hosting**:
   ```bash
   firebase deploy --only hosting
   ```

## Development with Emulators

Run Firebase emulators for local development:

```bash
firebase emulators:start
```

Access:
- App: `http://localhost:5000`
- Firestore: `http://localhost:8080`
- Auth: `http://localhost:9099`
- Emulator UI: `http://localhost:4000`

## API Reference

See `services/database.ts` for all available methods:

### User Operations
- `createUser()` - Create new user
- `getUserById()` - Get user by ID
- `getUserByUsername()` - Get user by username
- `updateUserProfile()` - Update profile
- `searchUsers()` - Search for users

### Social Operations
- `followUser()` - Follow a user
- `unfollowUser()` - Unfollow a user
- `getFollowers()` - Get user's followers
- `getFollowing()` - Get users being followed

### Post Operations
- `createPost()` - Create new post
- `getPost()` - Get post by ID
- `getFeed()` - Get personalized feed
- `getUserPosts()` - Get user's posts
- `likePost()` / `unlikePost()` - Like interactions
- `addComment()` - Add comment
- `deletePost()` - Delete post

### Messaging Operations
- `sendMessage()` - Send message
- `getMessages()` - Get chat messages
- `markMessagesAsRead()` - Mark as read

### Story Operations
- `createStory()` - Create story
- `getUserStories()` - Get user's active stories
- `getFollowingStories()` - Get stories from followed users
- `viewStory()` - Record story view
- `deleteExpiredStories()` - Clean up expired stories

### Notification Operations
- `createNotification()` - Create notification
- `getUserNotifications()` - Get user notifications
- `markNotificationAsRead()` - Mark as read
- `markAllNotificationsAsRead()` - Mark all as read

## Security

- Firestore security rules enforce data access control
- Users can only modify their own data
- Messages only accessible to sender/receiver
- Storage rules validate file types and sizes (10MB max)

## License

Private project

## Author

Made with 💙 for Snuggles
