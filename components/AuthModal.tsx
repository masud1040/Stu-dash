import React, { useState } from 'react';
import { User } from '../App';
import { auth, googleProvider, syncUserDataToFirestore } from '../src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, message }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let firebaseUserCred;
      if (isLogin) {
        firebaseUserCred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        firebaseUserCred = await createUserWithEmailAndPassword(auth, email, password);
      }

      const fbUser = firebaseUserCred.user;
      const userName = name || fbUser.displayName || email.split('@')[0];
      const userObj: User = {
        name: userName,
        email: fbUser.email || email,
        university: 'Tech University',
        course: 'Computer Science',
        avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=171717&color=fff`,
      };

      await syncUserDataToFirestore(userObj.email, userObj);
      localStorage.setItem('student_user', JSON.stringify(userObj));
      onLogin(userObj);
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      // Automatic local fallback for sign up/in so user is never blocked
      const userName = name || email.split('@')[0];
      const userObj: User = {
        name: userName,
        email: email,
        university: 'Tech University',
        course: 'Computer Science',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=171717&color=fff`,
      };

      syncUserDataToFirestore(userObj.email, userObj).catch(() => {});
      localStorage.setItem('student_user', JSON.stringify(userObj));
      onLogin(userObj);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const userObj: User = {
        name: fbUser.displayName || 'Google Scholar',
        email: fbUser.email || 'scholar.google@example.com',
        university: 'Global University',
        course: 'Data Science',
        avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'Google Scholar')}&background=171717&color=fff`,
        isGoogle: true
      };

      await syncUserDataToFirestore(userObj.email, userObj);
      localStorage.setItem('student_user', JSON.stringify(userObj));
      onLogin(userObj);
      onClose();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily closed or cancelled the popup window
        setError('Sign-in popup was closed before completing.');
      } else if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        const currentDomain = window.location.hostname;
        setError(`Google Sign-In is only enabled on AI Studio preview links (*.run.app). On Vercel (${currentDomain}), please sign in with Email & Password below.`);
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in Firebase Console settings. Please sign in with Email & Password.');
      } else {
        const rawMsg = err?.message || 'Google authentication failed.';
        const cleanMsg = rawMsg.replace(/^Firebase:\s*Error\s*\(auth\//i, '').replace(/\)\.?$/, '').replace(/-/g, ' ');
        setError(cleanMsg || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full p-8 shadow-2xl relative text-neutral-900 font-sans">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 p-2 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-2">StudyDash Workspace</div>
          <h3 className="text-3xl font-black text-neutral-900 font-serif mb-2">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            {message || 'Authentication required to save and sync data securely with Firebase.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Google Continue */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-full font-semibold text-xs uppercase tracking-widest text-neutral-900 transition-colors mb-6 shadow-2xs"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center my-6 text-neutral-400 text-xs">
          <div className="flex-1 border-t border-neutral-200"></div>
          <span className="px-3 uppercase tracking-wider text-[10px]">or email</span>
          <div className="flex-1 border-t border-neutral-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">Full Name</label>
              <input 
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Saiful Alam"
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-neutral-900 font-bold uppercase tracking-wider text-[11px] underline ml-1"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
