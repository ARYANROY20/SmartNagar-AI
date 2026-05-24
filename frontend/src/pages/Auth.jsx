import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2, Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestAdminAccess } from '../services/api.js';

export default function Auth() {
  const { loginWithGoogle, signInWithEmail, signUpWithEmail, loading, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      if (isAdminMode && adminCode.trim()) {
        await requestAdminAccess(adminCode.trim());
      }
      await refreshUserData?.();
      navigate(-1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      if (isAdminMode && adminCode.trim()) {
        await requestAdminAccess(adminCode.trim());
      }
      await refreshUserData?.();
      navigate(-1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to sign in with Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
     return (
       <div className="min-h-screen bg-transparent flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center p-4 pt-12">
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-4 left-4 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back
      </button>
      
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-blue-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1 text-center">
          {isAdminMode ? (isSignUp ? 'Create Admin Account' : 'Admin Sign In') : (isSignUp ? 'Create an Account' : 'Welcome Back')}
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          {isAdminMode ? 'Use your admin access code to open the operations dashboard.' : (isSignUp ? 'Join your community to report issues.' : 'Sign in to access your dashboard.')}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5 rounded-xl bg-gray-50 p-1 border border-gray-100">
          <button
            type="button"
            onClick={() => { setIsAdminMode(false); setError(''); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${!isAdminMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Citizen
          </button>
          <button
            type="button"
            onClick={() => { setIsAdminMode(true); setError(''); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${isAdminMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl mb-4 border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
            />
          </div>

          {isAdminMode && (
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Admin access code (for new admins)"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center mt-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isAdminMode ? (isSignUp ? 'Sign Up as Admin' : 'Sign In as Admin') : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-3">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">or sign in with</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading || isSubmitting}
          className="w-full bg-white text-gray-800 border border-gray-200 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isAdminMode ? 'Admin Google Sign In' : 'Google'}
        </button>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
              className="text-blue-600 hover:text-blue-700 font-bold"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
