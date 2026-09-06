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
import { loadUserDataForUser, clearUserLocalData } from './src/lib/dbSync';
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

// Timer Color Definitions & Configurations
export type TimerColorKey = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';

export interface TimerColorOption {
  key: TimerColorKey;
  label: string;
  name: string;
  hex: string;
  strokeClass: string;
  bgClass: string;
  textClass: string;
  badgeBg: string;
  badgeText: string;
}

export const TIMER_COLORS: Record<TimerColorKey, TimerColorOption> = {
  indigo: {
    key: 'indigo',
    label: 'Indigo (Default)',
    name: 'Indigo',
    hex: '#6366f1',
    strokeClass: 'text-indigo-500 dark:text-indigo-400',
    bgClass: 'bg-indigo-600 hover:bg-indigo-700',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300'
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald (Study / Focus)',
    name: 'Emerald',
    hex: '#10b981',
    strokeClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-600 hover:bg-emerald-700',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300'
  },
  rose: {
    key: 'rose',
    label: 'Rose (Urgent / Exam)',
    name: 'Rose',
    hex: '#f43f5e',
    strokeClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-600 hover:bg-rose-700',
    textClass: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300'
  },
  amber: {
    key: 'amber',
    label: 'Amber (Review / Reading)',
    name: 'Amber',
    hex: '#f59e0b',
    strokeClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-600 hover:bg-amber-700',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300'
  },
  sky: {
    key: 'sky',
    label: 'Sky (Code / Project)',
    name: 'Sky',
    hex: '#0ea5e9',
    strokeClass: 'text-sky-500 dark:text-sky-400',
    bgClass: 'bg-sky-600 hover:bg-sky-700',
    textClass: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-300'
  },
  violet: {
    key: 'violet',
    label: 'Violet (Creative / Writing)',
    name: 'Violet',
    hex: '#8b5cf6',
    strokeClass: 'text-violet-500 dark:text-violet-400',
    bgClass: 'bg-violet-600 hover:bg-violet-700',
    textClass: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-100 dark:bg-violet-950/60',
    badgeText: 'text-violet-700 dark:text-violet-300'
  }
};

export const DEFAULT_TAG_COLORS: Record<string, TimerColorKey> = {
  'Study': 'emerald',
  'Deep Work': 'indigo',
  'Urgent': 'rose',
  'Reading': 'amber',
  'Coding': 'sky',
  'Creative': 'violet'
};

const PRESET_TAGS = [
  { name: 'Study', icon: 'fa-graduation-cap' },
  { name: 'Deep Work', icon: 'fa-brain' },
  { name: 'Urgent', icon: 'fa-fire' },
  { name: 'Reading', icon: 'fa-book-open' },
  { name: 'Coding', icon: 'fa-laptop-code' },
  { name: 'Creative', icon: 'fa-pen-nib' }
];

