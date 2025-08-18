import { z } from 'zod';
import { ExamType, SkillType, QuestionType, Difficulty } from '../types';

// Base validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const userProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  preferredLanguage: z.string().optional(),
});

// Exam validation schemas
export const examTypeSchema = z.enum(['ielts', 'toefl', 'yds'] as const);
export const skillTypeSchema = z.enum(['reading', 'listening', 'writing', 'speaking', 'grammar', 'vocabulary'] as const);
export const questionTypeSchema = z.enum(['multiple_choice', 'true_false', 'fill_blank', 'essay', 'speaking', 'matching', 'ordering'] as const);
export const difficultySchema = z.enum(['easy', 'medium', 'hard'] as const);

// Question validation schemas
export const questionSchema = z.object({
  examTypeId: z.string().uuid('Invalid exam type ID'),
  skillId: z.string().uuid('Invalid skill ID'),
  questionType: questionTypeSchema,
  difficultyLevel: difficultySchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  instructions: z.string().max(1000, 'Instructions too long').optional(),
  audioUrl: z.string().url('Invalid audio URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  correctAnswer: z.string().optional(),
  options: z.record(z.any()).optional(),
  timeLimit: z.number().min(30, 'Time limit too short').max(7200, 'Time limit too long').default(300),
  points: z.number().min(1, 'Points must be at least 1').default(1),
  metadata: z.record(z.any()).optional(),
});

// Question attempt validation schemas
export const questionAttemptSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  userAnswer: z.string().min(1, 'Answer is required'),
  audioUrl: z.string().url('Invalid audio URL').optional(),
  timeSpent: z.number().min(0, 'Time spent cannot be negative').optional(),
});

// Answer validation by question type
export const multipleChoiceAnswerSchema = z.object({
  answer: z.string().min(1, 'Please select an answer'),
});

export const trueFalseAnswerSchema = z.object({
  answer: z.enum(['true', 'false'], { required_error: 'Please select true or false' }),
});

export const fillBlankAnswerSchema = z.object({
  answer: z.string().min(1, 'Please fill in the blank').max(100, 'Answer too long'),
});

export const essayAnswerSchema = z.object({
  answer: z.string()
    .min(10, 'Essay must be at least 10 characters')
    .max(1000, 'Essay must not exceed 1000 characters'),
});

export const speakingAnswerSchema = z.object({
  audioUrl: z.string().url('Invalid audio URL'),
  duration: z.number().min(1, 'Recording too short').max(300, 'Recording too long'),
});

// Progress validation schemas
export const progressQuerySchema = z.object({
  examType: examTypeSchema.optional(),
  skillType: skillTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// API request validation schemas
export const getNextQuestionSchema = z.object({
  examType: examTypeSchema,
  skillCode: skillTypeSchema,
  difficulty: difficultySchema.optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z.string().min(1, 'Answer is required'),
  audioUrl: z.string().url('Invalid audio URL').optional(),
  timeSpent: z.number().min(0, 'Time spent cannot be negative').default(0),
});

// File upload validation schemas
export const audioFileSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'].includes(file.type),
      'Invalid audio format. Supported formats: MP3, WAV, OGG, WebM'
    ),
});

export const imageFileSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' })
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'Invalid image format. Supported formats: JPEG, PNG, GIF, WebP'
    ),
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  filters: z.record(z.any()).optional(),
});

// Exam configuration validation schemas
export const examTypeConfigSchema = z.object({
  code: examTypeSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  scoringSystem: z.object({
    scale: z.string().min(1, 'Scale is required'),
    increment: z.number().min(0.1, 'Increment too small'),
    passingScore: z.number().min(0, 'Passing score cannot be negative'),
  }),
  skills: z.array(z.string().uuid('Invalid skill ID')),
  isActive: z.boolean().default(true),
});

export const examSkillConfigSchema = z.object({
  examTypeId: z.string().uuid('Invalid exam type ID'),
  skillCode: skillTypeSchema,
  skillName: z.string().min(1, 'Skill name is required').max(100, 'Skill name too long'),
  maxScore: z.number().min(1, 'Max score must be at least 1'),
  evaluationType: z.enum(['objective', 'subjective', 'ai_powered'] as const),
  isActive: z.boolean().default(true),
});

// Validation helper functions
export const validateAnswerByType = (questionType: QuestionType, answer: string, audioUrl?: string) => {
  switch (questionType) {
    case 'multiple_choice':
      return multipleChoiceAnswerSchema.parse({ answer });
    case 'true_false':
      return trueFalseAnswerSchema.parse({ answer });
    case 'fill_blank':
      return fillBlankAnswerSchema.parse({ answer });
    case 'essay':
      return essayAnswerSchema.parse({ answer });
    case 'speaking':
      if (!audioUrl) throw new Error('Audio URL is required for speaking questions');
      return speakingAnswerSchema.parse({ audioUrl, duration: 0 }); // Duration will be calculated
    default:
      return { answer };
  }
};

export const validateExamTypeSkills = (examType: ExamType, skillCode: SkillType): boolean => {
  const validSkills: Record<ExamType, SkillType[]> = {
    ielts: ['reading', 'listening', 'writing', 'speaking'],
    toefl: ['reading', 'listening', 'writing', 'speaking'],
    yds: ['reading', 'listening', 'grammar', 'vocabulary'],
  };

  return validSkills[examType].includes(skillCode);
};

export const validateScoreRange = (examType: ExamType, score: number): boolean => {
  const scoreRanges: Record<ExamType, { min: number; max: number }> = {
    ielts: { min: 0, max: 9 },
    toefl: { min: 0, max: 120 },
    yds: { min: 0, max: 100 },
  };

  const range = scoreRanges[examType];
  return score >= range.min && score <= range.max;
};

// Custom validation error class
export class ValidationError extends Error {
  public issues: z.ZodIssue[];

  constructor(error: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = error.issues;
  }

  getFieldErrors(): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    
    this.issues.forEach((issue) => {
      const path = issue.path.join('.');
      fieldErrors[path] = issue.message;
    });

    return fieldErrors;
  }

  getFirstError(): string {
    return this.issues[0]?.message || 'Validation failed';
  }
}

// Validation wrapper function
export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
};

// Safe validation function that returns result with success flag
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: ValidationError;
} => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: new ValidationError(error) };
    }
    return { success: false, error: error as ValidationError };
  }
};

// Export all schemas for external use
export const schemas = {
  // User schemas
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  userProfileUpdate: userProfileUpdateSchema,
  
  // Question schemas
  question: questionSchema,
  questionAttempt: questionAttemptSchema,
  
  // Answer schemas by type
  multipleChoiceAnswer: multipleChoiceAnswerSchema,
  trueFalseAnswer: trueFalseAnswerSchema,
  fillBlankAnswer: fillBlankAnswerSchema,
  essayAnswer: essayAnswerSchema,
  speakingAnswer: speakingAnswerSchema,
  
  // API schemas
  getNextQuestion: getNextQuestionSchema,
  submitAnswer: submitAnswerSchema,
  progressQuery: progressQuerySchema,
  
  // File upload schemas
  audioFile: audioFileSchema,
  imageFile: imageFileSchema,
  
  // Utility schemas
  pagination: paginationSchema,
  search: searchSchema,
  
  // Configuration schemas
  examTypeConfig: examTypeConfigSchema,
  examSkillConfig: examSkillConfigSchema,
};