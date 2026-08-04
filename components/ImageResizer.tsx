import React, { useState, useEffect, useRef } from 'react';

export interface Preset {
  id: string;
  name: string;
  nameBn: string;
  width: number;
  height: number;
  icon: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: 'passport',
    name: 'Passport Size',
    nameBn: 'পাসপোর্ট সাইজ',
    width: 413,
    height: 531,
    icon: 'fa-id-badge',
    description: '35mm × 45mm (Standard Passport Photo)'
  },
  {
    id: 'stamp',
    name: 'Stamp Size',
    nameBn: 'স্ট্যাম্প সাইজ',
    width: 236,
    height: 295,
    icon: 'fa-note-sticky',
    description: '20mm × 25mm (Standard Stamp Photo)'
  },
  {
    id: 'square',
    name: 'Square / DP',
    nameBn: 'স্কয়ার প্রোফাইল',
    width: 500,
    height: 500,
    icon: 'fa-border-all',
    description: '1:1 Ratio (500 × 500 px)'
  },
  {
    id: 'hd',
    name: 'Full HD',
    nameBn: 'ফুল এইচডি',
    width: 1920,
    height: 1080,
    icon: 'fa-desktop',
    description: '16:9 Landscape (1920 × 1080 px)'
  },
  {
    id: 'custom',
    name: 'Custom Size',
    nameBn: 'কাস্টম সাইজ',
    width: 800,
    height: 600,
    icon: 'fa-sliders',
    description: 'Specify your own width and height'
  }
];

