import React, { useState } from 'react';
import { InterviewLanguage, InterviewDifficulty, MockInterviewConfig } from '../../types/mockInterview';

interface Props {
  onStart: (config: MockInterviewConfig) => void;
  onOpenHistory: () => void;
  onBackToQuestions: () => void;
  isLoading: boolean;
  historyCount: number;
}

const POPULAR_TOPICS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'HTML',
  'CSS',
  'Next.js',
  'Database',
  'OOP',
  'Data Structures',
  'Frontend Development',
  'Backend Development',
  'General Interview',
  'Anything',
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export const MockInterviewSetup: React.FC<Props> = ({
  onStart,
  onOpenHistory,
  onBackToQuestions,
  isLoading,
  historyCount,
}) => {
  const [topic, setTopic] = useState('TypeScript');
  const [customTopic, setCustomTopic] = useState('');
  const [isCustomTopic, setIsCustomTopic] = useState(false);

  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [customCountInput, setCustomCountInput] = useState('8');

  const [language, setLanguage] = useState<InterviewLanguage>('English');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');

  const activeTopic = isCustomTopic ? customTopic.trim() || 'General Interview' : topic;
  const activeCount = isCustomCount ? Math.max(1, Math.min(25, parseInt(customCountInput, 10) || 5)) : questionCount;

  const handleStart = () => {
    onStart({
      topic: activeTopic,
      totalQuestions: activeCount,
      language,
      difficulty,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBackToQuestions}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Question Bank</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
          <span>Interview History</span>
          {historyCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Setup Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-7">
        {/* Header Hero */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-md shadow-indigo-500/20 shrink-0">
            <i className="fa-solid fa-headset"></i>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              AI Mock Interview Setup
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Practice real-time technical & behavioral interviews with AI voice questions, live voice recognition, and semantic feedback.
            </p>
          </div>
        </div>

        {/* 1. TOPIC SELECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-bold">1</span>
              <span>Interview Topic</span>
            </label>
            <span className="text-[11px] text-slate-400">Search or pick a topic</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR_TOPICS.map((t) => {
              const selected = !isCustomTopic && topic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    setIsCustomTopic(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t === 'Anything' && <i className="fa-solid fa-shuffle mr-1.5 text-amber-300"></i>}
                  {t}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCustomTopic(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isCustomTopic
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <i className="fa-solid fa-pen-to-square mr-1.5 text-xs"></i>
              Custom Topic
            </button>
          </div>

          {isCustomTopic && (
            <div className="pt-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter any topic (e.g., GraphQL, Docker, Spring Boot, Vue.js, System Design)..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* 2. NUMBER OF QUESTIONS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-bold">2</span>
              <span>Number of Questions</span>
            </label>
            <span className="text-[11px] text-slate-400">Determines interview length</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {QUESTION_COUNTS.map((cnt) => {
              const selected = !isCustomCount && questionCount === cnt;
              return (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => {
                    setQuestionCount(cnt);
                    setIsCustomCount(false);
                  }}
                  className={`min-w-16 py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cnt} Questions
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCustomCount(true)}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isCustomCount
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustomCount && (
            <div className="flex items-center gap-3 pt-2">
              <input
                type="number"
                min="1"
                max="25"
                value={customCountInput}
                onChange={(e) => setCustomCountInput(e.target.value)}
                className="w-28 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">questions (1 - 25 questions)</span>
            </div>
          )}
        </div>

        {/* 3. INTERVIEW LANGUAGE & DIFFICULTY (GRID) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Language */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-bold">3</span>
              <span>Interviewer Language</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['English', 'বাংলা', 'Banglish'] as InterviewLanguage[]).map((lang) => {
                const selected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-[11px] text-indigo-800 dark:text-indigo-300">
              <i className="fa-solid fa-circle-info text-indigo-500 mt-0.5 shrink-0"></i>
              <span>
                You may answer in <strong>English, বাংলা, or Banglish</strong> regardless of the chosen language. The evaluation engine understands mixed-language answers!
              </span>
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-bold">4</span>
              <span>Difficulty Level</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['Easy', 'Medium', 'Hard'] as InterviewDifficulty[]).map((diff) => {
                const selected = difficulty === diff;
                const badgeColor = diff === 'Easy' ? 'text-emerald-500' : diff === 'Medium' ? 'text-amber-500' : 'text-rose-500';
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={selected ? 'text-white' : badgeColor}>●</span> {diff}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
              Adjusts the technical depth, follow-ups, and architectural expectations of questions.
            </p>
          </div>
        </div>

        {/* 4. SUMMARY & START BUTTON */}
        <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Configuration:</span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold">
              {activeTopic}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {activeCount} Questions
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {language}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {difficulty}
            </span>
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>Preparing Board...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-play"></i>
                <span>Start Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
