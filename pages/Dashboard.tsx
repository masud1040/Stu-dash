import React, { useEffect, useState, useCallback } from 'react';
import { User, Page } from '../App';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { StudyRoadmap } from '../components/StudyRoadmap';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  BarElement 
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

interface DashboardProps {
  user: User;
  onChangePage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onChangePage }) => {
  const [data, setData] = useState({
    coursesCount: 0,
    pendingAssignments: 0,
    upcomingQuizzes: 0,
    totalStudyHours: "0.0",
    subjectLabels: [] as string[],
    subjectData: [] as number[],
    subjectColors: [] as string[],
    timeDistribution: [] as number[],
    weeklyProgress: [] as number[],
    upcomingEvents: [] as any[],
  });

  const [currentDate] = useState(new Date());

  // Function to load and process data
  const loadData = useCallback(() => {
    try {
      // 1. Fetch raw data
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      const todos = JSON.parse(localStorage.getItem('todos') || '[]');
      const sessions = JSON.parse(localStorage.getItem('study_sessions') || '[]');
      const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
      const assignments = JSON.parse(localStorage.getItem('study_assignments') || '[]');

      // 2. Calculate Top Card Stats
      const coursesCount = subjects.length;
      // UPDATED: Pending Assignments now comes from Study Tracker assignments
      const pendingAssignments = assignments.length;
      
      const now = new Date();
      now.setHours(0,0,0,0);

      // Filter meetings for type 'exam' and future dates
      const upcomingQuizzes = meetings.filter((m: any) => 
        (m.type === 'exam' || m.type === 'quiz') && new Date(m.date) >= now
      ).length;

      const totalMinutes = sessions.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);
      const totalStudyHours = (totalMinutes / 60).toFixed(1);

      // Process Upcoming Events (Top 3)
      const upcomingEvents = meetings
        .filter((m: any) => new Date(m.date) >= now)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

      // 3. Process Bar Chart (Study by Subject)
      const subjectLabels = subjects.map((s: any) => s.name);
      const subjectColors = subjects.map((s: any) => s.color || '#6366f1');
      const subjectData = subjects.map((s: any) => {
        const subSessions = sessions.filter((sess: any) => sess.subjectId === s.id);
        const mins = subSessions.reduce((acc: number, sess: any) => acc + (sess.duration || 0), 0);
        return parseFloat((mins / 60).toFixed(1));
      });

      // 4. Process Doughnut Chart (Time Distribution)
      const timeDist = [0, 0, 0, 0]; // [Morning, Afternoon, Evening, Night]
      sessions.forEach((sess: any) => {
        const hour = new Date(sess.startTime).getHours();
        if (hour >= 5 && hour < 12) timeDist[0] += sess.duration;
        else if (hour >= 12 && hour < 17) timeDist[1] += sess.duration;
        else if (hour >= 17 && hour < 21) timeDist[2] += sess.duration;
        else timeDist[3] += sess.duration;
      });

      // 5. Process Line Chart (Weekly Progress)
      const weeklyData = [0, 0, 0, 0, 0, 0, 0];
      sessions.forEach((sess: any) => {
        const d = new Date(sess.startTime);
        const diffTime = Math.abs(Date.now() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays <= 7) {
            let dayIndex = d.getDay(); // 0-6 (Sun-Sat)
            weeklyData[dayIndex] += (sess.duration || 0) / 60;
        }
      });
      // Rotate so it starts Mon (index 1) to Sun (index 0)
      const weeklyProgress = [...weeklyData.slice(1), weeklyData[0]]; 

      setData({
        coursesCount,
        pendingAssignments,
        upcomingQuizzes,
        totalStudyHours,
        subjectLabels,
        subjectData,
        subjectColors,
        timeDistribution: timeDist,
        weeklyProgress,
        upcomingEvents
      });

    } catch (error) {
      console.error("Error loading dashboard data", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Live update if data changes in other tabs
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  // Chart Options & Data Construction
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { callback: (value: any) => value + ' hrs' }
      },
      x: { grid: { display: false } }
    }
  };

  const barChartData = {
    labels: data.subjectLabels.length ? data.subjectLabels : ['No Subjects'],
    datasets: [{
      label: 'Hours',
      data: data.subjectData.length ? data.subjectData : [0],
      backgroundColor: data.subjectColors.length ? data.subjectColors : ['#e2e8f0'],
      borderRadius: 6,
      barThickness: 30,
    }]
  };

  const doughnutData = {
    labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
    datasets: [{
      data: data.timeDistribution.some(v => v > 0) ? data.timeDistribution : [1,0,0,0], 
      backgroundColor: ['#f59e0b', '#3b82f6', '#f97316', '#6366f1'],
      borderWidth: 0,
    }]
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 20 } }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: (value: any) => value + ' hrs' } },
      x: { grid: { display: false } }
    }
  };

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Daily Progress',
      data: data.weeklyProgress,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0,
      pointBackgroundColor: '#6366f1',
      pointBorderWidth: 2,
      pointRadius: 4,
    }]
  };

  // UI Components
  const SummaryCard = ({ title, count, icon, color, borderColor, onClick, actionText }: any) => (
    <div 
      className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-slate-200/80 dark:border-slate-800 shadow-xs group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            <AnimatedCounter value={count} />
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">{title}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white text-lg shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      </div>
      <div 
        className={`text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${borderColor.replace('border-', 'text-')}`}
      >
        <i className={actionText.includes('Add') ? "fa-solid fa-plus" : (actionText.includes('Keep') ? "fa-solid fa-chart-line" : "fa-solid fa-circle-exclamation")}></i>
        <span>{actionText}</span>
        <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ml-1"></i>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Here is a real-time summary of your academic progress & schedule.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800">
          <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg text-sm">
             <i className="fa-regular fa-calendar"></i>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        <SummaryCard 
          title="Enrolled Courses" 
          count={data.coursesCount} 
          icon="fa-book-open" 
          color="bg-indigo-600" 
          borderColor="border-indigo-600"
          actionText="Add courses"
          onClick={() => onChangePage('study')}
        />
        <SummaryCard 
          title="Pending Assignments" 
          count={data.pendingAssignments} 
          icon="fa-file-lines" 
          color="bg-sky-500" 
          borderColor="border-sky-500"
          actionText={data.pendingAssignments > 0 ? "View tasks" : "All caught up"}
          onClick={() => onChangePage('study')}
        />
        <SummaryCard 
          title="Upcoming Quizzes" 
          count={data.upcomingQuizzes} 
          icon="fa-question" 
          color="bg-amber-500" 
          borderColor="border-amber-500"
          actionText={data.upcomingQuizzes > 0 ? "Review schedule" : "No quizzes"}
          onClick={() => onChangePage('others')}
        />
      </div>

      {/* Row 2: Study Hours + Upcoming Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <SummaryCard 
            title="Study Hours (Total)" 
            count={data.totalStudyHours} 
            icon="fa-clock" 
            color="bg-emerald-600" 
            borderColor="border-emerald-600"
            actionText="Keep it up!"
            onClick={() => onChangePage('analytics')}
          />
        </div>

        {/* Upcoming Events Widget */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl p-6 shadow-2xs border border-slate-200/80 dark:border-slate-800">
           <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                 <i className="fa-regular fa-calendar-check text-indigo-500"></i> Upcoming Schedule
              </h3>
              <button onClick={() => onChangePage('others')} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View Schedule <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
           </div>
           
           <div className="space-y-2.5">
              {data.upcomingEvents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-6 text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <i className="fa-solid fa-calendar-xmark text-xl mb-1.5 opacity-40"></i>
                    <p className="text-xs font-medium">No upcoming events scheduled</p>
                    <button onClick={() => onChangePage('others')} className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 hover:underline">Add event in Tools</button>
                 </div>
              ) : (
                 data.upcomingEvents.map((event: any) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                       <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold shadow-2xs ${
                          event.type === 'exam' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' : 
                          event.type === 'class' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50' : 
                          'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50'
                       }`}>
                          <span className="text-base leading-none">{new Date(event.date).getDate()}</span>
                          <span className="text-[9px] uppercase font-semibold">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                             <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-[10px]"></i> {event.time || 'All Day'}</span>
                             {event.location && <span className="flex items-center gap-1"><i className="fa-solid fa-location-dot text-[10px]"></i> {event.location}</span>}
                          </div>
                       </div>
                       <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          event.type === 'exam' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300' : 
                          event.type === 'class' ? 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300' : 
                          'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-300'
                       }`}>
                          {event.type}
                       </span>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      {/* Analytics Section Header */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
           <i className="fa-solid fa-chart-pie text-indigo-500 text-base"></i>
           <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Study Analytics</h2>
        </div>
        <button onClick={() => onChangePage('analytics')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
          View Details <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-5">Study Hours by Subject</h3>
          <div className="h-60">
             <Bar data={barChartData} options={barOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-5">Study Time Distribution</h3>
          <div className="h-60 relative">
             <Doughnut data={doughnutData} options={doughnutOptions} />
             {/* Center Text Overlay */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mt-[-20px]">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{data.totalStudyHours}h</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-5">Weekly Study Progress</h3>
        <div className="h-60">
           <Line data={lineChartData} options={lineOptions} />
        </div>
      </div>

      {/* Academic Milestone Roadmap */}
      <StudyRoadmap />

      {/* Quick Actions Footer */}
      <div className="pt-2">
         <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-3 flex items-center gap-2">
           <i className="fa-solid fa-bolt text-amber-500"></i> Quick Actions
         </h3>
         <div className="flex gap-3 overflow-x-auto pb-1">
            <button onClick={() => onChangePage('study')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors whitespace-nowrap shadow-2xs flex items-center gap-2">
              <i className="fa-solid fa-play text-indigo-500"></i> Start Timer
            </button>
            <button onClick={() => onChangePage('todo')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors whitespace-nowrap shadow-2xs flex items-center gap-2">
              <i className="fa-solid fa-plus text-emerald-500"></i> Add Task
            </button>
            <button onClick={() => onChangePage('others')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors whitespace-nowrap shadow-2xs flex items-center gap-2">
              <i className="fa-solid fa-qrcode text-slate-400"></i> QR Tool
            </button>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;