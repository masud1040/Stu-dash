import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import { fetchCloudData, saveCloudData } from '../src/lib/dbSync';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- Types ---
interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'image' | 'video' | 'website';
  content: string; // Base64 for files, URL for links
  tags: string[];
  dateAdded: string;
  bookmarked: boolean;
  size?: string; // e.g., "2.5 MB"
}

const Resources: React.FC = () => {
  // --- State ---
  const [resources, setResources] = useState<Resource[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  
  // Form State
  const [activeTab, setActiveTab] = useState<'pdf' | 'image' | 'video' | 'website'>('pdf');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    url: '',
    file: null as File | null,
    filePreview: ''
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'image' | 'video' | 'website'>('all');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typeChartRef = useRef<any>(null);
  const growthChartRef = useRef<any>(null);

  // --- Effects ---
  useEffect(() => {
    fetchCloudData('', 'resources', []).then(data => {
      if (data && Array.isArray(data)) {
        setResources(data);
      }
    });
  }, []);

  const updateResources = (updater: (prev: Resource[]) => Resource[]) => {
    try {
      setResources(prev => {
        const updated = updater(prev);
        saveCloudData('', 'resources', updated);
        return updated;
      });
    } catch (e) {
      alert("Storage full! Please delete some items or upload smaller files.");
    }
  };

  // --- Helpers ---
  const getStats = () => {
    const total = resources.length;
    const bookmarked = resources.filter(r => r.bookmarked).length;
    
    // Added this week
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const addedThisWeek = resources.filter(r => new Date(r.dateAdded) >= startOfWeek).length;

    const pdfCount = resources.filter(r => r.type === 'pdf').length;

    return { total, bookmarked, addedThisWeek, pdfCount };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10000000) { // 10MB Limit
        alert("File is too large! Please upload files smaller than 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ 
          ...formData, 
          file: file, 
          filePreview: reader.result as string,
          title: file.name.split('.')[0] // Auto set title
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = (resource: Resource) => {
    if (!resource.content) return;
    const a = document.createElement('a');
    a.href = resource.content;
    let ext = 'bin';
    if (resource.type === 'pdf') ext = 'pdf';
    else if (resource.type === 'image') ext = 'png';
    else {
      window.open(resource.content, '_blank');
      return;
    }
    a.download = `${resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
        alert("Please enter a title");
        return;
    }

    let content = '';
    let size = '-';

    // Handle Content based on type
    if (activeTab === 'pdf' || activeTab === 'image') {
        if (!formData.filePreview) {
            alert("Please upload a file");
            return;
        }
        content = formData.filePreview;
        size = formData.file ? formatFileSize(formData.file.size) : 'Unknown';
    } else {
        if (!formData.url) {
            alert("Please enter a URL");
            return;
        }
        content = formData.url;
    }

    const newResource: Resource = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      type: activeTab,
      content: content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      dateAdded: new Date().toISOString().split('T')[0],
      bookmarked: false,
      size: size
    };

    updateResources(prev => [newResource, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', tags: '', url: '', file: null, filePreview: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      updateResources(prev => prev.filter(r => r.id !== id));
      if (previewResource?.id === id) setPreviewResource(null);
    }
  };

  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete ALL resources? This cannot be undone.")) {
      updateResources(() => []);
      setPreviewResource(null);
    }
  };

  const toggleBookmark = (id: string) => {
    updateResources(prev => prev.map(r => r.id === id ? { ...r, bookmarked: !r.bookmarked } : r));
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resources, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_resources.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const user = JSON.parse(localStorage.getItem('student_user') || '{}');

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("RESOURCE LIBRARY REPORT", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Asset Analysis", pageWidth / 2, 30, { align: 'center' });

    // User
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Student: ${user.name || 'Student'}`, 14, 50);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 55);

    // Summary
    const stats = getStats();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Library Summary", 14, 70);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summary = `You have collected ${stats.total} total learning resources. ${stats.bookmarked} items are bookmarked as important. This week you added ${stats.addedThisWeek} new items.`;
    doc.text(doc.splitTextToSize(summary, pageWidth - 28), 14, 77);

    // Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resource Inventory", 14, 90);

    autoTable(doc, {
      startY: 95,
      head: [['Title', 'Type', 'Tags', 'Date Added']],
      body: resources.map(r => [r.title, r.type.toUpperCase(), r.tags.join(', '), r.dateAdded]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Charts
    let chartY = (doc as any).lastAutoTable.finalY + 20;
    if (chartY > pageHeight - 100) { doc.addPage(); chartY = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Visual Analytics", 14, chartY);

    if (typeChartRef.current && growthChartRef.current) {
        const img1 = typeChartRef.current.toBase64Image();
        const img2 = growthChartRef.current.toBase64Image();
        doc.addImage(img1, 'PNG', 14, chartY + 10, 80, 50);
        doc.addImage(img2, 'PNG', 110, chartY + 10, 80, 50);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} | Student Life Dashboard - Resources`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save("resources.pdf");
  };

  // --- Chart Data ---
  const stats = getStats();
  const typeDistribution = {
    labels: ['PDF', 'Video', 'Image', 'Website'],
    datasets: [{
      data: [
        resources.filter(r => r.type === 'pdf').length,
        resources.filter(r => r.type === 'video').length,
        resources.filter(r => r.type === 'image').length,
        resources.filter(r => r.type === 'website').length,
      ],
      backgroundColor: ['#f43f5e', '#f97316', '#06b6d4', '#6366f1'],
      borderWidth: 0
    }]
  };

  const monthlyGrowth = {
    labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
    datasets: [{
      label: 'Count',
      data: [0, 0, 0, 0, 0, resources.length], // Mock data growth
      borderColor: '#8b5cf6',
      tension: 0.4
    }]
  };

  // --- Filtered Data ---
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  // --- Preview Renderer ---
  const renderPreview = () => {
    if (!previewResource) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-4 shadow-md flex justify-between items-center z-10">
          <button 
            onClick={() => setPreviewResource(null)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white rounded-lg font-bold flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Resources
          </button>
          <div className="text-center">
             <h2 className="text-lg font-bold text-slate-800 dark:text-white">{previewResource.title}</h2>
             <span className="text-xs text-slate-500 uppercase font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{previewResource.type}</span>
          </div>
          <div className="flex gap-2 items-center">
             {(previewResource.type === 'pdf' || previewResource.type === 'image') && (
                <button onClick={() => handleDownload(previewResource)} className="px-3.5 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 text-xs shadow" title="Download Original">
                  <i className="fa-solid fa-download"></i> Download
                </button>
             )}
             <button onClick={() => toggleBookmark(previewResource.id)} className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-yellow-50 text-yellow-500">
               <i className={`fa-${previewResource.bookmarked ? 'solid' : 'regular'} fa-bookmark`}></i>
             </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
           {previewResource.type === 'pdf' && (
             <iframe src={previewResource.content} className="w-full h-full max-w-5xl rounded-lg shadow-2xl bg-white" title="PDF Viewer"></iframe>
           )}
           
           {previewResource.type === 'image' && (
             <img src={previewResource.content} alt="Preview" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
           )}

           {previewResource.type === 'video' && (
             <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                {previewResource.content.includes('youtube') || previewResource.content.includes('youtu.be') ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={previewResource.content.replace('watch?v=', 'embed/')} 
                    title="Video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-white">
                      <i className="fa-brands fa-youtube text-6xl text-red-600 mb-4"></i>
                      <p>External Video Link</p>
                      <a href={previewResource.content} target="_blank" rel="noreferrer" className="mt-4 px-6 py-2 bg-red-600 rounded-lg font-bold hover:bg-red-700">
                        Open Video in New Tab
                      </a>
                   </div>
                )}
             </div>
           )}

           {previewResource.type === 'website' && (
             <div className="w-full h-full max-w-6xl flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-slate-100 p-2 flex items-center gap-2 border-b">
                   <div className="flex gap-1.5 ml-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                   </div>
                   <input disabled value={previewResource.content} className="flex-1 ml-4 bg-white px-3 py-1 rounded text-xs text-slate-500 border border-slate-200" />
                   <a href={previewResource.content} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-primary px-2">
                     <i className="fa-solid fa-up-right-from-square"></i>
                   </a>
                </div>
                <iframe src={previewResource.content} className="flex-1 w-full bg-white" title="Website Preview" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>
                <div className="p-4 text-center bg-yellow-50 text-yellow-800 text-sm">
                   <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                   Some websites may block in-app previews due to security settings. <a href={previewResource.content} target="_blank" rel="noreferrer" className="underline font-bold">Click here to open externally.</a>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Preview Modal */}
      {previewResource && renderPreview()}

      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-2">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Resources Manager</h1>
           <p className="text-slate-500 dark:text-slate-400">Organize and manage your learning materials</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <i className="fa-regular fa-calendar text-primary"></i>
           <span className="font-semibold text-slate-700 dark:text-slate-200">
             {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
           </span>
           <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ml-2">
             {stats.total}
           </div>
           <div className="text-xs text-slate-500">Resources</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-t-4 border-indigo-500 flex items-center justify-between">
            <div>
               <div className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.total}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Total Resources</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-200 dark:shadow-none">
               <i className="fa-solid fa-folder-open"></i>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-t-4 border-sky-500 flex items-center justify-between">
            <div>
               <div className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.bookmarked}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Bookmarked</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center text-xl shadow-lg shadow-sky-200 dark:shadow-none">
               <i className="fa-solid fa-bookmark"></i>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-t-4 border-orange-500 flex items-center justify-between">
            <div>
               <div className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.addedThisWeek}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Added This Week</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xl shadow-lg shadow-orange-200 dark:shadow-none">
               <i className="fa-solid fa-clock"></i>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-t-4 border-pink-500 flex items-center justify-between">
            <div>
               <div className="text-3xl font-extrabold text-slate-800 dark:text-white">{stats.pdfCount}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">PDF Documents</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-pink-200 dark:shadow-none">
               <i className="fa-solid fa-file-pdf"></i>
            </div>
         </div>
      </div>

      {/* Add Resource Form */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 border-l-4 border-l-primary">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <i className="fa-solid fa-circle-plus text-primary"></i> Add New Resource
            </h3>
            <div className="flex gap-2">
               <button onClick={exportJSON} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                 <i className="fa-solid fa-code mr-1"></i> Export JSON
               </button>
               <button onClick={exportPDF} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                 <i className="fa-solid fa-file-pdf mr-1"></i> Export PDF
               </button>
            </div>
         </div>

         {/* Type Tabs */}
         <div className="flex gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2 overflow-x-auto">
            <button 
               onClick={() => setActiveTab('pdf')} 
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pdf' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
               <i className="fa-solid fa-file-pdf"></i> PDF
            </button>
            <button 
               onClick={() => setActiveTab('image')} 
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'image' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
               <i className="fa-solid fa-image"></i> Image
            </button>
            <button 
               onClick={() => setActiveTab('video')} 
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'video' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
               <i className="fa-solid fa-video"></i> Video
            </button>
            <button 
               onClick={() => setActiveTab('website')} 
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'website' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
               <i className="fa-solid fa-globe"></i> Website
            </button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* File Upload Area for PDF/Image */}
            {(activeTab === 'pdf' || activeTab === 'image') && (
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Select {activeTab === 'pdf' ? 'PDF File' : 'Image File'}</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                     {formData.file ? (
                        <div className="text-center">
                           <i className={`fa-solid ${activeTab === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-image text-green-500'} text-4xl mb-2`}></i>
                           <p className="font-bold text-slate-800 dark:text-white">{formData.file.name}</p>
                           <p className="text-xs text-slate-400">{formatFileSize(formData.file.size)}</p>
                           <p className="text-xs text-green-500 font-bold mt-2">Ready to upload</p>
                        </div>
                     ) : (
                        <div className="text-center text-slate-400">
                           <i className="fa-solid fa-cloud-arrow-up text-3xl mb-2"></i>
                           <p className="text-sm font-bold">Tap to upload {activeTab} file</p>
                           <p className="text-xs mt-1">Max size: 10MB</p>
                        </div>
                     )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept={activeTab === 'pdf' ? "application/pdf" : "image/*"} onChange={handleFileChange} />
               </div>
            )}

            {/* URL Input for Video/Website */}
            {(activeTab === 'video' || activeTab === 'website') && (
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{activeTab === 'video' ? 'Video URL (YouTube/Vimeo)' : 'Website URL'}</label>
                  <input 
                     value={formData.url}
                     onChange={e => setFormData({...formData, url: e.target.value})}
                     placeholder={activeTab === 'video' ? "https://www.youtube.com/watch?v=..." : "https://www.wikipedia.org"}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Resource Title</label>
                  <input 
                     value={formData.title}
                     onChange={e => setFormData({...formData, title: e.target.value})}
                     placeholder="Enter resource title"
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tags (comma separated)</label>
                  <input 
                     value={formData.tags}
                     onChange={e => setFormData({...formData, tags: e.target.value})}
                     placeholder="e.g., math, physics, tutorial"
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
               <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter detailed description of the resource"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
               />
            </div>

            <div className="flex gap-3 pt-2">
               <button type="submit" className="w-full md:w-auto px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-plus"></i> Add Resource
               </button>
               <button type="button" onClick={resetForm} className="w-full md:w-auto px-8 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-rotate-right"></i> Clear Form
               </button>
            </div>
         </form>
      </div>

      {/* List Header & Filters */}
      <div className="space-y-4">
         <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-2">
               <i className="fa-solid fa-folder-tree text-primary text-xl"></i>
               <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">My Resources</h2>
                  <div className="text-xs text-slate-500 font-bold">({filteredResources.length})</div>
               </div>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
               <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400'}`}>
                  <i className="fa-solid fa-table-list"></i> Table
               </button>
               <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400'}`}>
                  <i className="fa-solid fa-grid-2"></i> Grid
               </button>
            </div>
         </div>
         
         <div className="text-xs text-slate-400 text-center italic mb-2">Tip: Press Ctrl/Cmd + K to focus search</div>

         <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
               <i className="fa-solid fa-search absolute left-4 top-3.5 text-slate-400 text-sm"></i>
               <input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search resources by title, description or tags..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:border-primary"
               />
            </div>
            <select 
               value={filterType}
               onChange={(e: any) => setFilterType(e.target.value)}
               className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none text-sm font-bold text-slate-600 dark:text-slate-300"
            >
               <option value="all">All Types</option>
               <option value="pdf">PDF Documents</option>
               <option value="image">Images</option>
               <option value="video">Videos</option>
               <option value="website">Websites</option>
            </select>
         </div>

         {/* Resources View */}
         {filteredResources.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-folder-open text-2xl text-slate-400"></i>
               </div>
               <h3 className="font-bold text-slate-600 dark:text-slate-300">No resources found</h3>
               <p className="text-sm text-slate-400">Try adjusting your filters or add a new resource.</p>
            </div>
         ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredResources.map(resource => (
                  <div key={resource.id} className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                     <div className="h-32 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center relative">
                        <i className={`fa-solid ${resource.type === 'pdf' ? 'fa-file-pdf text-red-500' : resource.type === 'image' ? 'fa-image text-green-500' : resource.type === 'video' ? 'fa-video text-orange-500' : 'fa-globe text-blue-500'} text-5xl opacity-80 group-hover:scale-110 transition-transform`}></i>
                        
                        <div className="absolute top-3 right-3 flex gap-2">
                           <button onClick={() => toggleBookmark(resource.id)} className={`w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center ${resource.bookmarked ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}>
                              <i className={`fa-${resource.bookmarked ? 'solid' : 'regular'} fa-bookmark text-xs`}></i>
                           </button>
                        </div>
                        <div className="absolute top-3 left-3">
                           <span className="px-2 py-1 bg-white/90 dark:bg-slate-800/90 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 shadow-sm">
                              {resource.type}
                           </span>
                        </div>
                     </div>
                     
                     <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{resource.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{resource.description || 'No description provided.'}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                           {resource.tags.slice(0,3).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] rounded-full">#{tag}</span>
                           ))}
                           {resource.tags.length > 3 && <span className="text-[10px] text-slate-400">+{resource.tags.length - 3}</span>}
                        </div>

                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-700">
                           <div className="text-[10px] text-slate-400 font-medium">{resource.dateAdded}</div>
                           <div className="flex gap-2">
                              <button onClick={() => handleDelete(resource.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                 <i className="fa-solid fa-trash"></i>
                              </button>
                              <button onClick={() => setPreviewResource(resource)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-primary rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                 Open
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Title</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Description</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tags</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date Added</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {filteredResources.map(resource => (
                           <tr key={resource.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shadow-sm ${resource.type === 'pdf' ? 'bg-red-500' : resource.type === 'image' ? 'bg-green-500' : resource.type === 'video' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                       <i className={`fa-solid ${resource.type === 'pdf' ? 'fa-file-pdf' : resource.type === 'image' ? 'fa-image' : resource.type === 'video' ? 'fa-video' : 'fa-globe'}`}></i>
                                    </div>
                                    <div>
                                       <div className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{resource.title}</div>
                                       <div className="text-[10px] text-slate-400">{resource.size}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${resource.type === 'pdf' ? 'bg-red-50 text-red-600' : resource.type === 'image' ? 'bg-green-50 text-green-600' : resource.type === 'video' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {resource.type}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-xs">{resource.description}</p>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-wrap gap-1">
                                    {resource.tags.slice(0, 2).map((tag, i) => (
                                       <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] rounded-full">#{tag}</span>
                                    ))}
                                    {resource.tags.length > 2 && <span className="text-[10px] text-slate-400">+{resource.tags.length - 2}</span>}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                 {resource.dateAdded}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <button onClick={() => toggleBookmark(resource.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${resource.bookmarked ? 'text-yellow-500 bg-yellow-50' : 'text-slate-300 hover:bg-slate-100'}`}>
                                       <i className={`fa-${resource.bookmarked ? 'solid' : 'regular'} fa-bookmark`}></i>
                                    </button>
                                    <button onClick={() => setPreviewResource(resource)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors" title="View">
                                       <i className="fa-solid fa-eye"></i>
                                    </button>
                                    {(resource.type === 'pdf' || resource.type === 'image') && (
                                       <button onClick={() => handleDownload(resource)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors" title="Download Original">
                                          <i className="fa-solid fa-download"></i>
                                       </button>
                                    )}
                                    <button onClick={() => handleDelete(resource.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors" title="Delete">
                                       <i className="fa-solid fa-trash"></i>
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* Footer Summary */}
         <div className="flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
               Showing {filteredResources.length} of {resources.length} resources
            </div>
            {resources.length > 0 && (
               <button onClick={handleDeleteAll} className="px-4 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-trash"></i> Clear All Resources
               </button>
            )}
         </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-orange-500">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <i className="fa-solid fa-chart-pie"></i> Resource Type Distribution
            </h3>
            <div className="h-64 flex justify-center">
               <Doughnut 
                  ref={typeChartRef}
                  data={typeDistribution} 
                  options={{ 
                     maintainAspectRatio: false,
                     plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20 } } }
                  }} 
               />
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-orange-500">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <i className="fa-solid fa-arrow-trend-up"></i> Resources Added Monthly
            </h3>
            <div className="h-64">
               <Bar 
                  ref={growthChartRef}
                  data={monthlyGrowth} 
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

export default Resources;