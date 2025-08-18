import { ExamType, Difficulty, QuestionAttempt, UserExamProgress } from '../types';
import { IELTS_CONFIG, TOEFL_CONFIG, YDS_CONFIG } from '../constants';

// Score Calculation Utilities
export const calculateBandScore = (examType: ExamType, attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;

  switch (examType) {
    case 'ielts':
      return calculateIELTSBandScore(attempts);
    case 'toefl':
      return calculateTOEFLScore(attempts);
    case 'yds':
      return calculateYDSScore(attempts);
    default:
      return 0;
  }
};

export const calculateIELTSBandScore = (attempts: QuestionAttempt[]): number => {
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = totalScore / attempts.length;
  
  // Round to nearest 0.5 for IELTS
  return Math.round(averageScore * 2) / 2;
};

export const calculateTOEFLScore = (attempts: QuestionAttempt[]): number => {
  // Group attempts by skill and calculate skill scores
  const skillGroups = groupAttemptsBySkill(attempts);
  let totalScore = 0;
  
  Object.values(skillGroups).forEach(skillAttempts => {
    const skillScore = Math.min(30, Math.round(
      skillAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / skillAttempts.length * 30
    ));
    totalScore += skillScore;
  });
  
  return Math.min(120, totalScore);
};

export const calculateYDSScore = (attempts: QuestionAttempt[]): number => {
  const totalPoints = attempts.reduce((sum, attempt) => sum + (attempt.question?.points || 1), 0);
  const earnedPoints = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  
  return Math.round((earnedPoints / totalPoints) * 100);
};

// Progress Calculation Utilities
export const calculateAccuracy = (progress: UserExamProgress): number => {
  if (progress.totalQuestions === 0) return 0;
  return (progress.correctAnswers / progress.totalQuestions) * 100;
};

export const calculateProgressPercentage = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.min(100, (current / target) * 100);
};

// Difficulty Adaptation Utilities
export const getAdaptiveDifficulty = (
  recentAttempts: QuestionAttempt[],
  currentDifficulty: Difficulty = 'easy'
): Difficulty => {
  if (recentAttempts.length < 3) return currentDifficulty;
  
  const recentAccuracy = recentAttempts.reduce((sum, attempt) => 
    sum + (attempt.isCorrect ? 1 : 0), 0
  ) / recentAttempts.length;
  
  if (recentAccuracy > 0.8) {
    return currentDifficulty === 'easy' ? 'medium' : 
           currentDifficulty === 'medium' ? 'hard' : 'hard';
  } else if (recentAccuracy < 0.4) {
    return currentDifficulty === 'hard' ? 'medium' : 
           currentDifficulty === 'medium' ? 'easy' : 'easy';
  }
  
  return currentDifficulty;
};

// Time Utilities
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const parseTimeToSeconds = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
};

export const getTimeRemaining = (startTime: Date, timeLimit: number): number => {
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  return Math.max(0, timeLimit - elapsed);
};

// Validation Utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateAnswerLength = (answer: string, questionType: string): boolean => {
  switch (questionType) {
    case 'essay':
      return answer.length >= 10 && answer.length <= 1000;
    case 'fill_blank':
      return answer.length >= 1 && answer.length <= 100;
    default:
      return answer.length > 0;
  }
};

// Array Utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const groupAttemptsBySkill = (attempts: QuestionAttempt[]): Record<string, QuestionAttempt[]> => {
  return groupBy(attempts, 'skillId');
};

// String Utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Number Utilities
export const roundToDecimal = (num: number, decimals: number): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const percentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Date Utilities
export const formatDate = (date: Date, format: 'short' | 'long' | 'time' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' }
  }[format];
  
  return date.toLocaleDateString('en-US', options);
};

export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// Local Storage Utilities
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};

// Debounce Utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle Utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Error Handling Utilities
export const createError = (code: string, message: string, details?: any): Error => {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).details = details;
  return error;
};

export const isAppError = (error: any): boolean => {
  return error && typeof error.code === 'string';
};

// Audio Utilities
export const formatAudioDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const validateAudioFile = (file: File): boolean => {
  const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};