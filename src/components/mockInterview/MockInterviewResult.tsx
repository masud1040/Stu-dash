import React, { useState } from 'react';
import { CompletedMockInterview } from '../../types/mockInterview';

interface Props {
  result: CompletedMockInterview;
  onPracticeAgain: () => void;
  onBackToQuestions: () => void;
  onOpenHistory: () => void;
  onAddQuestionToBank: (q: { question: string; answer: string; tag: string }) => void;
}

export const MockInterviewResult: React.FC<Props> = ({
  result,
  onPracticeAgain,
  onBackToQuestions,
  onOpenHistory,
  onAddQuestionToBank,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleAddQuestion = (q: any) => {
    onAddQuestionToBank({
      question: q.question,
      answer: q.betterAnswer || q.expectedAnswer || 'Technical interview answer.',
      tag: q.tag || result.topic,
    });
    setAddedIds((prev) => ({ ...prev, [q.id]: true }));
  };

  const getPerformanceRating = (score: number) => {
    if (score >= 85) return { label: 'Excellent Performance', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };
    if (score >= 70) return { label: 'Solid Candidate', color: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' };
    if (score >= 50) return { label: 'Needs Polish & Depth', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' };
    return { label: 'Requires Foundational Study', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' };
  };

  const rating = getPerformanceRating(result.score);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBackToQuestions}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Question Bank</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
            <span>All History</span>
          </button>

          <button
            onClick={onPracticeAgain}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-rotate-right"></i>
            <span>Practice Again</span>
          </button>
        </div>
      </div>

      {/* 1. SCORE SUMMARY HERO CARD */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-700/80 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${rating.badge}`}>
              {rating.label}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Mock Interview Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Session completed on {result.date} • Duration: {result.duration}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                Topic: {result.topic}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                Difficulty: {result.difficulty}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                Language: {result.language}
              </span>
            </div>
          </div>

          {/* Large Circular / Score Block */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-700/80 min-w-44 text-center shrink-0">
            <span className="text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {result.score}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Overall Rating
            </span>

            {/* Micro Breakdown */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400" title="Correct">
                {result.correctCount} ✓
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-amber-600 dark:text-amber-400" title="Partially Correct">
                {result.partialCount} ~
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-rose-600 dark:text-rose-400" title="Incorrect">
                {result.incorrectCount} ✗
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. IMPROVEMENTS & ACTIONABLE TAKEAWAYS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <i className="fa-solid fa-circle-check"></i>
            <span>Candidate Strengths</span>
          </div>
          <ul className="space-y-2">
            {result.strengths.map((str, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses / Needs Improvement */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>Needs Improvement & Polish</span>
          </div>
          <ul className="space-y-2">
            {result.weaknesses.map((weak, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                <span className="text-amber-500 font-bold">•</span>
                <span>{weak}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Topics */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <i className="fa-solid fa-book-open"></i>
            <span>Recommended Topics to Study</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {result.recommendedTopics.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-900/50"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Interview Tips */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <i className="fa-solid fa-lightbulb"></i>
            <span>Practical Interview Delivery Tips</span>
          </div>
          <ul className="space-y-2">
            {result.interviewTips.map((tip, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                <span className="text-purple-500 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. SUGGESTED PRACTICE QUESTIONS */}
      {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-800/80 dark:to-indigo-950/30 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <i className="fa-solid fa-clipboard-question"></i>
            <span>Suggested Questions for Next Time</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {result.suggestedQuestions.map((sq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-100 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium flex items-start gap-2"
              >
                <span className="text-indigo-500 font-bold">{i + 1}.</span>
                <span>{sq}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. QUESTION-BY-QUESTION ANALYSIS ACCORDION */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-list-check text-indigo-500"></i>
            <span>Question-by-Question Analysis ({result.questions.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Click to expand details</span>
        </div>

        <div className="space-y-3">
          {result.questions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id || (!expandedQuestionId && idx === 0);
            const isAdded = addedIds[q.id] || q.addedToBank;

            return (
              <div
                key={q.id || idx}
                className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  className="p-4 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900 cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {q.question}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          q.status === 'Correct'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : q.status === 'Partially Correct'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {q.status} ({q.score}/10)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {q.source === 'database' ? 'Question Bank' : 'AI Generated'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-400 text-xs shrink-0`}></i>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/80 space-y-4 text-xs sm:text-sm animate-fadeIn">
                    {/* Candidate Answer */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Your Answer:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 italic">
                        "{q.candidateAnswer || '(No answer provided)'}"
                      </p>
                    </div>

                    {/* Feedback */}
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block mb-1">
                        Interviewer Feedback:
                      </span>
                      <p>{q.feedback}</p>
                    </div>

                    {/* Model Answer & Verbal Guidance */}
                    {q.betterAnswer && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                            Model Answer:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300">
                            {q.betterAnswer}
                          </p>
                        </div>
                        {q.verbalHowToSay && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block mb-0.5">
                              Spoken Delivery Tip:
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 italic">
                              "{q.verbalHowToSay}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add to Bank Button if AI generated */}
                    {q.source === 'ai' && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleAddQuestion(q)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <i className={`fa-solid ${isAdded ? 'fa-check' : 'fa-bookmark text-indigo-500'}`}></i>
                          <span>{isAdded ? 'Added to Question Bank' : 'Save Question to Bank'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
