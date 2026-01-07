
import React, { useState, useEffect } from 'react';
import { ViewState, User } from '../types';
import { DBService } from '../services/database';
import { Lock, Loader2, User as UserIcon, ArrowRight, X, ChevronRight, PlusCircle, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (userId: string) => void;
  onNavigate: (view: ViewState) => void;
  onGoogleSetupNeeded?: (data: { email: string, fullName: string, avatar: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigate, onGoogleSetupNeeded }) => {
  // Saved accounts state
  const [savedUsers, setSavedUsers] = useState<User[]>([]);
  const [showSavedView, setShowSavedView] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);

  // Form state
  const [identifier, setIdentifier] = useState('demo');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSaved = async () => {
      const users = await DBService.getSavedSessions();
      if (users.length > 0) {
        setSavedUsers(users);
        setShowSavedView(true);
      }
      setCheckingSaved(false);
    };
    checkSaved();
  }, []);

  const handleQuickLogin = async (user: User) => {
    setLoading(true);
    try {
      const freshUser = await DBService.getUserById(user.id);
      if (!freshUser) {
        console.warn("User from saved session not found in DB, cleaning up.");
        DBService.removeSession(user.id);
        setSavedUsers(prev => prev.filter(u => u.id !== user.id));
        if (savedUsers.length <= 1) setShowSavedView(false);

        setError("Account not found. Please log in again.");
        setLoading(false);
        return;
      }

      if (!user.password) {
        DBService.removeSession(user.id);
        setSavedUsers(prev => prev.filter(u => u.id !== user.id));
        if (savedUsers.length <= 1) setShowSavedView(false);
        setError("Password not found. Please log in again.");
        setLoading(false);
        return;
      }

      await DBService.loginUser(user.username, user.password);
      onLogin(user.id);
    } catch (e) {
      console.error("Quick login failed", e);
      setError("Please log in again.");
      setShowSavedView(false);
      setIdentifier(user.username);
    }
    setLoading(false);
  };

  const handleRemoveAccount = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    DBService.removeSession(userId);
    const updated = savedUsers.filter(u => u.id !== userId);
    setSavedUsers(updated);
    if (updated.length === 0) setShowSavedView(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await DBService.loginUser(identifier, password);
      onLogin(user.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Check credentials.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await DBService.loginWithGoogle();

      if (result.isNew && result.googleData) {
        if (onGoogleSetupNeeded) {
          onGoogleSetupNeeded(result.googleData);
        }
      } else if (result.user) {
        onLogin(result.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setLoading(false);
    }
  };

  if (checkingSaved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-snuggle-50">
        <Loader2 className="w-8 h-8 text-snuggle-500 animate-spin" />
      </div>
    );
  }

  // --- Saved Accounts View ---
  if (showSavedView && savedUsers.length > 0) {
    return (
      <div className="min-h-screen bg-snuggle-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Floating Emojis */}
        <div className="floating-elements">
          <div className="float-element">🤍</div>
          <div className="float-element">💕</div>
          <div className="float-element">✨</div>
          <div className="float-element">💖</div>
          <div className="float-element">💫</div>
        </div>

        {/* Background blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-teal-200/50 rounded-full blur-[80px]" />

        <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 mb-6 animate-throb">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
              <defs>
                <radialGradient id="heartGradSaved" cx="30%" cy="30%" r="80%" fx="30%" fy="30%">
                  <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#f0fdf4', stopOpacity: 1 }} />
                </radialGradient>
              </defs>
              <path d="M50 88.9L16.7 55.6C7.2 46.1 7.2 30.9 16.7 21.4 26.2 11.9 41.4 11.9 50.9 21.4L50 22.3l-0.9-0.9C58.6 11.9 73.8 11.9 83.3 21.4c9.5 9.5 9.5 24.7 0 34.2L50 88.9z"
                fill="url(#heartGradSaved)"
                stroke="#e2e8f0"
                strokeWidth="1"
                filter="drop-shadow(0px 8px 12px rgba(0,0,0,0.1))"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Welcome Back</h2>

          <div className="w-full space-y-3 mb-8">
            {savedUsers.map(user => (
              <div
                key={user.id}
                onClick={() => handleQuickLogin(user)}
                className="bg-white rounded-[24px] p-3 pl-4 flex items-center shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 group relative"
              >
                <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                <div className="ml-4 flex-1">
                  <h3 className="font-bold text-gray-900">{user.username}</h3>
                  <p className="text-xs text-gray-400">{user.fullName}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-snuggle-50 group-hover:text-snuggle-500 transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                </div>

                <button
                  onClick={(e) => handleRemoveAccount(e, user.id)}
                  className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowSavedView(false)}
            className="flex items-center gap-2 text-snuggle-600 font-bold hover:text-snuggle-700 transition-colors bg-white/50 px-6 py-3 rounded-full"
          >
            <PlusCircle className="w-4 h-4" />
            Log into another account
          </button>

          <div className="mt-8">
            <button
              onClick={() => onNavigate(ViewState.SIGNUP)}
              className="text-gray-400 font-medium text-sm hover:text-gray-600"
            >
              Create new account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Standard Login Form ---
  return (
    <div className="min-h-screen bg-snuggle-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Emojis */}
      <div className="floating-elements">
        <div className="float-element">🤍</div>
        <div className="float-element">💕</div>
        <div className="float-element">✨</div>
        <div className="float-element">💖</div>
        <div className="float-element">💫</div>
      </div>

      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-teal-200/50 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm bg-white rounded-bento shadow-[0_20px_40px_rgba(0,0,0,0.05)] p-8 relative z-10">

        {/* Back button if saved users exist */}
        {savedUsers.length > 0 && (
          <button onClick={() => setShowSavedView(true)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 animate-throb">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
              <defs>
                <radialGradient id="heartGradLogin" cx="30%" cy="30%" r="80%" fx="30%" fy="30%">
                  <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#f0fdf4', stopOpacity: 1 }} />
                </radialGradient>
              </defs>
              <path d="M50 88.9L16.7 55.6C7.2 46.1 7.2 30.9 16.7 21.4 26.2 11.9 41.4 11.9 50.9 21.4L50 22.3l-0.9-0.9C58.6 11.9 73.8 11.9 83.3 21.4c9.5 9.5 9.5 24.7 0 34.2L50 88.9z"
                fill="url(#heartGradLogin)"
                stroke="#cbd5e1"
                strokeWidth="1"
                filter="drop-shadow(0px 8px 12px rgba(0,0,0,0.15))"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">SNUGGLE</h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Our Private Space 💞</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-[24px] p-1 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-4 mt-1">Username or Email</label>
            <div className="flex items-center px-4 pb-2">
              <UserIcon className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none"
                placeholder="Type here..."
                required
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-[24px] p-1 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-4 mt-1">Password</label>
            <div className="flex items-center px-4 pb-2">
              <Lock className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl break-words border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-[24px] shadow-lg hover:bg-gray-900 transform transition-all active:scale-95 flex justify-center items-center gap-2 group mt-4"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                Enter Our World 🤍🌍 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-100"></div>
          <span className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-wider">Or</span>
          <div className="flex-1 border-t border-gray-100"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3.5 rounded-[24px] hover:bg-gray-50 transform transition-all active:scale-95 flex justify-center items-center gap-3 group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">Don't have an account?</p>
          <button
            onClick={() => onNavigate(ViewState.SIGNUP)}
            className="text-snuggle-600 font-black hover:underline mt-1"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
