import React, { useState } from 'react';
import { CompletedMockInterview } from '../../types/mockInterview';

interface Props {
  history: CompletedMockInterview[];
  onSelectSession: (session: CompletedMockInterview) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartNew: () => void;
  onBackToQuestions: () => void;
}

export const MockInterviewHistory: React.FC<Props> = ({
  history,
  onSelectSession,
  onDeleteSession,
  onStartNew,
  onBackToQuestions,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getPerformanceBadge = (score: number) => {
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    if (score >= 70) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300';
    if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBackToQuestions}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Question Bank</span>
        </button>

        <button
          onClick={onStartNew}
          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-plus"></i>
          <span>New Mock Interview</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mock Interview History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your past practice sessions, answers, and improvement debriefs.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">
            {history.length} {history.length === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-2xl mx-auto">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Mock Interviews Recorded Yet
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Practice answering technical and behavioral interview questions with AI feedback and voice recognition.
              </p>
            </div>
            <button
              onClick={onStartNew}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Start Your First Mock Interview
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((session) => (
              <div
                key={session.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700/80 bg-white dark:bg-slate-800 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-base font-black">{session.score}%</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {session.topic}
                      </h4>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${getPerformanceBadge(session.score)}`}>
                        {session.score >= 70 ? 'Passed' : 'Needs Practice'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        <i className="fa-regular fa-calendar mr-1"></i>
                        {session.date}
                      </span>
                      <span>•</span>
                      <span>
                        <i className="fa-regular fa-clock mr-1"></i>
                        {session.duration}
                      </span>
                      <span>•</span>
                      <span>{session.totalQuestions} Questions</span>
                      <span>•</span>
                      <span className="capitalize">{session.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50">
                  <button
                    onClick={() => onSelectSession(session)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Debrief</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(session.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete session"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Interview Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will permanently delete this mock interview record and its feedback report.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
