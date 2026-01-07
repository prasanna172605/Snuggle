
import React, { useState } from 'react';
import { ViewState } from '../types';
import { DBService } from '../services/database';
import { Mail, Lock, User as UserIcon, Loader2, AtSign, ArrowRight } from 'lucide-react';

interface SignupProps {
  onSignup: (userId: string) => void;
  onNavigate: (view: ViewState) => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
    }

    try {
      const user = await DBService.registerUser({
          fullName,
          username,
          email,
          password
      });
      onSignup(user.id);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-snuggle-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-teal-200/50 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm bg-white rounded-bento shadow-[0_20px_40px_rgba(0,0,0,0.05)] p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h2>
            <p className="text-gray-400 text-sm font-medium mt-1">Join the cozy club</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
             <UserIcon className="w-5 h-5 text-gray-400 ml-2" />
             <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Full Name"
                required
              />
          </div>

          <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
             <AtSign className="w-5 h-5 text-gray-400 ml-2" />
             <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="username"
                required
              />
          </div>

          <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
             <Mail className="w-5 h-5 text-gray-400 ml-2" />
             <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Email"
                required
              />
          </div>

          <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
             <Lock className="w-5 h-5 text-gray-400 ml-2" />
             <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Password"
                required
              />
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-xl">
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
                Sign Up <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">Already a member?</p>
            <button 
                onClick={() => onNavigate(ViewState.LOGIN)} 
                className="text-snuggle-600 font-black hover:underline mt-1"
            >
                Log In
            </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
