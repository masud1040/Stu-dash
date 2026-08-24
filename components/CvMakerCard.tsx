import React from 'react';

interface CvMakerCardProps {
  className?: string;
}

export const CvMakerCard: React.FC<CvMakerCardProps> = ({ className = '' }) => {
  const cvMakerUrl = 'https://cv-maker-nine-alpha.vercel.app/';

  const handleOpen = () => {
    window.open(cvMakerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${className}`}>
      {/* Decorative background glow & circles */}
      <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-3 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
            Online Tool
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Free Resume Builder
          </span>
        </div>

        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2.5 tracking-tight text-white">
            <i className="fa-solid fa-file-signature text-amber-300"></i>
            CV Maker & Resume Builder
          </h2>
          <p className="text-sm text-indigo-100 mt-1 leading-relaxed">
            Create sleek, ATS-compliant resumes with modern templates, custom styling, and instant PDF exports.
          </p>
        </div>

        {/* Feature Tags */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs text-indigo-100/90 font-medium">
          <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
            <i className="fa-solid fa-check text-emerald-300 text-[10px]"></i> ATS Friendly
          </span>
          <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
            <i className="fa-solid fa-wand-magic-sparkles text-amber-300 text-[10px]"></i> Modern Templates
          </span>
          <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
            <i className="fa-solid fa-download text-sky-300 text-[10px]"></i> Instant Export
          </span>
        </div>
      </div>

      <div className="relative z-10 shrink-0 w-full md:w-auto">
        <a
          href={cvMakerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Guarantee opening in new tab even if some iframe restrictions exist
            e.stopPropagation();
          }}
          className="group w-full md:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-indigo-700 hover:text-indigo-900 font-bold rounded-xl shadow-md hover:shadow-xl hover:bg-indigo-50 transition-all duration-200 active:scale-95 text-sm"
        >
          <span>Open CV Maker</span>
          <i className="fa-solid fa-arrow-up-right-from-square text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
        </a>
      </div>
    </div>
  );
};

export default CvMakerCard;