// Global Timer Component (Compact, Draggable, Circular Progress)
const GlobalTimer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('global_timer_duration');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Focus Task Tag & Progress Ring Color States
  const [focusTag, setFocusTag] = useState<string>(() => {
    return localStorage.getItem('global_timer_tag') || 'Study';
  });

  const [tagColors, setTagColors] = useState<Record<string, TimerColorKey>>(() => {
    try {
      const saved = localStorage.getItem('global_timer_tag_colors');
      return saved ? { ...DEFAULT_TAG_COLORS, ...JSON.parse(saved) } : DEFAULT_TAG_COLORS;
    } catch {
      return DEFAULT_TAG_COLORS;
    }
  });

  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTag, setShowCustomTag] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);

  // Compute active color from current focus task tag
  const activeColorKey: TimerColorKey = tagColors[focusTag] || 'indigo';
  const currentColor = TIMER_COLORS[activeColorKey] || TIMER_COLORS.indigo;

  // Load contextual task suggestions from Todos & Subjects
  useEffect(() => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos') || '[]');
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      const pendingTodos = todos.filter((t: any) => !t.completed).map((t: any) => t.text).slice(0, 3);
      const subjectNames = subjects.map((s: any) => s.name).slice(0, 3);
      const combined = Array.from(new Set([...subjectNames, ...pendingTodos])).filter(Boolean);
      setTaskSuggestions(combined);
    } catch {
      // Ignore reading error
    }
  }, [isOpen]);

  // Sync state across storage events (e.g. from Settings)
  useEffect(() => {
    const syncFromStorage = () => {
      const savedTag = localStorage.getItem('global_timer_tag');
      if (savedTag) setFocusTag(savedTag);
      try {
        const savedColors = localStorage.getItem('global_timer_tag_colors');
        if (savedColors) setTagColors({ ...DEFAULT_TAG_COLORS, ...JSON.parse(savedColors) });
      } catch {}
    };
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const handleSelectTag = (tag: string) => {
    setFocusTag(tag);
    localStorage.setItem('global_timer_tag', tag);
    if (!tagColors[tag]) {
      const defaultColor = DEFAULT_TAG_COLORS[tag] || 'indigo';
      const updated = { ...tagColors, [tag]: defaultColor };
      setTagColors(updated);
      localStorage.setItem('global_timer_tag_colors', JSON.stringify(updated));
    }
    window.dispatchEvent(new Event('storage'));
  };

  const handleSelectColor = (colorKey: TimerColorKey) => {
    const updated = { ...tagColors, [focusTag]: colorKey };
    setTagColors(updated);
    localStorage.setItem('global_timer_tag_colors', JSON.stringify(updated));
    localStorage.setItem('global_timer_color', colorKey);
    window.dispatchEvent(new Event('storage'));
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    const cleanTag = customTagInput.trim();
    handleSelectTag(cleanTag);
    setCustomTagInput('');
    setShowCustomTag(false);
  };

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
            className="w-96 max-w-[92vw] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 text-slate-800 dark:text-white animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white shadow-xs transition-colors"
                  style={{ backgroundColor: currentColor.hex }}
                >
                  <i className="fa-solid fa-stopwatch"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Focus Timer</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span 
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{ backgroundColor: currentColor.hex }}
                    ></span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {focusTag} • <span style={{ color: currentColor.hex }} className="font-bold">{currentColor.name} Ring</span>
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* SETTING: Focus Task Tag & Progress Indicator Color */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-tag text-[10px]"></i>
                  <span>Focus Task Tag & Ring Color</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomTag(!showCustomTag)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {showCustomTag ? 'Close' : '+ Custom Tag'}
                </button>
              </div>

              {/* Preset Tags */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((item) => {
                  const tagColorKey = tagColors[item.name] || 'indigo';
                  const tagColorConfig = TIMER_COLORS[tagColorKey] || TIMER_COLORS.indigo;
                  const isSelected = focusTag === item.name;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectTag(item.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-slate-800 dark:border-white shadow-xs font-bold text-white'
                          : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                      style={isSelected ? { backgroundColor: tagColorConfig.hex } : undefined}
                    >
                      <i className={`fa-solid ${item.icon} text-[10px]`}></i>
                      <span>{item.name}</span>
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: isSelected ? '#ffffff' : tagColorConfig.hex }}
                      ></span>
                    </button>
                  );
                })}
              </div>

              {/* Suggestions from User's Todos & Subjects if available */}
              {taskSuggestions.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mb-1">
                    Or select from active tasks/subjects:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {taskSuggestions.map((tName) => {
                      const isSelected = focusTag === tName;
                      return (
                        <button
                          key={tName}
                          type="button"
                          onClick={() => handleSelectTag(tName)}
                          className={`text-[10px] px-2 py-0.5 rounded-md truncate max-w-[150px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                          title={tName}
                        >
                          {tName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Tag Input */}
              {showCustomTag && (
                <form onSubmit={handleAddCustomTag} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="Enter task tag (e.g. Physics Exam)..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Set
                  </button>
                </form>
              )}

              {/* Color Swatch Selector for the current tag */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Indicator Ring Color for <span className="font-extrabold" style={{ color: currentColor.hex }}>"{focusTag}"</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: currentColor.hex }}>
                    {currentColor.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {(Object.keys(TIMER_COLORS) as TimerColorKey[]).map((cKey) => {
                    const cOpt = TIMER_COLORS[cKey];
                    const isSelected = activeColorKey === cKey;

                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => handleSelectColor(cKey)}
                        className={`h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-105 shadow-xs' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: cOpt.hex }}
                        title={`${cOpt.label} for ${focusTag}`}
                      >
                        {isSelected && (
                          <i className="fa-solid fa-check text-white text-[11px] drop-shadow-xs"></i>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Duration Selector */}
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
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      durationMinutes === m 
                        ? 'text-white shadow-sm font-extrabold' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                    style={durationMinutes === m ? { backgroundColor: currentColor.hex } : undefined}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Countdown Display with Dynamic Color Ring Tint */}
            <div 
              className="flex flex-col items-center justify-center py-4 rounded-xl mb-4 border transition-colors bg-slate-50 dark:bg-slate-900/50"
              style={{
                borderColor: active ? `${currentColor.hex}50` : undefined,
                backgroundColor: active ? `${currentColor.hex}08` : undefined
              }}
            >
              <span 
                className="font-mono font-bold text-3xl tracking-tight transition-colors mb-1"
                style={{ color: active ? currentColor.hex : undefined }}
              >
                {formatTime(seconds)}
              </span>
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full transition-colors" 
                  style={{ backgroundColor: currentColor.hex }}
                ></span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  {active ? (seconds >= totalSeconds ? 'Completed!' : `${Math.round(progress * 100)}% done • ${focusTag}`) : `Ready to focus on ${focusTag}`}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {active ? (
                <button
                  onClick={stopTimer}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-stop"></i> Stop & Reset
                </button>
              ) : (
                <button
                  onClick={() => startTimer()}
                  className="flex-1 py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                  style={{ backgroundColor: currentColor.hex }}
                >
                  <i className="fa-solid fa-play"></i> Start {focusTag} Focus
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
          title={`Focus Timer: ${focusTag} (${currentColor.name} indicator) • Drag to move, click to configure`}
        >
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-11 h-11 rounded-full bg-slate-900 dark:bg-slate-800 text-white shadow-xl transition-all transform hover:scale-105 border border-slate-700 flex items-center justify-center group cursor-pointer"
            style={{
              boxShadow: active ? `0 10px 25px -5px ${currentColor.hex}50` : undefined
            }}
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
                stroke={active ? currentColor.hex : '#64748b'}
                className="transition-all duration-500"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {active ? (
                <span 
                  className="font-mono text-[9px] font-bold"
                  style={{ color: currentColor.hex }}
                >
                  {Math.max(0, durationMinutes - Math.floor(seconds / 60))}m
                </span>
              ) : (
                <i 
                  className="fa-solid fa-stopwatch text-xs transition-colors"
                  style={{ color: currentColor.hex }}
                ></i>
              )}
            </div>

            {/* Current Tag indicator dot */}
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 dark:border-slate-800 transition-colors shadow-xs"
              style={{ backgroundColor: currentColor.hex }}
              title={`Focus Tag: ${focusTag} (${currentColor.name})`}
            ></div>
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
          await loadUserDataForUser(userObj.email);
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
    clearUserLocalData();
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
          onLogin={async (u) => {
            setUser(u);
            setIsGuest(false);
            localStorage.setItem('student_user', JSON.stringify(u));
            localStorage.removeItem('is_guest');
            await loadUserDataForUser(u.email);
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
        onLogin={async (u) => {
          setUser(u);
          setIsGuest(false);
          localStorage.setItem('student_user', JSON.stringify(u));
          localStorage.removeItem('is_guest');
          await loadUserDataForUser(u.email);
          setShowAuthModal(false);
        }}
        message={authModalMessage}
      />
    </div>
  );
};

export default App;
