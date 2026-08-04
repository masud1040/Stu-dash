import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

interface TodoItem {
  id: string;
  text: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  amount?: number;
  createdDate: string;
}

const Todo: React.FC = () => {
  // --- State ---
  const [todos, setTodos] = useState<TodoItem[]>([]);
  
  // Collapsible Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    text: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    amount: ''
  });

  // Custom Delete Modal State
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Refs for Charts
  const priorityChartRef = useRef<any>(null);
  const trendChartRef = useRef<any>(null);

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading todos", e);
      }
    }
  }, []);

  // Sync to local storage
  const updateTodosState = (updater: (prev: TodoItem[]) => TodoItem[]) => {
    setTodos(prevTodos => {
      const newTodos = updater(prevTodos);
      localStorage.setItem('todos', JSON.stringify(newTodos));
      window.dispatchEvent(new Event('storage'));
      return newTodos;
    });
  };

  // Focus title input when form opens
  useEffect(() => {
    if (isFormOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    }
  }, [isFormOpen]);

  // --- Statistics ---
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
    totalAmount: todos.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    pendingAmount: todos.filter(t => !t.completed).reduce((acc, curr) => acc + (curr.amount || 0), 0)
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  };

  // --- Toggle Form Open ---
  const handleToggleForm = () => {
    if (isFormOpen) {
      resetForm();
    } else {
      setIsFormOpen(true);
    }
  };

  // --- Actions ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      if (isEditing) {
        updateTodosState(prev => prev.filter(t => t.id !== isEditing));
        resetForm();
      }
      return;
    }

    updateTodosState(prev => {
      if (isEditing) {
        return prev.map(t => t.id === isEditing ? {
          ...t,
          text: formData.text.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          dueDate: formData.dueDate,
          amount: formData.amount ? parseFloat(formData.amount) : 0
        } : t);
      } else {
        const newTodo: TodoItem = {
          id: generateId(),
          text: formData.text.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          dueDate: formData.dueDate,
          amount: formData.amount ? parseFloat(formData.amount) : 0,
          completed: false,
          createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        return [newTodo, ...prev];
      }
    });
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      text: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      amount: ''
    });
    setIsEditing(null);
    setIsFormOpen(false);
  };

  const handleEdit = (todo: TodoItem) => {
    setFormData({
      text: todo.text,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate,
      amount: todo.amount ? todo.amount.toString() : ''
    });
    setIsEditing(todo.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTodo = (id: string) => {
    updateTodosState(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const confirmDeleteTodo = () => {
    if (!todoToDelete) return;
    updateTodosState(prev => prev.filter(t => t.id !== todoToDelete));
    setTodoToDelete(null);
  };

  const clearCompleted = () => {
    updateTodosState(prev => prev.filter(t => !t.completed));
  };

  // --- PDF Export ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TODO LIST REPORT", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Task Overview", 14, 50);

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    autoTable(doc, {
      startY: 55,
      head: [['Total Tasks', 'Completed', 'Pending', 'Completion Rate', 'Pending Financial Total']],
      body: [[
        `${stats.total}`,
        `${stats.completed}`,
        `${stats.pending}`,
        `${completionRate}%`,
        `BDT ${stats.pendingAmount}`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const lastY = (doc as any).lastAutoTable.finalY + 12;

    autoTable(doc, {
      startY: lastY,
      head: [['Task', 'Priority', 'Due Date', 'Amount', 'Status']],
      body: todos.map(t => [
        t.text, 
        t.priority.toUpperCase(), 
        t.dueDate || '-', 
        t.amount ? `BDT ${t.amount}` : '-', 
        t.completed ? 'Done' : 'Pending'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | Student Life Dashboard - Todo Report`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save("todo-report.pdf");
  };

  // --- Charts Data ---
  const priorityChartData = {
    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
    datasets: [{
      data: [
        todos.filter(t => t.priority === 'high').length,
        todos.filter(t => t.priority === 'medium').length,
        todos.filter(t => t.priority === 'low').length,
      ],
      backgroundColor: ['#f43f5e', '#f59e0b', '#3b82f6'],
      borderWidth: 0
    }]
  };

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Tasks Completed',
      data: [1, 3, 2, 5, 4, 2, 6],
      borderColor: '#6366f1',
      tension: 0.4,
      fill: false
    }]
  };

  // --- Filtering ---
  const filteredTodos = todos.filter(t => {
    const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'completed' ? t.completed : !t.completed;
    const matchesPriority = filterPriority === 'all' ? true : t.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <i className="fa-solid fa-list-check text-indigo-600 dark:text-indigo-400"></i>
            Todo Task Studio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Organize daily tasks, prioritize work, and manage expenses.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Prominent '+' Add Task Button with Smooth Rotation */}
          <button 
            type="button"
            onClick={handleToggleForm}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all duration-300 flex items-center gap-2.5 shrink-0 ${
              isFormOpen 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
          >
            <i className={`fa-solid fa-plus text-sm transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`}></i>
            <span>{isFormOpen ? 'Close Form' : 'New Task'}</span>
          </button>

          <button 
            type="button"
            onClick={exportPDF}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 shadow-2xs"
          >
            <i className="fa-solid fa-file-pdf text-indigo-600 dark:text-indigo-400"></i>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Top Stat Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.total}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Tasks</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
            <i className="fa-solid fa-list-ul"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.completed}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Completed</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
            <i className="fa-solid fa-check"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.pending}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Pending</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
            <i className="fa-regular fa-clock"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">৳{stats.totalAmount}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Amount</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
        </div>
      </div>

      {/* Collapsible Add/Edit Task Form Container with Smooth Transition */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isFormOpen 
            ? 'max-h-[800px] opacity-100' 
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-md border border-indigo-100 dark:border-indigo-950/50 relative">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i className={`fa-solid ${isEditing ? 'fa-pen-to-square' : 'fa-circle-plus'} text-indigo-600 dark:text-indigo-400`}></i>
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </h3>
            <button 
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold flex items-center gap-1"
            >
              <i className="fa-solid fa-xmark"></i> Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Task Title *</label>
              <input 
                ref={titleInputRef}
                type="text"
                required
                value={formData.text}
                onChange={e => setFormData({...formData, text: e.target.value})}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description (Optional)</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Add additional context or steps..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p})}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                        formData.priority === p 
                          ? p === 'high' ? 'bg-rose-500 text-white border-rose-500 shadow-2xs' 
                          : p === 'medium' ? 'bg-amber-500 text-white border-amber-500 shadow-2xs' 
                          : 'bg-sky-500 text-white border-sky-500 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'high' && <i className="fa-solid fa-angles-up mr-1 text-[10px]"></i>}
                      {p === 'medium' && <i className="fa-solid fa-angle-up mr-1 text-[10px]"></i>}
                      {p === 'low' && <i className="fa-solid fa-angle-down mr-1 text-[10px]"></i>}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Due Date (Optional)</label>
                <input 
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Associated Amount (Optional)</label>
              <div className="relative max-w-xs">
                <input 
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full pl-4 pr-16 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <div className="absolute right-0 top-0 h-full px-3.5 bg-slate-100 dark:bg-slate-800 rounded-r-xl border-l border-slate-200 dark:border-slate-700 flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  ৳ BDT
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-2"
              >
                <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-plus'}`}></i>
                <span>{isEditing ? 'Save Changes' : 'Add Task'}</span>
              </button>
              <button 
                type="button" 
                onClick={resetForm} 
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Search & Filtering Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Only</option>
              <option value="completed">Completed Only</option>
            </select>

            <select 
              value={filterPriority}
              onChange={(e: any) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {todos.some(t => t.completed) && (
              <button 
                type="button"
                onClick={clearCompleted}
                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors shrink-0"
              >
                Clear Completed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800/90 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-clipboard-check text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1">Click "+ New Task" above to create your first todo.</p>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div 
              key={todo.id} 
              className={`group flex items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                todo.completed 
                  ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75' 
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <button 
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
                  className={`mt-0.5 sm:mt-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 ${
                    todo.completed 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 text-transparent'
                  }`}
                >
                  <i className="fa-solid fa-check text-xs"></i>
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-sm font-bold truncate ${todo.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {todo.text}
                    </h4>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      todo.priority === 'high' ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' :
                      todo.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' :
                      'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                    }`}>
                      {todo.priority}
                    </span>

                    {todo.amount && todo.amount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                        ৳{todo.amount} BDT
                      </span>
                    )}
                  </div>

                  {todo.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{todo.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-medium">
                    {todo.dueDate && (
                      <span className="flex items-center gap-1">
                        <i className="fa-regular fa-calendar text-[10px]"></i> Due: {todo.dueDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <i className="fa-regular fa-clock text-[10px]"></i> Created: {todo.createdDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  type="button"
                  onClick={() => handleEdit(todo)}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Edit Task"
                >
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>
                <button 
                  type="button"
                  onClick={() => setTodoToDelete(todo.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {todoToDelete && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-4 mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
              টাস্কটি ডিলিট করতে চান?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Are you sure you want to delete this task?
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setTodoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button 
                type="button"
                onClick={confirmDeleteTodo}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                ডিলিট (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-amber-500"></i>
            Priority Distribution
          </h3>
          <div className="h-56 flex justify-center">
            <Doughnut 
              ref={priorityChartRef}
              data={priorityChartData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15 } } }
              }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
            <i className="fa-solid fa-arrow-trend-up text-indigo-600 dark:text-indigo-400"></i>
            Task Completion Rate
          </h3>
          <div className="h-56">
            <Line 
              ref={trendChartRef}
              data={lineChartData} 
              options={{ 
                maintainAspectRatio: false,
                scales: { 
                  y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                  x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
              }} 
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Todo;
