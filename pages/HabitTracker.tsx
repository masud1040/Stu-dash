import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

// --- Types ---
interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string; // Tailind bg class, e.g. 'bg-indigo-500'
  colorHex?: string; // Color code for borders/glows
  category?: string;
  streak: number;
  completedDates: string[]; // ISO Date strings (YYYY-MM-DD)
}

// --- Habit Motivation Quotes ---
const HABIT_QUOTES = [
  "Motivation is what gets you started. Habit is what keeps you going.",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  "Your net worth is determined by what remains after your bad habits are subtracted.",
  "Chains of habit are too light to be felt until they are too heavy to be broken.",
  "Successful people are simply those with successful habits.",
  "It's not what we do once in a while that shapes our lives. It's what we do consistently.",
  "First we make our habits, then our habits make us.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements are the key to staggering long-term results.",
  "The secret of your future is hidden in your daily routine.",
  "You'll never change your life until you change something you do daily.",
  "Consistency is the bridge between goals and accomplishment."
];

// Color palette options
const COLOR_OPTIONS = [
  { name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', glow: 'shadow-indigo-500/30', hex: '#6366f1' },
  { name: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-500/30', hex: '#10b981' },
  { name: 'Rose', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', glow: 'shadow-rose-500/30', hex: '#f43f5e' },
  { name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', glow: 'shadow-amber-500/30', hex: '#f59e0b' },
  { name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', glow: 'shadow-purple-500/30', hex: '#a855f7' },
  { name: 'Sky', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', glow: 'shadow-sky-500/30', hex: '#0ea5e9' },
];

const ICON_OPTIONS = [
  'fa-star', 'fa-book-open', 'fa-dumbbell', 'fa-glass-water', 
  'fa-person-running', 'fa-bed', 'fa-utensils', 'fa-brain',
  'fa-code', 'fa-leaf', 'fa-pen-nib', 'fa-[#000]'
];

const HabitTracker: React.FC = () => {
  // --- State ---
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('fa-star');
  const [newHabitColorObj, setNewHabitColorObj] = useState(COLOR_OPTIONS[0]);
  const [newHabitCategory, setNewHabitCategory] = useState('Health');
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // 'list' = Weekly View, 'grid' = Monthly Matrix
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week...
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Delete confirmation modal state
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);

  // Refs for Charts (PDF capture)
  const weeklyChartRef = useRef<any>(null);
  const trendChartRef = useRef<any>(null);

  // Quote Rotation State
  const [quoteIndex, setQuoteIndex] = useState(0);

  // --- Initial Load & Storage ---
  useEffect(() => {
    const saved = localStorage.getItem('habits');
    if (saved) {
      try {
        setHabits(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading habits", e);
      }
    } else {
      // Default sample habits
      const defaultHabits: Habit[] = [
        {
          id: '1',
          name: 'পানি পান করা (৩ লিটার)',
          icon: 'fa-glass-water',
          color: 'bg-sky-500',
          colorHex: '#0ea5e9',
          category: 'Health',
          streak: 4,
          completedDates: [getTodayStr(), getPastDateStr(1), getPastDateStr(2), getPastDateStr(3)]
        },
        {
          id: '2',
          name: 'ব্যায়াম ও স্ট্রেচিং',
          icon: 'fa-dumbbell',
          color: 'bg-emerald-500',
          colorHex: '#10b981',
          category: 'Fitness',
          streak: 2,
          completedDates: [getTodayStr(), getPastDateStr(1)]
        },
        {
          id: '3',
          name: 'বই পড়া (৩০ মিনিট)',
          icon: 'fa-book-open',
          color: 'bg-indigo-500',
          colorHex: '#6366f1',
          category: 'Mindset',
          streak: 3,
          completedDates: [getTodayStr(), getPastDateStr(1), getPastDateStr(2)]
        }
      ];
      setHabits(defaultHabits);
      localStorage.setItem('habits', JSON.stringify(defaultHabits));
    }
  }, []);

  // Rotation Quote timer
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % HABIT_QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // --- Helper Functions ---
  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  function getPastDateStr(daysAgo: number) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  const saveHabits = (updated: Habit[]) => {
    setHabits(updated);
    localStorage.setItem('habits', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  // Compute 7 days for the selected week offset
  const getWeekDates = (offset = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + (offset * 7));

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const isToday = dateStr === getTodayStr();
      weekDays.push({
        dateObj: d,
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue...
        dayNum: d.getDate(),
        isToday
      });
    }
    return weekDays;
  };

  const currentWeekDates = getWeekDates(weekOffset);

  // Calculate Streak dynamically based on dates
  const calculateStreak = (completedDates: string[]) => {
    if (!completedDates || completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    const today = getTodayStr();
    const yesterday = getPastDateStr(1);

    if (!sorted.includes(today) && !sorted.includes(yesterday)) {
      return 0; // Streak broken if neither today nor yesterday is completed
    }

    let streak = 0;
    let checkDate = new Date();

    // If today is not completed yet, start checking from yesterday
    if (!sorted.includes(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, '0')}-${checkDate.getDate().toString().padStart(2, '0')}`;
      if (sorted.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Toggle habit completed for a specific date
  const toggleHabit = (id: string, dateStr: string) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        const isAlreadyDone = h.completedDates.includes(dateStr);
        const newCompleted = isAlreadyDone
          ? h.completedDates.filter(d => d !== dateStr)
          : [...h.completedDates, dateStr];
        
        const newStreak = calculateStreak(newCompleted);

        return {
          ...h,
          completedDates: newCompleted,
          streak: newStreak
        };
      }
      return h;
    });
    saveHabits(updated);
  };

  // --- Habit CRUD Actions ---
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      icon: newHabitIcon,
      color: newHabitColorObj.bg,
      colorHex: newHabitColorObj.hex,
      category: newHabitCategory,
      streak: 0,
      completedDates: []
    };

    saveHabits([newHabit, ...habits]);
    setNewHabitName('');
    setShowAddModal(false);
  };

  const confirmDelete = () => {
    if (!habitToDelete) return;
    saveHabits(habits.filter(h => h.id !== habitToDelete));
    setHabitToDelete(null);
  };

  // --- Statistics Calculation ---
  const calculateStats = () => {
    const today = getTodayStr();
    const currentMonthPrefix = today.substring(0, 7); // YYYY-MM

    const longestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    
    // Weekly completions (for current week)
    let weeklyCompletions = 0;
    const thisWeekDates = getWeekDates(0).map(d => d.dateStr);
    habits.forEach(h => {
      h.completedDates.forEach(d => {
        if (thisWeekDates.includes(d)) weeklyCompletions++;
      });
    });

    // Monthly completions
    let monthlyCompletions = 0;
    habits.forEach(h => {
      monthlyCompletions += h.completedDates.filter(d => d.startsWith(currentMonthPrefix)).length;
    });

    const daysInMonthSoFar = new Date().getDate();
    const totalPossibleThisMonth = habits.length * daysInMonthSoFar;
    const completionRate = totalPossibleThisMonth > 0 
      ? Math.round((monthlyCompletions / totalPossibleThisMonth) * 100) 
      : 0;

    return { longestStreak, weeklyCompletions, monthlyCompletions, completionRate };
  };

  const stats = calculateStats();

  // --- Chart Data Generators ---
  const getWeeklyChartData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const thisWeekDates = getWeekDates(0);

    thisWeekDates.forEach((wDay, idx) => {
      habits.forEach(h => {
        if (h.completedDates.includes(wDay.dateStr)) {
          counts[idx]++;
        }
      });
    });

    return {
      labels: days,
      datasets: [{
        label: 'Habits Completed',
        data: counts,
        backgroundColor: '#6366f1',
        borderRadius: 8,
        barThickness: 24
      }]
    };
  };

  const getTrendChartData = () => {
    const labels = [];
    const data = [];
    for (let i = 14; i >= 0; i--) {
      const dStr = getPastDateStr(i);
      labels.push(dStr.slice(8)); // day string e.g. "29"
      let count = 0;
      habits.forEach(h => {
        if (h.completedDates.includes(dStr)) count++;
      });
      data.push(count);
    }

    return {
      labels,
      datasets: [{
        label: 'Daily Completions',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#10b981'
      }]
    };
  };

  // --- PDF Export ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header Banner
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, pageWidth, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("HABIT TRACKER PROGRESS REPORT", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, pageWidth / 2, 28, { align: 'center' });

    // Summary Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Performance Summary", 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [['Total Habits', 'Longest Streak', 'Weekly Completions', 'Monthly Completion Rate']],
      body: [[
        `${habits.length}`,
        `${stats.longestStreak} Days 🔥`,
        `${stats.weeklyCompletions} Completed`,
        `${stats.completionRate}%`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { halign: 'center', fontSize: 10 }
    });

    // Detailed Habits Table
    const lastY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Habit Breakdown", 14, lastY);

    const rows = habits.map(h => [
      h.name,
      h.category || 'General',
      `${h.streak} Days`,
      `${h.completedDates.length} Days`,
      h.completedDates.includes(getTodayStr()) ? 'Completed Today' : 'Pending'
    ]);

    autoTable(doc, {
      startY: lastY + 5,
      head: [['Habit Name', 'Category', 'Current Streak', 'Total Days Done', 'Status Today']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | Student Life Dashboard - Habit Report`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save("habit-tracker-report.pdf");
  };

  // --- Monthly Matrix Calendar Renderer ---
  const renderMonthlyMatrix = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="space-y-6">
        {/* Month selector header */}
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">
            {currentCalendarDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })} Matrix Grid
          </h3>
          <button 
            onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <i className="fa-solid fa-seedling text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No habits available to render matrix grid.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[700px] space-y-4">
              {habits.map(habit => {
                const habitColorObj = COLOR_OPTIONS.find(c => c.bg === habit.color) || COLOR_OPTIONS[0];

                return (
                  <div key={habit.id} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${habit.color} text-white flex items-center justify-center text-sm shadow-2xs`}>
                          <i className={`fa-solid ${habit.icon}`}></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{habit.name}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{habit.category || 'General'}</span>
                            <span>•</span>
                            <span className="text-amber-500 font-semibold flex items-center gap-1">
                              <i className="fa-solid fa-fire"></i> {habit.streak} Day Streak
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Month Completion Ratio */}
                      <div className="text-right">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {habit.completedDates.filter(d => d.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)).length} / {daysInMonth} Days
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${habit.color}`} 
                            style={{ 
                              width: `${Math.round((habit.completedDates.filter(d => d.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)).length / daysInMonth) * 100)}%` 
                            }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Days Squares Grid */}
                    <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-31 gap-1.5 pt-1">
                      {daysArray.map(dayNum => {
                        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                        const isDone = habit.completedDates.includes(dateStr);
                        const isToday = dateStr === getTodayStr();

                        return (
                          <button
                            key={dayNum}
                            onClick={() => toggleHabit(habit.id, dateStr)}
                            title={`${dateStr} - ${isDone ? 'Completed' : 'Not completed'}`}
                            className={`h-8 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center transition-all duration-200 ${
                              isToday ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800' : ''
                            } ${
                              isDone 
                                ? `${habit.color} text-white shadow-2xs scale-100` 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{dayNum}</span>
                            {isDone && <i className="fa-solid fa-check text-[8px] mt-0.5"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <i className="fa-solid fa-calendar-check text-indigo-600 dark:text-indigo-400"></i>
            Habit Tracker Studio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Track daily habits, build long streaks, and analyze your growth.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Habit</span>
          </button>

          <button 
            onClick={exportPDF}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 shadow-2xs"
          >
            <i className="fa-solid fa-file-pdf text-indigo-600 dark:text-indigo-400"></i>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              {stats.longestStreak} <span className="text-base text-amber-500">Days</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Longest Streak</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
            <i className="fa-solid fa-fire"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.completionRate}%</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Monthly Completion Rate</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg">
            <i className="fa-solid fa-chart-line"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.weeklyCompletions}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Weekly Completions</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">
            <i className="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.monthlyCompletions}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Monthly Total</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg">
            <i className="fa-regular fa-calendar-days"></i>
          </div>
        </div>
      </div>

      {/* Main Habits View Controls & Content */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        
        {/* View Switcher Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Habit Tracker</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any day box to toggle completed status</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: List (Weekly) vs Grid (Monthly Matrix) */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>Weekly List</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-table-cells"></i>
                <span>Monthly Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Weekly List View */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* Week Navigation bar */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="px-3 py-1 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i> Previous Week
              </button>

              <div className="text-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentWeekDates[0].dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {currentWeekDates[6].dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {weekOffset !== 0 && (
                  <button 
                    onClick={() => setWeekOffset(0)}
                    className="ml-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    (Reset to Current Week)
                  </button>
                )}
              </div>

              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="px-3 py-1 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                Next Week <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>

            {/* List Header Row for Days */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 pb-2 border-b border-slate-200 dark:border-slate-800 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="sm:col-span-5">Habit Details</div>
              <div className="sm:col-span-7 grid grid-cols-7 text-center">
                {currentWeekDates.map((wDay, idx) => (
                  <div key={idx} className={`flex flex-col items-center py-1 rounded-lg ${wDay.isToday ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                    <span className="text-[10px]">{wDay.dayName}</span>
                    <span className="text-xs">{wDay.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit Items */}
            {habits.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <i className="fa-solid fa-seedling text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
                <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">No habits created yet!</p>
                <p className="text-xs text-slate-400 mt-1">Click "+ Add Habit" above to start your daily routine.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {habits.map(habit => {
                  // Compute week completion count for this habit
                  const weekDoneCount = currentWeekDates.filter(w => habit.completedDates.includes(w.dateStr)).length;
                  const weekPercent = Math.round((weekDoneCount / 7) * 100);

                  return (
                    <div 
                      key={habit.id} 
                      className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 hover:border-indigo-500/40 transition-all duration-200 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center"
                    >
                      {/* Left Side: Habit Info */}
                      <div className="sm:col-span-5 w-full flex items-center justify-between">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-11 h-11 rounded-xl ${habit.color} text-white flex items-center justify-center text-lg shadow-2xs shrink-0`}>
                            <i className={`fa-solid ${habit.icon}`}></i>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{habit.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                                {habit.category || 'General'}
                              </span>
                              <span className="text-amber-500 font-bold flex items-center gap-1">
                                <i className="fa-solid fa-fire text-xs"></i> {habit.streak} Days
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <button 
                          onClick={() => setHabitToDelete(habit.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-2"
                          title="Delete Habit"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>

                      {/* Right Side: 7 Interactive Day Checkboxes */}
                      <div className="sm:col-span-7 w-full grid grid-cols-7 gap-2">
                        {currentWeekDates.map((wDay, idx) => {
                          const isCompleted = habit.completedDates.includes(wDay.dateStr);

                          return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                              <span className="sm:hidden text-[9px] font-bold text-slate-400">{wDay.dayName} {wDay.dayNum}</span>
                              <button
                                type="button"
                                onClick={() => toggleHabit(habit.id, wDay.dateStr)}
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200 transform active:scale-90 font-bold text-sm ${
                                  isCompleted 
                                    ? `${habit.color} text-white shadow-md shadow-indigo-500/20 scale-105` 
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-indigo-400 hover:text-indigo-400'
                                } ${wDay.isToday && !isCompleted ? 'ring-2 ring-indigo-500/50' : ''}`}
                              >
                                {isCompleted ? (
                                  <i className="fa-solid fa-check text-base animate-scale-up"></i>
                                ) : (
                                  <span className="text-xs font-semibold opacity-40">{wDay.dayNum}</span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Monthly Matrix View */}
        {viewMode === 'grid' && renderMonthlyMatrix()}

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Completion Breakdown */}
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-column text-indigo-600 dark:text-indigo-400"></i>
            Weekly Activity Analysis
          </h3>
          <div className="h-56">
            <Bar 
              ref={weeklyChartRef}
              data={getWeeklyChartData()} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                  x: { grid: { display: false } }, 
                  y: { beginAtZero: true, ticks: { precision: 0 } } 
                }
              }} 
            />
          </div>
        </div>

        {/* 15-Day Trend Line */}
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
            <i className="fa-solid fa-arrow-trend-up text-emerald-600 dark:text-emerald-400"></i>
            15-Day Habit Trend
          </h3>
          <div className="h-56">
            <Line 
              ref={trendChartRef}
              data={getTrendChartData()} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                  x: { grid: { display: false } }, 
                  y: { beginAtZero: true, ticks: { precision: 0 } } 
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Motivation Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto">
          <i className="fa-solid fa-quote-left text-2xl opacity-40 mb-2 block"></i>
          <p className="text-base sm:text-lg font-serif italic leading-relaxed">
            "{HABIT_QUOTES[quoteIndex]}"
          </p>
          <div className="flex justify-center gap-1.5 mt-4">
            {HABIT_QUOTES.map((_, idx) => (
              <span 
                key={idx} 
                className={`h-1.5 rounded-full transition-all ${idx === quoteIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Add Habit */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-plus text-indigo-600 dark:text-indigo-400"></i>
                Create New Habit
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Habit Name *</label>
                <input 
                  type="text"
                  required
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g., Read 20 pages, Drink water..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="Health">Health & Wellness</option>
                  <option value="Fitness">Fitness & Exercise</option>
                  <option value="Mindset">Mindset & Mindfulness</option>
                  <option value="Study">Study & Career</option>
                  <option value="Personal">Personal Routine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Choose Icon</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewHabitIcon(icon)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        newHabitIcon === icon
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <i className={`fa-solid ${icon}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Color Theme</label>
                <div className="flex gap-3">
                  {COLOR_OPTIONS.map(col => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setNewHabitColorObj(col)}
                      className={`w-8 h-8 rounded-xl ${col.bg} transition-transform ${
                        newHabitColorObj.name === col.name ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-4 mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
              হ্যাবিটটি ডিলিট করতে চান?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Are you sure you want to delete this habit? All tracking history will be permanently removed.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setHabitToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button 
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                ডিলিট (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HabitTracker;
