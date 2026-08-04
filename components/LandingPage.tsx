import React from 'react';

interface LandingPageProps {
  onExplore: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onExplore, onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Subtle grid background lines for architectural minimal look */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight text-neutral-900 uppercase font-serif">
              STUDYDASH
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-semibold text-neutral-600">
            <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
            <a href="#preview" className="hover:text-neutral-900 transition-colors">Preview</a>
            <a href="#why" className="hover:text-neutral-900 transition-colors">Philosophy</a>
            <a href="#testimonials" className="hover:text-neutral-900 transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-neutral-900 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAuth}
              className="text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-900 transition-colors px-3 py-2"
            >
              Sign In
            </button>
            <button
              onClick={onExplore}
              className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:scale-[1.02] active:scale-95"
            >
              Explore Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
        <div className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-6">
          Student Workspace & Operating System
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-neutral-900 mb-8 font-serif leading-[1.08]">
          STUDYDASH
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto mb-12 font-normal leading-relaxed">
          Exploring the boundaries of organization, focus, and academic clarity through a visceral minimalist student workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onExplore}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            Explore Gallery / Workspace
          </button>
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-900 font-bold text-xs uppercase tracking-widest transition-all"
          >
            Sign In / Register
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 text-center text-xs text-neutral-400 uppercase tracking-widest">
          <span>Scroll</span>
          <div className="mt-2 animate-bounce">↓</div>
        </div>

        {/* Dashboard Preview Minimal Card */}
        <div id="preview" className="mt-16 relative max-w-4xl mx-auto rounded-3xl p-3 bg-neutral-100 border border-neutral-200 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden border border-neutral-200">
            <div className="h-10 bg-neutral-50 border-b border-neutral-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300"></div>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">studydash.app/workspace</div>
              <div className="w-4"></div>
            </div>
            <div className="p-8 text-left bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                  <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Focus Time</div>
                  <div className="text-3xl font-black text-neutral-900 font-serif">4h 25m</div>
                  <div className="text-xs text-emerald-600 font-medium mt-2">↑ 18% vs yesterday</div>
                </div>
                <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                  <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Active Tasks</div>
                  <div className="text-3xl font-black text-neutral-900 font-serif">12 / 15</div>
                  <div className="text-xs text-neutral-500 font-medium mt-2">80% completed</div>
                </div>
                <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                  <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Study Streak</div>
                  <div className="text-3xl font-black text-neutral-900 font-serif">14 Days 🔥</div>
                  <div className="text-xs text-amber-600 font-medium mt-2">Personal best</div>
                </div>
              </div>
              <div className="bg-neutral-900 text-white p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Instant Guest Access Enabled</h4>
                  <p className="text-xs text-neutral-400 mt-1">Test all modules without creating an account.</p>
                </div>
                <button
                  onClick={onExplore}
                  className="px-5 py-2.5 rounded-full bg-white text-neutral-900 font-bold text-xs uppercase tracking-widest hover:bg-neutral-100 transition-all"
                >
                  Launch App
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto border-t border-neutral-200">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-3">Capabilities</h2>
          <h3 className="text-3xl font-black text-neutral-900 font-serif">Engineered for Academic Precision</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl hover:border-neutral-900 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center text-xl mb-6">
              <i className="fa-solid fa-stopwatch"></i>
            </div>
            <h4 className="text-lg font-bold text-neutral-900 mb-2">Pomodoro & Study Tracker</h4>
            <p className="text-neutral-600 text-sm leading-relaxed">Precision timing sessions with detailed habit loops and statistical progress analytics.</p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl hover:border-neutral-900 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center text-xl mb-6">
              <i className="fa-solid fa-file-lines"></i>
            </div>
            <h4 className="text-lg font-bold text-neutral-900 mb-2">A4 Document Studio</h4>
            <p className="text-neutral-600 text-sm leading-relaxed">Professional rich text notes supporting English and Bengali with instant A4 PDF export.</p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl hover:border-neutral-900 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center text-xl mb-6">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <h4 className="text-lg font-bold text-neutral-900 mb-2">Interview Prep Q&A</h4>
            <p className="text-neutral-600 text-sm leading-relaxed">Build technical question banks and mastery guides designed for top university exams and interviews.</p>
          </div>
        </div>
      </section>

      {/* Student Statistics */}
      <section className="py-20 bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-black text-neutral-900 font-serif mb-1">45,000+</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Active Students</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neutral-900 font-serif mb-1">2.5M+</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Focus Hours</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neutral-900 font-serif mb-1">99.8%</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Satisfaction</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neutral-900 font-serif mb-1">120+</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Institutions</div>
          </div>
        </div>
      </section>

      {/* Why Choose StudyDash */}
      <section id="why" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-3">Philosophy</h2>
            <h3 className="text-3xl font-black text-neutral-900 font-serif mb-6">Simplicity is the Ultimate Sophistication</h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-6">
              StudyDash rejects cluttered dashboards and noisy notifications. Every pixel is crafted for deep focus, local privacy, and uncompromising elegance.
            </p>
            <div className="space-y-4 text-sm text-neutral-700">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check text-neutral-900"></i>
                <span>Instant guest mode with zero registration friction</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check text-neutral-900"></i>
                <span>100% offline-first secure local browser storage</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check text-neutral-900"></i>
                <span>Clean editorial typography and minimalist white layout</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-100 p-8 rounded-3xl border border-neutral-200">
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
                  <span>Habit Consistency</span>
                  <span>14 Days</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-900 w-[90%]"></div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
                  <span>Data Structures Assignment</span>
                  <span className="text-emerald-600">Exported PDF</span>
                </div>
                <p className="text-xs text-neutral-600">Trees, graphs, and asymptotic analysis notes formatted successfully.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 max-w-7xl mx-auto border-t border-neutral-200">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-3">Testimonials</h2>
          <h3 className="text-3xl font-black text-neutral-900 font-serif">Trusted by Ambitious Scholars</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl">
            <div className="flex gap-1 text-neutral-900 mb-4 text-xs">
              {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
            </div>
            <p className="text-neutral-700 text-sm italic mb-6 leading-relaxed">
              "StudyDash completely transformed my exam preparation. The A4 Notes and minimalist focus timer are absolute perfection."
            </p>
            <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Saiful Alam Masud</div>
            <div className="text-[11px] text-neutral-500">Computer Science</div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl">
            <div className="flex gap-1 text-neutral-900 mb-4 text-xs">
              {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
            </div>
            <p className="text-neutral-700 text-sm italic mb-6 leading-relaxed">
              "The guest explore mode lets me test drive everything instantly without any sign-up hassle. Absolutely love the clean white design."
            </p>
            <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Anika Rahman</div>
            <div className="text-[11px] text-neutral-500">Software Engineering</div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl">
            <div className="flex gap-1 text-neutral-900 mb-4 text-xs">
              {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
            </div>
            <p className="text-neutral-700 text-sm italic mb-6 leading-relaxed">
              "Minimalist, fast, and gorgeous. My GPA improved significantly ever since I started tracking my daily study streaks here."
            </p>
            <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Tanvir Kabir</div>
            <div className="text-[11px] text-neutral-500">Electrical Engineering</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto border-t border-neutral-200">
        <div className="text-center mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 mb-3">FAQ</h2>
          <h3 className="text-3xl font-black text-neutral-900 font-serif">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-2xl">
            <h4 className="font-bold text-neutral-900 text-sm mb-2">Can I explore without an account?</h4>
            <p className="text-neutral-600 text-xs leading-relaxed">Yes. Click "Explore Now" to browse all modules instantly as a guest user.</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-2xl">
            <h4 className="font-bold text-neutral-900 text-sm mb-2">Where is my data stored?</h4>
            <p className="text-neutral-600 text-xs leading-relaxed">Your notes, tasks, and routines are stored securely in your browser's local storage for privacy and speed.</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-2xl">
            <h4 className="font-bold text-neutral-900 text-sm mb-2">Can I export my notes to PDF?</h4>
            <p className="text-neutral-600 text-xs leading-relaxed">Yes! Both Notes and Interview Prep include one-click A4 PDF generation with full font support.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-16 bg-neutral-50 text-neutral-600 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="font-black tracking-widest uppercase font-serif text-neutral-900">STUDYDASH</div>
          <div className="flex items-center gap-6 uppercase tracking-wider font-semibold">
            <a href="#features" className="hover:text-neutral-900">Features</a>
            <a href="#why" className="hover:text-neutral-900">Philosophy</a>
            <button onClick={onOpenAuth} className="hover:text-neutral-900">Sign In</button>
            <button onClick={onExplore} className="hover:text-neutral-900">Launch</button>
          </div>
          <div className="text-neutral-400">© 2026 StudyDash Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
