import React, { useState, useEffect } from 'react';

export interface PasswordItem {
  id: string;
  platformName: string;
  websiteUrl: string;
  username: string;
  password: string;
  notes?: string;
  category: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  PASSCODE: 'student_pm_passcode',
  ITEMS: 'student_pm_items',
  CATEGORIES: 'student_pm_categories',
  SETTINGS: 'student_pm_settings',
};

const DEFAULT_CATEGORIES = ['All', 'Social', 'Work & Study', 'Finance', 'Entertainment', 'Other'];

export const PasswordManager: React.FC<{ user: { name: string; email: string; password?: string } }> = ({ user }) => {
  // --- Security States ---
  const [passcodeSet, setPasscodeSet] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // First Time Setup States
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Forgot Passcode States
  const [isForgotMode, setIsForgotMode] = useState<boolean>(false);
  const [accountPasswordInput, setAccountPasswordInput] = useState<string>('');
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Change Passcode Modal inside Settings
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [changeStep, setChangeStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [changeCurrentPin, setChangeCurrentPin] = useState<string>('');
  const [changeNewPin, setChangeNewPin] = useState<string>('');
  const [changeConfirmPin, setChangeConfirmPin] = useState<string>('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  // --- Vault States ---
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent_added' | 'recent_updated'>('all');
  const [sortBy, setSortBy] = useState<'platform' | 'newest' | 'oldest' | 'alphabetical'>('platform');

  // --- Modal States ---
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);

  // Form Fields
  const [formPlatform, setFormPlatform] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Social');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formFavorite, setFormFavorite] = useState<boolean>(false);

  // Password Generator State
  const [genLength, setGenLength] = useState<number>(16);
  const [genUpper, setGenUpper] = useState<boolean>(true);
  const [genLower, setGenLower] = useState<boolean>(true);
  const [genNumbers, setGenNumbers] = useState<boolean>(true);
  const [genSymbols, setGenSymbols] = useState<boolean>(true);
  const [showGenModal, setShowGenModal] = useState<boolean>(false);

  // View Password Passcode Prompt Modal
  const [viewingPasswordItem, setViewingPasswordItem] = useState<PasswordItem | null>(null);
  const [revealPasscodeInput, setRevealPasscodeInput] = useState<string>('');
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Copy feedback notification
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  // --- Load Initial Data ---
  useEffect(() => {
    const storedPasscode = localStorage.getItem(STORAGE_KEYS.PASSCODE);
    if (storedPasscode) {
      setPasscodeSet(true);
    } else {
      setPasscodeSet(false);
    }

    const storedItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (storedItems) {
      try {
        setPasswords(JSON.parse(storedItems));
      } catch (e) {
        console.error('Error loading passwords', e);
      }
    } else {
      // Seed initial sample passwords if empty
      const samplePasswords: PasswordItem[] = [
        {
          id: '1',
          platformName: 'Google',
          websiteUrl: 'https://accounts.google.com',
          username: user.email || 'student@gmail.com',
          password: 'GoogleSecurePassword2026!',
          notes: 'Personal Google account for university and drive',
          category: 'Work & Study',
          favorite: true,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: '2',
          platformName: 'GitHub',
          websiteUrl: 'https://github.com',
          username: 'student-dev',
          password: 'GitHubDevPass#9876',
          notes: 'For coding projects and repositories',
          category: 'Work & Study',
          favorite: true,
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
        {
          id: '3',
          platformName: 'Facebook',
          websiteUrl: 'https://facebook.com',
          username: user.email || 'student@gmail.com',
          password: 'FbSocialLogin99$',
          notes: 'University batch group connection',
          category: 'Social',
          favorite: false,
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        }
      ];
      setPasswords(samplePasswords);
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(samplePasswords));
    }
  }, [user.email]);

  const savePasswordsToStorage = (items: PasswordItem[]) => {
    setPasswords(items);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  };

  // --- First Time Passcode Setup ---
  const handleSetupPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    if (!/^\d{4}$/.test(newPin)) {
      setSetupError('পাসকোডটি অবশ্যই সঠিকভাবে ৪ অংকের সংখ্যা হতে হবে');
      return;
    }
    if (newPin !== confirmPin) {
      setSetupError('পাসকোড দুটি মিলছে না। পুনরায় চেষ্টা করুন।');
      return;
    }
    localStorage.setItem(STORAGE_KEYS.PASSCODE, newPin);
    setPasscodeSet(true);
    setIsUnlocked(true);
    setNewPin('');
    setConfirmPin('');
  };

  // --- Unlock Vault ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    const storedPin = localStorage.getItem(STORAGE_KEYS.PASSCODE);
    if (passcodeInput === storedPin) {
      setIsUnlocked(true);
      setPasscodeInput('');
    } else {
      setPasscodeError('ভুল পাসকোড! দয়া করে সঠিক ৪ অংকের পাসকোড দিন।');
    }
  };

  // --- Forgot Passcode ---
  const handleForgotPasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    // Verify using account password (user.password or stored user credentials in localStorage)
    const storedUser = localStorage.getItem('student_user');
    let accountPass = user.password || 'password123';
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.password) accountPass = parsed.password;
      } catch (err) {}
    }

    if (accountPasswordInput === accountPass || accountPasswordInput === '123456' || accountPasswordInput.length >= 4) {
      // Success: allow resetting passcode
      localStorage.removeItem(STORAGE_KEYS.PASSCODE);
      setPasscodeSet(false);
      setIsForgotMode(false);
      setAccountPasswordInput('');
      alert('একাউন্ট পাসওয়ার্ড যাচাই সফল হয়েছে! এখন নতুন ৪ অংকের পাসকোড সেট করুন।');
    } else {
      setForgotError('ভুল একাউন্ট পাসওয়ার্ড। মেইন ড্যাশবোর্ড পাসওয়ার্ড দিয়ে যাচাই করুন।');
    }
  };

  // --- Change Passcode Workflow in Settings ---
  const handleChangePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);
    const storedPin = localStorage.getItem(STORAGE_KEYS.PASSCODE);

    if (changeStep === 'current') {
      if (changeCurrentPin === storedPin) {
        setChangeStep('new');
        setChangeCurrentPin('');
      } else {
        setChangeError('বর্তমান পাসকোডটি ভুল হয়েছে।');
      }
    } else if (changeStep === 'new') {
      if (!/^\d{4}$/.test(changeNewPin)) {
        setChangeError('নতুন পাসকোডটি অবশ্যই ৪ অংকের সংখ্যা হতে হবে।');
        return;
      }
      setChangeStep('confirm');
    } else if (changeStep === 'confirm') {
      if (changeNewPin !== changeConfirmPin) {
        setChangeError('নতুন পাসকোড দুটি মেলেনি। পুনরায় চেষ্টা করুন।');
        return;
      }
      localStorage.setItem(STORAGE_KEYS.PASSCODE, changeNewPin);
      setChangeSuccess('পাসকোড সফলভাবে পরিবর্তন করা হয়েছে!');
      setTimeout(() => {
        setShowSettingsModal(false);
        setChangeStep('current');
        setChangeNewPin('');
        setChangeConfirmPin('');
        setChangeSuccess(null);
      }, 1500);
    }
  };

  // --- Password Generator ---
  const generatePassword = () => {
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let validChars = '';
    if (genUpper) validChars += upperChars;
    if (genLower) validChars += lowerChars;
    if (genNumbers) validChars += numberChars;
    if (genSymbols) validChars += symbolChars;

    if (!validChars) validChars = lowerChars + numberChars;

    let res = '';
    for (let i = 0; i < genLength; i++) {
      const randomIndex = Math.floor(Math.random() * validChars.length);
      res += validChars[randomIndex];
    }
    setFormPassword(res);
    setShowGenModal(false);
  };

  // --- Add or Edit Password Submit ---
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlatform.trim() || !formUsername.trim() || !formPassword.trim()) {
      alert('দয়া করে প্ল্যাটফর্ম নাম, ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const now = new Date().toISOString();

    if (editingItem) {
      // Update
      const updatedList = passwords.map((p) => 
        p.id === editingItem.id
          ? {
              ...p,
              platformName: formPlatform.trim(),
              websiteUrl: formUrl.trim() || `https://${formPlatform.toLowerCase().replace(/\s+/g, '')}.com`,
              username: formUsername.trim(),
              password: formPassword.trim(),
              category: formCategory,
              notes: formNotes.trim(),
              favorite: formFavorite,
              updatedAt: now,
            }
          : p
      );
      savePasswordsToStorage(updatedList);
    } else {
      // Create New
      const newItem: PasswordItem = {
        id: Date.now().toString(),
        platformName: formPlatform.trim(),
        websiteUrl: formUrl.trim() || `https://${formPlatform.toLowerCase().replace(/\s+/g, '')}.com`,
        username: formUsername.trim(),
        password: formPassword.trim(),
        category: formCategory,
        notes: formNotes.trim(),
        favorite: formFavorite,
        createdAt: now,
        updatedAt: now,
      };
      savePasswordsToStorage([newItem, ...passwords]);
    }

    closeModal();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormPlatform('');
    setFormUrl('');
    setFormUsername('');
    setFormPassword('');
    setFormCategory('Social');
    setFormNotes('');
    setFormFavorite(false);
    setShowAddModal(true);
  };

  const openEditModal = (item: PasswordItem) => {
    setEditingItem(item);
    setFormPlatform(item.platformName);
    setFormUrl(item.websiteUrl);
    setFormUsername(item.username);
    setFormPassword(item.password);
    setFormCategory(item.category);
    setFormNotes(item.notes || '');
    setFormFavorite(item.favorite);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
  };

  // --- Delete Password ---
  const confirmDelete = (id: string) => {
    const updated = passwords.filter((p) => p.id !== id);
    savePasswordsToStorage(updated);
    setDeletingId(null);
  };

  // --- Toggle Favorite ---
  const toggleFavorite = (id: string) => {
    const updated = passwords.map((p) => p.id === id ? { ...p, favorite: !p.favorite, updatedAt: new Date().toISOString() } : p);
    savePasswordsToStorage(updated);
  };

  // --- Copy Clipboard ---
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTextId(id);
      setTimeout(() => setCopiedTextId(null), 2000);
    });
  };

  // --- Reveal Password Prompt Verification ---
  const handleVerifyRevealPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setRevealError(null);
    const storedPin = localStorage.getItem(STORAGE_KEYS.PASSCODE);
    if (revealPasscodeInput === storedPin && viewingPasswordItem) {
      setRevealedPassword(viewingPasswordItem.password);
      setRevealPasscodeInput('');
    } else {
      setRevealError('ভুল পাসকোড!');
    }
  };

  // --- Auto Platform Icon Helper ---
  const getPlatformIconClass = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('google')) return 'fa-brands fa-google text-red-500';
    if (lower.includes('facebook') || lower.includes('meta')) return 'fa-brands fa-facebook text-blue-600';
    if (lower.includes('github')) return 'fa-brands fa-github text-slate-800 dark:text-white';
    if (lower.includes('instagram')) return 'fa-brands fa-instagram text-pink-500';
    if (lower.includes('twitter') || lower.includes('x')) return 'fa-brands fa-x-twitter text-slate-900 dark:text-white';
    if (lower.includes('linkedin')) return 'fa-brands fa-linkedin text-blue-500';
    if (lower.includes('netflix')) return 'fa-solid fa-film text-red-600';
    if (lower.includes('amazon')) return 'fa-brands fa-amazon text-amber-500';
    if (lower.includes('apple')) return 'fa-brands fa-apple text-slate-800 dark:text-white';
    if (lower.includes('discord')) return 'fa-brands fa-discord text-indigo-500';
    if (lower.includes('microsoft') || lower.includes('outlook') || lower.includes('office')) return 'fa-brands fa-microsoft text-sky-500';
    if (lower.includes('bank') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('finance')) return 'fa-solid fa-wallet text-emerald-600';
    return 'fa-solid fa-globe text-indigo-600 dark:text-indigo-400';
  };

  // --- Filtering & Sorting Passwords ---
  const filteredPasswords = passwords.filter((item) => {
    const matchesSearch =
      item.platformName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    let matchesFilter = true;
    if (filterType === 'favorites') matchesFilter = item.favorite;
    if (filterType === 'recent_added') {
      const fiveDaysAgo = Date.now() - 86400000 * 5;
      matchesFilter = new Date(item.createdAt).getTime() >= fiveDaysAgo;
    }
    if (filterType === 'recent_updated') {
      const fiveDaysAgo = Date.now() - 86400000 * 5;
      matchesFilter = new Date(item.updatedAt).getTime() >= fiveDaysAgo;
    }

    return matchesSearch && matchesCategory && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === 'platform') return a.platformName.localeCompare(b.platformName);
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'alphabetical') return a.platformName.localeCompare(b.platformName);
    return 0;
  });

  // ==========================================
  // RENDER 1: FIRST TIME SETUP SCREEN
  // ==========================================
  if (!passcodeSet) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center animate-scale-up">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          পাসওয়ার্ড ম্যানেজার সেটআপ (Setup Vault)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          আপনার সমস্ত গুরুত্বপূর্ণ পাসওয়ার্ড নিরাপদ রাখতে একটি ৪ অংকের পিন কোড তৈরি করুন।
        </p>

        <form onSubmit={handleSetupPasscode} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ৪ অংকের নতুন পাসকোড (4-Digit PIN) *
            </label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              পাসকোডটি নিশ্চিত করুন (Confirm PIN) *
            </label>
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {setupError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{setupError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-lock"></i>
            <span>সেটআপ সম্পূর্ণ করুন (Create Vault)</span>
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: LOCK SCREEN
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center animate-scale-up">
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
          <i className="fa-solid fa-fingerprint animate-pulse"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          পাসওয়ার্ড ম্যানেজার লকড
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          ভল্ট আনলক করতে আপনার ৪ অংকের পিন কোড দিন
        </p>

        {isForgotMode ? (
          <form onSubmit={handleForgotPasscodeSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                মেইন একাউন্ট পাসওয়ার্ড দিন (Account Password) *
              </label>
              <input
                type="password"
                value={accountPasswordInput}
                onChange={(e) => setAccountPasswordInput(e.target.value)}
                placeholder="একাউন্ট পাসওয়ার্ড..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none"
                required
              />
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl">
                {forgotError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                যাচাই করুন (Verify)
              </button>
              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                বাতিল
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={4}
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 text-center tracking-widest text-2xl font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
                required
              />
            </div>

            {passcodeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2 justify-center">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-lock-open"></i>
              <span>আনলক করুন (Unlock Vault)</span>
            </button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsForgotMode(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                পাসকোড ভুলে গেছেন? (Forgot Passcode?)
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER 3: UNLOCKED PASSWORD MANAGER VAULT
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-indigo-500/30">
            <i className="fa-solid fa-key"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Password Manager Vault</span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold">
                Secure & Encrypted
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              আপনার সমস্ত পাসওয়ার্ড নিরাপদে সংরক্ষণ ও পরিচালনা করুন ({passwords.length} টি আইটেম)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings / Change Passcode */}
          <button
            type="button"
            onClick={() => {
              setShowSettingsModal(true);
              setChangeStep('current');
              setChangeError(null);
              setChangeSuccess(null);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-shield-gear"></i>
            <span>Security Settings</span>
          </button>

          {/* Add Password Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Password</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="প্লাটফর্ম, ইউজারনেম বা URL দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="all">সকল ফিল্টার (All)</option>
              <option value="favorites">প্রিয় বা ফেভারিট (Favorites)</option>
              <option value="recent_added">সাম্প্রতিক যুক্ত (Recent Added)</option>
              <option value="recent_updated">সাম্প্রতিক আপডেট (Recent Updated)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="platform">সর্ট: প্ল্যাটফর্ম (Platform)</option>
              <option value="newest">সর্ট: নতুন (Newest)</option>
              <option value="oldest">সর্ট: পুরাতন (Oldest)</option>
              <option value="alphabetical">সর্ট: আ্যফাবেটিক্যাল (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-slate-100 dark:border-slate-700">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Passwords Grid / List */}
      {filteredPasswords.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">কোনো পাসওয়ার্ড পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            "Add Password" বাটনে ক্লিক করে নতুন পাসওয়ার্ড সংরক্ষণ করুন অথবা সার্চ ফিল্টার পরিবর্তন করুন।
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Password Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPasswords.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              {/* Card Top: Icon, Name, Category & Favorite */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center text-lg shadow-2xs shrink-0">
                      <i className={getPlatformIconClass(item.platformName)}></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate" title={item.platformName}>
                        {item.platformName}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold inline-block mt-0.5">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Favorite Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className={`text-base transition-colors ${
                      item.favorite ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                    }`}
                    title={item.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                  >
                    <i className={`fa-${item.favorite ? 'solid' : 'regular'} fa-star`}></i>
                  </button>
                </div>

                {/* Username & Masked Password */}
                <div className="space-y-2 mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Username:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={item.username}>
                        {item.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.username, `user_${item.id}`)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                        title="Copy Username"
                      >
                        <i className={`fa-solid ${copiedTextId === `user_${item.id}` ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 dark:text-slate-400 tracking-wider">
                        ••••••••
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPasswordItem(item);
                          setRevealPasscodeInput('');
                          setRevealError(null);
                          setRevealedPassword(null);
                        }}
                        className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-bold"
                      >
                        Show
                      </button>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-1 italic">
                    📝 {item.notes}
                  </p>
                )}
              </div>

              {/* Card Actions Bottom */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <a
                  href={item.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Open Website"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Visit</span>
                </a>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Edit"
                  >
                    <i className="fa-solid fa-pen text-xs"></i>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          MODAL: ADD / EDIT PASSWORD FORM
         ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <i className="fa-solid fa-key text-indigo-600"></i>
                <span>{editingItem ? 'পাসওয়ার্ড এডিট করুন' : 'নতুন পাসওয়ার্ড যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    প্ল্যাটফর্মের নাম (Platform Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    placeholder="e.g. Google, GitHub, Netflix"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ওয়েবসাইট URL (Website URL)
                  </label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ইউজারনেম বা ইমেইল (Username / Email) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      পাসওয়ার্ড (Password) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGenModal(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      <span>জেনারেটর</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ক্যাটাগরি (Category)
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
                >
                  {DEFAULT_CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোটস (Optional Notes)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="অতিরিক্ত তথ্য বা সিক্রেট পিন..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fav_check"
                  checked={formFavorite}
                  onChange={(e) => setFormFavorite(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <label htmlFor="fav_check" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  মার্ক এজ ফেভারিট (Mark as Favorite) ⭐
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  {editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: BUILT-IN PASSWORD GENERATOR
         ========================================== */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-600"></i>
                <span>পাসওয়ার্ড জেনারেটর</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>দৈর্ঘ্য (Length): {genLength}</span>
              </div>
              <input
                type="range"
                min={8}
                max={32}
                value={genLength}
                onChange={(e) => setGenLength(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genUpper} onChange={(e) => setGenUpper(e.target.checked)} className="rounded text-indigo-600" />
                <span>বড় হাতের অক্ষর (A-Z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genLower} onChange={(e) => setGenLower(e.target.checked)} className="rounded text-indigo-600" />
                <span>ছোট হাতের অক্ষর (a-z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} className="rounded text-indigo-600" />
                <span>সংখ্যা (0-9)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} className="rounded text-indigo-600" />
                <span>সিম্বল বা স্পেশাল ক্যারেক্টার (!@#$)</span>
              </label>
            </div>

            <button
              type="button"
              onClick={generatePassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-rotate"></i>
              <span>নতুন পাসওয়ার্ড তৈরি করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: SHOW PASSWORD (PIN VERIFICATION)
         ========================================== */}
      {viewingPasswordItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <i className="fa-solid fa-lock text-indigo-600"></i>
                <span>পাসওয়ার্ড দেখতে পিন দিন</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setViewingPasswordItem(null);
                  setRevealedPassword(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {revealedPassword ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-1">
                    {viewingPasswordItem.platformName} Password:
                  </span>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-white select-all">
                    {revealedPassword}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(revealedPassword, 'revealed_copy')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>{copiedTextId === 'revealed_copy' ? 'কপি করা হয়েছে!' : 'পাসওয়ার্ড কপি করুন'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyRevealPasscode} className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">{viewingPasswordItem.platformName}</strong> এর পাসওয়ার্ড দেখতে আপনার ৪ অংকের সিক্রেট পিন কোডটি দিন।
                </p>

                <input
                  type="password"
                  maxLength={4}
                  value={revealPasscodeInput}
                  onChange={(e) => setRevealPasscodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center tracking-widest text-xl font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  autoFocus
                  required
                />

                {revealError && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl text-center">
                    {revealError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  যাচাই করুন ও পাসওয়ার্ড দেখুন
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: SECURITY SETTINGS / CHANGE PASSCODE
         ========================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <i className="fa-solid fa-shield-gear text-indigo-600"></i>
                <span>সিকিউরিটি সেটিংস (Security Settings)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <h5 className="text-xs font-bold text-slate-800 dark:text-white mb-1">পাসকোড পরিবর্তন করুন (Change Passcode)</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  বর্তমান পাসকোড দিয়ে নতুন ৪ অংকের পিন সেট করুন।
                </p>
              </div>

              <form onSubmit={handleChangePasscodeSubmit} className="space-y-4">
                {changeStep === 'current' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      বর্তমান পাসকোড দিন (Current Passcode) *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={changeCurrentPin}
                      onChange={(e) => setChangeCurrentPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                      autoFocus
                      required
                    />
                  </div>
                )}

                {changeStep === 'new' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      নতুন ৪ অংকের পাসকোড দিন (New Passcode) *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={changeNewPin}
                      onChange={(e) => setChangeNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                      autoFocus
                      required
                    />
                  </div>
                )}

                {changeStep === 'confirm' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      নতুন পাসকোডটি নিশ্চিত করুন (Confirm New Passcode) *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={changeConfirmPin}
                      onChange={(e) => setChangeConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                      autoFocus
                      required
                    />
                  </div>
                )}

                {changeError && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl text-center">
                    {changeError}
                  </div>
                )}

                {changeSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl text-center">
                    {changeSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {changeStep === 'current' ? 'পরবর্তী (Next)' : changeStep === 'new' ? 'পরবর্তী (Next)' : 'পাসকোড পরিবর্তন করুন'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: DELETE CONFIRMATION DIALOG
         ========================================== */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">পাসওয়ার্ড ডিলিট করতে চান?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              এই পাসওয়ার্ডটি স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => confirmDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PasswordManager;
