import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import ImageResizer from '../components/ImageResizer';
import UrlShortener from '../components/UrlShortener';
import CvMakerCard from '../components/CvMakerCard';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: 'exam' | 'class' | 'meeting' | 'event';
}

interface CVData {
  fileName: string;
  fileData: string;
  uploadDate: string;
}

const Others: React.FC = () => {
  // --- QR Code State ---
  const [qrText, setQrText] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrColor, setQrColor] = useState('#6366f1'); // Primary Color
  const [qrBgColor, setQrBgColor] = useState('#ffffff');

  // --- Routine State ---
  const [routineImage, setRoutineImage] = useState<string | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const routineInputRef = useRef<HTMLInputElement>(null);

  // --- CV State ---
  const [cvData, setCvData] = useState<CVData | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // --- Meeting State ---
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    type: 'meeting'
  });

  // --- Effects ---
  useEffect(() => {
    // Load all persisted data
    const savedRoutine = localStorage.getItem('class_routine');
    if (savedRoutine) setRoutineImage(savedRoutine);

    const savedMeetings = localStorage.getItem('meetings');
    if (savedMeetings) setMeetings(JSON.parse(savedMeetings));

    const savedCV = localStorage.getItem('student_cv');
    if (savedCV) setCvData(JSON.parse(savedCV));
  }, []);

  useEffect(() => {
    generateQR();
  }, [qrText, qrColor, qrBgColor]);

  // --- QR Logic ---
  const generateQR = async () => {
    if (!qrText) {
        setQrImage('');
        return;
    }
    try {
      const url = await QRCode.toDataURL(qrText, {
        width: 400,
        margin: 2,
        color: {
          dark: qrColor,
          light: qrBgColor
        }
      });
      setQrImage(url);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadQR = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `qrcode_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Routine Logic ---
  const handleRoutineUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
          alert("Image too large. Please upload < 5MB");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setRoutineImage(base64);
        localStorage.setItem('class_routine', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteRoutine = () => {
    if(confirm("Remove class routine image?")) {
        setRoutineImage(null);
        localStorage.removeItem('class_routine');
    }
  };

  const downloadRoutine = () => {
      if (!routineImage) return;
      const link = document.createElement('a');
      link.href = routineImage;
      link.download = 'my_class_routine.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- CV Logic ---
  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.type !== 'application/pdf') {
              alert("Please upload a PDF file.");
              return;
          }
          if (file.size > 5000000) { // 5MB limit for localStorage safety
              alert("File too large. Max 5MB allowed.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const newData: CVData = {
                  fileName: file.name,
                  fileData: reader.result as string,
                  uploadDate: new Date().toLocaleDateString()
              };
              setCvData(newData);
              localStorage.setItem('student_cv', JSON.stringify(newData));
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteCV = () => {
      if(confirm("Delete your CV?")) {
          setCvData(null);
          localStorage.removeItem('student_cv');
      }
  };

  const downloadCV = () => {
      if(!cvData) return;
      const link = document.createElement('a');
      link.href = cvData.fileData;
      link.download = cvData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Meeting Logic ---
  const handleMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;
    
    setMeetings(prev => {
        const newEvent: Meeting = {
          id: Date.now().toString(),
          title: formData.title,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          type: formData.type as any
        };
        const updated = [...prev, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('meetings', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        return updated;
    });
    
    setFormData({ title: '', date: new Date().toISOString().split('T')[0], time: '', location: '', type: 'meeting' });
    setShowMeetingForm(false);
  };

  const deleteMeeting = (id: string) => {
    if(confirm("Delete this event?")) {
        setMeetings(prev => {
            const updated = prev.filter(m => m.id !== id);
            localStorage.setItem('meetings', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-red-100 text-red-700 border-red-200';
      case 'class': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'meeting': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'event': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Student Toolkit</h1>
           <p className="text-slate-500 dark:text-slate-400">Essential utilities and academic schedule manager</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <i className="fa-regular fa-clock text-primary"></i>
           <span className="font-semibold text-slate-700 dark:text-slate-200">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
      </div>

      {/* Online CV Maker Tool */}
      <CvMakerCard />

      {/* Image Resizer Studio */}
      <ImageResizer />

      {/* Custom Link Generator & URL Shortener */}
      <UrlShortener />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- QR Code Generator --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shadow-lg shadow-slate-300 dark:shadow-none">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">QR Studio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generate custom colored QR codes</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 flex-1">
             <div className="flex-1 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Content</label>
                   <input 
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-primary transition-colors"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Color</label>
                      <div className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg">
                         <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                         <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{qrColor}</span>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Background</label>
                      <div className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg">
                         <input type="color" value={qrBgColor} onChange={e => setQrBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                         <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{qrBgColor}</span>
                      </div>
                   </div>
                </div>
                <button 
                   onClick={downloadQR}
                   disabled={!qrImage}
                   className="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                   <i className="fa-solid fa-download"></i> Download PNG
                </button>
             </div>

             <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 w-full md:w-48 h-48">
                {qrImage ? (
                   <img src={qrImage} alt="Generated QR" className="w-40 h-40 object-contain rounded-lg shadow-sm" />
                ) : (
                   <div className="text-center text-slate-400">
                      <i className="fa-solid fa-qrcode text-3xl mb-2 opacity-50"></i>
                      <p className="text-xs">Preview</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* --- CV / Resume Manager --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
           <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200 dark:shadow-none">
                <i className="fa-solid fa-file-contract"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">CV / Resume</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Keep your profile ready & create online</p>
              </div>
            </div>
            <a
              href="https://cv-maker-nine-alpha.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/30"
              title="Open CV Maker Website"
            >
              <span>CV Maker</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
          </div>

          <div className="flex-1 flex flex-col justify-center">
             {cvData ? (
                <div className="space-y-3">
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 flex items-center gap-4">
                     <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-red-500 text-2xl shadow-sm">
                        <i className="fa-solid fa-file-pdf"></i>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 dark:text-white truncate">{cvData.fileName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Uploaded: {cvData.uploadDate}</div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={downloadCV} className="w-8 h-8 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm flex items-center justify-center hover:text-primary transition-colors" title="Download">
                           <i className="fa-solid fa-download"></i>
                        </button>
                        <button onClick={deleteCV} className="w-8 h-8 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm flex items-center justify-center hover:text-red-500 transition-colors" title="Delete">
                           <i className="fa-solid fa-trash"></i>
                        </button>
                     </div>
                  </div>
                  <a
                    href="https://cv-maker-nine-alpha.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 text-xs font-semibold text-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Create a new updated CV on CV Maker</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                </div>
             ) : (
                <div className="space-y-3">
                  <div 
                    onClick={() => cvInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                  >
                     <div className="w-14 h-14 bg-orange-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-orange-500 mb-3 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                     </div>
                     <h4 className="font-bold text-slate-700 dark:text-slate-200">Upload CV (PDF)</h4>
                     <p className="text-xs text-slate-400 mt-1">Max file size 5MB</p>
                  </div>

                  <div className="text-center">
                    <span className="text-xs text-slate-400">or</span>
                  </div>

                  <a
                    href="https://cv-maker-nine-alpha.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
                    <span>Build with CV Maker Website</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                </div>
             )}
             <input type="file" ref={cvInputRef} className="hidden" accept="application/pdf" onChange={handleCVUpload} />
          </div>
        </div>

        {/* --- Class Routine --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    <i className="fa-solid fa-calendar-week"></i>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Class Routine</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Weekly timetable image</p>
                 </div>
              </div>
              {routineImage && (
                 <div className="flex gap-2">
                    <button onClick={downloadRoutine} className="text-slate-400 hover:text-primary transition-colors" title="Download">
                       <i className="fa-solid fa-download"></i>
                    </button>
                    <button onClick={deleteRoutine} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                       <i className="fa-solid fa-trash"></i>
                    </button>
                 </div>
              )}
           </div>

           <div className="flex-1 min-h-[250px] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
              {routineImage ? (
                 <>
                    <img 
                       src={routineImage} 
                       alt="Routine" 
                       className="w-full h-full object-contain cursor-pointer"
                       onClick={() => setShowRoutineModal(true)}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => setShowRoutineModal(true)} className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-lg font-bold hover:bg-white/30 transition-all">
                          <i className="fa-solid fa-expand mr-2"></i> View Fullscreen
                       </button>
                    </div>
                 </>
              ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <i className="fa-regular fa-image text-4xl text-slate-300 mb-3"></i>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No routine uploaded</p>
                    <button 
                       onClick={() => routineInputRef.current?.click()}
                       className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-all"
                    >
                       Select Image
                    </button>
                 </div>
              )}
              <input type="file" ref={routineInputRef} className="hidden" accept="image/*" onChange={handleRoutineUpload} />
           </div>
        </div>

        {/* --- Academic Scheduler --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-200 dark:shadow-none">
                    <i className="fa-regular fa-calendar-check"></i>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Scheduler</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Exams, Classes & Events</p>
                 </div>
              </div>
              <button 
                 onClick={() => setShowMeetingForm(!showMeetingForm)}
                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showMeetingForm ? 'bg-red-100 text-red-500' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
              >
                 <i className={`fa-solid ${showMeetingForm ? 'fa-xmark' : 'fa-plus'}`}></i>
              </button>
           </div>

           {showMeetingForm && (
              <form onSubmit={handleMeetingSubmit} className="mb-4 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 animate-slide-down">
                 <div className="space-y-3">
                    <input 
                       required
                       placeholder="Event Title (e.g., Final Exam)"
                       value={formData.title}
                       onChange={e => setFormData({...formData, title: e.target.value})}
                       className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-3">
                       <input 
                          type="date"
                          required
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:border-primary"
                       />
                       <input 
                          type="time"
                          value={formData.time}
                          onChange={e => setFormData({...formData, time: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:border-primary"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <input 
                          placeholder="Location (Optional)"
                          value={formData.location}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:border-primary"
                       />
                       <select 
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:border-primary"
                       >
                          <option value="meeting">Meeting</option>
                          <option value="exam">Exam</option>
                          <option value="class">Class</option>
                          <option value="event">Event</option>
                       </select>
                    </div>
                    <button type="submit" className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-600 transition-colors">
                       Add to Schedule
                    </button>
                 </div>
              </form>
           )}

           <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
              {meetings.length === 0 ? (
                 <div className="text-center py-10 text-slate-400">
                    <i className="fa-solid fa-calendar-xmark text-3xl mb-2 opacity-50"></i>
                    <p className="text-sm">No upcoming events.</p>
                 </div>
              ) : (
                 meetings.map(m => (
                    <div key={m.id} className="group flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-700/20 hover:shadow-md transition-all">
                       <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-lg mr-3 text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] font-bold uppercase">{new Date(m.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-lg font-bold leading-none">{new Date(m.date).getDate()}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{m.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                             <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> {m.time || 'All Day'}</span>
                             {m.location && <span className="flex items-center gap-1"><i className="fa-solid fa-location-dot"></i> {m.location}</span>}
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getTypeStyles(m.type)}`}>
                             {m.type}
                          </span>
                          <button 
                             onClick={() => deleteMeeting(m.id)}
                             className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>

      {/* Routine View Modal */}
      {showRoutineModal && routineImage && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowRoutineModal(false)}>
            <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
               <img src={routineImage} alt="Full Routine" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
               <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={downloadRoutine} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors" title="Download">
                     <i className="fa-solid fa-download"></i>
                  </button>
                  <button onClick={() => setShowRoutineModal(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors" title="Close">
                     <i className="fa-solid fa-xmark"></i>
                  </button>
               </div>
            </div>
         </div>,
         document.body
      )}

    </div>
  );
};

export default Others;