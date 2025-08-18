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

interface Question {
  id: string;
  examTypeId: string;
  skillId: string;
  questionType: string;
  difficultyLevel: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}

interface Evaluation {
  isCorrect?: boolean;
  score: number;
  rawScore: number;
  feedback: string;
  suggestions: string;
  criteriaScores?: Record<string, number>;
  transcription?: string;
  audioUrl?: string;
}

interface WritingEvaluation extends Evaluation {
  development?: number;
  organization?: number;
  languageUse?: number;
  overallScore: number;
}

interface SpeakingEvaluation extends Evaluation {
  delivery?: number;
  languageUse?: number;
  topicDevelopment?: number;
  overallScore: number;
  transcription: string;
}

// Enhanced TOEFL configuration with skill-specific settings
const ENHANCED_TOEFL_CONFIG = {
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
  },
  READING: {
    PASSAGES_PER_TEST: 3,
    QUESTIONS_PER_PASSAGE: 12,
    TOTAL_QUESTIONS: 36,
    TIME_LIMIT: 3240, // 54 minutes
    QUESTION_TYPES: [
      'multiple_choice',
      'insert_text',
      'reading_to_learn_categorize',
      'reading_to_learn_summarize',
      'vocabulary',
      'reference',
      'inference',
      'rhetorical_purpose',
      'factual_information',
      'negative_factual_information'
    ]
  },
  LISTENING: {
    CONVERSATIONS: 2,
    LECTURES: 4,
    QUESTIONS_PER_CONVERSATION: 5,
    QUESTIONS_PER_LECTURE: 6,
    TOTAL_QUESTIONS: 34,
    TIME_LIMIT: 2460, // 41 minutes
    QUESTION_TYPES: [
      'multiple_choice',
      'multiple_choice_multiple_answer',
      'replay',
      'organization',
      'connecting_content'
    ]
  },
  WRITING: {
    TASKS: 2,
    INTEGRATED_TASK: {
      TIME_LIMIT: 1200, // 20 minutes
      MIN_WORDS: 150,
      MAX_WORDS: 225,
      TYPE: 'integrated'
    },
    INDEPENDENT_TASK: {
      TIME_LIMIT: 1800, // 30 minutes
      MIN_WORDS: 300,
      TYPE: 'independent'
    }
  },
  SPEAKING: {
    TASKS: 4,
    TASK1: {
      TYPE: 'independent',
      PREPARATION_TIME: 15, // 15 seconds
      SPEAKING_TIME: 45, // 45 seconds
      TOPIC: 'personal_preference'
    },
    TASK2: {
      TYPE: 'integrated_campus',
      PREPARATION_TIME: 30, // 30 seconds
      SPEAKING_TIME: 60, // 60 seconds
      TOPIC: 'campus_situation'
    },
    TASK3: {
      TYPE: 'integrated_academic',
      PREPARATION_TIME: 30, // 30 seconds
      SPEAKING_TIME: 60, // 60 seconds
      TOPIC: 'academic_course'
    },
    TASK4: {
      TYPE: 'integrated_academic',
      PREPARATION_TIME: 20, // 20 seconds
      SPEAKING_TIME: 60, // 60 seconds
      TOPIC: 'academic_lecture'
    }
  }
};

