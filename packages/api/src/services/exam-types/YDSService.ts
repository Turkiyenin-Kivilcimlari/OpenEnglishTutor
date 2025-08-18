import { prisma } from '@/config/database';
import { ExamService } from '../ExamServiceFactory';

// Local type definitions
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

// Local YDS configuration
const YDS_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 100,
    INCREMENT: 1,
    PASSING_SCORE: 60
  },
  SKILLS: ['reading', 'listening', 'grammar', 'vocabulary'],
  TIME_LIMITS: {
    reading: 5400, // 90 minutes
    listening: 1800, // 30 minutes
    grammar: 2700, // 45 minutes
    vocabulary: 1800 // 30 minutes
  }
};

// Local utility functions
const calculateYDSScore = (attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;
  
  const totalPoints = attempts.reduce((sum, attempt) => sum + (attempt.question?.points || 1), 0);
  const earnedPoints = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  
  return Math.round((earnedPoints / totalPoints) * 100);
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

export class YDSService implements ExamService {
  private examTypeCode = 'yds';
  private scoringScale = YDS_CONFIG.SCORING;

  async getNextQuestion(userId: string, skillCode: string, difficulty?: string) {
    try {
      // Get exam type and skill
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('YDS exam type not found');
      }

      const skill = await prisma.examSkill.findFirst({
        where: {
          examTypeId: examType.id,
          skillCode: skillCode,
          isActive: true
        }
      });

      if (!skill) {
        throw new Error(`YDS skill '${skillCode}' not found`);
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
      console.error('Error getting next YDS question:', error);
      throw error;
    }
  }

  async evaluateAnswer(question: any, answer: string, audioUrl?: string) {
    try {
      // YDS is primarily objective-based
      return this.evaluateObjectiveAnswer(question, answer);
    } catch (error) {
      console.error('Error evaluating YDS answer:', error);
      throw error;
    }
  }

  private evaluateObjectiveAnswer(question: any, answer: string) {
    const isCorrect = answer.toLowerCase().trim() === 
                     question.correctAnswer?.toLowerCase().trim();

    const score = isCorrect ? (question.points || 1) : 0;
    
    return {
      isCorrect,
      score,
      rawScore: score,
      feedback: isCorrect 
        ? "Doğru! Tebrikler." 
        : `Yanlış. Doğru cevap: ${question.correctAnswer}`,
      suggestions: isCorrect 
        ? "Böyle devam edin!" 
        : this.generateYDSSuggestions(question.skill?.skillCode, question.questionType),
      criteriaScores: null
    };
  }

  private generateYDSSuggestions(skillCode: string, questionType: string): string {
    if (skillCode === 'grammar') {
      return "Gramer kurallarını tekrar gözden geçirin. Cümle yapılarına ve zaman uyumuna dikkat edin.";
    } else if (skillCode === 'vocabulary') {
      return "Kelime dağarcığınızı geliştirin. Kelimelerin farklı anlamlarını ve kullanım alanlarını öğrenin.";
    } else if (skillCode === 'reading') {
      return "Metni daha dikkatli okuyun. Ana fikri ve detayları ayırt etmeye çalışın.";
    } else if (skillCode === 'listening') {
      return "Dinleme becerilerinizi geliştirin. Anahtar kelimelere odaklanın ve not alın.";
    }
    
    return "YDS sınavına yönelik daha fazla pratik yapın.";
  }

  async calculateScore(attempts: any[]): Promise<number> {
    if (attempts.length === 0) return 0;
    
    return calculateYDSScore(attempts as QuestionAttempt[]);
  }

  async getProgressReport(userId: string, skillCode?: string) {
    try {
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('YDS exam type not found');
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
      console.error('Error getting YDS progress report:', error);
      throw error;
    }
  }

  // YDS-specific helper methods
  getValidSkills(): string[] {
    return YDS_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return YDS_CONFIG.TIME_LIMITS[skillCode as keyof typeof YDS_CONFIG.TIME_LIMITS] || 300;
  }

  getScoreDescription(score: number): string {
    if (score >= 85) return "Çok İyi";
    if (score >= 70) return "İyi";
    if (score >= 60) return "Geçer";
    if (score >= 50) return "Zayıf";
    return "Başarısız";
  }

  // YDS-specific methods
  getSkillWeights(): Record<string, number> {
    return {
      reading: 0.4,    // 40% - Reading comprehension
      listening: 0.2,  // 20% - Listening comprehension
      grammar: 0.25,   // 25% - Grammar and structure
      vocabulary: 0.15 // 15% - Vocabulary
    };
  }

  calculateWeightedScore(skillScores: Record<string, number>): number {
    const weights = this.getSkillWeights();
    let totalWeightedScore = 0;
    let totalWeight = 0;

    Object.entries(skillScores).forEach(([skill, score]) => {
      const weight = weights[skill] || 0;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }
}