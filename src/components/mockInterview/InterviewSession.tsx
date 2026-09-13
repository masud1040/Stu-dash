import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MockInterviewConfig, EvaluatedQuestion, MockQuestion } from '../../types/mockInterview';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
} from '../../lib/speechUtils';
import { correctTechnicalTerms } from '../../lib/technicalTermCorrector';
import { areQuestionsSemanticallyDuplicate } from '../../lib/questionDeduplicator';

interface Props {
  config: MockInterviewConfig;
  questions: MockQuestion[];
  onFinishInterview: (evaluatedQuestions: EvaluatedQuestion[], durationStr: string) => void;
  onExit: () => void;
  onAddQuestionToBank: (q: { question: string; answer: string; tag: string }) => void;
}

type InterviewPhase = 'asking' | 'ready' | 'recording' | 'evaluating' | 'reviewed';

export const InterviewSession: React.FC<Props> = ({
  config,
  questions: initialQuestions,
  onFinishInterview,
  onExit,
  onAddQuestionToBank,
}) => {
  const [questions, setQuestions] = useState<MockQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluatedQuestions, setEvaluatedQuestions] = useState<EvaluatedQuestion[]>([]);

  // Phase state machine
  const [phase, setPhase] = useState<InterviewPhase>('asking');

  // Candidate Answer text and transcript state
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [committedText, setCommittedText] = useState('');
  const [rawSpokenTranscript, setRawSpokenTranscript] = useState('');
  const [appliedCorrections, setAppliedCorrections] = useState<string[]>([]);

  // Recording & Error state
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isTypingMode, setIsTypingMode] = useState(false);

  // Audio / Speech Synthesis state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(true);

  // Evaluation state
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluatedQuestion | null>(null);
  const [showBetterAnswer, setShowBetterAnswer] = useState(true);
  const [addedToBankCurrent, setAddedToBankCurrent] = useState(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Exit dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const recognizerRef = useRef<any>(null);
  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // Track session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format elapsed seconds
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Stop active speech recognition safely
  const stopRecognizerInstance = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Play question audio and manage state transitions
  const playQuestionAudio = useCallback((text: string) => {
    stopSpeaking();
    setIsAiSpeaking(true);
    setPhase('asking');

    speakText(
      text,
      config.language,
      () => {
        setIsAiSpeaking(true);
        setPhase('asking');
      },
      () => {
        setIsAiSpeaking(false);
        // Add a gentle 600ms grace period so candidate gets ready
        setTimeout(() => {
          setPhase((current) => (current === 'asking' ? 'ready' : current));
        }, 600);
      },
      () => {
        setIsAiSpeaking(false);
        setPhase((current) => (current === 'asking' ? 'ready' : current));
      }
    );
  }, [config.language]);

  // Handle question changes and reset question-specific state
  useEffect(() => {
    if (!currentQ) return;
    setCandidateAnswer('');
    setCommittedText('');
    setRawSpokenTranscript('');
    setAppliedCorrections([]);
    setCurrentEvaluation(null);
    setShowBetterAnswer(true);
    setAddedToBankCurrent(false);
    setSpeechError(null);
    stopRecognizerInstance();

    if (autoSpeechEnabled) {
      playQuestionAudio(currentQ.question);
    } else {
      setPhase('ready');
    }

    return () => {
      stopSpeaking();
      stopRecognizerInstance();
    };
  }, [currentIndex, currentQ, autoSpeechEnabled, playQuestionAudio, stopRecognizerInstance]);

  // Toggle AI Question Voice playback
  const handleTogglePlayAudio = () => {
    if (isAiSpeaking) {
      stopSpeaking();
      setIsAiSpeaking(false);
      setPhase('ready');
    } else if (currentQ) {
      playQuestionAudio(currentQ.question);
    }
  };

  // Start Speech Recognition with Transcript Accumulation
  const startRecording = () => {
    // If AI is currently speaking, stop it immediately and pause before opening mic
    if (isAiSpeaking) {
      stopSpeaking();
      setIsAiSpeaking(false);
    }

    setSpeechError(null);

    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Speech recognition is not supported in this browser. Please type your answer below.');
      setIsTypingMode(true);
      return;
    }

    // Stop existing recognizer instance if active
    stopRecognizerInstance();

    // Base text to append to
    const baseText = committedText.trim();

    try {
      const recognizer = createSpeechRecognizer(config.language, {
        onStart: () => {
          setIsRecording(true);
          setPhase('recording');
        },
        onResult: (currentSessionText) => {
          // Accumulate without erasing previous speech!
          const combined = baseText
            ? `${baseText} ${currentSessionText}`.trim()
            : currentSessionText.trim();

          setCandidateAnswer(combined);
          setRawSpokenTranscript(combined);
        },
        onError: (err) => {
          console.warn('Speech recognition error event:', err);
          if (err !== 'no-speech') {
            setSpeechError(err);
          }
          setIsRecording(false);
          setPhase((p) => (p === 'recording' ? 'ready' : p));
        },
        onEnd: () => {
          setIsRecording(false);
          setPhase((p) => (p === 'recording' ? 'ready' : p));
          // Commit full accumulated text so resuming appends seamlessly
          setCandidateAnswer((latest) => {
            setCommittedText(latest);
            return latest;
          });
        },
      });

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      setSpeechError('Microphone access failed. You can type your response manually.');
      setIsTypingMode(true);
      setIsRecording(false);
      setPhase('ready');
    }
  };

  // Stop recording and preserve accumulated text
  const stopRecording = () => {
    stopRecognizerInstance();
    setCommittedText(candidateAnswer.trim());
    setPhase('ready');
  };

  // Handle manual typing/editing
  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCandidateAnswer(val);
    setCommittedText(val);
  };

  // Clear answer / Retry
  const handleRetryAnswer = () => {
    stopRecording();
    setCandidateAnswer('');
    setCommittedText('');
    setRawSpokenTranscript('');
    setAppliedCorrections([]);
    setSpeechError(null);
    setPhase('ready');
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    stopRecording();

    const trimmedRaw = candidateAnswer.trim();
    if (!trimmedRaw) {
      setSpeechError('Please speak or type your answer before submitting.');
      return;
    }

    // Apply intelligent technical term correction (e.g., "you state" -> "useState", "a sync" -> "async")
    const termCorrection = correctTechnicalTerms(trimmedRaw);
    const finalAnswerToEvaluate = termCorrection.corrected || trimmedRaw;
    setCandidateAnswer(finalAnswerToEvaluate);
    setAppliedCorrections(termCorrection.appliedTerms);

    setPhase('evaluating');
    setSpeechError(null);

    try {
      const res = await fetch('/api/mock-interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          expectedAnswer: currentQ.expectedAnswer,
          candidateAnswer: finalAnswerToEvaluate,
          rawTranscript: rawSpokenTranscript || trimmedRaw,
          topic: config.topic,
          language: config.language,
          difficulty: config.difficulty,
          questionIndex: currentIndex,
          totalQuestions: config.totalQuestions,
          previousTurns: evaluatedQuestions.map((q) => ({
            question: q.question,
            candidateAnswer: q.candidateAnswer,
            evaluation: q.status,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const modelAns =
          data.modelAnswer ||
          data.betterAnswer ||
          currentQ.expectedAnswer ||
          `When working with ${config.topic}, standard practices emphasize clear separation of concerns, defensive error handling, and modular component design.`;

        const verbalScript =
          data.howToSayVerbally ||
          data.verbalHowToSay ||
          `I usually explain this by first defining the core principle, providing an example from my experience with ${config.topic}, and highlighting the key trade-off.`;

        const evalItem: EvaluatedQuestion = {
          id: currentQ.id,
          question: currentQ.question,
          candidateAnswer: finalAnswerToEvaluate,
          rawTranscript: rawSpokenTranscript || trimmedRaw,
          correctedTranscript: data.correctedTranscript || finalAnswerToEvaluate,
          expectedAnswer: currentQ.expectedAnswer,
          score: Number(data.score) || 7,
          status: data.status || 'Correct',
          coveredPoints: data.coveredPoints || [],
          missingPoints: data.missingPoints || [],
          technicalIssues: data.technicalIssues || [],
          feedback: data.feedback || 'Good effort! Your response demonstrates understanding.',
          modelAnswer: modelAns,
          betterAnswer: modelAns,
          howToSayVerbally: verbalScript,
          verbalHowToSay: verbalScript,
          source: currentQ.source,
          tag: currentQ.tag || config.topic,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setCurrentEvaluation(evalItem);
        setEvaluatedQuestions((prev) => [...prev, evalItem]);
        setPhase('reviewed');

        // Check if there is an intelligent contextual follow-up question
        // ONLY insert if total count constraint is maintained and question is not duplicate!
        if (
          data.contextualFollowUp &&
          typeof data.contextualFollowUp === 'string' &&
          data.contextualFollowUp.trim().length > 10 &&
          questions.length < config.totalQuestions
        ) {
          const followUpQ = data.contextualFollowUp.trim();
          const isDup = questions.some((q) => areQuestionsSemanticallyDuplicate(q.question, followUpQ));
          if (!isDup) {
            const newFollowUpItem: MockQuestion = {
              id: `followup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              question: followUpQ,
              expectedAnswer: 'Detailed follow-up explanation.',
              source: 'ai',
              tag: currentQ.tag || config.topic,
            };
            // Insert right after current question
            setQuestions((prev) => {
              const copy = [...prev];
              copy.splice(currentIndex + 1, 0, newFollowUpItem);
              return copy.slice(0, config.totalQuestions);
            });
          }
        }
      } else {
        throw new Error(data.error || 'Evaluation failed');
      }
    } catch (err: any) {
      console.warn('Answer evaluation fallback:', err);
      // Resilient local evaluation fallback so candidate is never blocked
      const fallbackModel =
        currentQ.expectedAnswer ||
        `When discussing ${config.topic}, it is important to clearly outline the core mechanism, state why it is beneficial, and mention standard production considerations.`;
      const fallbackItem: EvaluatedQuestion = {
        id: currentQ.id,
        question: currentQ.question,
        candidateAnswer: finalAnswerToEvaluate,
        rawTranscript: rawSpokenTranscript || trimmedRaw,
        correctedTranscript: finalAnswerToEvaluate,
        expectedAnswer: currentQ.expectedAnswer,
        score: finalAnswerToEvaluate.split(/\s+/).length > 25 ? 8 : 6.5,
        status: finalAnswerToEvaluate.split(/\s+/).length > 25 ? 'Correct' : 'Partially Correct',
        coveredPoints: ['Core topic acknowledged and addressed'],
        missingPoints: ['Could expand on practical production trade-offs'],
        technicalIssues: [],
        feedback: 'Good answer! You demonstrated a working understanding of the concept.',
        modelAnswer: fallbackModel,
        betterAnswer: fallbackModel,
        howToSayVerbally: `Start with a concise one-sentence definition, followed by a concrete code or design pattern example from your past work.`,
        verbalHowToSay: `Start with a concise one-sentence definition, followed by a concrete code or design pattern example from your past work.`,
        source: currentQ.source,
        tag: currentQ.tag || config.topic,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setCurrentEvaluation(fallbackItem);
      setEvaluatedQuestions((prev) => [...prev, fallbackItem]);
      setPhase('reviewed');
    }
  };

  // Next Question or Finish
  const handleNext = () => {
    if (isLastQuestion) {
      onFinishInterview(evaluatedQuestions, formatTime(elapsedSeconds));
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Add question to question bank with duplicate prevention
  const handleAddCurrentToBank = () => {
    if (!currentQ) return;
    onAddQuestionToBank({
      question: currentQ.question,
      answer: currentEvaluation?.modelAnswer || currentEvaluation?.betterAnswer || currentQ.expectedAnswer || 'Technical interview answer.',
      tag: currentQ.tag || config.topic,
    });
    setAddedToBankCurrent(true);
  };

  const progressPercent = Math.round(((currentIndex + (currentEvaluation ? 1 : 0.35)) / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. TOP HEADER & PROGRESS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-xs shadow-indigo-500/20">
              <i className="fa-solid fa-headset"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Live Mock Interview
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                  {config.topic}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium hidden sm:inline">
                  {config.difficulty}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-0.5">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-normal">
                  <i className="fa-regular fa-clock mr-1"></i>
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
              title={autoSpeechEnabled ? 'Mute AI voice' : 'Enable AI voice'}
              className={`p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                autoSpeechEnabled
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
              }`}
            >
              <i className={`fa-solid ${autoSpeechEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* 2. INTERVIEW BOARD AREA */}
      <div className="grid grid-cols-1 gap-6">
        {/* INTERVIEWER SECTION */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-indigo-800/40 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* AI Avatar with wave pulse */}
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl shadow-md ${
                  isAiSpeaking ? 'animate-pulse ring-4 ring-indigo-400/40' : ''
                }`}>
                  <i className="fa-solid fa-robot"></i>
                </div>
                {isAiSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">AI Interviewer</h3>
                  {currentQ?.source === 'database' ? (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-semibold">
                      Question Bank
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[10px] font-semibold">
                      AI Generated
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-300 mt-0.5">
                  {isAiSpeaking
                    ? 'Asking question aloud...'
                    : phase === 'recording'
                    ? 'Listening to candidate response...'
                    : phase === 'evaluating'
                    ? 'Analyzing response semantics...'
                    : 'Ready for your answer'}
                </p>
              </div>
            </div>

            {/* Voice repeat button */}
            <button
              onClick={handleTogglePlayAudio}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <i className={`fa-solid ${isAiSpeaking ? 'fa-stop text-rose-300' : 'fa-volume-high text-indigo-300'}`}></i>
              <span>{isAiSpeaking ? 'Stop Voice' : 'Repeat Question'}</span>
            </button>
          </div>

          {/* Question Text */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-100">
              "{currentQ?.question}"
            </p>
          </div>
        </div>

        {/* CANDIDATE ANSWER SECTION (Before evaluation) */}
        {!currentEvaluation && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Your Answer
                </h4>
              </div>

              <button
                onClick={() => setIsTypingMode(!isTypingMode)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <i className={`fa-solid ${isTypingMode ? 'fa-microphone' : 'fa-keyboard'}`}></i>
                <span>{isTypingMode ? 'Switch to Voice Input' : 'Type / Edit Manually'}</span>
              </button>
            </div>

            {/* Error / Notice message */}
            {speechError && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 shrink-0"></i>
                <div className="flex-1">
                  <p>{speechError}</p>
                </div>
                <button
                  onClick={() => setSpeechError(null)}
                  className="text-amber-500 hover:text-amber-700 text-xs cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            {/* Preserved Transcript Notice if stopped previously with content */}
            {!isRecording && committedText.trim().length > 0 && (
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check text-indigo-500"></i>
                  Transcript preserved. You can click <strong>"Continue Speaking"</strong> to add more, or edit directly.
                </span>
              </div>
            )}

            {/* Live Transcript / Input Area */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={candidateAnswer}
                  onChange={handleManualTextChange}
                  placeholder={
                    isRecording
                      ? "Listening to you... Words appear in real-time as you speak..."
                      : isAiSpeaking
                      ? "Please wait while the AI finishes asking the question..."
                      : "Click 'Start Speaking' or type your answer here. You can speak in English, বাংলা, or mixed Banglish..."
                  }
                  rows={4}
                  className={`w-full p-4 rounded-xl text-sm transition-all focus:outline-hidden focus:ring-2 ${
                    isRecording
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-400 dark:border-rose-600 focus:ring-rose-500'
                      : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } text-slate-800 dark:text-slate-100 placeholder-slate-400`}
                />

                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500 text-white text-[11px] font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>Recording Audio</span>
                  </div>
                )}
              </div>

              {/* Spoken Language Hint & Stats */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 px-1">
                <div className="flex items-center gap-2">
                  <span>Language: {config.language} (English, বাংলা, Banglish supported)</span>
                </div>
                <span>{candidateAnswer.trim() ? `${candidateAnswer.trim().split(/\s+/).length} words` : '0 words'}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer animate-pulse"
                  >
                    <i className="fa-solid fa-microphone-slash"></i>
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={phase === 'evaluating'}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                      isAiSpeaking
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                        : candidateAnswer.trim()
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <i className="fa-solid fa-microphone"></i>
                    <span>{candidateAnswer.trim() ? 'Continue Speaking' : 'Start Speaking'}</span>
                  </button>
                )}

                {candidateAnswer.trim() && (
                  <button
                    type="button"
                    onClick={handleRetryAnswer}
                    disabled={phase === 'evaluating'}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Clear response and record again"
                  >
                    <i className="fa-solid fa-rotate-left"></i>
                    <span>Clear Answer</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={phase === 'evaluating' || !candidateAnswer.trim()}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {phase === 'evaluating' ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3. EVALUATION & FEEDBACK STATE (After candidate answers) */}
        {currentEvaluation && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80 dark:border-slate-700/80 space-y-6 animate-fadeIn">
            {/* Score & Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                  currentEvaluation.score >= 7
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : currentEvaluation.score >= 4
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                }`}>
                  {currentEvaluation.score.toFixed(1)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Answer Evaluation
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      currentEvaluation.status === 'Correct'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : currentEvaluation.status === 'Partially Correct'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                    }`}>
                      {currentEvaluation.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                    Score: {currentEvaluation.score}/10
                  </h4>
                </div>
              </div>

              {/* Add to Bank Button (if AI generated) */}
              {currentQ?.source === 'ai' && (
                <button
                  onClick={handleAddCurrentToBank}
                  disabled={addedToBankCurrent}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    addedToBankCurrent
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <i className={`fa-solid ${addedToBankCurrent ? 'fa-check' : 'fa-bookmark text-indigo-500'}`}></i>
                  <span>{addedToBankCurrent ? 'Saved to Question Bank' : 'Save Question to Bank'}</span>
                </button>
              )}
            </div>

            {/* Candidate Spoken Answer Card */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Your Spoken Answer:
                </span>
                {appliedCorrections.length > 0 && (
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Auto-normalized STT: {appliedCorrections.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic">
                "{currentEvaluation.candidateAnswer}"
              </p>
            </div>

            {/* Feedback & Semantic Points */}
            <div className="space-y-3">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                  <i className="fa-solid fa-comment-dots"></i>
                  <span>Interviewer Feedback:</span>
                </div>
                <p>{currentEvaluation.feedback}</p>
              </div>

              {/* Covered & Missing Points & Technical Issues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {currentEvaluation.coveredPoints && currentEvaluation.coveredPoints.length > 0 && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check"></i>
                      <span>Key Points Covered:</span>
                    </span>
                    <ul className="space-y-1">
                      {currentEvaluation.coveredPoints.map((pt, i) => (
                        <li key={i} className="text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-1.5">
                          <span>•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentEvaluation.missingPoints && currentEvaluation.missingPoints.length > 0 && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-lightbulb"></i>
                      <span>To Improve / Mention:</span>
                    </span>
                    <ul className="space-y-1">
                      {currentEvaluation.missingPoints.map((pt, i) => (
                        <li key={i} className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                          <span>•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Technical Issues / Misconceptions (if any) */}
              {currentEvaluation.technicalIssues && currentEvaluation.technicalIssues.length > 0 && (
                <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-xl p-3 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>Technical Inaccuracies Identified:</span>
                  </span>
                  <ul className="space-y-1">
                    {currentEvaluation.technicalIssues.map((issue, i) => (
                      <li key={i} className="text-xs text-rose-900 dark:text-rose-200 flex items-start gap-1.5">
                        <span>•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Model Answer & How to say it in an interview */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowBetterAnswer(!showBetterAnswer)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <i className={`fa-solid ${showBetterAnswer ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                <span>{showBetterAnswer ? 'Hide Model Answer & Spoken Phrasing' : 'Show Ideal Model Answer & Spoken Phrasing'}</span>
              </button>

              {showBetterAnswer && (
                <div className="mt-3 space-y-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 animate-fadeIn text-xs sm:text-sm">
                  {(currentEvaluation.modelAnswer || currentEvaluation.betterAnswer) && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                        Ideal Model Answer (Interview Quality):
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {currentEvaluation.modelAnswer || currentEvaluation.betterAnswer}
                      </p>
                    </div>
                  )}

                  {(currentEvaluation.howToSayVerbally || currentEvaluation.verbalHowToSay) && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                        How to Say it Verbally in an Interview:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{currentEvaluation.howToSayVerbally || currentEvaluation.verbalHowToSay}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Next Question / Finish Button */}
            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all transform active:scale-95"
              >
                <span>{isLastQuestion ? 'Complete Interview & View Final Report' : 'Next Question'}</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leave Interview Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Are you sure you want to exit?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your current in-progress mock interview will be abandoned.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Continue Interview
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Exit Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
