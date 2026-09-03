import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import StudyTracker from './pages/StudyTracker';
import HabitTracker from './pages/HabitTracker';
import Resources from './pages/Resources';
import Todo from './pages/Todo';
import Notes from './pages/Notes';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Others from './pages/Others';
import Settings from './pages/Settings';
import InterviewPrep from './pages/InterviewPrep';
import PasswordManager from './components/PasswordManager';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import { auth, getUserDataFromFirestore } from './src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Types
export type Page = 'dashboard' | 'study' | 'habits' | 'resources' | 'todo' | 'notes' | 'analytics' | 'profile' | 'settings' | 'others' | 'interview' | 'passwords';

export interface User {
  name: string;
  email: string;
  avatar?: string;
  university?: string;
  course?: string;
  phone?: string;
  studentId?: string;
  bio?: string;
  year?: string;
  joinDate?: string;
  gpa?: string;
  isGoogle?: boolean;
}

// Global Timer Component (Compact, Draggable, Circular Progress)
const GlobalTimer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('global_timer_duration');
    return saved ? parseInt(saved, 10) : 25;
  });

  const [position, setPosition] = useState<{ x: number | null; y: number | null }>(() => {
    const saved = localStorage.getItem('global_timer_pos');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { x: null, y: null };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = React.useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const timerRef = React.useRef<HTMLDivElement>(null);

  const intervalRef = React.useRef<number | null>(null);
  const hasPlayedChimeRef = React.useRef(false);
  const totalSeconds = durationMinutes * 60;

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      // Ignore audio error
    }
  };

  useEffect(() => {
    if (active && seconds >= totalSeconds && !hasPlayedChimeRef.current) {
      hasPlayedChimeRef.current = true;
      playChime();
    }
    if (!active) {
      hasPlayedChimeRef.current = false;
    }
  }, [seconds, active, totalSeconds]);

  useEffect(() => {
    const storedStart = localStorage.getItem('global_timer_start');
    const storedDuration = localStorage.getItem('global_timer_duration');
    if (storedDuration) {
      setDurationMinutes(parseInt(storedDuration, 10));
    }
    if (storedStart) {
      setActive(true);
      const startTime = parseInt(storedStart, 10);
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setSeconds(elapsed);

      intervalRef.current = window.setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(currentElapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = timerRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (window.innerWidth - 65);
    const currentY = rect ? rect.top : (window.innerHeight - 65);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = timerRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (window.innerWidth - 65);
    const currentY = rect ? rect.top : (window.innerHeight - 65);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      posX: currentX,
      posY: currentY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 60, dragRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('global_timer_pos', JSON.stringify(position));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 60, dragRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('global_timer_pos', JSON.stringify(position));
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, position]);

  const startTimer = (mins?: number) => {
    const targetMins = mins !== undefined ? mins : durationMinutes;
    if (mins !== undefined) {
      setDurationMinutes(mins);
      localStorage.setItem('global_timer_duration', mins.toString());
    }
    setActive(true);
    const now = Date.now();
    localStorage.setItem('global_timer_start', now.toString());
    setSeconds(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const start = parseInt(localStorage.getItem('global_timer_start') || now.toString(), 10);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSeconds(elapsed);
    }, 1000);
  };

  const stopTimer = () => {
    setActive(false);
    setSeconds(0);
    localStorage.removeItem('global_timer_start');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const formatTime = (totalSecs: number) => {
    const remaining = Math.max(0, totalSeconds - totalSecs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = Math.min(1, seconds / totalSeconds);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 text-slate-800 dark:text-white animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-stopwatch text-indigo-500 text-sm"></i>
                <h3 className="font-bold text-sm">Focus Timer</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
                Duration (Minutes)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setDurationMinutes(m);
                      localStorage.setItem('global_timer_duration', m.toString());
                      if (active) startTimer(m);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      durationMinutes === m 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
              <span className="font-mono font-bold text-2xl text-slate-800 dark:text-white mb-1">
                {formatTime(seconds)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {active ? (seconds >= totalSeconds ? 'Completed!' : `${Math.round(progress * 100)}% done`) : 'Ready to focus'}
              </span>
            </div>

            <div className="flex gap-2">
              {active ? (
                <button
                  onClick={stopTimer}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-stop"></i> Stop & Reset
                </button>
              ) : (
                <button
                  onClick={() => startTimer()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-play"></i> Start Focus
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div 
        ref={timerRef}
        style={position.x !== null && position.y !== null ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' } : {}}
        className="fixed bottom-6 right-6 z-[100] flex flex-col items-end select-none"
      >
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-grab active:cursor-grabbing p-1"
          title="Drag to move, click to open timer"
        >
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-11 h-11 rounded-full bg-slate-900 dark:bg-slate-800 text-white shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-105 border border-slate-700 flex items-center justify-center group"
          >
            <svg className="w-10 h-10 transform -rotate-90 absolute">
              <circle
                cx="20"
                cy="20"
                r={radius}
                className="text-slate-800 dark:text-slate-700"
                strokeWidth="3"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="20"
                cy="20"
                r={radius}
                className={`${active ? 'text-indigo-400' : 'text-slate-500'} transition-all duration-500`}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {active ? (
                <span className="font-mono text-[9px] font-bold text-indigo-300">
                  {Math.max(0, durationMinutes - Math.floor(seconds / 60))}m
                </span>
              ) : (
                <i className="fa-solid fa-stopwatch text-xs text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('student_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.email || parsed.name)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse student_user from localStorage', e);
    }
    return null;
  });

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('is_guest') === 'true';
  });

  const [authInitialized, setAuthInitialized] = useState<boolean>(() => {
    // If we already have a session in localStorage, immediately allow rendering without flashing LandingPage
    return !!localStorage.getItem('student_user') || localStorage.getItem('is_guest') === 'true';
  });

  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const validPages: Page[] = ['dashboard', 'study', 'habits', 'resources', 'todo', 'notes', 'analytics', 'profile', 'settings', 'others', 'interview', 'passwords'];
    const saved = localStorage.getItem('current_page') as Page;
    if (saved && validPages.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });

  // Keep currentPage synced to localStorage so browser refresh stays on the same page
  useEffect(() => {
    if (currentPage) {
      localStorage.setItem('current_page', currentPage);
    }
  }, [currentPage]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme_preference') || localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as 'light' | 'dark' | 'system';
    }
    return 'system';
  });
  const [darkMode, setDarkMode] = useState(false);
  const [timerHidden, setTimerHidden] = useState(() => {
    return localStorage.getItem('global_timer_hidden') === 'true';
  });

  useEffect(() => {
    const handleTimerVisibility = () => {
      setTimerHidden(localStorage.getItem('global_timer_hidden') === 'true');
    };
    window.addEventListener('storage', handleTimerVisibility);
    window.addEventListener('timer-visibility-changed', handleTimerVisibility);
    return () => {
      window.removeEventListener('storage', handleTimerVisibility);
      window.removeEventListener('timer-visibility-changed', handleTimerVisibility);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const cloudProfile = await getUserDataFromFirestore(firebaseUser.email || '');
          const storedUser = localStorage.getItem('student_user');
          let localObj: User | null = null;
          if (storedUser) {
            try {
              localObj = JSON.parse(storedUser);
            } catch (e) {}
          }

          const userObj: User = cloudProfile || (localObj?.email === firebaseUser.email ? localObj : null) || {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
            email: firebaseUser.email || 'student@studydash.com',
            university: 'Tech University',
            course: 'Computer Science',
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'Student')}&background=171717&color=fff`,
            isGoogle: !!firebaseUser.providerData?.some(p => p.providerId === 'google.com'),
          };
          setUser(userObj);
          setIsGuest(false);
          localStorage.setItem('student_user', JSON.stringify(userObj));
          localStorage.removeItem('is_guest');
        } else {
          // If Firebase has no active firebaseUser, check if there is a valid stored user in localStorage
          // (e.g. Email/Password sign-in, local fallback, or cached session)
          const storedUser = localStorage.getItem('student_user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              if (parsed && (parsed.email || parsed.name)) {
                setUser(parsed);
                setIsGuest(false);
              } else {
                setUser(null);
              }
            } catch (e) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth state check error:', err);
      } finally {
        setAuthInitialized(true);
      }
    });

    const timeout = setTimeout(() => {
      setAuthInitialized(true);
    }, 1200);

    // Resize Handler
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
        setIsMobile(true);
      } else {
        setSidebarOpen(true);
        setIsMobile(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (themePreference === 'dark') {
        isDark = true;
      } else if (themePreference === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (themePreference === 'system') {
        const isDark = e.matches;
        setDarkMode(isDark);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [themePreference]);

  const setTheme = (pref: 'light' | 'dark' | 'system') => {
    setThemePreference(pref);
    localStorage.setItem('theme_preference', pref);
    localStorage.setItem('theme', pref);
  };

  const toggleDarkMode = () => {
    if (themePreference === 'light') {
      setTheme('dark');
    } else if (themePreference === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('student_user', JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    localStorage.removeItem('student_user');
    localStorage.removeItem('is_guest');
    localStorage.removeItem('current_page');
    setUser(null);
    setIsGuest(false);
    setCurrentPage('dashboard');
  };

  // Guard for guest user attempting write / modify actions
  const requireAuth = (actionName = 'perform this action') => {
    if (isGuest) {
      setAuthModalMessage(`Please sign in to ${actionName} and save your data.`);
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  // If neither logged in nor guest, show Landing Page or initial loader
  if (!user && !isGuest) {
    if (!authInitialized) {
      return (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-xl shadow-indigo-500/30 animate-pulse mb-4">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tracking-widest uppercase font-semibold">Loading StudyDash...</p>
        </div>
      );
    }

    if (isLoadingExplore) {
      return (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-xl shadow-indigo-500/30 animate-pulse mb-6">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white font-serif mb-2">Preparing StudyDash</h2>
          <p className="text-xs text-slate-500 tracking-widest uppercase font-semibold mb-6">Loading student workspace modules...</p>
          <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 animate-[indeterminate_1s_infinite_linear]" style={{ width: '60%' }}></div>
          </div>
        </div>
      );
    }

    return (
      <>
        <LandingPage 
          onExplore={() => {
            setIsLoadingExplore(true);
            setTimeout(() => {
              setIsLoadingExplore(false);
              setIsGuest(true);
              localStorage.setItem('is_guest', 'true');
            }, 600);
          }}
          onOpenAuth={() => setShowAuthModal(true)}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={(u) => {
            setUser(u);
            setIsGuest(false);
            localStorage.setItem('student_user', JSON.stringify(u));
            localStorage.removeItem('is_guest');
            setShowAuthModal(false);
          }}
          message={authModalMessage}
        />
      </>
    );
  }

  const activeUser = user || {
    name: 'Guest User',
    email: 'guest@studydash.com',
    avatar: 'https://ui-avatars.com/api/?name=Guest+User&background=64748b&color=fff',
    university: 'Guest Mode',
    course: 'Explorer'
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={activeUser} onChangePage={setCurrentPage} />;
      case 'study': return <StudyTracker />;
      case 'habits': return <HabitTracker />;
      case 'resources': return <Resources />;
      case 'todo': return <Todo />;
      case 'notes': return <Notes />;
      case 'analytics': return <Analytics />;
      case 'profile': return <Profile user={activeUser} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />;
      case 'others': return <Others />;
      case 'settings': return <Settings darkMode={darkMode} toggleDarkMode={toggleDarkMode} themePreference={themePreference} setTheme={setTheme} user={activeUser} onLogout={handleLogout} />;
      case 'interview': return <InterviewPrep />;
      case 'passwords': return <PasswordManager user={activeUser} />;
      default: return <Dashboard user={activeUser} onChangePage={setCurrentPage} />;
    }
  };

  const NavItem = ({ page, icon, label }: { page: Page; icon: string; label: string }) => (
    <button
      onClick={() => {
        setCurrentPage(page);
        if (isMobile) setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
        currentPage === page 
          ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-500/20' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
      }`}
    >
      <i className={`fa-solid ${icon} w-4 text-center text-xs ${currentPage === page ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}></i>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800/95 border-r border-slate-200/80 dark:border-slate-800 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 shrink-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Header */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-indigo-500/20">
              <i className="fa-solid fa-graduation-cap text-base"></i>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                StudyDash
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">Student Workspace</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3.5 space-y-1 py-4">
            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Overview</p>
            <NavItem page="dashboard" icon="fa-chart-simple" label="Dashboard" />
            <NavItem page="profile" icon="fa-user" label="Profile" />
            <NavItem page="analytics" icon="fa-chart-pie" label="Analytics" />
            
            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5">Productivity</p>
            <NavItem page="study" icon="fa-stopwatch" label="Study Tracker" />
            <NavItem page="habits" icon="fa-fire" label="Habit Tracker" />
            <NavItem page="todo" icon="fa-check-double" label="Todo List" />
            <NavItem page="interview" icon="fa-graduation-cap" label="Interview Prep" />
            
            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5">Library</p>
            <NavItem page="resources" icon="fa-folder-open" label="Resources" />
            <NavItem page="notes" icon="fa-book-open" label="Notes" />

            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5">Security</p>
            <NavItem page="passwords" icon="fa-shield-halved" label="Password Manager" />

            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-5">System</p>
            <NavItem page="others" icon="fa-toolbox" label="Tools" />
            <NavItem page="settings" icon="fa-gear" label="Settings" />
          </div>

          {/* User Profile / Guest Footer in Sidebar */}
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            {isGuest ? (
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-center">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">Browsing as Guest</p>
                <button
                  onClick={() => {
                    setAuthModalMessage('Sign in to unlock full cloud saving and profile sync.');
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Sign In / Register
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0" onClick={() => setCurrentPage('profile')} role="button">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                    {activeUser.avatar ? <img src={activeUser.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : activeUser.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{activeUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{activeUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Sign Out"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Guest Banner if applicable */}
        {isGuest && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-2 font-medium">
              <i className="fa-solid fa-circle-info"></i>
              <span>You are exploring StudyDash in guest mode. Data changes require signing in.</span>
            </div>
            <button
              onClick={() => {
                setAuthModalMessage('Sign in to save your progress permanently.');
                setShowAuthModal(true);
              }}
              className="px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-lg transition-colors shadow-2xs"
            >
              Sign In Now
            </button>
          </div>
        )}

        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
            >
              <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold capitalize text-sm">{currentPage}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isGuest && (
              <button
                onClick={() => {
                  setAuthModalMessage('Sign in to save tasks and notes.');
                  setShowAuthModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Sign In
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
              title={`Theme: ${themePreference.charAt(0).toUpperCase() + themePreference.slice(1)} (Click to switch)`}
            >
              <i className={`fa-solid ${
                themePreference === 'light' ? 'fa-sun text-amber-500' :
                themePreference === 'dark' ? 'fa-moon text-indigo-400' :
                'fa-desktop text-slate-500 dark:text-slate-400'
              } text-sm`}></i>
            </button>

            <button
              onClick={() => setCurrentPage('others')}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors relative"
              title="Schedule & Events"
            >
              <i className="fa-regular fa-bell text-sm"></i>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
            </button>

            {!isGuest && (
              <button
                onClick={() => setCurrentPage('profile')}
                className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:opacity-90 transition-opacity ml-1"
              >
                {activeUser.avatar ? <img src={activeUser.avatar} alt="User" className="w-full h-full rounded-full object-cover" /> : activeUser.name[0]}
              </button>
            )}
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-slate-50 dark:bg-slate-900">
          <div key={currentPage} className="max-w-7xl mx-auto animate-page-enter">
            {renderPage()}
          </div>
        </div>

        {/* Global Floating Timer */}
        {!timerHidden && <GlobalTimer />}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={(u) => {
          setUser(u);
          setIsGuest(false);
          localStorage.setItem('student_user', JSON.stringify(u));
          localStorage.removeItem('is_guest');
          setShowAuthModal(false);
        }}
        message={authModalMessage}
      />
    </div>
  );
};

export default App;
