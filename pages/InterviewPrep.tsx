import React, { useState, useEffect } from 'react';

export interface QuestionItem {
  id: string;
  question: string;
  answer: string;
  tag: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TAGS = ['React', 'JavaScript', 'System Design', 'Data Structures', 'Behavioral'];

const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-1',
    question: 'What is the Virtual DOM in React and how does reconciliation work?',
    answer: 'The Virtual DOM is an in-memory lightweight representation of the actual DOM elements. When state changes, React creates a new Virtual DOM tree and compares it with the previous one (a process called "diffing"). React then calculates the minimal set of operations needed to update the real DOM and applies them efficiently (called "reconciliation").',
    tag: 'React',
    favorite: true,
    createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    updatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  },
  {
    id: 'q-2',
    question: 'Explain JavaScript closures and provide a common use case.',
    answer: 'A closure is the combination of a function bundled together with references to its surrounding state (lexical environment). In JavaScript, closures give inner functions access to an outer function\'s scope even after the outer function has executed. Common use cases include data privacy / encapsulation, event handlers, and currying.',
    tag: 'JavaScript',
    favorite: false,
    createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    updatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
];

const InterviewPrep: React.FC = () => {
  // Local storage loaded state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Filter and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [isCustomTag, setIsCustomTag] = useState(false);
  const [formErrors, setFormErrors] = useState<{ question?: string; answer?: string; tag?: string }>({});

  // Modals & Active Items
  const [detailModalItem, setDetailModalItem] = useState<QuestionItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<QuestionItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Form State
  const [editQuestionInput, setEditQuestionInput] = useState('');
  const [editAnswerInput, setEditAnswerInput] = useState('');
  const [editSelectedTag, setEditSelectedTag] = useState('');
  const [editCustomTagInput, setEditCustomTagInput] = useState('');
  const [isEditCustomTag, setIsEditCustomTag] = useState(false);

  // JSON Paste Modal State
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonPasteInput, setJsonPasteInput] = useState('');

  // File input ref for JSON import
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load from local storage
  useEffect(() => {
    const storedQuestions = localStorage.getItem('interview_questions');
    if (storedQuestions) {
      try {
        setQuestions(JSON.parse(storedQuestions));
      } catch (e) {
        setQuestions(INITIAL_QUESTIONS);
      }
    } else {
      setQuestions(INITIAL_QUESTIONS);
      localStorage.setItem('interview_questions', JSON.stringify(INITIAL_QUESTIONS));
    }

    const storedTags = localStorage.getItem('interview_tags');
    if (storedTags) {
      try {
        setTags(JSON.parse(storedTags));
      } catch (e) {
        setTags(DEFAULT_TAGS);
      }
    } else {
      setTags(DEFAULT_TAGS);
      localStorage.setItem('interview_tags', JSON.stringify(DEFAULT_TAGS));
    }
  }, []);

  // Sync questions to LocalStorage
  const saveQuestionsToStorage = (updated: QuestionItem[]) => {
    setQuestions(updated);
    localStorage.setItem('interview_questions', JSON.stringify(updated));
  };

  // Sync tags to LocalStorage
  const saveTagsToStorage = (updatedTags: string[]) => {
    const unique = Array.from(new Set(updatedTags)).filter(Boolean);
    setTags(unique);
    localStorage.setItem('interview_tags', JSON.stringify(unique));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Export JSON
  const exportJSON = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      questions,
      tags
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_prep_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Interview data exported as JSON successfully!');
  };

  // Robust JSON Processor & Merger
  const processAndMergeJSONData = (parsed: any) => {
    let rawList: any[] = [];
    let extractedTags: string[] = [];

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) {
        rawList = parsed.questions;
      } else if (Array.isArray(parsed.data)) {
        rawList = parsed.data;
      } else if (Array.isArray(parsed.items)) {
        rawList = parsed.items;
      } else {
        // Try to find any array property in the object
        const foundKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        if (foundKey) {
          rawList = parsed[foundKey];
        } else {
          // Single question object?
          rawList = [parsed];
        }
      }
      if (Array.isArray(parsed.tags)) {
        extractedTags = parsed.tags;
      }
    }

    if (!rawList || rawList.length === 0) {
      alert('No valid questions found in the JSON data. Please ensure it contains question and answer fields.');
      return false;
    }

    const newItems: QuestionItem[] = rawList.map((item, idx) => ({
      id: item.id || `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      question: item.question || item.title || item.q || item.prompt || 'Untitled Question',
      answer: item.answer || item.desc || item.a || item.explanation || item.solution || 'No answer provided.',
      tag: item.tag || item.category || item.topic || 'General',
      favorite: Boolean(item.favorite || item.fav || false),
      createdAt: item.createdAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      updatedAt: item.updatedAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }));

    const merged = [...newItems, ...questions];
    const uniqueMap = new Map();
    merged.forEach(item => uniqueMap.set(item.id, item));
    const finalQ = Array.from(uniqueMap.values()) as QuestionItem[];
    saveQuestionsToStorage(finalQ);

    const allTags = [...tags, ...extractedTags, ...newItems.map(i => i.tag)];
    saveTagsToStorage(allTags);

    showToast(`Successfully imported ${newItems.length} questions!`);
    return true;
  };

  // Import JSON via File Upload
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        processAndMergeJSONData(parsed);
      } catch (err) {
        alert('Failed to parse JSON file. Please verify the JSON syntax.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import JSON via Paste Modal
  const handlePasteJSONSubmit = () => {
    if (!jsonPasteInput.trim()) {
      alert('Please paste valid JSON text.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonPasteInput);
      const success = processAndMergeJSONData(parsed);
      if (success) {
        setIsJsonModalOpen(false);
        setJsonPasteInput('');
      }
    } catch (err) {
      alert('Invalid JSON format. Please check your syntax and try again.');
    }
  };

  // Export Professional A4 PDF / Print Report
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Interview Preparation & Mastery Guide - AI Studio</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              background: #ffffff;
              margin: 0;
              padding: 0;
            }
            .header {
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin-top: 4px;
            }
            .meta {
              text-align: right;
              font-size: 12px;
              color: #64748b;
            }
            .summary-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              font-size: 13px;
            }
            .question-item {
              page-break-inside: avoid;
              margin-bottom: 24px;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 18px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .q-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .tag-badge {
              background: #e0e7ff;
              color: #4f46e5;
              font-size: 11px;
              font-weight: 700;
              padding: 3px 10px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .date {
              font-size: 11px;
              color: #94a3b8;
            }
            .q-title {
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 10px 0;
            }
            .answer-box {
              background: #f8fafc;
              border-left: 4px solid #4f46e5;
              padding: 12px 14px;
              font-size: 13px;
              color: #334155;
              white-space: pre-wrap;
              border-radius: 0 6px 6px 0;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Interview Preparation Report</h1>
              <div class="subtitle">AI Studio Career & Technical Mastery Guide</div>
            </div>
            <div class="meta">
              <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              <div><strong>Total Questions:</strong> ${questions.length}</div>
            </div>
          </div>

          <div class="summary-card">
            <div><strong>Active Filter:</strong> Tag: ${selectedTagFilter} ${favoritesOnly ? '• Favorites Only' : ''}</div>
            <div><strong>Report Items:</strong> ${filteredQuestions.length} Questions</div>
          </div>

          <div>
            ${filteredQuestions.map((q, idx) => `
              <div class="question-item">
                <div class="q-header">
                  <span class="tag-badge">${q.tag}</span>
                  <span class="date">#${idx + 1} • Added: ${q.createdAt}</span>
                </div>
                <h3 class="q-title">${q.question}</h3>
                <div class="answer-box"><strong>Answer:</strong>\n${q.answer}</div>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            Generated via AI Studio Build • Professional A4 Interview Guide
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Add Question Handler
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { question?: string; answer?: string; tag?: string } = {};

    const qTrimmed = questionInput.trim();
    const aTrimmed = answerInput.trim();
    const finalTag = (isCustomTag ? customTagInput : selectedTag).trim();

    if (!qTrimmed) errors.question = 'Question is required';
    if (!aTrimmed) errors.answer = 'Answer is required';
    if (!finalTag) errors.tag = 'Tag / Subject is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Save tag if new
    if (finalTag && !tags.includes(finalTag)) {
      saveTagsToStorage([...tags, finalTag]);
    }

    const nowFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const newQuestion: QuestionItem = {
      id: 'q-' + Date.now(),
      question: qTrimmed,
      answer: aTrimmed,
      tag: finalTag,
      favorite: false,
      createdAt: nowFormatted,
      updatedAt: nowFormatted
    };

    saveQuestionsToStorage([newQuestion, ...questions]);

    // Reset Form
    setQuestionInput('');
    setAnswerInput('');
    setSelectedTag('');
    setCustomTagInput('');
    setIsCustomTag(false);
    setFormErrors({});
    setIsFormOpen(false);
    showToast('Question saved successfully!');
  };

  // Toggle Favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = questions.map(q => q.id === id ? { ...q, favorite: !q.favorite } : q);
    saveQuestionsToStorage(updated);

    if (detailModalItem && detailModalItem.id === id) {
      setDetailModalItem(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  // Delete Question
  const handleDelete = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    saveQuestionsToStorage(updated);
    if (detailModalItem && detailModalItem.id === id) {
      setDetailModalItem(null);
    }
    setDeleteConfirmId(null);
    showToast('Question deleted');
  };

  // Open Edit Modal
  const openEditModal = (q: QuestionItem) => {
    setEditModalItem(q);
    setEditQuestionInput(q.question);
    setEditAnswerInput(q.answer);

    if (tags.includes(q.tag)) {
      setEditSelectedTag(q.tag);
      setIsEditCustomTag(false);
      setEditCustomTagInput('');
    } else {
      setEditSelectedTag('CUSTOM');
      setIsEditCustomTag(true);
      setEditCustomTagInput(q.tag);
    }
  };

  // Save Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;

    const qTrimmed = editQuestionInput.trim();
    const aTrimmed = editAnswerInput.trim();
    const finalTag = (isEditCustomTag ? editCustomTagInput : editSelectedTag).trim();

    if (!qTrimmed || !aTrimmed || !finalTag) {
      showToast('Please fill out all required fields');
      return;
    }

    if (finalTag && !tags.includes(finalTag)) {
      saveTagsToStorage([...tags, finalTag]);
    }

    const nowFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const updated = questions.map(q => {
      if (q.id === editModalItem.id) {
        return {
          ...q,
          question: qTrimmed,
          answer: aTrimmed,
          tag: finalTag,
          updatedAt: nowFormatted
        };
      }
      return q;
    });

    saveQuestionsToStorage(updated);

    // Update Detail Modal if opened
    if (detailModalItem && detailModalItem.id === editModalItem.id) {
      setDetailModalItem({
        ...detailModalItem,
        question: qTrimmed,
        answer: aTrimmed,
        tag: finalTag,
        updatedAt: nowFormatted
      });
    }

    setEditModalItem(null);
    showToast('Question updated successfully!');
  };

  // Copy helpers
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(message);
    }).catch(() => {
      showToast('Failed to copy text');
    });
  };

  // Filtered Questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'All' || q.tag === selectedTagFilter;
    const matchesFav = !favoritesOnly || q.favorite;
    return matchesSearch && matchesTag && matchesFav;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[110] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <i className="fa-solid fa-circle-check text-emerald-400 text-lg"></i>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-3">
              <i className="fa-solid fa-graduation-cap"></i> Career & Tech Mastery
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Interview Preparation</h1>
            <p className="text-indigo-100 mt-1 max-w-xl text-sm md:text-base">
              Master technical & behavioral interview questions, organize with custom tags, and export professionally styled A4 PDFs or JSON backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Hidden JSON file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />

            {/* Export PDF (A4) */}
            <button
              onClick={exportPDF}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-xs transition-all shadow-lg flex items-center gap-2 transform active:scale-95"
              title="Export formatted questions as A4 printable PDF report"
            >
              <i className="fa-solid fa-file-pdf text-rose-500 text-sm"></i>
              <span>Export A4 PDF</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={exportJSON}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all border border-white/20 backdrop-blur-md flex items-center gap-2 transform active:scale-95"
              title="Export all interview questions as JSON file"
            >
              <i className="fa-solid fa-code text-amber-300 text-sm"></i>
              <span>Export JSON</span>
            </button>

            {/* Import JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all border border-white/20 backdrop-blur-md flex items-center gap-2 transform active:scale-95"
              title="Import interview questions from JSON file"
            >
              <i className="fa-solid fa-file-arrow-up text-emerald-300 text-sm"></i>
              <span>Import JSON</span>
            </button>

            {/* Paste JSON */}
            <button
              onClick={() => setIsJsonModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all border border-white/20 backdrop-blur-md flex items-center gap-2 transform active:scale-95"
              title="Paste JSON questions directly"
            >
              <i className="fa-solid fa-code text-cyan-300 text-sm"></i>
              <span>Paste JSON</span>
            </button>
          </div>
        </div>

        {/* Quick Stats bar inside banner */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <div className="text-2xl font-extrabold">{questions.length}</div>
            <div className="text-xs text-indigo-200">Total Questions</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <div className="text-2xl font-extrabold">{questions.filter(q => q.favorite).length}</div>
            <div className="text-xs text-indigo-200">Favorited Items</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <div className="text-2xl font-extrabold">{tags.length}</div>
            <div className="text-xs text-indigo-200">Categories / Tags</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <div className="text-2xl font-extrabold">
              {questions.length > 0 ? `${Math.round((questions.filter(q => q.favorite).length / questions.length) * 100)}%` : '0%'}
            </div>
            <div className="text-xs text-indigo-200">Mastery Ratio</div>
          </div>
        </div>
      </div>

      {/* 1. Add Interview Question Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`flex items-center justify-between cursor-pointer select-none ${isFormOpen ? 'mb-6 pb-4 border-b border-slate-100 dark:border-slate-700' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold transition-transform duration-200 hover:scale-105">
              <i className={`fa-solid ${isFormOpen ? 'fa-minus' : 'fa-plus'} text-lg`}></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Add New Interview Question</span>
                {!isFormOpen && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900/50">
                    Click + to expand
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Save a technical or behavioral question with detailed answers.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFormOpen(!isFormOpen);
            }}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all shadow-2xs"
            title={isFormOpen ? "Hide Form" : "Show Form"}
          >
            <i className={`fa-solid ${isFormOpen ? 'fa-xmark' : 'fa-plus'} text-sm`}></i>
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleAddQuestion} className="space-y-5 animate-fade-in">
          {/* Question Textarea */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Question <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                if (formErrors.question) setFormErrors(prev => ({ ...prev, question: undefined }));
              }}
              placeholder="e.g. What is the difference between process and thread in Operating Systems?"
              className={`w-full px-4 py-3 rounded-xl border ${
                formErrors.question ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-primary'
              } bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            ></textarea>
            {formErrors.question && <p className="text-xs text-rose-500 mt-1">{formErrors.question}</p>}
          </div>

          {/* Answer Large Textarea */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Answer <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={answerInput}
              onChange={(e) => {
                setAnswerInput(e.target.value);
                if (formErrors.answer) setFormErrors(prev => ({ ...prev, answer: undefined }));
              }}
              placeholder="Write a clear, structured answer with key points or code examples..."
              className={`w-full px-4 py-3 rounded-xl border ${
                formErrors.answer ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-primary'
              } bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            ></textarea>
            {formErrors.answer && <p className="text-xs text-rose-500 mt-1">{formErrors.answer}</p>}
          </div>

          {/* Tag / Subject Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Tag / Subject <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!isCustomTag ? (
                <div className="relative">
                  <select
                    value={selectedTag}
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') {
                        setIsCustomTag(true);
                        setSelectedTag('');
                      } else {
                        setSelectedTag(e.target.value);
                        if (formErrors.tag) setFormErrors(prev => ({ ...prev, tag: undefined }));
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.tag ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">-- Select Existing Tag --</option>
                    {tags.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="CREATE_NEW" className="font-semibold text-primary">+ Create New Tag...</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => {
                      setCustomTagInput(e.target.value);
                      if (formErrors.tag) setFormErrors(prev => ({ ...prev, tag: undefined }));
                    }}
                    placeholder="Type new tag name..."
                    className={`flex-1 px-4 py-3 rounded-xl border ${
                      formErrors.tag ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTag(false);
                      setCustomTagInput('');
                    }}
                    className="px-3 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-xs font-semibold"
                    title="Select existing tag"
                  >
                    Select List
                  </button>
                </div>
              )}

              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 px-2">
                <i className="fa-solid fa-circle-info mr-1.5 text-primary"></i>
                Selecting or typing a new tag saves it automatically for future reuse.
              </div>
            </div>
            {formErrors.tag && <p className="text-xs text-rose-500 mt-1">{formErrors.tag}</p>}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>Save Question</span>
            </button>
          </div>
        </form>
        )}
      </div>

      {/* Question List Section Header & Search/Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-list-check text-primary"></i>
            <span>Question Bank</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
              {filteredQuestions.length}
            </span>
          </h2>

          {/* Controls: Search, Tag Dropdown, Favorites Only */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Tag Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="px-4 py-2 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
              >
                <option value="All">All Tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <i className="fa-solid fa-filter absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
            </div>

            {/* Favorites Toggle */}
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                favoritesOnly
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <i className={`fa-solid fa-star ${favoritesOnly ? 'text-amber-500' : 'text-slate-400'}`}></i>
              <span>Favorites</span>
            </button>
          </div>
        </div>

        {/* 3. Question List */}
        {filteredQuestions.length === 0 ? (
          /* 11. Empty State */
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto text-slate-400 text-2xl mb-4">
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No Questions Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {searchQuery || selectedTagFilter !== 'All' || favoritesOnly
                ? 'Try adjusting your search criteria or filter options.'
                : 'Get started by adding your first interview question above.'}
            </p>
            {(searchQuery || selectedTagFilter !== 'All' || favoritesOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTagFilter('All');
                  setFavoritesOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                onClick={() => setDetailModalItem(q)}
                className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between overflow-hidden"
              >
                {/* Subtle top gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    {/* Tag Badge */}
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1.5 shadow-2xs">
                      <i className="fa-solid fa-tag text-[10px]"></i>
                      {q.tag}
                    </span>

                    {/* Favorite Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(q.id, e)}
                      className={`p-2 rounded-xl transition-all ${
                        q.favorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={q.favorite ? 'Remove from favorites' : 'Mark as favorite'}
                    >
                      <i className="fa-solid fa-star text-base"></i>
                    </button>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-3 leading-snug">
                    {q.question}
                  </h3>

                  {/* Answer Preview */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 font-normal">
                    {q.answer}
                  </p>
                </div>

                {/* Card Footer: Date & Read More */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-calendar"></i>
                    {q.createdAt}
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Read Q&A</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Question Details Modal / Popup */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                    {detailModalItem.tag}
                  </span>
                  <span className="text-xs text-slate-400">Created: {detailModalItem.createdAt}</span>
                  {detailModalItem.updatedAt && detailModalItem.updatedAt !== detailModalItem.createdAt && (
                    <span className="text-xs text-slate-400">• Updated: {detailModalItem.updatedAt}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {detailModalItem.question}
                </h3>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleFavorite(detailModalItem.id)}
                  className={`p-2 rounded-xl transition-colors ${
                    detailModalItem.favorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                  }`}
                  title="Toggle favorite"
                >
                  <i className="fa-solid fa-star text-xl"></i>
                </button>
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Content - Answer display */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-message text-primary"></i> Answer
                </h4>
                <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-5 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {detailModalItem.answer}
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              {/* Copy Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => copyToClipboard(detailModalItem.answer, 'Answer copied to clipboard!')}
                  className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-medium transition-colors flex items-center gap-1.5 border border-indigo-200/50 dark:border-indigo-800/50"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Copy Answer</span>
                </button>

                <button
                  onClick={() => copyToClipboard(`Q: ${detailModalItem.question}\n\nA:\n${detailModalItem.answer}`, 'Question & Answer copied!')}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-paste"></i>
                  <span>Copy Q & A</span>
                </button>
              </div>

              {/* Edit & Delete Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openEditModal(detailModalItem);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setDeleteConfirmId(detailModalItem.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-trash"></i>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Question Modal */}
      {editModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-amber-500"></i>
                <span>Edit Question</span>
              </h3>
              <button
                onClick={() => setEditModalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Question</label>
                <textarea
                  rows={2}
                  value={editQuestionInput}
                  onChange={(e) => setEditQuestionInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Answer</label>
                <textarea
                  rows={5}
                  value={editAnswerInput}
                  onChange={(e) => setEditAnswerInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tag / Subject</label>
                {!isEditCustomTag ? (
                  <select
                    value={editSelectedTag}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsEditCustomTag(true);
                        setEditSelectedTag('');
                      } else {
                        setEditSelectedTag(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    {tags.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="CUSTOM">+ Create New Tag...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editCustomTagInput}
                      onChange={(e) => setEditCustomTagInput(e.target.value)}
                      placeholder="Type tag name..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditCustomTag(false);
                        setEditSelectedTag(tags[0] || '');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                    >
                      Cancel Custom
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-indigo-600 transition-colors shadow-lg shadow-primary/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/30"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Paste JSON Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-code text-indigo-500 text-lg"></i>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Paste Interview Questions (JSON)</h3>
              </div>
              <button
                onClick={() => setIsJsonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste your JSON array or object containing interview questions. Compatible with ChatGPT, Claude, and AI Studio exports.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                JSON Content
              </label>
              <textarea
                rows={8}
                value={jsonPasteInput}
                onChange={(e) => setJsonPasteInput(e.target.value)}
                placeholder={`[\n  {\n    "question": "What is React?",\n    "answer": "A JavaScript library for building user interfaces.",\n    "tag": "React"\n  }\n]`}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsJsonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteJSONSubmit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <i className="fa-solid fa-file-arrow-down"></i>
                Import JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPrep;
