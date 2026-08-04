import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnimatedCounter } from '../components/AnimatedCounter';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface Subject {
  id: string;
  name: string;
  color: string;
  targetHours: number;
}

interface Session {
  id: string;
  subjectId: string;
  startTime: string;
  duration: number; // minutes
  date: string;
}

interface Assignment {
  id: string;
  subjectId: string;
  topic: string;
  deadline: string;
}

const MOTIVATION_QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The expert in anything was once a beginner.",
  "Motivation is what gets you started. Habit is what keeps you going.",
  "Your future is created by what you do today, not tomorrow.",
  "Believe you can and you're halfway there."
];

export const StudyTracker: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [activeSession, setActiveSession] = useState<{subjectId: string, startTime: number} | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ id: '', name: '', targetHours: 20 });
  const [isEditing, setIsEditing] = useState(false);

  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ id: '', subjectId: '', topic: '', deadline: '' });
  const [assignmentSubjectName, setAssignmentSubjectName] = useState('');
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntry, setManualEntry] = useState({ subjectId: '', date: new Date().toISOString().split('T')[0], hours: 0, minutes: 0 });

  const [currentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const timerRef = useRef<number | null>(null);
  const weeklyChartRef = useRef<any>(null);
  const distChartRef = useRef<any>(null);

  useEffect(() => {
    const savedSubjects = localStorage.getItem('subjects');
    const savedSessions = localStorage.getItem('study_sessions');
    const savedAssignments = localStorage.getItem('study_assignments');

    if (savedSubjects) {
      const parsed = JSON.parse(savedSubjects);
      setSubjects(parsed);
      if (parsed.length > 0) setSelectedSubjectId(parsed[0].id);
    } 

    if (savedSessions) setSessions(JSON.parse(savedSessions));

    if (savedAssignments) {
        const parsedAssignments = JSON.parse(savedAssignments);
        const today = new Date().toISOString().split('T')[0];
        const validAssignments = parsedAssignments.filter((a: Assignment) => a.deadline >= today);
        setAssignments(validAssignments);
    }
  }, []);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeSession.startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
  };

  const getStats = () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const todayStr = new Date().toISOString().split('T')[0];

    let total = 0, today = 0, week = 0, month = 0;

    sessions.forEach(s => {
      total += s.duration;
      if (s.date === todayStr) today += s.duration;
      if (new Date(s.date) >= startOfWeek) week += s.duration;
      if (new Date(s.date) >= startOfMonth) month += s.duration;
    });

    return {
      total: (total / 60).toFixed(1),
      today: (today / 60).toFixed(1),
      week: (week / 60).toFixed(1),
      month: (month / 60).toFixed(1)
    };
  };

  const getSubjectProgress = (subjectId: string) => {
    const totalMinutes = sessions
      .filter(s => s.subjectId === subjectId)
      .reduce((acc, curr) => acc + curr.duration, 0);
    return (totalMinutes / 60);
  };

  const toggleTimer = () => {
    if (activeSession) {
      const durationMin = Math.ceil(elapsed / 60);
      if (durationMin > 0) {
        const newSession: Session = {
          id: Date.now().toString(),
          subjectId: activeSession.subjectId,
          startTime: new Date(activeSession.startTime).toISOString(),
          duration: durationMin,
          date: new Date().toISOString().split('T')[0]
        };
        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        localStorage.setItem('study_sessions', JSON.stringify(updatedSessions));
      }
      setActiveSession(null);
      setElapsed(0);
    } else {
      if (!selectedSubjectId) return alert("Select a subject first");
      setActiveSession({ subjectId: selectedSubjectId, startTime: Date.now() });
    }
  };

  const saveManualEntry = () => {
    const totalMinutes = (parseInt(manualEntry.hours as any) || 0) * 60 + (parseInt(manualEntry.minutes as any) || 0);
    if (totalMinutes <= 0 || !manualEntry.subjectId) return;

    const newSession: Session = {
      id: Date.now().toString(),
      subjectId: manualEntry.subjectId,
      startTime: new Date().toISOString(),
      duration: totalMinutes,
      date: manualEntry.date
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    localStorage.setItem('study_sessions', JSON.stringify(updatedSessions));
    setShowManualModal(false);
    setManualEntry({ subjectId: '', date: new Date().toISOString().split('T')[0], hours: 0, minutes: 0 });
  };

  const deleteSubject = (id: string) => {
    if (activeSession && activeSession.subjectId === id) {
        alert("Cannot delete this subject while timer is active.");
        return;
    }
    const updatedSubjects = subjects.filter(s => s.id !== id);
    const updatedSessions = sessions.filter(s => s.subjectId !== id);
    const updatedAssignments = assignments.filter(a => a.subjectId !== id);

    setSubjects(updatedSubjects);
    setSessions(updatedSessions);
    setAssignments(updatedAssignments);
    
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    localStorage.setItem('study_sessions', JSON.stringify(updatedSessions));
    localStorage.setItem('study_assignments', JSON.stringify(updatedAssignments));
    
    if (selectedSubjectId === id) {
        setSelectedSubjectId(updatedSubjects.length > 0 ? updatedSubjects[0].id : '');
    }
  };

  const handleSaveSubject = () => {
    if (!subjectForm.name.trim()) return;
    let updatedSubjects = [...subjects];
    if (isEditing) {
      updatedSubjects = updatedSubjects.map(s => 
        s.id === subjectForm.id ? { ...s, name: subjectForm.name, targetHours: Number(subjectForm.targetHours) } : s
      );
    } else {
      const newSub: Subject = {
        id: Date.now().toString(),
        name: subjectForm.name,
        color: '#171717',
        targetHours: Number(subjectForm.targetHours)
      };
      updatedSubjects.push(newSub);
      if (!selectedSubjectId) setSelectedSubjectId(newSub.id);
    }
    setSubjects(updatedSubjects);
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    setSubjectForm({ id: '', name: '', targetHours: 20 });
    setIsEditing(false);
    setShowSubjectForm(false);
  };

  const deleteAssignment = (id: string) => {
    const updated = assignments.filter(a => a.id !== id);
    setAssignments(updated);
    localStorage.setItem('study_assignments', JSON.stringify(updated));
  };

  const handleSaveAssignment = () => {
    if (!assignmentForm.topic.trim() || !assignmentSubjectName.trim() || !assignmentForm.deadline) return;

    let finalSubjectId = assignmentForm.subjectId;
    const existingSubject = subjects.find(s => s.name.toLowerCase() === assignmentSubjectName.toLowerCase());
    if (existingSubject) {
        finalSubjectId = existingSubject.id;
    } else {
        const newSub: Subject = {
            id: Date.now().toString(),
            name: assignmentSubjectName,
            color: '#171717',
            targetHours: 10
        };
        const updatedSubjects = [...subjects, newSub];
        setSubjects(updatedSubjects);
        localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
        finalSubjectId = newSub.id;
    }

    let updatedAssignments = [...assignments];
    if (isEditingAssignment) {
        updatedAssignments = updatedAssignments.map(a => 
            a.id === assignmentForm.id ? { ...a, subjectId: finalSubjectId, topic: assignmentForm.topic, deadline: assignmentForm.deadline } : a
        );
    } else {
        updatedAssignments.push({
            id: Date.now().toString(),
            subjectId: finalSubjectId,
            topic: assignmentForm.topic,
            deadline: assignmentForm.deadline
        });
    }

    updatedAssignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    setAssignments(updatedAssignments);
    localStorage.setItem('study_assignments', JSON.stringify(updatedAssignments));
    
    setAssignmentForm({ id: '', subjectId: '', topic: '', deadline: '' });
    setAssignmentSubjectName('');
    setIsEditingAssignment(false);
    setShowAssignmentForm(false);
  };

  const downloadStudyReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const user = JSON.parse(localStorage.getItem('student_user') || '{}');
    
    doc.setFillColor(23, 23, 23);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("STUDY TRACKER REPORT", pageWidth / 2, 22, { align: 'center' });

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Student: ${user.name || 'Scholar'}`, 14, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52);

    const stats = getStats();
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Hours', `${stats.total} hrs`],
        ['This Week', `${stats.week} hrs`],
        ['This Month', `${stats.month} hrs`],
        ['Active Subjects', subjects.length],
        ['Assignments', assignments.length]
      ],
      theme: 'grid',
      headStyles: { fillColor: [23, 23, 23] }
    });

    doc.save(`Study_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-9"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const daySessions = sessions.filter(s => s.date === dateStr);
      const hasData = daySessions.length > 0;
      const isSelected = selectedCalendarDate === dateStr;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <button
          key={d}
          onClick={() => setSelectedCalendarDate(dateStr)}
          className={`h-9 w-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all relative
            ${isSelected ? 'bg-neutral-900 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-800'}
            ${isToday && !isSelected ? 'border border-neutral-900 text-neutral-900' : ''}
          `}
        >
          {d}
          {hasData && !isSelected && (
            <div className="w-1 h-1 rounded-full bg-neutral-900 absolute bottom-1"></div>
          )}
        </button>
      );
    }
    return days;
  };

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const weeklyData = {
    labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: [{
      label: 'Hours',
      data: last7Days.map(dateStr => {
        const mins = sessions.filter(s => s.date === dateStr).reduce((acc, curr) => acc + curr.duration, 0);
        return parseFloat((mins / 60).toFixed(1));
      }),
      backgroundColor: '#171717',
      borderRadius: 6
    }]
  };

  const doughnutData = {
    labels: subjects.length ? subjects.map(s => s.name) : ['No Subjects'],
    datasets: [{
      data: subjects.length ? subjects.map(s => getSubjectProgress(s.id)) : [1],
      backgroundColor: subjects.length ? subjects.map((_, idx) => idx % 2 === 0 ? '#171717' : '#737373') : ['#e5e5e5'],
      borderWidth: 0
    }]
  };

  const stats = getStats();

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-6">
        <div>
           <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">Time & Productivity</div>
           <h2 className="text-3xl font-black text-neutral-900 font-serif">Study Tracker</h2>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowManualModal(true)} 
              className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            >
              + Manual Time
            </button>
            <button 
              onClick={downloadStudyReport} 
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-file-pdf"></i> PDF Report
            </button>
        </div>
      </div>

      {/* --- Minimalist Timer Card --- */}
      <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xl text-neutral-900 ${activeSession ? 'animate-pulse' : ''}`}>
             <i className="fa-solid fa-stopwatch"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">{activeSession ? 'Focus Session Active' : 'Ready to Focus'}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{activeSession ? 'Tracking study progress...' : 'Select a subject to begin'}</p>
          </div>
        </div>

        <div className="font-mono text-5xl md:text-6xl font-black text-neutral-900 tracking-tight">
          {activeSession ? formatTime(elapsed) : '00 : 00 : 00'}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs uppercase tracking-wider font-semibold rounded-full px-4 py-3 focus:outline-none focus:border-neutral-900 transition-colors w-full md:w-44"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={activeSession !== null}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          <button 
            onClick={toggleTimer}
            className={`px-7 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center gap-2 whitespace-nowrap
              ${activeSession ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}
            `}
          >
            <i className={`fa-solid ${activeSession ? 'fa-stop' : 'fa-play'}`}></i>
            {activeSession ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hours', value: stats.total, icon: 'fa-chart-simple' },
          { label: "Today's Hours", value: stats.today, icon: 'fa-calendar-day' },
          { label: 'This Week', value: stats.week, icon: 'fa-calendar-week' },
          { label: 'This Month', value: stats.month, icon: 'fa-calendar' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 text-sm">
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 font-serif">
                <AnimatedCounter value={stat.value} decimals={1} />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Main Grid: Subjects & Assignments --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Subjects & Assignments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Subjects Section */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Subjects & Progress</h3>
                <p className="text-xs text-neutral-500">Manage your study domains and monthly targets</p>
              </div>
              <button 
                onClick={() => {
                  setSubjectForm({ id: '', name: '', targetHours: 20 });
                  setIsEditing(false);
                  setShowSubjectForm(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                + Add Subject
              </button>
            </div>

            <div className="space-y-4">
              {subjects.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">No subjects added yet. Create one to get started.</div>
              ) : (
                subjects.map(sub => {
                  const studiedHours = getSubjectProgress(sub.id);
                  const progressPct = Math.min(100, Math.round((studiedHours / sub.targetHours) * 100));
                  return (
                    <div key={sub.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:border-neutral-900 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold text-neutral-900 text-sm">{sub.name}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-neutral-500 font-medium">{studiedHours.toFixed(1)}h / {sub.targetHours}h</span>
                          <button onClick={() => deleteSubject(sub.id)} className="text-neutral-400 hover:text-rose-600 transition-colors">
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-neutral-900 h-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assignments Section */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Deadlines & Assignments</h3>
                <p className="text-xs text-neutral-500">Upcoming tasks automatically synchronized</p>
              </div>
              <button 
                onClick={() => {
                  setAssignmentForm({ id: '', subjectId: '', topic: '', deadline: new Date().toISOString().split('T')[0] });
                  setAssignmentSubjectName('');
                  setIsEditingAssignment(false);
                  setShowAssignmentForm(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                + Add Assignment
              </button>
            </div>

            <div className="space-y-3">
              {assignments.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 text-xs">No pending assignments. You're all caught up!</div>
              ) : (
                assignments.map(a => {
                  const sub = subjects.find(s => s.id === a.subjectId);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                      <div>
                        <div className="font-bold text-neutral-900 text-sm">{a.topic}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{sub?.name || 'General'} • Due: {a.deadline}</div>
                      </div>
                      <button onClick={() => deleteAssignment(a.id)} className="text-neutral-400 hover:text-rose-600 p-2">
                        <i className="fa-solid fa-check text-xs"></i>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Col: Calendar & Charts */}
        <div className="space-y-8">
          
          {/* Calendar Widget */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 text-sm">Study Calendar</h3>
              <div className="text-xs font-semibold text-neutral-500">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] uppercase font-bold text-neutral-400">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Weekly Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
             <h3 className="font-bold text-neutral-900 mb-4 text-sm">Weekly Study Hours</h3>
             <div className="h-44">
               <Bar 
                 ref={weeklyChartRef}
                 data={weeklyData} 
                 options={{ 
                   responsive: true, 
                   maintainAspectRatio: false,
                   plugins: { legend: { display: false } },
                   scales: { x: { grid: { display: false } }, y: { display: false } }
                 }} 
               />
             </div>
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
             <h3 className="font-bold text-neutral-900 mb-4 text-sm">Subject Distribution</h3>
             <div className="h-40 flex justify-center">
               <Doughnut 
                 ref={distChartRef}
                 data={doughnutData} 
                 options={{ 
                   responsive: true, 
                   maintainAspectRatio: false,
                   plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
                 }} 
               />
             </div>
          </div>

        </div>
      </div>

      {/* --- Motivation Footer --- */}
      <div className="bg-neutral-900 rounded-2xl p-6 text-center text-white relative overflow-hidden shadow-lg">
        <p className="text-sm italic font-serif opacity-90">"{MOTIVATION_QUOTES[quoteIndex]}"</p>
      </div>

      {/* --- Modals --- */}
      
      {/* 1. Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-4 font-serif">Add Manual Study Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Subject</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={manualEntry.subjectId}
                  onChange={e => setManualEntry({...manualEntry, subjectId: e.target.value})}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Date</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={manualEntry.date}
                  onChange={e => setManualEntry({...manualEntry, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Hours</label>
                   <input type="number" min="0" className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900" value={manualEntry.hours} onChange={e => setManualEntry({...manualEntry, hours: parseInt(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Minutes</label>
                   <input type="number" min="0" max="59" className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900" value={manualEntry.minutes} onChange={e => setManualEntry({...manualEntry, minutes: parseInt(e.target.value)})} />
                 </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowManualModal(false)} className="px-5 py-2.5 text-neutral-600 hover:text-neutral-900 text-xs font-bold uppercase tracking-wider">Cancel</button>
              <button onClick={saveManualEntry} className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-widest">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Subject Form Modal */}
      {showSubjectForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-4 font-serif">{isEditing ? 'Edit Subject' : 'Add New Subject'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Subject Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Data Structures"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={subjectForm.name}
                  onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Monthly Target Hours</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={subjectForm.targetHours}
                  onChange={e => setSubjectForm({...subjectForm, targetHours: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowSubjectForm(false)} className="px-5 py-2.5 text-neutral-600 hover:text-neutral-900 text-xs font-bold uppercase tracking-wider">Cancel</button>
              <button onClick={handleSaveSubject} className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-widest">Save Subject</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Assignment Form Modal */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900 mb-4 font-serif">Add Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Topic / Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Binary Tree Homework"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={assignmentForm.topic}
                  onChange={e => setAssignmentForm({...assignmentForm, topic: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Subject Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Algorithms"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={assignmentSubjectName}
                  onChange={e => setAssignmentSubjectName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Deadline Date</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
                  value={assignmentForm.deadline}
                  onChange={e => setAssignmentForm({...assignmentForm, deadline: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowAssignmentForm(false)} className="px-5 py-2.5 text-neutral-600 hover:text-neutral-900 text-xs font-bold uppercase tracking-wider">Cancel</button>
              <button onClick={handleSaveAssignment} className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-widest">Save Task</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Calendar Modal */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setSelectedCalendarDate(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-neutral-200" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4 border-b border-neutral-200 pb-3">
               <div>
                  <h3 className="text-lg font-bold text-neutral-900 font-serif">
                    {new Date(selectedCalendarDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Daily Log</p>
               </div>
               <button onClick={() => setSelectedCalendarDate(null)} className="text-neutral-400 hover:text-neutral-900"><i className="fa-solid fa-xmark text-lg"></i></button>
             </div>
             
             <div className="space-y-3 max-h-60 overflow-y-auto">
               {sessions.filter(s => s.date === selectedCalendarDate).length === 0 ? (
                 <div className="text-center py-8 text-neutral-400 text-xs">No study sessions recorded for this day.</div>
               ) : (
                 sessions.filter(s => s.date === selectedCalendarDate).map((sess, idx) => {
                   const sub = subjects.find(s => s.id === sess.subjectId);
                   return (
                     <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                       <div className="font-bold text-neutral-900 text-xs">{sub?.name || 'Subject'}</div>
                       <div className="text-xs text-neutral-600 font-mono">
                         {Math.floor(sess.duration / 60)}h {sess.duration % 60}m
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyTracker;
