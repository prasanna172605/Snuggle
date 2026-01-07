
import React, { useState, useEffect } from 'react';
import { User, ViewState } from './types';
import { DBService } from './services/database';
import Login from './pages/Login';
import Signup from './pages/Signup';
import GoogleUsernameSetup from './pages/GoogleUsernameSetup';
import Feed from './pages/Feed';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Create from './pages/Create';
import Notifications from './pages/Notifications';
import BottomNav from './components/BottomNav';
import CallOverlay from './components/CallOverlay';
import { CallProvider } from './context/CallContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

const AppContent = ({
  currentUser,
  onLogout,
  onUpdateUser,
  onDeleteAccount,
  onSwitchAccount,
  onAddAccount
}: {
  currentUser: User,
  onLogout: () => void,
  onUpdateUser: (user: User) => void,
  onDeleteAccount: () => void,
  onSwitchAccount: (userId: string) => void,
  onAddAccount: () => void
}) => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.MESSAGES);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Monitor notifications with realtime listener
    const unsubscribe = DBService.subscribeToNotifications(currentUser.id, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const navigateToChat = (user: User) => {
    setActiveChatUser(user);
    setCurrentView(ViewState.CHAT);
  };

  const navigateToProfile = async (userId: string) => {
    if (userId === currentUser.id) {
      setCurrentView(ViewState.PROFILE);
    } else {
      const user = await DBService.getUserById(userId);
      if (user) {
        setViewingProfileUser(user);
        setCurrentView(ViewState.USER_PROFILE);
      }
    }
  };

  const handleNavigate = (view: ViewState, arg?: any) => {
    if (view === ViewState.USER_PROFILE && typeof arg === 'string') {
      navigateToProfile(arg);
    } else {
      setCurrentView(view);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.FEED:
        return <Feed currentUser={currentUser} onUserClick={navigateToProfile} />;
      case ViewState.CREATE:
        return <Create currentUser={currentUser} onNavigate={setCurrentView} />;
      case ViewState.MESSAGES:
        return (
          <Messages
            currentUser={currentUser}
            onChatSelect={navigateToChat}
            onUserClick={navigateToProfile}
          />
        );
      case ViewState.PROFILE:
        return (
          <Profile
            user={currentUser}
            currentUser={currentUser}
            isOwnProfile={true}
            onLogout={onLogout}
            onNavigate={handleNavigate}
          />
        );
      case ViewState.USER_PROFILE:
        return viewingProfileUser ? (
          <div className="flex flex-col min-h-screen">
            <div className="bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center">
              <button onClick={() => setCurrentView(ViewState.FEED)} className="mr-3 text-gray-600 dark:text-gray-300">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="font-bold dark:text-white">Profile</span>
            </div>
            <Profile
              user={viewingProfileUser}
              currentUser={currentUser}
              isOwnProfile={false}
              onStartChat={navigateToChat}
            />
          </div>
        ) : <Feed currentUser={currentUser} />;
      case ViewState.CHAT:
        return activeChatUser ? (
          <Chat
            currentUser={currentUser}
            otherUser={activeChatUser}
            onBack={() => setCurrentView(ViewState.MESSAGES)}
          />
        ) : <Messages currentUser={currentUser} onChatSelect={navigateToChat} onUserClick={navigateToProfile} />;
      case ViewState.SETTINGS:
        return (
          <Settings
            currentUser={currentUser}
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onLogout={onLogout}
            onUpdateUser={onUpdateUser}
            onDeleteAccount={onDeleteAccount}
            onSwitchAccount={onSwitchAccount}
            onAddAccount={onAddAccount}
          />
        );
      case ViewState.NOTIFICATIONS:
        return (
          <div className="flex flex-col min-h-screen">
            <div className="bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center">
              <button onClick={() => setCurrentView(ViewState.FEED)} className="mr-3 text-gray-600 dark:text-gray-300">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="font-bold dark:text-white">Notifications</span>
            </div>
            <Notifications currentUser={currentUser} onUserClick={navigateToProfile} />
          </div>
        );
      default:
        return <Messages currentUser={currentUser} onChatSelect={navigateToChat} onUserClick={navigateToProfile} />;
    }
  };

  const isFullScreen = currentView === ViewState.CHAT || currentView === ViewState.SETTINGS || currentView === ViewState.CREATE;

  return (
    <div className="min-h-screen bg-snuggle-50 dark:bg-black flex justify-center">
      <div className="w-full max-w-md bg-white dark:bg-black shadow-xl min-h-screen relative flex flex-col transition-colors duration-200">
        {!isFullScreen && currentView !== ViewState.USER_PROFILE && currentView !== ViewState.NOTIFICATIONS && (
          <header className="sticky top-0 z-20 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3 border-b border-snuggle-100 dark:border-gray-800 flex justify-between items-center transition-colors">
            <h1 className="text-2xl font-black bg-gradient-to-r from-snuggle-500 to-emerald-700 bg-clip-text text-transparent tracking-tight">
              SNUGGLE
            </h1>
            <div className="w-8 h-8 animate-throb">
              {/* 3D White Heart SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                <defs>
                  <radialGradient id="heartGrad" cx="30%" cy="30%" r="80%" fx="30%" fy="30%">
                    <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#f0fdf4', stopOpacity: 1 }} />
                  </radialGradient>
                </defs>
                <path d="M50 88.9L16.7 55.6C7.2 46.1 7.2 30.9 16.7 21.4 26.2 11.9 41.4 11.9 50.9 21.4L50 22.3l-0.9-0.9C58.6 11.9 73.8 11.9 83.3 21.4c9.5 9.5 9.5 24.7 0 34.2L50 88.9z"
                  fill="url(#heartGrad)"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.1))"
                />
              </svg>
            </div>
          </header>
        )}
        <main className={`flex-1 overflow-y-auto ${!isFullScreen ? 'pb-20' : ''}`}>
          {renderContent()}
        </main>
        <CallOverlay />
        {!isFullScreen && (
          <BottomNav
            currentView={currentView}
            onViewChange={setCurrentView}
            unreadCount={unreadCount}
          />
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<ViewState>(ViewState.LOGIN);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingGoogleData, setPendingGoogleData] = useState<{ email: string, fullName: string, avatar: string } | null>(null);

  useEffect(() => {
    // Initialize Theme
    const theme = localStorage.getItem('snuggle_theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Firebase auth state check timed out');
      setIsLoading(false);
      setAuthView(ViewState.LOGIN);
    }, 5000); // 5 second timeout

    try {
      const unsubscribe = DBService.observeAuthState((user) => {
        clearTimeout(loadingTimeout);
        setCurrentUser(user);
        if (user) {
          setAuthView(ViewState.FEED);
        } else {
          setAuthView(ViewState.LOGIN);
        }
        setIsLoading(false);
      });

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth observer:', error);
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setAuthView(ViewState.LOGIN);
      return () => { };
    }
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (currentUser) {
        DBService.updatePresence(currentUser.id, false);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser]);

  const handleLogin = async (userId: string) => {
    // DBService updates state, triggering observer
  };

  const handleLogout = async () => {
    if (currentUser) {
      await DBService.logoutUser(currentUser.id);
    }
  };

  const handleDeleteAccount = async () => {
    if (currentUser) {
      if (window.confirm("Are you sure?")) {
        await DBService.deleteUser(currentUser.id);
      }
    }
  };

  const handleSwitchAccount = async (userId: string) => {
    const user = await DBService.getUserById(userId);
    if (user) {
      DBService.loginInternal(user);
    }
  };

  const handleAddAccount = () => {
    handleLogout();
  };

  const handleUpdateUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleGoogleSetupNeeded = (data: { email: string, fullName: string, avatar: string }) => {
    setPendingGoogleData(data);
    setAuthView(ViewState.GOOGLE_SETUP);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-snuggle-50"><Loader2 className="w-8 h-8 animate-spin text-snuggle-500" /></div>;
  }

  if (!currentUser) {
    if (authView === ViewState.SIGNUP) {
      return <Signup onSignup={handleLogin} onNavigate={setAuthView} />;
    }
    if (authView === ViewState.GOOGLE_SETUP && pendingGoogleData) {
      return (
        <GoogleUsernameSetup
          googleData={pendingGoogleData}
          onSignup={handleLogin}
          onCancel={() => {
            setPendingGoogleData(null);
            setAuthView(ViewState.LOGIN);
          }}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onNavigate={setAuthView}
        onGoogleSetupNeeded={handleGoogleSetupNeeded}
      />
    );
  }

  return (
    <CallProvider currentUser={currentUser}>
      <AppContent
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
        onDeleteAccount={handleDeleteAccount}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
      />
    </CallProvider>
  );
};

export default App;
