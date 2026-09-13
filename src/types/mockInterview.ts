import { QuestionItem } from '../../pages/InterviewPrep';

export type InterviewLanguage = 'English' | 'বাংলা' | 'Banglish';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MockInterviewConfig {
  topic: string;
  totalQuestions: number;
  language: InterviewLanguage;
  difficulty: InterviewDifficulty;
}

export interface MockQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
  source: 'database' | 'ai';
  tag: string;
  isIntroductory?: boolean;
}

export interface EvaluatedQuestion {
  id: string;
  question: string;
  candidateAnswer: string;
  expectedAnswer?: string;
  score: number;
  status: 'Correct' | 'Partially Correct' | 'Incorrect';
  coveredPoints?: string[];
  missingPoints?: string[];
  technicalIssues?: string[];
  feedback: string;
  betterAnswer?: string;
  verbalHowToSay?: string;
  source: 'database' | 'ai';
  tag: string;
  timestamp?: string;
  addedToBank?: boolean;
}

export interface CompletedMockInterview {
  id: string;
  date: string;
  topic: string;
  language: InterviewLanguage;
  difficulty: InterviewDifficulty;
  totalQuestions: number;
  score: number; // percentage 0-100
  duration: string;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  interviewTips: string[];
  suggestedQuestions: string[];
  questions: EvaluatedQuestion[];
}
