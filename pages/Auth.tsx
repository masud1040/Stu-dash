import React, { useState } from 'react';
import { User } from '../App';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthSuccess(false); // Standard login
  };

  const handleGoogleLogin = () => {
    // Simulate Google Login delay
    setTimeout(() => {
      handleAuthSuccess(true); // Google login
    }, 800);
  };

  const handleAuthSuccess = (isGoogle: boolean) => {
    // Simulate auth user data
    const user: User = {
      name: isGoogle ? 'Alex (Google)' : (formData.name || 'Saiful Alam Masud'),
      email: isGoogle ? 'alex.google@example.com' : (formData.email || 'master@admin.com'),
      university: 'Tech University',
      course: 'Computer Science',
      avatar: isGoogle ? 'https://ui-avatars.com/api/?name=Alex+Google&background=4285F4&color=fff' : 'https://ui-avatars.com/api/?name=Saiful+Alam+Masud&background=6366f1&color=fff',
      isGoogle: isGoogle // Flag to disable password change
    };
    
    localStorage.setItem('student_user', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side - Brand & Features */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-500 p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-300 opacity-20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold mb-2">Welcome Back!</h1>
            <p className="text-blue-100 text-lg">Sign in to access your personalized dashboard, track your studies, manage tasks, and achieve your academic goals.</p>
          </div>

          <div className="relative z-10 space-y-6 mt-10 md:mt-0">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-xl"></i>
              </div>
              <span className="font-semibold text-lg">Advanced Analytics & Reports</span>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-calendar-check text-xl"></i>
              </div>
              <span className="font-semibold text-lg">Smart Study & Habit Tracking</span>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-file-pdf text-xl"></i>
              </div>
              <span className="font-semibold text-lg">PDF Export & Resource Management</span>
            </div>
             <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-mobile-screen text-xl"></i>
              </div>
              <span className="font-semibold text-lg">Fully Responsive on All Devices</span>
            </div>
          </div>

          <div className="mt-8 relative z-10 bg-white/10 p-6 rounded-xl border border-white/20">
             <p className="italic text-sm text-blue-50 mb-3">"This dashboard transformed how I manage my studies. My productivity increased by 40% in just one month!"</p>
             <div className="flex items-center gap-2 font-bold text-yellow-300">
               <i className="fa-solid fa-star"></i>
               <span className="text-white">Saiful Alam Masud</span>
             </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white relative">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{isLogin ? 'Login to Account' : 'Create Account'}</h2>
              <p className="text-slate-500">Enter your credentials to access your dashboard</p>
            </div>

            {/* Google Login Button */}
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mb-6 font-semibold text-slate-700"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                     <i className="fa-regular fa-user absolute left-4 top-3.5 text-slate-400"></i>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <i className="fa-regular fa-envelope absolute left-4 top-3.5 text-slate-400"></i>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="student@university.edu"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-3.5 text-slate-400"></i>
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <i className="fa-regular fa-eye absolute right-4 top-3.5 text-slate-400 cursor-pointer"></i>
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2">
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>{isLogin ? 'Login to Dashboard' : 'Create Account'}</span>
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <p className="text-slate-500">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 font-bold hover:underline"
                >
                  {isLogin ? 'Sign Up Now' : 'Sign In'}
                </button>
              </p>
              <div className="mt-4 text-xs text-slate-400">
                By logging in, you agree to our <a href="#" className="hover:text-blue-500">Terms of Service</a> and <a href="#" className="hover:text-blue-500">Privacy Policy</a>
              </div>
              <div className="mt-8 text-xs text-slate-300">
                © 2026 Student Life Dashboard. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;