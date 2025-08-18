import { prisma } from '@/config/database';
import { ExamService } from '../ExamServiceFactory';

// Local type definitions (will be replaced with shared imports later)
type Difficulty = 'easy' | 'medium' | 'hard';

interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  examTypeId: string;
  skillId: string;
  userAnswer: string;
  audioUrl?: string;
  timeSpent: number;
  submittedAt: Date;
  isCorrect?: boolean;
  score: number;
  rawScore: number;
  evaluationFeedback?: string;
  suggestions?: string;
  criteriaScores?: Record<string, number>;
  metadata?: Record<string, any>;
  question?: any;
}

interface UserExamProgress {
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
}

// Local IELTS configuration
const IELTS_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 9,
    INCREMENT: 0.5,
    PASSING_SCORE: 6.0
  },
  SKILLS: ['reading', 'listening', 'writing', 'speaking'],
  TIME_LIMITS: {
    reading: 3600, // 60 minutes
    listening: 1800, // 30 minutes
    writing: 3600, // 60 minutes
    speaking: 900 // 15 minutes
  }
};

// Local utility functions
const calculateIELTSBandScore = (attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = totalScore / attempts.length;
  return Math.round(averageScore * 2) / 2;
};

const getAdaptiveDifficulty = (
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

export class IELTSService implements ExamService {
  private examTypeCode = 'ielts';
  private scoringScale = IELTS_CONFIG.SCORING;

  async getNextQuestion(userId: string, skillCode: string, difficulty?: string) {
    try {
      // Get exam type and skill
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('IELTS exam type not found');
      }

      const skill = await prisma.examSkill.findFirst({
        where: {
          examTypeId: examType.id,
          skillCode: skillCode,
          isActive: true
        }
      });

      if (!skill) {
        throw new Error(`IELTS skill '${skillCode}' not found`);
      }

      // Get user's recent attempts to avoid repetition
      const recentAttempts = await prisma.questionAttempt.findMany({
        where: {
          userId,
          examTypeId: examType.id,
          skillId: skill.id
        },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: { questionId: true }
      });

      const excludeIds = recentAttempts.map((attempt: any) => attempt.questionId);

      // Determine difficulty level
      let targetDifficulty: Difficulty;
      if (difficulty) {
        targetDifficulty = difficulty as Difficulty;
      } else {
        // Get adaptive difficulty based on recent performance
        const recentPerformance = await prisma.questionAttempt.findMany({
          where: {
            userId,
            examTypeId: examType.id,
            skillId: skill.id
          },
          orderBy: { submittedAt: 'desc' },
          take: 5
        });

        targetDifficulty = getAdaptiveDifficulty(recentPerformance as QuestionAttempt[], 'easy');
      }

      // Find appropriate question
      const question = await prisma.question.findFirst({
        where: {
          examTypeId: examType.id,
          skillId: skill.id,
          difficultyLevel: targetDifficulty.toUpperCase() as any,
          id: { notIn: excludeIds }
        },
        include: {
          examType: true,
          skill: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!question) {
        // If no questions found with target difficulty, try any difficulty
        const fallbackQuestion = await prisma.question.findFirst({
          where: {
            examTypeId: examType.id,
            skillId: skill.id,
            id: { notIn: excludeIds }
          },
          include: {
            examType: true,
            skill: true
          },
          orderBy: { createdAt: 'desc' }
        });

        return fallbackQuestion;
      }

      return question;
    } catch (error) {
      console.error('Error getting next IELTS question:', error);
      throw error;
    }
  }

  async evaluateAnswer(question: any, answer: string, audioUrl?: string) {
    try {
      const isObjective = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'].includes(
        question.questionType
      );

      if (isObjective) {
        return this.evaluateObjectiveAnswer(question, answer);
      } else {
        return this.evaluateSubjectiveAnswer(question, answer, audioUrl);
      }
    } catch (error) {
      console.error('Error evaluating IELTS answer:', error);
      throw error;
    }
  }

  private evaluateObjectiveAnswer(question: any, answer: string) {
    const isCorrect = answer.toLowerCase().trim() === 
                     question.correctAnswer?.toLowerCase().trim();

    const score = isCorrect ? this.scoringScale.MAX : 0;
    
    return {
      isCorrect,
      score,
      rawScore: score,
      feedback: isCorrect 
        ? "Correct! Well done." 
        : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      suggestions: isCorrect 
        ? "Keep up the good work!" 
        : "Review the passage/audio carefully and try to identify key information.",
      criteriaScores: null
    };
  }

  private async evaluateSubjectiveAnswer(question: any, answer: string, audioUrl?: string) {
    // For now, return a mock evaluation
    // In a real implementation, this would call AI services
    const mockBandScore = 6.5 + Math.random() * 2; // Random score between 6.5-8.5
    
    const criteriaScores = {
      taskAchievement: Math.round((mockBandScore + (Math.random() - 0.5)) * 2) / 2,
      coherenceCohesion: Math.round((mockBandScore + (Math.random() - 0.5)) * 2) / 2,
      lexicalResource: Math.round((mockBandScore + (Math.random() - 0.5)) * 2) / 2,
      grammaticalRange: Math.round((mockBandScore + (Math.random() - 0.5)) * 2) / 2
    };

    const overallScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0) / 4;
    const finalScore = Math.round(overallScore * 2) / 2; // Round to nearest 0.5

    return {
      isCorrect: null, // Not applicable for subjective questions
      score: finalScore,
      rawScore: finalScore,
      feedback: this.generateIELTSFeedback(question.questionType, finalScore),
      suggestions: this.generateIELTSSuggestions(question.questionType, finalScore),
      criteriaScores,
      transcription: audioUrl ? "Mock transcription for development" : undefined
    };
  }

  private generateIELTSFeedback(questionType: string, score: number): string {
    if (questionType === 'WRITING') {
      if (score >= 7.0) {
        return "Good response with clear ideas and appropriate language use. Your writing demonstrates good control of grammar and vocabulary.";
      } else if (score >= 6.0) {
        return "Adequate response that addresses the task. Some areas for improvement in vocabulary range and grammatical accuracy.";
      } else {
        return "Basic response with limited development. Focus on expanding your ideas and improving language accuracy.";
      }
    } else if (questionType === 'SPEAKING') {
      if (score >= 7.0) {
        return "Fluent speech with good pronunciation and natural language use. You communicate effectively with minimal hesitation.";
      } else if (score >= 6.0) {
        return "Generally fluent with some hesitation. Good range of vocabulary with occasional grammatical errors.";
      } else {
        return "Basic fluency with frequent pauses. Work on expanding vocabulary and improving grammatical accuracy.";
      }
    }
    
    return "Response evaluated according to IELTS criteria.";
  }

  private generateIELTSSuggestions(questionType: string, score: number): string {
    if (questionType === 'WRITING') {
      if (score < 6.0) {
        return "Practice organizing your ideas clearly. Use more varied sentence structures and expand your vocabulary.";
      } else if (score < 7.0) {
        return "Work on using more sophisticated vocabulary and complex sentence structures. Ensure all parts of the task are fully addressed.";
      } else {
        return "Excellent work! Continue practicing to maintain consistency in your high-level performance.";
      }
    } else if (questionType === 'SPEAKING') {
      if (score < 6.0) {
        return "Practice speaking regularly to improve fluency. Focus on pronunciation and using more varied vocabulary.";
      } else if (score < 7.0) {
        return "Work on reducing hesitation and using more complex grammatical structures naturally.";
      } else {
        return "Great fluency and language use! Keep practicing to maintain this level.";
      }
    }
    
    return "Continue practicing to improve your IELTS performance.";
  }

  async calculateScore(attempts: any[]): Promise<number> {
    if (attempts.length === 0) return 0;
    
    return calculateIELTSBandScore(attempts as QuestionAttempt[]);
  }

  async getProgressReport(userId: string, skillCode?: string) {
    try {
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('IELTS exam type not found');
      }

      const whereClause: any = {
        userId,
        examTypeId: examType.id
      };

      if (skillCode) {
        const skill = await prisma.examSkill.findFirst({
          where: {
            examTypeId: examType.id,
            skillCode: skillCode
          }
        });

        if (skill) {
          whereClause.skillId = skill.id;
        }
      }

      const progress = await prisma.userExamProgress.findMany({
        where: whereClause,
        include: {
          skill: true,
          examType: true
        }
      });

      return {
        examType: this.examTypeCode,
        skillCode,
        progress,
        summary: {
          totalQuestions: progress.reduce((sum: number, p: any) => sum + p.totalQuestions, 0),
          correctAnswers: progress.reduce((sum: number, p: any) => sum + p.correctAnswers, 0),
          averageScore: progress.length > 0 
            ? progress.reduce((sum: number, p: any) => sum + (p.averageScore || 0), 0) / progress.length 
            : 0,
          bestScore: Math.max(...progress.map((p: any) => p.bestScore || 0), 0)
        }
      };
    } catch (error) {
      console.error('Error getting IELTS progress report:', error);
      throw error;
    }
  }

  // IELTS-specific helper methods
  getValidSkills(): string[] {
    return IELTS_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return IELTS_CONFIG.TIME_LIMITS[skillCode as keyof typeof IELTS_CONFIG.TIME_LIMITS] || 300;
  }

  getBandScoreDescription(score: number): string {
    if (score >= 8.5) return "Very good user";
    if (score >= 7.5) return "Good user";
    if (score >= 6.5) return "Competent user";
    if (score >= 5.5) return "Modest user";
    if (score >= 4.5) return "Limited user";
    return "Extremely limited user";
  }
}
