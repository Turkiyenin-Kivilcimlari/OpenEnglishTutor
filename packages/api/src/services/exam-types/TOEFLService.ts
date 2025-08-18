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

// Local TOEFL configuration
const TOEFL_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 120,
    INCREMENT: 1,
    PASSING_SCORE: 80,
    SKILL_MAX: 30
  },
  SKILLS: ['reading', 'listening', 'writing', 'speaking'],
  TIME_LIMITS: {
    reading: 3240, // 54 minutes
    listening: 2460, // 41 minutes
    writing: 3000, // 50 minutes
    speaking: 1200 // 20 minutes
  }
};

// Local utility functions
const calculateTOEFLScore = (attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;
  
  // Group attempts by skill and calculate skill scores
  const skillGroups: Record<string, QuestionAttempt[]> = {};
  attempts.forEach(attempt => {
    if (!skillGroups[attempt.skillId]) {
      skillGroups[attempt.skillId] = [];
    }
    skillGroups[attempt.skillId].push(attempt);
  });
  
  let totalScore = 0;
  Object.values(skillGroups).forEach(skillAttempts => {
    const skillScore = Math.min(30, Math.round(
      skillAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / skillAttempts.length * 30
    ));
    totalScore += skillScore;
  });
  
  return Math.min(120, totalScore);
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

export class TOEFLService implements ExamService {
  private examTypeCode = 'toefl';
  private scoringScale = TOEFL_CONFIG.SCORING;

  async getNextQuestion(userId: string, skillCode: string, difficulty?: string) {
    try {
      // Get exam type and skill
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('TOEFL exam type not found');
      }

      const skill = await prisma.examSkill.findFirst({
        where: {
          examTypeId: examType.id,
          skillCode: skillCode,
          isActive: true
        }
      });

      if (!skill) {
        throw new Error(`TOEFL skill '${skillCode}' not found`);
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
      console.error('Error getting next TOEFL question:', error);
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
      console.error('Error evaluating TOEFL answer:', error);
      throw error;
    }
  }

  private evaluateObjectiveAnswer(question: any, answer: string) {
    const isCorrect = answer.toLowerCase().trim() === 
                     question.correctAnswer?.toLowerCase().trim();

    const score = isCorrect ? this.scoringScale.SKILL_MAX : 0;
    
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
    const mockScore = 20 + Math.random() * 10; // Random score between 20-30
    
    const criteriaScores = {
      development: Math.round((mockScore * 0.33 + (Math.random() - 0.5) * 2) * 10) / 10,
      organization: Math.round((mockScore * 0.33 + (Math.random() - 0.5) * 2) * 10) / 10,
      languageUse: Math.round((mockScore * 0.34 + (Math.random() - 0.5) * 2) * 10) / 10
    };

    const overallScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);
    const finalScore = Math.round(overallScore);

    return {
      isCorrect: null, // Not applicable for subjective questions
      score: finalScore,
      rawScore: finalScore,
      feedback: this.generateTOEFLFeedback(question.questionType, finalScore),
      suggestions: this.generateTOEFLSuggestions(question.questionType, finalScore),
      criteriaScores,
      transcription: audioUrl ? "Mock transcription for development" : undefined
    };
  }

  private generateTOEFLFeedback(questionType: string, score: number): string {
    if (questionType === 'WRITING') {
      if (score >= 24) {
        return "Excellent writing with clear development and sophisticated language use. Your response demonstrates strong organizational skills.";
      } else if (score >= 17) {
        return "Good writing with adequate development. Some areas for improvement in organization and language complexity.";
      } else {
        return "Basic writing with limited development. Focus on improving organization and expanding language use.";
      }
    } else if (questionType === 'SPEAKING') {
      if (score >= 24) {
        return "Clear and fluent speech with good delivery and topic development. Your pronunciation is generally clear.";
      } else if (score >= 17) {
        return "Generally clear speech with some hesitation. Good topic development with occasional language errors.";
      } else {
        return "Basic speech with frequent pauses. Work on improving delivery and expanding topic development.";
      }
    }
    
    return "Response evaluated according to TOEFL criteria.";
  }

  private generateTOEFLSuggestions(questionType: string, score: number): string {
    if (questionType === 'WRITING') {
      if (score < 17) {
        return "Practice organizing your ideas with clear introduction, body, and conclusion. Use more varied vocabulary and sentence structures.";
      } else if (score < 24) {
        return "Work on developing your ideas more fully and using more sophisticated language. Ensure smooth transitions between ideas.";
      } else {
        return "Excellent work! Continue practicing to maintain consistency in your high-level performance.";
      }
    } else if (questionType === 'SPEAKING') {
      if (score < 17) {
        return "Practice speaking regularly to improve fluency and pronunciation. Focus on developing your ideas more completely.";
      } else if (score < 24) {
        return "Work on reducing hesitation and using more precise vocabulary. Develop your responses more thoroughly.";
      } else {
        return "Great fluency and topic development! Keep practicing to maintain this level.";
      }
    }
    
    return "Continue practicing to improve your TOEFL performance.";
  }

  async calculateScore(attempts: any[]): Promise<number> {
    if (attempts.length === 0) return 0;
    
    return calculateTOEFLScore(attempts as QuestionAttempt[]);
  }

  async getProgressReport(userId: string, skillCode?: string) {
    try {
      const examType = await prisma.examType.findUnique({
        where: { code: this.examTypeCode }
      });

      if (!examType) {
        throw new Error('TOEFL exam type not found');
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
      console.error('Error getting TOEFL progress report:', error);
      throw error;
    }
  }

  // TOEFL-specific helper methods
  getValidSkills(): string[] {
    return TOEFL_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return TOEFL_CONFIG.TIME_LIMITS[skillCode as keyof typeof TOEFL_CONFIG.TIME_LIMITS] || 300;
  }

  getScoreDescription(score: number): string {
    if (score >= 100) return "Advanced proficiency";
    if (score >= 80) return "High-intermediate proficiency";
    if (score >= 60) return "Intermediate proficiency";
    if (score >= 40) return "Low-intermediate proficiency";
    return "Basic proficiency";
  }
}