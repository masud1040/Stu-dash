import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Note {
  id: string;
  title: string;
  content: string; // HTML content
  date: string; // Last modified date
  category?: string;
  wordCount?: number;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Custom Delete Modal state (Reliable on mobile devices & webviews)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  // PDF Exporting Loading State
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // A4 Page Editor States
  const editorRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const loadedNoteIdRef = useRef<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(1);
  const [selectedFont, setSelectedFont] = useState<string>("'Hind Siliguri', 'Noto Sans Bengali', sans-serif");

  // --- Initial Load & Local Storage Sync ---
  useEffect(() => {
    const saved = localStorage.getItem('notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading notes", e);
      }
    } else {
      // Default welcome sample note
      const defaultNote: Note = {
        id: '1',
        title: 'বাংলা ও ইংরেজি এ৪ নোটস',
        content: '<h1>A4 ডকুমেন্ট এডিটর</h1><p>এখানে আপনি <strong>বাংলা (Hind Siliguri)</strong> এবং ইংরেজি যেকোনো ভাষায় সুন্দরভাবে নোট লিখতে পারবেন।</p><h3>প্রধান বৈশিষ্ট্যসমূহ:</h3><ul><li><strong>বাংলা ফন্ট সাপোর্ট:</strong> পিডিএফ ডাউনলোডে বাংলা লেখা একদম স্পষ্ট দেখাবে।</li><li><strong>মাল্টি-পেজ সাপোর্ট:</strong> লেখা ১ পেজের বেশি হলে স্বয়ংক্রিয়ভাবে ২ বা ততধিক পেজের পিডিএফ তৈরি হবে।</li><li><strong>মোবাইল ডিলিট পপআপ:</strong> মোবাইলেও সহজে ডিলিট করার জন্য কাস্টম কনফার্মেশন পপআপ।</li></ul>',
        date: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: 'Personal',
        wordCount: 45
      };
      setNotes([defaultNote]);
      localStorage.setItem('notes', JSON.stringify([defaultNote]));
    }
  }, []);

  // --- Sync Editor content when switching active note ---
  useEffect(() => {
    if (currentNoteId && editorRef.current) {
      if (loadedNoteIdRef.current !== currentNoteId) {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
          editorRef.current.innerHTML = note.content || '<p><br></p>';
          loadedNoteIdRef.current = currentNoteId;
          calculateCounts();
        }
      }
    } else {
      loadedNoteIdRef.current = null;
    }
  }, [currentNoteId]);

  // --- Persistence Functions ---
  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const createNote = (template: 'blank' | 'lecture' | 'meeting' | 'assignment' = 'blank') => {
    let initialTitle = 'নতুন নোট';
    let initialContent = '<p><br></p>';
    let cat = 'General';

    if (template === 'lecture') {
      initialTitle = 'লেকচার নোটস';
      initialContent = '<h1>লেকচারের শিরোনাম</h1><p><strong>বিষয়:</strong> কম্পিউটার সায়েন্স | <strong>তারিখ:</strong> ' + new Date().toLocaleDateString() + '</p><hr/><p><strong>মূল বিষয়বস্তু:</strong></p><ul><li>বিষয় ১: ...</li></ul>';
      cat = 'Academic';
    } else if (template === 'meeting') {
      initialTitle = 'মিটিং বিবরণী';
      initialContent = '<h1>মিটিং বিবরণী</h1><p><strong>তারিখ:</strong> ' + new Date().toLocaleDateString() + ' | <strong>স্থান:</strong> কনফারেন্স রুম</p><p><strong>উপস্থিতি:</strong> সাইফুল, আরিয়ান, সাকিল</p><hr/><h3>আলোচ্য বিষয়সমূহ</h3><p>মূল সিদ্ধান্তসমূহ...</p>';
      cat = 'Work';
    } else if (template === 'assignment') {
      initialTitle = 'অ্যাসাইনমেন্ট ড্রাফট';
      initialContent = '<h1>অ্যাসাইনমেন্ট শিরোনাম</h1><p><strong>শিক্ষার্থীর নাম:</strong> সাইফুল আলম</p><p><strong>বিষয়:</strong> সফটওয়্যার ইঞ্জিনিয়ারিং</p><hr/><p>এখানে বিস্তারিত লিখুন...</p>';
      cat = 'Academic';
    }

    const newNote: Note = {
      id: Date.now().toString(),
      title: initialTitle,
      content: initialContent,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      category: cat,
      wordCount: 0
    };

    const updated = [newNote, ...notes];
    saveNotesToStorage(updated);
    setCurrentNoteId(newNote.id);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDeleteNote = () => {
    if (!noteToDelete) return;
    const updated = notes.filter(n => n.id !== noteToDelete);
    saveNotesToStorage(updated);
    if (currentNoteId === noteToDelete) {
      setCurrentNoteId(null);
    }
    setNoteToDelete(null);
  };

  const updateCurrentNote = (updates: Partial<Note>) => {
    if (!currentNoteId) return;
    
    setNotes(prevNotes => {
      const updatedNotes = prevNotes.map(n => 
        n.id === currentNoteId 
          ? { 
              ...n, 
              ...updates, 
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
            } 
          : n
      );
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
      return updatedNotes;
    });
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // --- Real-time Input Handler ---
  const handleEditorInput = () => {
    if (!editorRef.current || !currentNoteId) return;
    const newHtml = editorRef.current.innerHTML;
    calculateCounts();
    
    updateCurrentNote({ 
      content: newHtml,
      wordCount: calculateWordCount(editorRef.current.innerText || '')
    });
  };

  const calculateWordCount = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const calculateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setWordCount(calculateWordCount(text));
    setCharCount(text.length);

    // Calculate approximate A4 pages based on pixel height (297mm ~ 1122px at 96DPI)
    if (pageContainerRef.current) {
      const height = pageContainerRef.current.offsetHeight;
      const pages = Math.max(1, Math.ceil(height / 1050));
      setPageCount(pages);
    }
  };

  // --- Formatting Exec Commands ---
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleEditorInput();
    }
  };

  const changeFontFamily = (font: string) => {
    setSelectedFont(font);
    execCmd('fontName', font);
  };

  const insertHorizontalRule = () => {
    execCmd('insertHorizontalRule');
  };

  // --- Bangla-compatible & Multi-Page PDF Generation ---
  const exportPDF = async () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note || !pageContainerRef.current) return;

    try {
      setIsExportingPdf(true);

      const element = pageContainerRef.current;
      
      // Capture canvas at high resolution for crisp Bangla text rendering
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First Page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Subsequent Pages (Multi-Page PDF Support)
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = (note.title || 'Note').trim().replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, '_') || 'Note';
      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const printDocument = () => {
    window.print();
  };

  // --- Home Dashboard View ---
  const renderHome = () => {
    const filteredNotes = notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="space-y-8 animate-fade-in pb-16">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <i className="fa-solid fa-file-signature text-indigo-600 dark:text-indigo-400"></i>
              A4 Document Studio
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Create, format Bangla & English notes on multi-page A4 canvas with PDF export.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes or content..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <button 
              onClick={() => createNote('blank')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-2 shrink-0"
            >
              <i className="fa-solid fa-plus"></i>
              <span className="hidden sm:inline">New A4 Page</span>
            </button>
          </div>
        </div>

        {/* Start a New Document Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start A New A4 Document</h3>
            <span className="text-[11px] text-slate-400">Standard A4 Layout</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Blank Document */}
            <div 
              onClick={() => createNote('blank')}
              className="group cursor-pointer bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col items-center justify-center text-center h-44 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-plus"></i>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Blank Page</p>
              <span className="text-[10px] text-slate-400 mt-0.5">Clean A4 Canvas</span>
            </div>

            {/* Lecture Notes */}
            <div 
              onClick={() => createNote('lecture')}
              className="group cursor-pointer bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col items-center justify-center text-center h-44 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Lecture Notes</p>
              <span className="text-[10px] text-slate-400 mt-0.5">Academic Template</span>
            </div>

            {/* Meeting Minutes */}
            <div 
              onClick={() => createNote('meeting')}
              className="group cursor-pointer bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col items-center justify-center text-center h-44 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-users"></i>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Meeting Minutes</p>
              <span className="text-[10px] text-slate-400 mt-0.5">Agenda & Summary</span>
            </div>

            {/* Assignment Draft */}
            <div 
              onClick={() => createNote('assignment')}
              className="group cursor-pointer bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col items-center justify-center text-center h-44 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-file-lines"></i>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Assignment</p>
              <span className="text-[10px] text-slate-400 mt-0.5">Report Format</span>
            </div>
          </div>
        </div>

        {/* Recent Documents Grid */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent A4 Documents ({filteredNotes.length})</h3>
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['all', 'Academic', 'Work', 'Personal', 'General'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <i className="fa-solid fa-file-circle-xmark text-3xl text-slate-300 dark:text-slate-600 mb-2"></i>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No documents match your filter.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1 hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => setCurrentNoteId(note.id)}
                  className="group cursor-pointer bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between relative"
                >
                  {/* Miniature A4 Paper Preview */}
                  <div className="w-full h-48 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3 overflow-hidden relative mb-3 shadow-inner">
                    <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2 truncate">
                      {note.title || 'Untitled Document'}
                    </div>
                    <div className="text-[8px] leading-relaxed text-slate-400 select-none pointer-events-none line-clamp-6 opacity-80">
                      {note.content.replace(/<[^>]*>?/gm, '') || 'Empty document...'}
                    </div>
                    {/* A4 Badge Overlay */}
                    <span className="absolute bottom-2 right-2 text-[9px] font-semibold px-2 py-0.5 rounded bg-white/90 dark:bg-slate-800/90 text-slate-500 border border-slate-200 dark:border-slate-700">
                      A4 Page
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{note.title || 'Untitled'}</h4>
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteClick(e, note.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                        title="Delete Document"
                      >
                        <i className="fa-solid fa-trash-can text-sm"></i>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <i className="fa-regular fa-calendar text-[10px]"></i>
                        {note.date}
                      </span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {note.wordCount || 0} words
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Premium A4 Multi-Page Document Editor View ---
  const renderEditor = () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return null;

    return (
      <div className="fixed inset-0 z-[60] bg-slate-100 dark:bg-slate-950 flex flex-col animate-fade-in select-none">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-2xs shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentNoteId(null)} 
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Back to Documents"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>

            <div className="flex flex-col">
              <input 
                type="text"
                value={note.title}
                onChange={(e) => updateCurrentNote({ title: e.target.value })}
                className="font-bold text-sm md:text-base text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1 -ml-1 placeholder-slate-400"
                placeholder="Untitled A4 Document"
              />
              <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  {lastSaved ? `Saved ${lastSaved}` : 'Auto-saved'}
                </span>
                <span>•</span>
                <span>A4 Format ({pageCount} {pageCount === 1 ? 'Page' : 'Pages'})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Button inside editor */}
            <button 
              onClick={(e) => handleDeleteClick(e, note.id)}
              className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              title="Delete Note"
            >
              <i className="fa-solid fa-trash-can text-sm"></i>
            </button>

            {/* Print Button */}
            <button 
              onClick={printDocument}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Print Document"
            >
              <i className="fa-solid fa-print text-xs"></i>
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Export PDF Button */}
            <button 
              onClick={exportPDF} 
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              {isExportingPdf ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  <span>Creating PDF...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-pdf"></i>
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Formatting Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0 z-10 shadow-2xs">
          {/* Undo / Redo */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => execCmd('undo')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Undo"
            >
              <i className="fa-solid fa-rotate-left text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('redo')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Redo"
            >
              <i className="fa-solid fa-rotate-right text-xs"></i>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Font Family Selector including Bangla Fonts */}
          <select 
            value={selectedFont}
            onChange={(e) => changeFontFamily(e.target.value)}
            className="h-8 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="'Hind Siliguri', 'Noto Sans Bengali', sans-serif">Hind Siliguri (বাংলা)</option>
            <option value="'Noto Sans Bengali', sans-serif">Noto Sans Bengali (বাংলা)</option>
            <option value="Inter, sans-serif">Inter (Sans-serif)</option>
            <option value="Times New Roman, serif">Times New Roman</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Arial, sans-serif">Arial</option>
          </select>

          {/* Text Style / Block Format */}
          <select 
            onChange={(e) => execCmd('formatBlock', e.target.value)} 
            className="h-8 px-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="p">Normal Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
            <option value="pre">Code Block</option>
          </select>

          {/* Text Color Picker */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg px-1.5 py-0.5 border border-slate-200 dark:border-slate-700" title="Text Color">
            <i className="fa-solid fa-palette text-xs text-slate-500"></i>
            <input 
              type="color" 
              defaultValue="#000000"
              onChange={(e) => execCmd('foreColor', e.target.value)} 
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 gap-0.5">
            <button 
              onClick={() => execCmd('bold')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
              title="Bold"
            >
              B
            </button>
            <button 
              onClick={() => execCmd('italic')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 italic font-serif text-xs"
              title="Italic"
            >
              I
            </button>
            <button 
              onClick={() => execCmd('underline')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 underline text-xs"
              title="Underline"
            >
              U
            </button>
            <button 
              onClick={() => execCmd('strikeThrough')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 line-through text-xs"
              title="Strikethrough"
            >
              S
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Alignments */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 gap-0.5">
            <button 
              onClick={() => execCmd('justifyLeft')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Align Left"
            >
              <i className="fa-solid fa-align-left text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('justifyCenter')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Align Center"
            >
              <i className="fa-solid fa-align-center text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('justifyRight')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Align Right"
            >
              <i className="fa-solid fa-align-right text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('justifyFull')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Justify"
            >
              <i className="fa-solid fa-align-justify text-xs"></i>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Lists & Dividers */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 gap-0.5">
            <button 
              onClick={() => execCmd('insertUnorderedList')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Bullet List"
            >
              <i className="fa-solid fa-list-ul text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('insertOrderedList')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Numbered List"
            >
              <i className="fa-solid fa-list-ol text-xs"></i>
            </button>
            <button 
              onClick={insertHorizontalRule} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Horizontal Line"
            >
              <i className="fa-solid fa-minus text-xs"></i>
            </button>
            <button 
              onClick={() => execCmd('removeFormat')} 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Clear Formatting"
            >
              <i className="fa-solid fa-eraser text-xs"></i>
            </button>
          </div>

          {/* Zoom Level Controls */}
          <div className="ml-auto flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              className="hover:text-slate-900 dark:hover:text-white px-1 font-bold"
            >
              -
            </button>
            <span className="font-semibold text-[11px] min-w-[32px] text-center">{zoomLevel}%</span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
              className="hover:text-slate-900 dark:hover:text-white px-1 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* A4 Paper Scroll Canvas Container */}
        <div 
          className="flex-1 overflow-y-auto bg-slate-200/70 dark:bg-slate-950 p-4 md:p-8 flex justify-center cursor-text"
          onClick={() => editorRef.current?.focus()}
        >
          {/* A4 Sheet Paper Container (Target for PDF Capture) */}
          <div 
            ref={pageContainerRef}
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 shadow-2xl rounded-sm p-[20mm] md:p-[25mm] border border-slate-300/80 dark:border-slate-800 relative print:p-0 print:shadow-none print:border-none my-2 flex flex-col justify-between"
          >
            <div>
              {/* Header Watermark Line */}
              <div className="text-[10px] text-slate-300 dark:text-slate-700 font-semibold uppercase tracking-widest flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-2 select-none print:hidden">
                <span>{note.title || 'Untitled Document'}</span>
                <span>A4 Document</span>
              </div>

              {/* ContentEditable Area */}
              <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                className="outline-none min-h-[240mm] prose dark:prose-invert max-w-none leading-relaxed text-slate-900 dark:text-slate-100 text-sm md:text-base font-normal selection:bg-indigo-100 dark:selection:bg-indigo-900"
                style={{ fontFamily: selectedFont }}
              />
            </div>

            {/* Footer Watermark Line */}
            <div className="mt-8 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-300 dark:text-slate-700 select-none print:hidden">
              <span>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
              <span>Student Life Studio</span>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0 select-none z-10">
          <div className="flex items-center gap-4">
            <span>Words: <strong className="text-slate-800 dark:text-slate-200">{wordCount}</strong></span>
            <span>Characters: <strong className="text-slate-800 dark:text-slate-200">{charCount}</strong></span>
            <span>Est. Pages: <strong className="text-indigo-600 dark:text-indigo-400">{pageCount} A4</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <i className="fa-solid fa-check text-[10px]"></i>
              Bengali Font Active
            </span>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <>
      {currentNoteId ? renderEditor() : renderHome()}

      {/* Reliable Mobile & Desktop Custom Delete Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-4 mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
              ডকুমেন্টটি মুছে ফেলতে চান?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button 
                type="button"
                onClick={confirmDeleteNote}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                ডিলিট (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notes;
