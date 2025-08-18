// User Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  examProgress: UserExamProgress[];
}

// Exam Types
export type ExamType = 'ielts' | 'toefl' | 'yds';
export type SkillType = 'reading' | 'listening' | 'writing' | 'speaking' | 'grammar' | 'vocabulary';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'speaking' | 'matching' | 'ordering';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type EvaluationType = 'objective' | 'subjective' | 'ai_powered';

export interface ExamTypeConfig {
  id: string;
  code: ExamType;
  name: string;
  description: string;
  scoringSystem: {
    scale: string;
    increment: number;
    passingScore: number;
  };
  skills: ExamSkill[];
  isActive: boolean;
  createdAt: Date;
}

export interface ExamSkill {
  id: string;
  examTypeId: string;
  skillCode: SkillType;
  skillName: string;
  maxScore: number;
  evaluationType: EvaluationType;
  isActive: boolean;
  createdAt: Date;
}

// Question Types
export interface Question {
  id: string;
  examTypeId: string;
  skillId: string;
  questionType: QuestionType;
  difficultyLevel: Difficulty;
  title: string;
  content: string;
  instructions?: string;
  audioUrl?: string;
  imageUrl?: string;
  correctAnswer?: string;
  options?: Record<string, any>;
  timeLimit: number;
  points: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  examType?: ExamTypeConfig;
  skill?: ExamSkill;
}

// Question Attempt Types
export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  examTypeId: string;
  skillId: string;
  userAnswer: string;
  audioUrl?: string;
  timeSpent: number;
  submittedAt: Date;
  
  // Evaluation results
  isCorrect?: boolean;
  score: number;
  rawScore: number;
  evaluationFeedback?: string;
  suggestions?: string;
  criteriaScores?: Record<string, number>;
  metadata?: Record<string, any>;
  
  // Relations
  user?: User;
  question?: Question;
}

// Progress Types
export interface UserExamProgress {
  id: string;
  userId: string;
  examTypeId: string;
  skillId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalPoints: number;
  earnedPoints: number;
  averageScore: number;
  bestScore: number;
  lastActivity: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  examType?: ExamTypeConfig;
  skill?: ExamSkill;
}

// Evaluation Types
export interface Evaluation {
  isCorrect?: boolean;
  score: number;
  rawScore: number;
  feedback: string;
  suggestions: string;
  criteriaScores?: Record<string, number>;
  transcription?: string; // For speaking questions (AI or manual)
  audioUrl?: string;
  aiEvaluation?: AIOverallEvaluation; // New field to hold the structured AI evaluation result
}

// Base AI Evaluation Interface
export interface AIOverallEvaluation {
  overallScore: number; // Overall score given by AI
  feedback: string; // Detailed textual feedback
  suggestions: string; // Suggestions for improvement
  criteriaScores: Record<string, number>; // Specific criteria scores (e.g., { "Fluency": 7, "Lexical Resource": 6 })
  rawAIAssessment?: any; // Optional: To store the raw JSON response from AI for advanced debugging/auditing
}

// Specific AI Evaluation Interfaces for different exam types and skills
export interface IELTSWritingAIEvaluation extends AIOverallEvaluation {
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
}

export interface IELTSSpeakingAIEvaluation extends AIOverallEvaluation {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  pronunciation: number;
  transcription: string; // Transcription from STT service
}

export interface TOEFLWritingAIEvaluation extends AIOverallEvaluation {
  development: number;
  organization: number;
  languageUse: number;
}

export interface TOEFLSpeakingAIEvaluation extends AIOverallEvaluation {
  delivery: number;
  languageUse: number;
  topicDevelopment: number;
  transcription: string; // Transcription from STT service
}

// Existing Evaluation Types (no change needed as AI results are now nested under 'aiEvaluation')
export interface WritingEvaluation extends Evaluation {
  // specific writing fields for non-AI evaluations if needed, otherwise rely on general Evaluation for AI ones.
}

export interface SpeakingEvaluation extends Evaluation {
  // specific speaking fields for non-AI evaluations if needed, otherwise rely on general Evaluation for AI ones.
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Question Flow Types
export interface QuestionFlowState {
  currentQuestion: Question | null;
  userAnswer: string;
  audioUrl: string;
  timeSpent: number;
  isSubmitting: boolean;
  result: EvaluationResult | null;
}

export interface EvaluationResult {
  attempt: QuestionAttempt;
  evaluation: Evaluation;
  progress: UserExamProgress;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Dashboard Types
export interface DashboardData {
  user: UserProfile;
  recentActivity: QuestionAttempt[];
  progressSummary: UserExamProgress[];
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  type: 'skill_improvement' | 'exam_suggestion' | 'practice_reminder';
  title: string;
  description: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;