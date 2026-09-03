import React, { useState, useEffect, useRef } from 'react';
import { fetchCloudData, saveCloudData } from '../src/lib/dbSync';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: '1',
    title: 'Core Fundamentals Review',
    description: 'Master data structures, algorithms, and asymptotic complexity analysis.',
    dueDate: '2026-03-15',
    completed: true,
  },
  {
    id: '2',
    title: 'Midterm Project Prototype',
    description: 'Build and deploy full-stack student workspace prototype with React & Node.',
    dueDate: '2026-04-01',
    completed: true,
  },
  {
    id: '3',
    title: 'Advanced System Architecture',
    description: 'Study distributed databases, caching layers, and microservice patterns.',
    dueDate: '2026-05-10',
    completed: false,
  },
  {
    id: '4',
    title: 'Final Capstone Presentation',
    description: 'Prepare documentation, slide decks, and final defense for faculty review.',
    dueDate: '2026-06-20',
    completed: false,
  },
];

export const StudyRoadmap: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    try {
      const stored = localStorage.getItem('study_roadmap_milestones');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MILESTONES;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    let userEmail = 'guest';
    try {
      const userStr = localStorage.getItem('student_user');
      if (userStr) {
        userEmail = JSON.parse(userStr).email || 'guest';
      }
    } catch (e) {}

    fetchCloudData(userEmail, 'study_roadmap_milestones', DEFAULT_MILESTONES).then(data => {
      if (data && Array.isArray(data)) {
        setMilestones(data);
      }
    });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let userEmail = 'guest';
    try {
      const userStr = localStorage.getItem('student_user');
      if (userStr) {
        userEmail = JSON.parse(userStr).email || 'guest';
      }
    } catch (e) {}
    saveCloudData(userEmail, 'study_roadmap_milestones', milestones);
  }, [milestones]);

  const toggleMilestone = (id: string) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDesc.trim() || 'Academic milestone goal.',
      dueDate: newDate || new Date().toISOString().split('T')[0],
      completed: false,
    };

    setMilestones(prev => [...prev, newMilestone]);
    setNewTitle('');
    setNewDesc('');
    setNewDate('');
    setShowAddModal(false);
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 shadow-2xs border border-slate-200/80 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-route"></i>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">Academic Milestone Roadmap</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Track your semester objectives and step-by-step progress.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{completedCount} / {milestones.length} Completed</span>
            <div className="w-24 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <i className="fa-solid fa-plus text-[10px]"></i> Add Goal
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">No roadmap milestones added yet. Add one above!</div>
        ) : (
          milestones.map((milestone) => (
            <div key={milestone.id} className="relative group">
              {/* Timeline dot */}
              <button
                onClick={() => toggleMilestone(milestone.id)}
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  milestone.completed 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-105' 
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-600'
                }`}
                title={milestone.completed ? "Mark incomplete" : "Mark complete"}
              >
                {milestone.completed && <i className="fa-solid fa-check text-[10px]"></i>}
              </button>

              <div 
                onClick={() => toggleMilestone(milestone.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  milestone.completed 
                    ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800 opacity-75' 
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className={`font-bold text-sm transition-colors ${milestone.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {milestone.title}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit">
                    Due: {milestone.dueDate}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Academic Milestone</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Systems Exam Prep"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-600"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  placeholder="Brief details of your milestone..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-600 resize-none"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Target Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-600"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-2xs"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoadmap;
