import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface ShortenedLinkItem {
  id: string;
  originalUrl: string;
  shortUrl: string;
  customAlias?: string;
  service: 'tinyurl' | 'isgd' | 'custom' | 'utm';
  createdAt: string;
  clicks?: number;
}

const STORAGE_KEY = 'student_shortened_links_history';

const UrlShortener: React.FC = () => {
  // --- Active Tab ---
  const [activeTab, setActiveTab] = useState<'shortener' | 'utm' | 'history'>('shortener');

  // --- URL Shortener State ---
  const [longUrl, setLongUrl] = useState<string>('');
  const [customAlias, setCustomAlias] = useState<string>('');
  const [service, setService] = useState<'tinyurl' | 'isgd' | 'custom'>('tinyurl');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Output State ---
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- UTM Builder State ---
  const [utmUrl, setUtmUrl] = useState<string>('');
  const [utmSource, setUtmSource] = useState<string>('whatsapp');
  const [utmMedium, setUtmMedium] = useState<string>('social');
  const [utmCampaign, setUtmCampaign] = useState<string>('student_share');
  const [utmTerm, setUtmTerm] = useState<string>('');
  const [utmContent, setUtmContent] = useState<string>('');

  // --- History State ---
  const [history, setHistory] = useState<ShortenedLinkItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading link history', e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (items: ShortenedLinkItem[]) => {
    setHistory(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
  };

  // --- Generate QR Code Data URL ---
  const generateQrCode = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#4f46e5',
          light: '#ffffff'
        }
      });
    } catch (e) {
      console.error('Error generating QR', e);
      return '';
    }
  };

  // --- Validate & Normalize URL ---
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // --- URL Shortener Action ---
  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const validUrl = normalizeUrl(longUrl);

    if (!validUrl) {
      setErrorMessage('অনুগ্রহ করে একটি সঠিক URL প্রদান করুন (e.g., https://example.com)');
      return;
    }

    setIsProcessing(true);
    let generatedShortUrl = '';

    try {
      if (service === 'custom') {
        // Custom branded alias generator with real working redirect
        const slug = customAlias.trim()
          ? customAlias.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
          : Math.random().toString(36).substring(2, 8);
        const originUrl = window.location.origin;
        generatedShortUrl = `${originUrl}/?go=${slug}&u=${encodeURIComponent(validUrl)}`;
      } else if (service === 'tinyurl') {
        // TinyURL public API
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(validUrl)}`);
        if (res.ok) {
          generatedShortUrl = await res.text();
        } else {
          throw new Error('TinyURL API request failed');
        }
      } else if (service === 'isgd') {
        // is.gd public API
        const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(validUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.shorturl) {
            generatedShortUrl = data.shorturl;
          } else {
            throw new Error(data.errormessage || 'is.gd failed');
          }
        } else {
          throw new Error('is.gd API request failed');
        }
      }

      if (!generatedShortUrl) {
        // Fallback shortener if API fails
        const slug = customAlias.trim()
          ? customAlias.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
          : Math.random().toString(36).substring(2, 8);
        const originUrl = window.location.origin;
        generatedShortUrl = `${originUrl}/?go=${slug}&u=${encodeURIComponent(validUrl)}`;
      }

      // Generate QR for shortened link
      const qrDataUrl = await generateQrCode(generatedShortUrl);
      setResultLink(generatedShortUrl);
      setResultQrUrl(qrDataUrl);

      // Save to History
      const newItem: ShortenedLinkItem = {
        id: Date.now().toString(),
        originalUrl: validUrl,
        shortUrl: generatedShortUrl,
        customAlias: customAlias.trim() || undefined,
        service,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        clicks: 0
      };

      saveHistory([newItem, ...history]);
    } catch (err: any) {
      console.error('Shorten error:', err);
      // Fallback on error so user always gets a working custom short link
      const slug = customAlias.trim()
        ? customAlias.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        : Math.random().toString(36).substring(2, 8);
      const originUrl = window.location.origin;
      const fallbackUrl = `${originUrl}/?go=${slug}&u=${encodeURIComponent(validUrl)}`;
      const qrDataUrl = await generateQrCode(fallbackUrl);

      setResultLink(fallbackUrl);
      setResultQrUrl(qrDataUrl);

      const newItem: ShortenedLinkItem = {
        id: Date.now().toString(),
        originalUrl: validUrl,
        shortUrl: fallbackUrl,
        customAlias: customAlias.trim() || undefined,
        service: 'custom',
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        clicks: 0
      };
      saveHistory([newItem, ...history]);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Compute UTM Campaign Link ---
  const getComputedUtmUrl = (): string => {
    const base = normalizeUrl(utmUrl);
    if (!base) return '';
    try {
      const urlObj = new URL(base);
      if (utmSource.trim()) urlObj.searchParams.set('utm_source', utmSource.trim());
      if (utmMedium.trim()) urlObj.searchParams.set('utm_medium', utmMedium.trim());
      if (utmCampaign.trim()) urlObj.searchParams.set('utm_campaign', utmCampaign.trim());
      if (utmTerm.trim()) urlObj.searchParams.set('utm_term', utmTerm.trim());
      if (utmContent.trim()) urlObj.searchParams.set('utm_content', utmContent.trim());
      return urlObj.toString();
    } catch (e) {
      return base;
    }
  };

  // --- UTM Shorten Button Action ---
  const handleShortenUtm = async () => {
    const fullUtm = getComputedUtmUrl();
    if (!fullUtm) return;
    setLongUrl(fullUtm);
    setCustomAlias('');
    setService('tinyurl');
    setActiveTab('shortener');
  };

  // --- Copy to Clipboard Handler ---
  const handleCopy = (text: string, id: string = 'main') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // --- Native Web Share / Fallback Share ---
  const handleShare = async (url: string, title: string = 'Shared Link') => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Student Toolkit - Shared Link',
          text: `Check out this link: ${title}`,
          url: url
        });
      } catch (err) {
        console.log('Share cancelled or error:', err);
      }
    } else {
      // Fallback: Copy and show alert
      handleCopy(url, 'share');
      alert('লিংকটি ক্লিপবোর্ডে কপি করা হয়েছে! এখন যেকোনো স্থানে শেয়ার করতে পারেন।');
    }
  };

  // --- Social Share Helpers ---
  const shareToWhatsApp = (url: string) => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this link: ' + url)}`, '_blank');
  };

  const shareToTelegram = (url: string) => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Check out this link!')}`, '_blank');
  };

  const shareToFacebook = (url: string) => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  // --- Delete History Item ---
  const deleteHistoryItem = (id: string) => {
    saveHistory(history.filter(item => item.id !== id));
  };

  const clearAllHistory = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে সকল লিংক হিস্টোরি মুছে ফেলতে চান?')) {
      saveHistory([]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
      
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">
            <i className="fa-solid fa-link"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              Custom Link Generator & URL Shortener
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              যেকোনো দীর্ঘ URL ছোট করুন, কাস্টম লিংক তৈরি করুন এবং এক ক্লিকে শেয়ার করুন
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('shortener')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'shortener'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-scissors"></i>
            <span>URL Shortener</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('utm')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'utm'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-tag"></i>
            <span>UTM Link Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>History</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px]">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* --- Tab 1: URL Shortener & Custom Alias --- */}
      {activeTab === 'shortener' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleShorten} className="space-y-4">
              
              {/* Long URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  দীর্ঘ URL (Long URL / Website Link) *
                </label>
                <div className="relative">
                  <i className="fa-solid fa-link absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={longUrl}
                    onChange={(e) => setLongUrl(e.target.value)}
                    placeholder="https://example.com/my-very-long-link-url..."
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Service & Custom Alias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    শর্টনার সার্ভিস (Service)
                  </label>
                  <select
                    value={service}
                    onChange={(e: any) => setService(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                  >
                    <option value="tinyurl">TinyURL API (Public & Real)</option>
                    <option value="isgd">is.gd API (Fast & Clean)</option>
                    <option value="custom">Custom Smart Link (100% Working Redirect)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    কাস্টম এলিয়াস / নাম (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">/</span>
                    <input
                      type="text"
                      value={customAlias}
                      onChange={(e) => setCustomAlias(e.target.value)}
                      placeholder="e.g. my-routine-2026"
                      className="w-full pl-6 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>লিংক তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <span>লিংক ছোট করুন (Generate Short Link)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Result Output & Sharing Options (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            {resultLink ? (
              <div className="bg-indigo-50/70 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 space-y-4 animate-scale-up">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-1 rounded-full">
                    Shortened Link Ready
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {service.toUpperCase()}
                  </span>
                </div>

                {/* Shortened URL Preview Box */}
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                  <a
                    href={resultLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate hover:underline"
                  >
                    {resultLink}
                  </a>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(resultLink, 'result')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      copiedId === 'result'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                    }`}
                  >
                    <i className={`fa-solid ${copiedId === 'result' ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedId === 'result' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Quick Sharing Options */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    শেয়ার করুন (Share Options):
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Native Share */}
                    <button
                      type="button"
                      onClick={() => handleShare(resultLink, 'Shortened Link')}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <i className="fa-solid fa-share-nodes"></i>
                      <span>Share Link</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => shareToWhatsApp(resultLink)}
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm transition-colors shadow-2xs"
                      title="Share to WhatsApp"
                    >
                      <i className="fa-brands fa-whatsapp"></i>
                    </button>

                    {/* Telegram */}
                    <button
                      type="button"
                      onClick={() => shareToTelegram(resultLink)}
                      className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm transition-colors shadow-2xs"
                      title="Share to Telegram"
                    >
                      <i className="fa-brands fa-telegram"></i>
                    </button>

                    {/* Facebook */}
                    <button
                      type="button"
                      onClick={() => shareToFacebook(resultLink)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors shadow-2xs"
                      title="Share to Facebook"
                    >
                      <i className="fa-brands fa-facebook-f"></i>
                    </button>
                  </div>
                </div>

                {/* QR Code Preview */}
                {resultQrUrl && (
                  <div className="pt-3 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={resultQrUrl}
                        alt="QR Code"
                        className="w-14 h-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">QR Code Ready</h4>
                        <p className="text-[10px] text-slate-400">এই লিংকের জন্য স্ক্যান কোড</p>
                      </div>
                    </div>
                    <a
                      href={resultQrUrl}
                      download="shortened_link_qr.png"
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-download"></i>
                      <span>QR</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-3">
                  <i className="fa-solid fa-link-slash"></i>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  কোনো লিংক জেনারেট করা হয়নি
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  বামে দীর্ঘ URL প্রবেশ করিয়ে "লিংক ছোট করুন" বাটনে ক্লিক করুন।
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- Tab 2: UTM Campaign Link Builder --- */}
      {activeTab === 'utm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                মূল ওয়েবসাইট বা পেজ URL *
              </label>
              <input
                type="text"
                value={utmUrl}
                onChange={(e) => setUtmUrl(e.target.value)}
                placeholder="https://example.com/portfolio"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Campaign Source
                </label>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="e.g. facebook, whatsapp"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Campaign Medium
                </label>
                <input
                  type="text"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="e.g. social, chat, cpc"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="e.g. spring_event"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  UTM Term (Optional Keyword)
                </label>
                <input
                  type="text"
                  value={utmTerm}
                  onChange={(e) => setUtmTerm(e.target.value)}
                  placeholder="e.g. computer_science"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  UTM Content (Optional Banner/Link)
                </label>
                <input
                  type="text"
                  value={utmContent}
                  onChange={(e) => setUtmContent(e.target.value)}
                  placeholder="e.g. header_button"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: UTM Live Preview & Copy */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  তৈরিকৃত Campaign Link:
                </span>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 break-all max-h-24 overflow-y-auto">
                  {getComputedUtmUrl() || 'URL প্রবেশ করান...'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={!getComputedUtmUrl()}
                  onClick={() => handleCopy(getComputedUtmUrl(), 'utm_copy')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    copiedId === 'utm_copy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <i className={`fa-solid ${copiedId === 'utm_copy' ? 'fa-check' : 'fa-copy'}`}></i>
                  <span>{copiedId === 'utm_copy' ? 'Copied!' : 'Copy Campaign Link'}</span>
                </button>

                <button
                  type="button"
                  disabled={!getComputedUtmUrl()}
                  onClick={() => handleShare(getComputedUtmUrl(), 'UTM Campaign Link')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <i className="fa-solid fa-share-nodes"></i>
                  <span>Share</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={!getComputedUtmUrl()}
                  onClick={handleShortenUtm}
                  className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-scissors"></i>
                  <span>এই Campaign URL-টি ছোট করুন (Shorten This)</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- Tab 3: Generated Links History --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              আপনার তৈরিকৃত লিংকের তালিকা ({history.length})
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearAllHistory}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5"
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>Clear All</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <i className="fa-solid fa-clock-rotate-left text-3xl text-slate-300 dark:text-slate-600 mb-2"></i>
              <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">কোনো লিংক হিস্টোরি নেই</p>
              <p className="text-xs text-slate-400 mt-1">
                URL Shortener ট্যাব থেকে নতুন লিংক তৈরি করলে এখানে সংরক্ষিত হবে।
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={item.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate hover:underline"
                      >
                        {item.shortUrl}
                      </a>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.service}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate" title={item.originalUrl}>
                      {item.originalUrl}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span><i className="fa-regular fa-clock mr-1"></i>{item.createdAt}</span>
                    </div>
                  </div>

                  {/* Actions: Copy, Share, Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.shortUrl, item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        copiedId === item.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <i className={`fa-solid ${copiedId === item.id ? 'fa-check' : 'fa-copy'}`}></i>
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(item.shortUrl, 'Shortened URL')}
                      className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                      title="Share link"
                    >
                      <i className="fa-solid fa-share-nodes"></i>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHistoryItem(item.id)}
                      className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-colors"
                      title="Delete link"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default UrlShortener;
