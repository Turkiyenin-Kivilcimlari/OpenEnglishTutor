import { ExamType, SkillType, QuestionType, Difficulty } from '../types';

// Exam Type Constants
export const EXAM_TYPES: Record<ExamType, { name: string; description: string }> = {
  ielts: {
    name: 'IELTS Academic',
    description: 'International English Language Testing System - Academic'
  },
  toefl: {
    name: 'TOEFL iBT',
    description: 'Test of English as a Foreign Language - Internet-based Test'
  },
  yds: {
    name: 'YDS',
    description: 'Yabancı Dil Sınavı (Foreign Language Exam)'
  }
};

// Skill Type Constants
export const SKILL_TYPES: Record<SkillType, { name: string; description: string }> = {
  reading: {
    name: 'Reading',
    description: 'Reading comprehension and analysis'
  },
  listening: {
    name: 'Listening',
    description: 'Listening comprehension and understanding'
  },
  writing: {
    name: 'Writing',
    description: 'Written expression and composition'
  },
  speaking: {
    name: 'Speaking',
    description: 'Oral communication and fluency'
  },
  grammar: {
    name: 'Grammar',
    description: 'Grammar rules and structure'
  },
  vocabulary: {
    name: 'Vocabulary',
    description: 'Word knowledge and usage'
  }
};

// Question Type Constants
export const QUESTION_TYPES: Record<QuestionType, { name: string; description: string }> = {
  multiple_choice: {
    name: 'Multiple Choice',
    description: 'Select the correct answer from multiple options'
  },
  true_false: {
    name: 'True/False',
    description: 'Determine if the statement is true or false'
  },
  fill_blank: {
    name: 'Fill in the Blank',
    description: 'Complete the sentence with the correct word or phrase'
  },
  essay: {
    name: 'Essay',
    description: 'Write a comprehensive response'
  },
  speaking: {
    name: 'Speaking',
    description: 'Provide an oral response'
  },
  matching: {
    name: 'Matching',
    description: 'Match items from two lists'
  },
  ordering: {
    name: 'Ordering',
    description: 'Arrange items in the correct order'
  }
};

// Difficulty Constants
export const DIFFICULTY_LEVELS: Record<Difficulty, { name: string; description: string; color: string }> = {
  easy: {
    name: 'Easy',
    description: 'Basic level questions',
    color: '#10B981' // green
  },
  medium: {
    name: 'Medium',
    description: 'Intermediate level questions',
    color: '#F59E0B' // yellow
  },
  hard: {
    name: 'Hard',
    description: 'Advanced level questions',
    color: '#EF4444' // red
  }
};

// IELTS Specific Constants
export const IELTS_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 9,
    INCREMENT: 0.5,
    PASSING_SCORE: 6.0
  },
  SKILLS: ['reading', 'listening', 'writing', 'speaking'] as SkillType[],
  TIME_LIMITS: {
    reading: 3600, // 60 minutes
    listening: 1800, // 30 minutes
    writing: 3600, // 60 minutes
    speaking: 900 // 15 minutes
  },
  WRITING_CRITERIA: [
    { name: 'Task Achievement', weight: 0.25 },
    { name: 'Coherence and Cohesion', weight: 0.25 },
    { name: 'Lexical Resource', weight: 0.25 },
    { name: 'Grammatical Range and Accuracy', weight: 0.25 }
  ],
  SPEAKING_CRITERIA: [
    { name: 'Fluency and Coherence', weight: 0.25 },
    { name: 'Lexical Resource', weight: 0.25 },
    { name: 'Grammatical Range and Accuracy', weight: 0.25 },
    { name: 'Pronunciation', weight: 0.25 }
  ]
};

// TOEFL Specific Constants
export const TOEFL_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 120,
    INCREMENT: 1,
    PASSING_SCORE: 80,
    SKILL_MAX: 30
  },
  SKILLS: ['reading', 'listening', 'writing', 'speaking'] as SkillType[],
  TIME_LIMITS: {
    reading: 3240, // 54 minutes
    listening: 2460, // 41 minutes
    writing: 3000, // 50 minutes
    speaking: 1200 // 20 minutes
  },
  WRITING_CRITERIA: [
    { name: 'Development', weight: 0.33 },
    { name: 'Organization', weight: 0.33 },
    { name: 'Language Use', weight: 0.34 }
  ],
  SPEAKING_CRITERIA: [
    { name: 'Delivery', weight: 0.33 },
    { name: 'Language Use', weight: 0.33 },
    { name: 'Topic Development', weight: 0.34 }
  ]
};

// YDS Specific Constants
export const YDS_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 100,
    INCREMENT: 1,
    PASSING_SCORE: 60
  },
  SKILLS: ['reading', 'listening', 'grammar', 'vocabulary'] as SkillType[],
  TIME_LIMITS: {
    reading: 5400, // 90 minutes
    listening: 1800, // 30 minutes
    grammar: 2700, // 45 minutes
    vocabulary: 1800 // 30 minutes
  }
};

// API Constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh'
  },
  EXAMS: {
    TYPES: '/api/exam-types',
    SKILLS: '/api/exams/:type/skills',
    QUESTIONS: {
      NEXT: '/api/questions/next',
      SUBMIT: '/api/questions/:id/submit'
    }
  },
  PROGRESS: {
    DASHBOARD: '/api/progress/dashboard',
    EXAM_TYPE: '/api/progress/:examType',
    COMPARISON: '/api/progress/comparison',
    HISTORY: '/api/progress/history'
  },
  EVALUATION: {
    IELTS_WRITING: '/api/evaluate/ielts/writing',
    IELTS_SPEAKING: '/api/evaluate/ielts/speaking',
    TOEFL_WRITING: '/api/evaluate/toefl/writing',
    TOEFL_SPEAKING: '/api/evaluate/toefl/speaking',
    YDS_GRAMMAR: '/api/evaluate/yds/grammar'
  }
};

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Question Errors
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  INVALID_ANSWER: 'INVALID_ANSWER',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  
  // AI Service Errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  EVALUATION_FAILED: 'EVALUATION_FAILED',
  SPEECH_RECOGNITION_FAILED: 'SPEECH_RECOGNITION_FAILED',
  
  // General Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Default Values
export const DEFAULT_VALUES = {
  QUESTION_TIME_LIMIT: 300, // 5 minutes
  MAX_WRITING_LENGTH: 1000,
  MAX_SPEAKING_DURATION: 300, // 5 minutes
  AI_TIMEOUT: 30000, // 30 seconds
  PAGINATION_LIMIT: 20,
  CACHE_TTL: 3600 // 1 hour
};

// UI Constants
export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6B7280',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4'
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px'
  },
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  }
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-()]+$/,
  URL: /^https?:\/\/.+/
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};