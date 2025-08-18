// Export all types
export * from './types';

// Export all constants
export * from './constants';

// Export all utilities
export * from './utils';

// Export all validations
export * from './validations';

// Re-export commonly used items for convenience
export type {
  User,
  UserProfile,
  ExamType,
  SkillType,
  QuestionType,
  Difficulty,
  Question,
  QuestionAttempt,
  UserExamProgress,
  Evaluation,
  WritingEvaluation,
  SpeakingEvaluation,
  ApiResponse,
  PaginatedResponse,
  EvaluationResult,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  DashboardData,
  Recommendation,
  AppError
} from './types';

export {
  EXAM_TYPES,
  SKILL_TYPES,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  IELTS_CONFIG,
  TOEFL_CONFIG,
  YDS_CONFIG,
  API_ENDPOINTS,
  ERROR_CODES,
  DEFAULT_VALUES,
  UI_CONSTANTS
} from './constants';

export {
  calculateBandScore,
  calculateIELTSBandScore,
  calculateTOEFLScore,
  calculateYDSScore,
  calculateAccuracy,
  getAdaptiveDifficulty,
  formatTime,
  formatDate,
  getRelativeTime,
  isValidEmail,
  isValidPassword,
  validateAnswerLength,
  shuffleArray,
  groupBy,
  capitalize,
  truncateText,
  slugify,
  roundToDecimal,
  clamp,
  percentage,
  debounce,
  throttle,
  createError,
  isAppError
} from './utils';

export {
  schemas,
  ValidationError,
  validate,
  safeValidate,
  validateAnswerByType,
  validateExamTypeSkills,
  validateScoreRange,
  emailSchema,
  passwordSchema,
  userRegistrationSchema,
  userLoginSchema,
  questionSchema,
  questionAttemptSchema,
  submitAnswerSchema,
  getNextQuestionSchema
} from './validations';