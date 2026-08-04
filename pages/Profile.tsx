import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { Doughnut } from 'react-chartjs-2';

interface Props {
  user: User;
  onUpdateUser: (u: User) => void;
  onLogout: () => void;
}

const Profile: React.FC<Props> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDate] = useState(new Date());

  // Statistics State
  const [stats, setStats] = useState({
    studyHours: 0,
    assignmentsDone: 0,
    activeHabits: 0,
    averageGrade: 'N/A', 
    habitData: [] as any[],
    habitDistribution: [0, 0, 0] // Active, Completed Today, Inactive
  });

  // Load Real-Time Data
  useEffect(() => {
    const loadStats = () => {
      // 1. Study Hours
      const sessions = JSON.parse(localStorage.getItem('study_sessions') || '[]');
      const totalMinutes = sessions.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);
      const studyHours = parseFloat((totalMinutes / 60).toFixed(1));

      // 2. Assignments
      const todos = JSON.parse(localStorage.getItem('todos') || '[]');
      const assignmentsDone = todos.filter((t: any) => t.completed).length;

      // 3. Habits
      const habits = JSON.parse(localStorage.getItem('habits') || '[]');
      const activeHabitsCount = habits.length; // Simply count all as active being tracked
      
      const today = new Date().toISOString().split('T')[0];
      let completedToday = 0;
      let inactive = 0;

      const formattedHabits = habits.map((h: any) => {
         const isDone = h.completedDates.includes(today);
         if (isDone) completedToday++;
         // Arbitrary logic for "inactive": streak is 0 and not done today
         if (h.streak === 0 && !isDone) inactive++;

         return {
           name: h.name,
           icon: h.icon,
           streak: h.streak,
           isDone: isDone,
           color: h.color || 'bg-indigo-500'
         };
      });

      setStats({
        studyHours,
        assignmentsDone,
        activeHabits: activeHabitsCount,
        averageGrade: user.gpa || 'N/A',
        habitData: formattedHabits,
        habitDistribution: [activeHabitsCount - inactive, completedToday, inactive] // Just for chart visualization logic
      });
    };

    loadStats();
    // Listen for global storage updates
    window.addEventListener('storage', loadStats);
    return () => window.removeEventListener('storage', loadStats);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('student_user', JSON.stringify(formData));
    onUpdateUser(formData);
    setIsEditing(false);
  };

  // Completion calculation
  const calculateCompletion = () => {
    const fields = ['name', 'email', 'phone', 'studentId', 'bio', 'course', 'year', 'university', 'gpa'];
    let filled = 0;
    fields.forEach(f => {
      if ((formData as any)[f]) filled++;
    });
    return Math.round((filled / fields.length) * 100);
  };

  // Chart Config
  const doughnutData = {
    labels: ['Active Habits', 'Completed Today', 'Inactive'],
    datasets: [{
      data: [stats.habitDistribution[0], stats.habitDistribution[1], stats.habitDistribution[2] || 1], // Fallback 1 to show grey ring if empty
      backgroundColor: ['#6366f1', '#22c55e', '#94a3b8'],
      borderWidth: 0,
    }]
  };
  const doughnutOptions = {
    cutout: '70%',
    plugins: { legend: { display: false } },
    maintainAspectRatio: false
  };

  const StatCard = ({ icon, value, label, color, subLabel }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform duration-300">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl mb-3 shadow-lg shadow-primary/20`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{value}</div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</div>
      {subLabel && <div className="text-[10px] text-slate-300 mt-1">{subLabel}</div>}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Profile Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your personal information and account settings</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <i className="fa-regular fa-calendar text-primary"></i>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
               {user.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
             </div>
             <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</div>
                <div className="text-xs text-slate-400">Student Account</div>
             </div>
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
         <h2 className="text-xl font-bold text-slate-800 dark:text-white">Personal Information</h2>
         <div className="flex gap-3">
            {isEditing ? (
              <>
                 <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                 <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all">Save Changes</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all">
                <i className="fa-regular fa-pen-to-square mr-2"></i> Edit Profile
              </button>
            )}
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <i className="fa-solid fa-rotate mr-2"></i> Refresh
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Avatar & Status */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 flex flex-col items-center">
            <div className="relative group mb-6">
              <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-primary to-secondary p-1">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-primary">{user.name.substring(0,2).toUpperCase()}</span>
                  )}
                </div>
              </div>
              {isEditing && (
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-white dark:bg-slate-700 shadow-lg rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-primary transition-colors"
                 >
                   <i className="fa-solid fa-camera"></i>
                 </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            {isEditing && (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="mb-6 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium w-full shadow-lg shadow-primary/20"
               >
                 <i className="fa-solid fa-upload mr-2"></i> Upload New Photo
               </button>
            )}

            <div className="text-xs text-slate-400 mb-8">Supports JPG, PNG up to 5MB</div>

            {/* Completion Circle Mockup - Fixed Visibility */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-700" />
                 <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - calculateCompletion() / 100)} className="text-primary transition-all duration-1000" strokeLinecap="round" />
               </svg>
               <span className="absolute text-xl font-bold text-slate-800 dark:text-white">{calculateCompletion()}%</span>
            </div>
            <div className="text-sm font-medium text-slate-500 mb-8">Profile Completion</div>

            <div className="w-full space-y-4">
              <div className="flex justify-between text-sm border-b border-slate-50 dark:border-slate-700 pb-2">
                <span className="text-slate-400"><i className="fa-regular fa-calendar mr-2"></i>Member Since</span>
                <span className="font-bold text-slate-800 dark:text-white">{user.joinDate || 'Jan 2024'}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 dark:border-slate-700 pb-2">
                <span className="text-slate-400"><i className="fa-regular fa-id-card mr-2"></i>Account Type</span>
                <span className="font-bold text-slate-800 dark:text-white">Student</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 dark:border-slate-700 pb-2">
                <span className="text-slate-400"><i className="fa-solid fa-signal mr-2"></i>Status</span>
                <span className="font-bold text-green-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400"><i className="fa-solid fa-clock-rotate-left mr-2"></i>Last Login</span>
                <span className="font-bold text-slate-800 dark:text-white">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Form Fields */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 h-full">
             
             <div className="mb-8">
               <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6">
                 <i className="fa-solid fa-circle-user"></i> Basic Information
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Full Name</label>
                   <input 
                      name="name"
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email Address</label>
                   <input 
                      name="email"
                      disabled={!isEditing}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Phone Number</label>
                   <input 
                      name="phone"
                      placeholder="+1 234 567 8900"
                      disabled={!isEditing}
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Student ID</label>
                   <input 
                      name="studentId"
                      placeholder="STU7022"
                      disabled={!isEditing}
                      value={formData.studentId || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Bio</label>
                   <textarea 
                      name="bio"
                      rows={3}
                      placeholder="Passionate student pursuing excellence..."
                      disabled={!isEditing}
                      value={formData.bio || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all resize-none"
                   />
                 </div>
               </div>
             </div>

             <div>
               <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6">
                 <i className="fa-solid fa-graduation-cap"></i> Academic Information
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Course/Program</label>
                   <input 
                      name="course"
                      disabled={!isEditing}
                      value={formData.course || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Year</label>
                   <select 
                      name="year"
                      disabled={!isEditing}
                      value={formData.year || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   >
                     <option value="">Select Year</option>
                     <option value="1st Year">1st Year</option>
                     <option value="2nd Year">2nd Year</option>
                     <option value="3rd Year">3rd Year</option>
                     <option value="4th Year">4th Year</option>
                     <option value="Final Year">Final Year</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">University/Institution</label>
                   <input 
                      name="university"
                      disabled={!isEditing}
                      value={formData.university || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">CGPA / Average Grade</label>
                   <input 
                      name="gpa"
                      placeholder="e.g. 3.85 or 92%"
                      disabled={!isEditing}
                      value={formData.gpa || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                   />
                 </div>
               </div>
             </div>

          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div>
         <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <i className="fa-solid fa-chart-simple text-primary"></i> Your Statistics
         </h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="fa-clock" value={stats.studyHours} label="Study Hours" color="bg-indigo-600" />
            <StatCard icon="fa-file-lines" value={stats.assignmentsDone} label="Assignments Done" color="bg-sky-500" />
            <StatCard icon="fa-fire" value={stats.activeHabits} label="Active Habits" color="bg-orange-500" />
            <StatCard icon="fa-graduation-cap" value={stats.averageGrade} label="Average Grade" color="bg-lime-500" />
         </div>
      </div>

      {/* Habit Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <i className="fa-solid fa-chart-pie text-primary"></i> Habit Analytics
            </h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <div className="h-64 relative">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700"></div>
                  </div>
               </div>
               <div className="flex justify-center gap-4 mt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                     <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Active Habits
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                     <div className="w-3 h-3 rounded-full bg-green-500"></div> Completed Today
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                     <div className="w-3 h-3 rounded-full bg-slate-400"></div> Inactive
                  </div>
               </div>
            </div>
         </div>

         <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <i className="fa-solid fa-list-check text-primary"></i> Your Habits
            </h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 max-h-[380px] overflow-y-auto">
               {stats.habitData.length === 0 ? (
                  <div className="text-center text-slate-400 py-10">No active habits started yet.</div>
               ) : (
                  stats.habitData.map((habit, idx) => (
                     <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-1">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${habit.color} flex items-center justify-center text-white text-xs`}>
                                 <i className={`fa-solid ${habit.icon}`}></i>
                              </div>
                              <div>
                                 <div className="font-bold text-slate-800 dark:text-white text-sm">{habit.name}</div>
                                 <div className="text-[10px] text-slate-400">Daily Goal</div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              {habit.isDone ? (
                                 <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Done Today</span>
                              ) : (
                                 <span className="text-xs font-bold text-slate-400">Pending</span>
                              )}
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                 <i className="fa-solid fa-fire text-orange-500 mr-1"></i> {habit.streak} days
                              </div>
                           </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                           <div 
                              className={`h-full rounded-full transition-all duration-500 ${habit.isDone ? 'bg-green-500' : 'bg-indigo-500'}`} 
                              style={{ width: habit.isDone ? '100%' : `${Math.min(habit.streak * 10, 100)}%` }} // Mock progress based on streak
                           ></div>
                        </div>
                        {idx !== stats.habitData.length - 1 && <div className="border-b border-slate-50 dark:border-slate-700 mt-4"></div>}
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>

      <div className="text-center text-xs text-slate-300 mt-8 pb-4">
         © 2026 Student Life Dashboard. All rights reserved. | Premium Edition v2.0.0
         <div className="mt-1">Profile updates automatically sync across all pages.</div>
      </div>

    </div>
  );
};

export default Profile;