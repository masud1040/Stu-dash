import React, { useState } from 'react';
import { User } from '../App';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      name: name || (isLogin ? 'Student User' : 'New Scholar'),
      email: email || 'student@studydash.com',
      university: 'Tech University',
      course: 'Computer Science',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=171717&color=fff`,
    };
    localStorage.setItem('student_user', JSON.stringify(newUser));
    onLogin(newUser);
    onClose();
  };

  const handleGoogleAuth = () => {
    const googleUser: User = {
      name: 'Google Scholar',
      email: 'scholar.google@example.com',
      university: 'Global University',
      course: 'Data Science',
      avatar: 'https://ui-avatars.com/api/?name=Google+Scholar&background=171717&color=fff',
      isGoogle: true
    };
    localStorage.setItem('student_user', JSON.stringify(googleUser));
    onLogin(googleUser);
    onClose();
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

        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-2">StudyDash Workspace</div>
          <h3 className="text-3xl font-black text-neutral-900 font-serif mb-2">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            {message || 'Authentication required to save and modify data securely.'}
          </p>
        </div>

        {/* Google Continue */}
        <button
          type="button"
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
            className="w-full py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all mt-2"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
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
