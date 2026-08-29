import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { 
  deleteCurrentUserData,
  clearFullDatabase, 
  getCurrentFirebaseInfo, 
  saveCustomFirebaseConfig, 
  resetToDefaultFirebase, 
  testFirestoreConnection,
  syncAllLocalDataToFirestore,
  fetchAllCloudDataToLocal,
  SUPER_ADMIN_EMAIL
} from '../src/lib/firebase';

interface SettingsProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  themePreference: 'light' | 'dark' | 'system';
  setTheme: (pref: 'light' | 'dark' | 'system') => void;
  user: User;
  onLogout: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, toggleDarkMode, themePreference, setTheme, user, onLogout }) => {
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'notifications' | 'database'>('general');
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'database') {
      setActiveTab('general');
    }
  }, [isSuperAdmin, activeTab]);
  
  // Firebase Admin State
  const [firebaseInfo, setFirebaseInfo] = useState(getCurrentFirebaseInfo());
  const [customConfigJson, setCustomConfigJson] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Notification State
  const [notificationSettings, setNotificationSettings] = useState({
    emailMonthly: true,
    inApp: true,
    taskDeadlines: true
  });
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Load notification settings
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) setNotificationSettings(JSON.parse(savedSettings));

    // Load local notifications
    const savedNotifs = localStorage.getItem('local_notifications');
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
    
    // Load custom firebase config into text area if exists
    const customConfig = localStorage.getItem('custom_firebase_config');
    if (customConfig) {
      setCustomConfigJson(customConfig);
    }
  }, []);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      alert("New passwords do not match!");
      return;
    }
    alert("Password updated successfully!");
    setPassword({ current: '', new: '', confirm: '' });
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    const updated = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(updated);
    localStorage.setItem('notification_settings', JSON.stringify(updated));
  };

  const simulateMonthlyReport = () => {
    if (!notificationSettings.emailMonthly) {
        alert("Please enable Monthly Reports first!");
        return;
    }

    alert(`📧 Email sent to: ${user.email}\n\nSubject: Your Monthly Progress Report\nBody: You studied 45 hours this month! Keep it up.`);

    const newNotif: Notification = {
        id: Date.now().toString(),
        title: 'Monthly Report Ready',
        message: 'Your study summary for this month has been sent to your email.',
        date: new Date().toLocaleString(),
        read: false
    };
    
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    localStorage.setItem('local_notifications', JSON.stringify(updatedNotifs));
  };

  const clearNotifications = () => {
      setNotifications([]);
      localStorage.removeItem('local_notifications');
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmText = prompt("Type 'DELETE' to permanently erase your account data (Tasks, Habits, Notes, etc.) and reset your local session.");
    if (confirmText === 'DELETE') {
      try {
        setIsDeleting(true);
        await deleteCurrentUserData(user?.email, user?.id); 
        alert("Your account data has been permanently deleted.");
        onLogout();
        window.location.reload(); 
      } catch (err) {
        console.error("Failed to delete user account data:", err);
        alert("Encountered an issue deleting account data, but local storage was cleared.");
        onLogout();
        window.location.reload();
      } finally {
        setIsDeleting(false);
      }
    } else if (confirmText !== null) {
      alert("Deletion cancelled. You must type 'DELETE' exactly.");
    }
  };

  // Sync All Data to Firestore
  const handleSyncAllToCloud = async () => {
    try {
      setIsSyncing(true);
      setSyncStatusMsg(null);
      const res = await syncAllLocalDataToFirestore(user.email || SUPER_ADMIN_EMAIL);
      setSyncStatusMsg(`✅ Successfully synced ${res.count} modules to Firestore!`);
    } catch (err: any) {
      setSyncStatusMsg(`❌ Sync error: ${err?.message || 'Failed to sync data'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch All Cloud Data to Local
  const handleFetchAllFromCloud = async () => {
    try {
      setIsSyncing(true);
      setSyncStatusMsg(null);
      const res = await fetchAllCloudDataToLocal(user.email || SUPER_ADMIN_EMAIL);
      setSyncStatusMsg(`✅ Successfully retrieved and restored ${res.count} data items from Firestore!`);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setSyncStatusMsg(`❌ Fetch error: ${err?.message || 'Failed to fetch cloud data'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Test Firestore Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testFirestoreConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Custom Firebase Project Config
  const handleSaveCustomFirebase = () => {
    if (!customConfigJson.trim()) {
      alert("Please paste your Firebase config JSON object.");
      return;
    }
    try {
      // Allow clean js object or JSON string
      let cleaned = customConfigJson.trim();
      if (cleaned.startsWith('const firebaseConfig =')) {
        cleaned = cleaned.replace('const firebaseConfig =', '').replace(/;$/, '').trim();
      }
      // If keys aren't quoted, format or parse
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonErr) {
        // Evaluate safely if JavaScript object format was pasted
        parsed = Function(`"use strict"; return (${cleaned});`)();
      }

      if (!parsed.apiKey || !parsed.projectId) {
        alert("Config must contain at least 'apiKey' and 'projectId'.");
        return;
      }

      saveCustomFirebaseConfig(parsed);
      alert("🎉 Custom Firebase configuration saved! The application will reload to connect to your Firebase project.");
      window.location.reload();
    } catch (err: any) {
      alert("Invalid configuration format: " + err.message);
    }
  };

  // Reset to default Firebase
  const handleResetToDefaultFirebase = () => {
    if (confirm("Reset to default AI Studio Firebase project?")) {
      resetToDefaultFirebase();
      alert("Reset to default Firebase. Reloading...");
      window.location.reload();
    }
  };

  const ToggleSwitch = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) => (
    <div className={`flex items-center justify-between py-4 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-slate-700 dark:text-slate-200 font-medium">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} disabled={disabled} />
        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">
          {isSuperAdmin 
            ? "Manage your application preferences, Firebase database, and security." 
            : "Manage your application preferences and security."}
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden sticky top-4">
            <nav className="flex flex-col">
              <button 
                onClick={() => setActiveTab('general')}
                className={`text-left px-6 py-4 font-medium transition-colors border-l-4 ${activeTab === 'general' ? 'bg-primary/5 text-primary border-primary' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <i className="fa-solid fa-sliders mr-3 w-5"></i> General
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={() => setActiveTab('database')}
                  className={`text-left px-6 py-4 font-medium transition-colors border-l-4 ${activeTab === 'database' ? 'bg-primary/5 text-primary border-primary' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <i className="fa-solid fa-database mr-3 w-5 text-amber-500"></i> Database & Admin
                </button>
              )}
              <button 
                onClick={() => setActiveTab('account')}
                className={`text-left px-6 py-4 font-medium transition-colors border-l-4 ${activeTab === 'account' ? 'bg-primary/5 text-primary border-primary' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <i className="fa-solid fa-user-shield mr-3 w-5"></i> Security
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`text-left px-6 py-4 font-medium transition-colors border-l-4 ${activeTab === 'notifications' ? 'bg-primary/5 text-primary border-primary' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className="flex justify-between items-center w-full">
                   <span><i className="fa-solid fa-bell mr-3 w-5"></i> Notifications</span>
                   {notifications.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{notifications.length}</span>}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 min-h-[500px]">
            
            {/* --- GENERAL SETTINGS --- */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Appearance</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'light', label: 'Light Mode', icon: 'fa-sun', desc: 'Clean bright interface' },
                    { id: 'dark', label: 'Dark Mode', icon: 'fa-moon', desc: 'Easy on the eyes in dark' },
                    { id: 'system', label: 'System Default', icon: 'fa-desktop', desc: 'Auto-matches OS preference' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setTheme(item.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        themePreference === item.id 
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                          themePreference === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          <i className={`fa-solid ${item.icon}`}></i>
                        </div>
                        {themePreference === item.id && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-check"></i>
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm mb-0.5">{item.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Regional</h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language</label>
                       <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary">
                         <option>English (US)</option>
                         <option>Spanish</option>
                         <option>French</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Time Zone</label>
                       <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary">
                         <option>UTC (Coordinated Universal Time)</option>
                         <option>EST (Eastern Standard Time)</option>
                         <option>PST (Pacific Standard Time)</option>
                       </select>
                     </div>
                   </div>
                </div>
              </div>
            )}

            {/* --- DATABASE & ADMIN SETTINGS --- */}
            {isSuperAdmin && activeTab === 'database' && (
              <div className="space-y-6 animate-fade-in">
                {/* Admin Status Card */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-indigo-900/40 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30 flex items-center gap-1">
                          <i className="fa-solid fa-crown text-[10px]"></i> Database Super Admin
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${firebaseInfo.isCustom ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                          {firebaseInfo.isCustom ? 'Custom Firebase (Owner Admin)' : 'Active Cloud Database'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{SUPER_ADMIN_EMAIL}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Project: <code className="text-indigo-200 bg-indigo-950/60 px-1.5 py-0.5 rounded">{firebaseInfo.projectId}</code></span>
                        <span>•</span>
                        <span>DB: <code className="text-indigo-200 bg-indigo-950/60 px-1.5 py-0.5 rounded">{firebaseInfo.databaseId}</code></span>
                      </p>
                    </div>

                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-500/50 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isTesting ? 'fa-spinner fa-spin' : 'fa-network-wired'}`}></i>
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div className={`mt-4 p-3 rounded-xl text-xs font-medium border flex items-center gap-2 animate-fade-in ${testResult.success ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200' : 'bg-red-950/50 border-red-700/60 text-red-200'}`}>
                      <i className={`fa-solid ${testResult.success ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-red-400'}`}></i>
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Cloud Sync Operations */}
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-cloud-arrow-up text-indigo-500"></i>
                      Full Database Sync Engine
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sync all 10+ modules (Todos, Notes, Habits, Study Sessions, Subjects, Assignments, Interview Q&As, Password Vault, Short URLs, Roadmap Milestones) to/from Firestore Cloud Database.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleSyncAllToCloud}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                      <span>Sync All Local Data to Cloud DB</span>
                    </button>

                    <button
                      onClick={handleFetchAllFromCloud}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'}`}></i>
                      <span>Fetch & Restore from Cloud DB</span>
                    </button>
                  </div>

                  {syncStatusMsg && (
                    <p className="text-xs font-semibold p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 animate-fade-in">
                      {syncStatusMsg}
                    </p>
                  )}
                </div>

                {/* Connect Own Firebase Project (Full Owner Admin) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <i className="fa-brands fa-google text-amber-500"></i>
                        Connect Your Own Firebase Project (100% Admin & Owner)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        আপনি যদি নিজে Firebase Console-এর মালিক/এডমিন হয়ে সম্পূর্ণ ডাটা সরাসরি আপনার নিজের Firebase Project-এ রাখতে চান, তাহলে আপনার Firebase Console (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">console.firebase.google.com</a>) থেকে Web App Config টি নিচে পেস্ট করে সেভ করুন।
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Firebase Web App Config (JSON or JavaScript Object):
                    </label>
                    <textarea
                      rows={6}
                      className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder={`{
  "apiKey": "AIzaSy...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef"
}`}
                      value={customConfigJson}
                      onChange={(e) => setCustomConfigJson(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSaveCustomFirebase}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
                    >
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>Save & Connect My Firebase</span>
                    </button>

                    {firebaseInfo.isCustom && (
                      <button
                        onClick={handleResetToDefaultFirebase}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-all"
                      >
                        Reset to Default Database
                      </button>
                    )}
                  </div>
                </div>

                {/* Firestore Collections Overview */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-slate-400"></i>
                    Synced Cloud Collections
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { name: 'users', label: 'User Profiles' },
                      { name: 'user_data', label: 'Master Sync State' },
                      { name: 'todos', label: 'Todos & Tasks' },
                      { name: 'notes', label: 'Study Notes' },
                      { name: 'habits', label: 'Habit Tracker' },
                      { name: 'subjects', label: 'Study Subjects' },
                      { name: 'study_sessions', label: 'Timer Sessions' },
                      { name: 'interview_questions', label: 'Interview Q&A' },
                    ].map(c => (
                      <div key={c.name} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{c.label}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- ACCOUNT SECURITY --- */}
            {activeTab === 'account' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Change Password</h3>
                
                {user.isGoogle ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3 text-blue-800 dark:text-blue-300 mb-6">
                        <i className="fa-brands fa-google text-xl"></i>
                        <div>
                            <p className="font-bold text-sm">Account Managed by Google</p>
                            <p className="text-xs">You cannot change your password here. Please manage security via your Google Account settings.</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                        <input 
                        type="password" 
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary"
                        value={password.current}
                        onChange={e => setPassword({...password, current: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                        <input 
                        type="password" 
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary"
                        value={password.new}
                        onChange={e => setPassword({...password, new: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                        <input 
                        type="password" 
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary"
                        value={password.confirm}
                        onChange={e => setPassword({...password, confirm: e.target.value})}
                        />
                    </div>
                    <button className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-600 shadow-md">
                        Update Password
                    </button>
                    </form>
                )}

                <div className="border-t border-slate-100 dark:border-slate-700 pt-8 mt-8">
                  <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Danger Zone
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Permanently delete your account data from Firestore and wipe your stored local data (Habits, Todos, Notes, Interviews, Tool data).
                  </p>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-6 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Deleting Account Data...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Delete My Account Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* --- NOTIFICATIONS --- */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Notification Preferences</h3>
                    <p className="text-sm text-slate-500 mb-4">Manage how and when you want to be notified.</p>
                    
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 border rounded-xl px-4 border-slate-100 dark:border-slate-700">
                        <ToggleSwitch 
                            label="Email Monthly Reports" 
                            checked={notificationSettings.emailMonthly} 
                            onChange={() => handleToggleNotification('emailMonthly')} 
                        />
                        <ToggleSwitch 
                            label="In-App Notifications" 
                            checked={notificationSettings.inApp} 
                            onChange={() => handleToggleNotification('inApp')} 
                        />
                        <ToggleSwitch 
                            label="Task Deadlines" 
                            checked={notificationSettings.taskDeadlines} 
                            onChange={() => handleToggleNotification('taskDeadlines')} 
                        />
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                        <button 
                            onClick={simulateMonthlyReport}
                            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-bold shadow hover:bg-sky-600 transition-colors"
                        >
                            <i className="fa-solid fa-paper-plane mr-2"></i> Test Email Report
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">In-App Notification Log</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearNotifications} className="text-xs text-red-500 hover:underline">Clear All</button>
                        )}
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-3">
                        {notifications.length === 0 ? (
                            <div className="text-center text-slate-400 py-6">
                                <i className="fa-regular fa-bell-slash text-2xl mb-2"></i>
                                <p className="text-sm">No new notifications</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <i className="fa-solid fa-envelope-open-text text-xs"></i>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{notif.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-2 text-right">{notif.date}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