const ImageResizer: React.FC = () => {
  // --- File State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);
  const [origSizeKb, setOrigSizeKb] = useState<number>(0);

  // --- Resizing Controls ---
  const [preset, setPreset] = useState<string>('passport');
  const [targetWidth, setTargetWidth] = useState<number>(413);
  const [targetHeight, setTargetHeight] = useState<number>(531);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(413 / 531);

  // Quality & Format Controls
  const [quality, setQuality] = useState<number>(85); // 10 - 100 %
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [fitMode, setFitMode] = useState<'cover' | 'contain' | 'stretch'>('cover');
  const [bgColor, setBgColor] = useState<string>('#ffffff'); // For padding or jpg conversion

  // Output State
  const [resizedDataUrl, setResizedDataUrl] = useState<string | null>(null);
  const [resizedSizeKb, setResizedSizeKb] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drag and Drop
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // --- Load Image File ---
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল আপলোড করুন (JPEG, PNG, WebP etc.)');
      return;
    }

    setSelectedFile(file);
    setOrigSizeKb(Math.round(file.size / 1024));

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);

      // Read dimensions
      const img = new Image();
      img.onload = () => {
        setOrigWidth(img.width);
        setOrigHeight(img.height);
        const ratio = img.width / img.height;
        setAspectRatio(ratio);

        // If custom preset or standard, set defaults accordingly
        if (preset === 'custom') {
          setTargetWidth(img.width);
          setTargetHeight(img.height);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // --- Handle Preset Selection ---
  const handleSelectPreset = (pId: string) => {
    setPreset(pId);
    const selected = PRESETS.find(p => p.id === pId);
    if (selected && pId !== 'custom') {
      setTargetWidth(selected.width);
      setTargetHeight(selected.height);
      setAspectRatio(selected.width / selected.height);
    } else if (pId === 'custom' && origWidth && origHeight) {
      setTargetWidth(origWidth);
      setTargetHeight(origHeight);
      setAspectRatio(origWidth / origHeight);
    }
  };

  // --- Handle Dimension Inputs with Aspect Ratio Lock ---
  const handleWidthChange = (w: number) => {
    const val = Math.max(1, w);
    setTargetWidth(val);
    if (lockAspect && aspectRatio) {
      setTargetHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (h: number) => {
    const val = Math.max(1, h);
    setTargetHeight(val);
    if (lockAspect && aspectRatio) {
      setTargetWidth(Math.round(val * aspectRatio));
    }
  };

  // Quick scale factors
  const handleQuickScale = (percent: number) => {
    if (!origWidth || !origHeight) return;
    const newW = Math.round((origWidth * percent) / 100);
    const newH = Math.round((origHeight * percent) / 100);
    setTargetWidth(newW);
    setTargetHeight(newH);
    setPreset('custom');
  };

  // --- Realtime Resize Processing via Canvas ---
  useEffect(() => {
    if (!imageSrc || targetWidth <= 0 || targetHeight <= 0) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Render mode calculations
      if (fitMode === 'stretch') {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      } else if (fitMode === 'contain') {
        // Fit whole image inside target box with padding
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (targetWidth - nw) / 2;
        const ny = (targetHeight - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
      } else if (fitMode === 'cover') {
        // Crop & fill target area (perfect for Passport / Stamp photos)
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (targetWidth - nw) / 2;
        const ny = (targetHeight - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
      }

      // Export quality string
      const qualityFloat = quality / 100;
      const dataUrl = canvas.toDataURL(format, qualityFloat);

      setResizedDataUrl(dataUrl);

      // Estimate byte length from base64 string
      const stringLength = dataUrl.length - 'data:image/png;base64,'.length;
      const sizeInBytes = Math.round(stringLength * 0.75);
      setResizedSizeKb(Math.round(sizeInBytes / 1024));

      setIsProcessing(false);
    };

    img.src = imageSrc;
  }, [imageSrc, targetWidth, targetHeight, quality, format, fitMode, bgColor]);

  // --- Download Handler ---
  const handleDownload = () => {
    if (!resizedDataUrl) return;
    const link = document.createElement('a');
    
    // Choose extension
    let ext = 'jpg';
    if (format === 'image/png') ext = 'png';
    if (format === 'image/webp') ext = 'webp';

    const cleanName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "image";
    link.download = `${cleanName}_${targetWidth}x${targetHeight}_resized.${ext}`;
    link.href = resizedDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">
            <i className="fa-solid fa-compress-arrows-alt"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Image Resizer Studio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ছবি রিসাইজ, রেজোলিউশন পরিবর্তন ও পাসপোর্ট/স্ট্যাম্প সাইজ কনভার্টার
            </p>
          </div>
        </div>

        {selectedFile && (
          <button
            onClick={() => {
              setSelectedFile(null);
              setImageSrc(null);
              setResizedDataUrl(null);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 text-xs font-semibold transition-all self-start sm:self-center flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
            <span>নতুন ছবি আপলোড</span>
          </button>
        )}
      </div>

      {!imageSrc ? (
        /* Dropzone Upload */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto mb-4 shadow-2xs">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <h4 className="font-bold text-slate-800 dark:text-white text-base">
            আপনার ছবি এখানে ড্রপ করুন অথবা ব্রাউজ করুন
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            JPG, PNG, WebP ফরম্যাট সাপোর্টেড। পাসপোর্ট, স্ট্যাম্প বা অন্য যেকোনো সাইজে খুব সহজে কনভার্ট করুন।
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs">
            <i className="fa-solid fa-file-image"></i>
            <span>ছবি নির্বাচন করুন</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
        </div>
      ) : (
        /* Active Workspace: Controls & Live Preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Resize Settings (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Presets Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                ১. দ্রুত সাইজ প্রেসেট (Presets)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => {
                  const isActive = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fa-solid ${p.icon} text-sm ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}></i>
                        <span className="text-xs font-bold">{p.nameBn}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">
                        {p.width} × {p.height} px
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Dimensions Input (Width x Height) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ২. হাইট ও ওয়াইডথ (Custom Dimensions)
                </label>
                <button
                  type="button"
                  onClick={() => setLockAspect(!lockAspect)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                    lockAspect
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                  title="Lock/Unlock Aspect Ratio"
                >
                  <i className={`fa-solid ${lockAspect ? 'fa-link' : 'fa-link-slash'}`}></i>
                  <span>{lockAspect ? 'অনুপাত লকড' : 'মুক্ত'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Width (ওয়াইডথ, px)</span>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={targetWidth}
                    onChange={(e) => {
                      setPreset('custom');
                      handleWidthChange(parseInt(e.target.value) || 0);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Height (হাইট, px)</span>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={targetHeight}
                    onChange={(e) => {
                      setPreset('custom');
                      handleHeightChange(parseInt(e.target.value) || 0);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Percentage Scaling */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 mr-1">দ্রুত স্কেল:</span>
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQuickScale(p)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Image Fit & Crop Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                ৩. ছবির ফিট মোড (Fit Mode)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cover', name: 'ক্রপ / ফিল (Cover)', icon: 'fa-crop-simple', desc: 'পাসপোর্ট ছবির জন্য সেরা' },
                  { id: 'contain', name: 'প্যাডিং সহ (Contain)', icon: 'fa-expand', desc: 'পুরো ছবি ফিট করবে' },
                  { id: 'stretch', name: 'টেনে মেলানো (Stretch)', icon: 'fa-up-right-and-down-left-from-center', desc: 'হাইট/ওয়াইডথ ফিক্সড' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFitMode(mode.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      fitMode === mode.id
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <i className={`fa-solid ${mode.icon} text-sm mb-1 block`}></i>
                    <span className="text-[10px] block leading-tight font-semibold">{mode.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Quality & Resolution Compression */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ৪. ছবি কোয়ালিটি (Quality / Resolution)
                </label>
                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                কোয়ালিটি কমালে ছবির রেজোলিউশন ও ফাইল সাইজ (KB) অনেক কমে যাবে।
              </p>
            </div>

            {/* 5. Format & Background Fill */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  ফরম্যাট (Format)
                </label>
                <select
                  value={format}
                  onChange={(e: any) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                >
                  <option value="image/jpeg">JPG / JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  ব্যাকগ্রাউন্ড কালার
                </label>
                <div className="flex items-center gap-2 p-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold">{bgColor}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Comparison & Live Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Image Comparison Summary Box */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {/* Original Info */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">মূল ছবি (Original)</span>
                <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                  {origWidth} × {origHeight} px
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  সাইজ: <span className="text-amber-600 dark:text-amber-400">{origSizeKb} KB</span>
                </div>
              </div>

              {/* Resized Info */}
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">রিসাইজড ছবি (New)</span>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {targetWidth} × {targetHeight} px
                </div>
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <span>সাইজ:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{resizedSizeKb} KB</span>
                  {origSizeKb > 0 && resizedSizeKb > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold">
                      {Math.round(((resizedSizeKb - origSizeKb) / origSizeKb) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Canvas / Image Live Preview Container */}
            <div className="flex-1 min-h-[300px] max-h-[420px] bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-center relative overflow-hidden">
              {isProcessing ? (
                <div className="text-center text-slate-400 animate-pulse">
                  <i className="fa-solid fa-spinner fa-spin text-3xl mb-2 text-indigo-600"></i>
                  <p className="text-xs font-semibold">প্রসেসিং হচ্ছে...</p>
                </div>
              ) : resizedDataUrl ? (
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <img
                    src={resizedDataUrl}
                    alt="Resized preview"
                    className="max-h-[340px] max-w-full object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
                  />
                  {preset === 'passport' && (
                    <span className="mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      পাসপোর্ট সাইজ প্রিভিউ (35mm × 45mm)
                    </span>
                  )}
                  {preset === 'stamp' && (
                    <span className="mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      স্ট্যাম্প সাইজ প্রিভিউ (20mm × 25mm)
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Download Action Button */}
            <button
              onClick={handleDownload}
              disabled={!resizedDataUrl || isProcessing}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-download text-base"></i>
              <span>ডাউনলোড করুন (Download Resized Image)</span>
            </button>

          </div>

        </div>
      )}
    </div>
  );
};

export default ImageResizer;