// Utility functions
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
  private scoringScale = ENHANCED_TOEFL_CONFIG.SCORING;

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

      // Generate skill-specific question
      return await this.generateSkillSpecificQuestion(skillCode, targetDifficulty, excludeIds, examType.id, skill.id);
    } catch (error) {
      console.error('Error getting next TOEFL question:', error);
      throw error;
    }
  }

  private async generateSkillSpecificQuestion(
    skillCode: string, 
    difficulty: Difficulty, 
    excludeIds: string[], 
    examTypeId: string, 
    skillId: string
  ) {
    switch (skillCode) {
      case 'reading':
        return await this.generateReadingQuestion(difficulty, excludeIds, examTypeId, skillId);
      case 'listening':
        return await this.generateListeningQuestion(difficulty, excludeIds, examTypeId, skillId);
      case 'writing':
        return await this.generateWritingQuestion(difficulty, excludeIds, examTypeId, skillId);
      case 'speaking':
        return await this.generateSpeakingQuestion(difficulty, excludeIds, examTypeId, skillId);
      default:
        throw new Error(`Unsupported TOEFL skill: ${skillCode}`);
    }
  }

  private async generateReadingQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
    // Try to find existing question first
    const existingQuestion = await prisma.question.findFirst({
      where: {
        examTypeId,
        skillId,
        difficultyLevel: difficulty.toUpperCase() as any,
        id: { notIn: excludeIds }
      },
      include: {
        examType: true,
        skill: true
      }
    });

    if (existingQuestion) {
      return existingQuestion;
    }

    // Generate new reading question based on TOEFL format
    const readingQuestionTypes = ENHANCED_TOEFL_CONFIG.READING.QUESTION_TYPES;
    const questionType = readingQuestionTypes[Math.floor(Math.random() * readingQuestionTypes.length)];
    
    const passages = this.getReadingPassagesByDifficulty(difficulty);
    const selectedPassage = passages[Math.floor(Math.random() * passages.length)];
    
    return {
      id: `toefl_reading_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'READING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `TOEFL Reading - ${questionType.replace('_', ' ').toUpperCase()}`,
      content: selectedPassage.text,
      instructions: this.getReadingInstructions(questionType),
      timeLimit: ENHANCED_TOEFL_CONFIG.READING.TIME_LIMIT / 3, // Per passage
      points: 12, // Questions per passage
      metadata: {
        passageType: selectedPassage.type,
        questionType,
        passage: selectedPassage,
        questions: this.generateReadingQuestions(selectedPassage, questionType, difficulty)
      }
    };
  }

  private async generateListeningQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        examTypeId,
        skillId,
        difficultyLevel: difficulty.toUpperCase() as any,
        id: { notIn: excludeIds }
      },
      include: {
        examType: true,
        skill: true
      }
    });

    if (existingQuestion) {
      return existingQuestion;
    }

    const contentTypes = ['conversation', 'lecture'];
    const selectedType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const listeningContent = this.getListeningContentByType(selectedType, difficulty);
    
    return {
      id: `toefl_listening_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'LISTENING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `TOEFL Listening - ${selectedType.toUpperCase()}`,
      content: listeningContent.transcript,
      instructions: this.getListeningInstructions(selectedType),
      audioUrl: listeningContent.audioUrl,
      timeLimit: selectedType === 'conversation' ? 300 : 360, // 5-6 minutes
      points: selectedType === 'conversation' ? 5 : 6,
      metadata: {
        contentType: selectedType,
        audioScript: listeningContent.transcript,
        questions: this.generateListeningQuestions(listeningContent, selectedType, difficulty)
      }
    };
  }

  private async generateWritingQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        examTypeId,
        skillId,
        difficultyLevel: difficulty.toUpperCase() as any,
        id: { notIn: excludeIds }
      },
      include: {
        examType: true,
        skill: true
      }
    });

    if (existingQuestion) {
      return existingQuestion;
    }

    const tasks = ['integrated', 'independent'];
    const selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
    const writingPrompt = this.getWritingPrompt(selectedTask, difficulty);
    
    return {
      id: `toefl_writing_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'ESSAY',
      difficultyLevel: difficulty.toUpperCase(),
      title: `TOEFL Writing - ${selectedTask.toUpperCase()} Task`,
      content: writingPrompt.prompt,
      instructions: writingPrompt.instructions,
      timeLimit: selectedTask === 'integrated' ? ENHANCED_TOEFL_CONFIG.WRITING.INTEGRATED_TASK.TIME_LIMIT : ENHANCED_TOEFL_CONFIG.WRITING.INDEPENDENT_TASK.TIME_LIMIT,
      points: 30, // Each writing task is scored out of 30
      metadata: {
        taskType: selectedTask,
        minWords: selectedTask === 'integrated' ? ENHANCED_TOEFL_CONFIG.WRITING.INTEGRATED_TASK.MIN_WORDS : ENHANCED_TOEFL_CONFIG.WRITING.INDEPENDENT_TASK.MIN_WORDS,
        readingPassage: (writingPrompt as any).readingPassage,
        listeningContent: (writingPrompt as any).listeningContent
      }
    };
  }

  private async generateSpeakingQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        examTypeId,
        skillId,
        difficultyLevel: difficulty.toUpperCase() as any,
        id: { notIn: excludeIds }
      },
      include: {
        examType: true,
        skill: true
      }
    });

    if (existingQuestion) {
      return existingQuestion;
    }

    const tasks = [1, 2, 3, 4];
    const selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
    const speakingContent = this.getSpeakingContent(selectedTask, difficulty);
    
    return {
      id: `toefl_speaking_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'SPEAKING',
      difficultyLevel: difficulty.toUpperCase(),
      title: `TOEFL Speaking Task ${selectedTask}`,
      content: speakingContent.prompt,
      instructions: speakingContent.instructions,
      timeLimit: this.getSpeakingTimeLimit(selectedTask),
      points: 30, // Each speaking task is scored out of 30
      metadata: {
        taskNumber: selectedTask,
        taskType: speakingContent.type,
        preparationTime: speakingContent.preparationTime,
        speakingTime: speakingContent.speakingTime,
        readingPassage: (speakingContent as any).readingPassage,
        listeningContent: (speakingContent as any).listeningContent
      }
    };
  }

  async evaluateAnswer(question: any, answer: string, audioUrl?: string) {
    try {
      const skillCode = question.skill?.skillCode || this.extractSkillFromMetadata(question);
      
      switch (skillCode) {
        case 'reading':
          return await this.evaluateReadingAnswer(question, answer);
        case 'listening':
          return await this.evaluateListeningAnswer(question, answer);
        case 'writing':
          return await this.evaluateWritingAnswer(question, answer);
        case 'speaking':
          return await this.evaluateSpeakingAnswer(question, answer, audioUrl);
        default:
          throw new Error(`Unsupported skill for evaluation: ${skillCode}`);
      }
    } catch (error) {
      console.error('Error evaluating TOEFL answer:', error);
      throw error;
    }
  }

  private async evaluateReadingAnswer(question: any, answer: string): Promise<Evaluation> {
    const questions = question.metadata?.questions || [];
    const userAnswers = JSON.parse(answer);
    
    let correctCount = 0;
    const detailedResults: any[] = [];
    
    questions.forEach((q: any, index: number) => {
      const userAnswer = userAnswers[index]?.toLowerCase().trim();
      const correctAnswer = q.correctAnswer.toLowerCase().trim();
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;
      
      detailedResults.push({
        questionId: q.id,
        userAnswer: userAnswers[index],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      });
    });
    
    const rawScore = correctCount;
    const scaledScore = this.convertReadingScoreToTOEFL(rawScore, questions.length);
    
    return {
      isCorrect: correctCount === questions.length,
      score: scaledScore,
      rawScore,
      feedback: this.generateReadingFeedback(scaledScore, correctCount, questions.length),
      suggestions: this.generateReadingSuggestions(scaledScore, detailedResults),
      criteriaScores: {
        accuracy: (correctCount / questions.length) * 30,
        comprehension: scaledScore
      }
    };
  }

  private async evaluateListeningAnswer(question: any, answer: string): Promise<Evaluation> {
    const questions = question.metadata?.questions || [];
    const userAnswers = JSON.parse(answer);
    
    let correctCount = 0;
    const detailedResults: any[] = [];
    
    questions.forEach((q: any, index: number) => {
      const userAnswer = userAnswers[index]?.toLowerCase().trim();
      const correctAnswer = q.correctAnswer.toLowerCase().trim();
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;
      
      detailedResults.push({
        questionId: q.id,
        userAnswer: userAnswers[index],
        correctAnswer: q.correctAnswer,
        isCorrect,
        timeStamp: q.timeStamp
      });
    });
    
    const rawScore = correctCount;
    const scaledScore = this.convertListeningScoreToTOEFL(rawScore, questions.length);
    
    return {
      isCorrect: correctCount === questions.length,
      score: scaledScore,
      rawScore,
      feedback: this.generateListeningFeedback(scaledScore, correctCount, questions.length),
      suggestions: this.generateListeningSuggestions(scaledScore, detailedResults),
      criteriaScores: {
        accuracy: (correctCount / questions.length) * 30,
        comprehension: scaledScore
      }
    };
  }

  private async evaluateWritingAnswer(question: any, answer: string): Promise<WritingEvaluation> {
    const taskType = question.metadata?.taskType || 'independent';
    const minWords = question.metadata?.minWords || 300;
    const wordCount = answer.split(/\s+/).length;
    
    // Mock AI evaluation - in production, this would call actual AI services
    const mockScores = this.generateMockWritingScores(answer, taskType, wordCount >= minWords);
    
    const overallScore = (mockScores.development + mockScores.organization + mockScores.languageUse) / 3;
    const finalScore = Math.round(overallScore);
    
    return {
      isCorrect: undefined,
      score: finalScore,
      rawScore: finalScore,
      feedback: this.generateWritingFeedback(taskType, finalScore, wordCount, minWords),
      suggestions: this.generateWritingSuggestions(taskType, finalScore, mockScores),
      development: mockScores.development,
      organization: mockScores.organization,
      languageUse: mockScores.languageUse,
      overallScore: finalScore,
      criteriaScores: mockScores
    };
  }

  private async evaluateSpeakingAnswer(question: any, answer: string, audioUrl?: string): Promise<SpeakingEvaluation> {
    const taskNumber = question.metadata?.taskNumber || 1;
    
    // Mock AI evaluation - in production, this would call actual AI services
    const mockScores = this.generateMockSpeakingScores(answer, taskNumber);
    const mockTranscription = this.generateMockTranscription(audioUrl);
    
    const overallScore = (mockScores.delivery + mockScores.languageUse + mockScores.topicDevelopment) / 3;
    const finalScore = Math.round(overallScore);
    
    return {
      isCorrect: undefined,
      score: finalScore,
      rawScore: finalScore,
      feedback: this.generateSpeakingFeedback(taskNumber, finalScore),
      suggestions: this.generateSpeakingSuggestions(taskNumber, finalScore, mockScores),
      delivery: mockScores.delivery,
      languageUse: mockScores.languageUse,
      topicDevelopment: mockScores.topicDevelopment,
      overallScore: finalScore,
      transcription: mockTranscription,
      criteriaScores: mockScores
    };
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

      // Get detailed skill-specific progress
      const skillProgress = await this.getSkillSpecificProgress(userId, examType.id, skillCode);

      return {
        examType: this.examTypeCode,
        skillCode,
        progress,
        skillProgress,
        summary: {
          totalQuestions: progress.reduce((sum: number, p: any) => sum + p.totalQuestions, 0),
          correctAnswers: progress.reduce((sum: number, p: any) => sum + p.correctAnswers, 0),
          averageScore: progress.length > 0 
            ? progress.reduce((sum: number, p: any) => sum + (p.averageScore || 0), 0) / progress.length 
            : 0,
          bestScore: Math.max(...progress.map((p: any) => p.bestScore || 0), 0),
          overallTOEFLScore: this.calculateOverallTOEFLScore(progress)
        }
      };
    } catch (error) {
      console.error('Error getting TOEFL progress report:', error);
      throw error;
    }
  }

  // TOEFL-specific helper methods
  getValidSkills(): string[] {
    return ENHANCED_TOEFL_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return ENHANCED_TOEFL_CONFIG.TIME_LIMITS[skillCode as keyof typeof ENHANCED_TOEFL_CONFIG.TIME_LIMITS] || 300;
  }

  getScoreDescription(score: number): string {
    if (score >= 100) return "Advanced proficiency";
    if (score >= 80) return "High-intermediate proficiency";
    if (score >= 60) return "Intermediate proficiency";
    if (score >= 40) return "Low-intermediate proficiency";
    return "Basic proficiency";
  }

  // Private helper methods for question generation and evaluation
  private extractSkillFromMetadata(question: any): string {
    return question.metadata?.skillCode || 'reading';
  }

  private getSpeakingTimeLimit(taskNumber: number): number {
    const timeLimits = {
      1: 60, // 15s prep + 45s speaking
      2: 90, // 30s prep + 60s speaking
      3: 90, // 30s prep + 60s speaking
      4: 80  // 20s prep + 60s speaking
    };
    return timeLimits[taskNumber as keyof typeof timeLimits] || 90;
  }

  private convertReadingScoreToTOEFL(rawScore: number, totalQuestions: number): number {
    const percentage = (rawScore / totalQuestions) * 100;
    if (percentage >= 95) return 30;
    if (percentage >= 90) return 28;
    if (percentage >= 85) return 26;
    if (percentage >= 80) return 24;
    if (percentage >= 75) return 22;
    if (percentage >= 70) return 20;
    if (percentage >= 65) return 18;
    if (percentage >= 60) return 16;
    if (percentage >= 55) return 14;
    if (percentage >= 50) return 12;
    if (percentage >= 45) return 10;
    if (percentage >= 40) return 8;
    if (percentage >= 35) return 6;
    if (percentage >= 30) return 4;
    if (percentage >= 25) return 2;
    return 0;
  }

  private convertListeningScoreToTOEFL(rawScore: number, totalQuestions: number): number {
    return this.convertReadingScoreToTOEFL(rawScore, totalQuestions);
  }

  private generateReadingFeedback(score: number, correctCount: number, totalQuestions: number): string {
    const percentage = (correctCount / totalQuestions) * 100;
    if (score >= 24) {
      return `Excellent reading performance! You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). You demonstrate strong academic reading skills and can understand complex texts effectively.`;
    } else if (score >= 17) {
      return `Good reading performance. You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). You show solid comprehension but could improve on inference and detail questions.`;
    } else {
      return `Your reading needs improvement. You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). Focus on vocabulary building and reading comprehension strategies.`;
    }
  }

  private generateReadingSuggestions(score: number, detailedResults: any[]): string {
    if (score >= 24) {
      return "Excellent work! Continue reading academic texts and focus on time management strategies for the actual test.";
    } else if (score >= 17) {
      return "Good foundation! Work on inference questions and practice identifying main ideas vs. supporting details. Build academic vocabulary.";
    } else {
      return "Focus on basic reading strategies: skimming, scanning, and understanding paragraph structure. Practice with shorter academic passages first.";
    }
  }

  private generateListeningFeedback(score: number, correctCount: number, totalQuestions: number): string {
    const percentage = (correctCount / totalQuestions) * 100;
    if (score >= 24) {
      return `Outstanding listening skills! You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). You can follow complex academic discussions and lectures effectively.`;
    } else if (score >= 17) {
      return `Good listening performance. You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). You understand main ideas well but could improve on detail and inference questions.`;
    } else {
      return `Your listening needs work. You scored ${score}/30 with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). Practice with academic content and note-taking strategies.`;
    }
  }

  private generateListeningSuggestions(score: number, detailedResults: any[]): string {
    if (score >= 24) {
      return "Excellent listening! Continue exposure to academic lectures and conversations. Practice advanced note-taking techniques.";
    } else if (score >= 17) {
      return "Good listening foundation. Work on identifying speaker attitudes and connecting information across the audio. Practice predicting content.";
    } else {
      return "Focus on basic listening skills: identifying main ideas, understanding speaker purposes, and following conversation flow. Use subtitles initially, then remove them.";
    }
  }

  private generateMockWritingScores(answer: string, taskType: string, meetsWordCount: boolean): Record<string, number> {
    // Mock AI scoring - in production, this would use actual AI evaluation
    const baseScore = meetsWordCount ? 20 : 15;
    const variation = (Math.random() - 0.5) * 6; // ±3 point variation
    
    return {
      development: Math.max(0, Math.min(30, baseScore + variation)),
      organization: Math.max(0, Math.min(30, baseScore + (Math.random() - 0.5) * 6)),
      languageUse: Math.max(0, Math.min(30, baseScore + (Math.random() - 0.5) * 6))
    };
  }

  private generateWritingFeedback(taskType: string, score: number, wordCount: number, minWords: number): string {
    let feedback = `TOEFL ${taskType} Writing Task Assessment (Score: ${score}/30)\n\n`;
    
    if (wordCount < minWords) {
      feedback += `⚠️ Word count: ${wordCount}/${minWords} - You need to write more to fully address the task.\n\n`;
    } else {
      feedback += `✓ Word count: ${wordCount}/${minWords} - Good length.\n\n`;
    }
    
    if (score >= 24) {
      feedback += "Excellent writing! Your essay demonstrates strong organization, clear development of ideas, and effective language use.";
    } else if (score >= 17) {
      feedback += "Good writing with room for improvement. Focus on clearer organization and more precise language use.";
    } else {
      feedback += "Your writing needs significant improvement. Work on basic essay structure, idea development, and grammar.";
    }
    
    return feedback;
  }

  private generateWritingSuggestions(taskType: string, score: number, scores: any): string {
    let suggestions = "Improvement suggestions:\n";
    
    if (scores.development < 20) {
      suggestions += "• Develop your ideas more fully with specific examples and details\n";
      suggestions += "• Ensure each paragraph has a clear main idea\n";
    }
    
    if (scores.organization < 20) {
      suggestions += "• Use clear transitions between paragraphs\n";
      suggestions += "• Follow a logical essay structure (introduction, body, conclusion)\n";
    }
    
    if (scores.languageUse < 20) {
      suggestions += "• Work on sentence variety and complexity\n";
      suggestions += "• Review grammar and vocabulary usage\n";
    }
    
    if (taskType === 'integrated') {
      suggestions += "• Practice summarizing and connecting information from reading and listening sources\n";
    } else {
      suggestions += "• Practice expressing and supporting personal opinions with clear examples\n";
    }
    
    return suggestions;
  }

  private generateMockSpeakingScores(answer: string, taskNumber: number): Record<string, number> {
    // Mock AI scoring based on task complexity
    const baseScore = 18 + (Math.random() * 8); // 18-26 range
    
    return {
      delivery: Math.max(0, Math.min(30, baseScore + (Math.random() - 0.5) * 6)),
      languageUse: Math.max(0, Math.min(30, baseScore + (Math.random() - 0.5) * 6)),
      topicDevelopment: Math.max(0, Math.min(30, baseScore + (Math.random() - 0.5) * 6))
    };
  }

  private generateMockTranscription(audioUrl?: string): string {
    if (!audioUrl) return "No audio provided for transcription.";
    
    return "Mock transcription: This is a simulated transcription of the speaking response. In production, this would be generated by speech-to-text AI.";
  }

  private generateSpeakingFeedback(taskNumber: number, score: number): string {
    let feedback = `TOEFL Speaking Task ${taskNumber} Assessment (Score: ${score}/30)\n\n`;
    
    if (score >= 24) {
      feedback += "Excellent speaking performance! Your response demonstrates clear delivery, effective language use, and well-developed ideas.";
    } else if (score >= 17) {
      feedback += "Good speaking with areas for improvement. Work on fluency, pronunciation, and idea development.";
    } else {
      feedback += "Your speaking needs significant work. Focus on basic pronunciation, fluency, and organizing your thoughts clearly.";
    }
    
    return feedback;
  }

  private generateSpeakingSuggestions(taskNumber: number, score: number, scores: any): string {
    let suggestions = "Speaking improvement suggestions:\n";
    
    if (scores.delivery < 20) {
      suggestions += "• Work on pronunciation and intonation\n";
      suggestions += "• Practice speaking at a natural pace\n";
      suggestions += "• Reduce hesitations and filler words\n";
    }
    
    if (scores.languageUse < 20) {
      suggestions += "• Expand your vocabulary range\n";
      suggestions += "• Practice using complex sentence structures\n";
      suggestions += "• Work on grammatical accuracy\n";
    }
    
    if (scores.topicDevelopment < 20) {
      suggestions += "• Organize your ideas more clearly\n";
      suggestions += "• Provide specific examples and details\n";
      suggestions += "• Stay focused on the topic\n";
    }
    
    if (taskNumber === 1) {
      suggestions += "• Practice expressing personal preferences with clear reasons\n";
    } else if (taskNumber >= 2) {
      suggestions += "• Practice summarizing and connecting information from multiple sources\n";
    }
    
    return suggestions;
  }

  private async getSkillSpecificProgress(userId: string, examTypeId: string, skillCode?: string) {
    // Get all skills or specific skill
    const skills = skillCode ? [skillCode] : this.getValidSkills();
    
    const progressData = await Promise.all(skills.map(async (skill) => {
      const skillRecord = await prisma.examSkill.findFirst({
        where: { examTypeId, skillCode: skill }
      });
      
      if (!skillRecord) return null;
      
      const attempts = await prisma.questionAttempt.findMany({
        where: {
          userId,
          examTypeId,
          skillId: skillRecord.id
        },
        orderBy: { submittedAt: 'desc' },
        take: 50
      });
      
      return {
        skill,
        totalAttempts: attempts.length,
        averageScore: attempts.length > 0
          ? attempts.reduce((sum: number, attempt: any) => sum + attempt.score, 0) / attempts.length
          : 0,
        bestScore: Math.max(...attempts.map((a: any) => a.score), 0),
        recentTrend: this.calculateTrend(attempts.slice(0, 10)),
        weakAreas: this.identifyWeakAreas(attempts, skill)
      };
    }));
    
    return progressData.filter(Boolean);
  }

  private calculateTrend(attempts: any[]): 'improving' | 'declining' | 'stable' {
    if (attempts.length < 5) return 'stable';
    
    const recent = attempts.slice(0, 3).reduce((sum, a) => sum + a.score, 0) / 3;
    const older = attempts.slice(-3).reduce((sum, a) => sum + a.score, 0) / 3;
    
    if (recent > older + 2) return 'improving';
    if (recent < older - 2) return 'declining';
    return 'stable';
  }

  private identifyWeakAreas(attempts: any[], skill: string): string[] {
    const weakAreas: string[] = [];
    
    if (skill === 'reading') {
      const lowScoreAttempts = attempts.filter(a => a.score < 17);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Reading comprehension', 'Vocabulary in context', 'Inference questions');
      }
    } else if (skill === 'listening') {
      const lowScoreAttempts = attempts.filter(a => a.score < 17);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Note-taking', 'Detail questions', 'Speaker attitude');
      }
    }
    // Add more skill-specific weak area identification
    
    return weakAreas;
  }

  private calculateOverallTOEFLScore(progress: any[]): number {
    if (progress.length === 0) return 0;
    
    const skillScores = progress.map(p => p.averageScore || 0);
    const totalScore = skillScores.reduce((sum, score) => sum + score, 0);
    
    // Convert to TOEFL scale (0-120)
    return Math.min(120, Math.round(totalScore));
  }

  private getReadingPassagesByDifficulty(difficulty: Difficulty) {
    const passages = {
      easy: [
        {
          type: 'academic',
          text: 'Sample academic passage about environmental science...',
          title: 'Environmental Conservation'
        }
      ],
      medium: [
        {
          type: 'academic',
          text: 'More complex academic passage about psychology...',
          title: 'Cognitive Psychology'
        }
      ],
      hard: [
        {
          type: 'academic',
          text: 'Advanced academic passage about quantum physics...',
          title: 'Quantum Mechanics'
        }
      ]
    };
    
    return passages[difficulty] || passages.easy;
  }

  private getReadingInstructions(questionType: string): string {
    const instructions = {
      multiple_choice: "Choose the best answer from the four options provided.",
      insert_text: "Choose where the sentence best fits in the passage.",
      reading_to_learn_categorize: "Complete the table by matching the appropriate answer choices to the categories.",
      reading_to_learn_summarize: "Complete the summary by selecting the three answer choices that express important ideas.",
      vocabulary: "The word X in the passage is closest in meaning to...",
      reference: "The word X in the passage refers to...",
      inference: "What can be inferred from the passage about...?",
      rhetorical_purpose: "Why does the author mention X in the passage?",
      factual_information: "According to the passage, which of the following is true about...?",
      negative_factual_information: "All of the following are mentioned in the passage EXCEPT..."
    };
    
    return instructions[questionType as keyof typeof instructions] || instructions.multiple_choice;
  }

  private generateReadingQuestions(passage: any, questionType: string, difficulty: Difficulty) {
    // Generate mock questions based on passage and type
    return [
      {
        id: `q1_${Date.now()}`,
        type: questionType,
        question: `Sample ${questionType} question about the passage`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'This is the correct answer because...'
      }
    ];
  }

  private getListeningContentByType(contentType: string, difficulty: Difficulty) {
    const content = {
      conversation: {
        audioUrl: '/audio/toefl_conversation_sample.mp3',
        transcript: 'Sample conversation transcript between student and professor...',
        duration: 180
      },
      lecture: {
        audioUrl: '/audio/toefl_lecture_sample.mp3',
        transcript: 'Sample academic lecture transcript about biology...',
        duration: 300
      }
    };
    
    return content[contentType as keyof typeof content] || content.conversation;
  }

  private getListeningInstructions(contentType: string): string {
    return contentType === 'conversation'
      ? "Listen to a conversation between a student and a university employee, then answer the questions."
      : "Listen to part of a lecture in an academic course, then answer the questions.";
  }

  private generateListeningQuestions(content: any, contentType: string, difficulty: Difficulty) {
    const questionCount = contentType === 'conversation' ? 5 : 6;
    return Array.from({ length: questionCount }, (_, i) => ({
      id: `lq${i + 1}_${Date.now()}`,
      question: `Sample listening question ${i + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      timeStamp: i * 30 // seconds into audio
    }));
  }

  private getWritingPrompt(taskType: string, difficulty: Difficulty) {
    if (taskType === 'integrated') {
      return {
        prompt: 'Summarize the points made in the lecture, being sure to explain how they cast doubt on the specific points made in the reading passage.',
        instructions: 'You have 20 minutes to plan and write your response. Your response will be judged on the quality of your writing and on the completeness and accuracy of the content.',
        readingPassage: 'Sample reading passage about renewable energy...',
        listeningContent: 'Sample lecture that contradicts the reading passage...'
      };
    } else {
      return {
        prompt: 'Do you agree or disagree with the following statement? It is better to have broad knowledge of many academic subjects than to specialize in one specific subject. Use specific reasons and examples to support your answer.',
        instructions: 'You have 30 minutes to plan and write your response. Be sure to use specific examples and details to support your opinion.'
      };
    }
  }

  private getSpeakingContent(taskNumber: number, difficulty: Difficulty) {
    const tasks = {
      1: {
        type: 'independent',
        prompt: 'Some people prefer to work independently, while others prefer to work as part of a team. Which do you prefer and why?',
        instructions: 'You have 15 seconds to prepare and 45 seconds to speak.',
        preparationTime: 15,
        speakingTime: 45
      },
      2: {
        type: 'integrated_campus',
        prompt: 'The university is planning to change the meal plan options. Read the announcement and listen to the conversation, then explain the woman\'s opinion.',
        instructions: 'You have 30 seconds to prepare and 60 seconds to speak.',
        preparationTime: 30,
        speakingTime: 60,
        readingPassage: 'Sample campus announcement...',
        listeningContent: 'Sample student conversation...'
      },
      3: {
        type: 'integrated_academic',
        prompt: 'Using the example from the lecture, explain the concept discussed in the reading passage.',
        instructions: 'You have 30 seconds to prepare and 60 seconds to speak.',
        preparationTime: 30,
        speakingTime: 60,
        readingPassage: 'Sample academic reading...',
        listeningContent: 'Sample academic lecture...'
      },
      4: {
        type: 'integrated_academic',
        prompt: 'Using the examples from the lecture, explain the main concept.',
        instructions: 'You have 20 seconds to prepare and 60 seconds to speak.',
        preparationTime: 20,
        speakingTime: 60,
        listeningContent: 'Sample academic lecture with examples...'
      }
    };
    
    return tasks[taskNumber as keyof typeof tasks] || tasks[1];
  }
}