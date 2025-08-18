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
}

// Enhanced YDS configuration with skill-specific settings
const ENHANCED_YDS_CONFIG = {
  SCORING: {
    MIN: 0,
    MAX: 100,
    INCREMENT: 1,
    PASSING_SCORE: 60
  },
  SKILLS: ['reading', 'listening', 'grammar', 'vocabulary'],
  TIME_LIMITS: {
    reading: 5400, // 90 minutes total
    listening: 1800, // 30 minutes
    grammar: 2700, // 45 minutes
    vocabulary: 1800 // 30 minutes
  },
  READING: {
    PASSAGES_PER_TEST: 4,
    QUESTIONS_PER_PASSAGE: 5,
    TOTAL_QUESTIONS: 20,
    TIME_LIMIT: 5400, // 90 minutes
    QUESTION_TYPES: [
      'main_idea',
      'detail',
      'inference',
      'vocabulary_in_context',
      'author_purpose',
      'text_organization',
      'reference',
      'negative_detail'
    ],
    PASSAGE_TYPES: [
      'academic_article',
      'scientific_text',
      'literary_excerpt',
      'news_article',
      'opinion_piece'
    ]
  },
  LISTENING: {
    AUDIO_CLIPS: 10,
    QUESTIONS_PER_CLIP: 2,
    TOTAL_QUESTIONS: 20,
    TIME_LIMIT: 1800, // 30 minutes
    QUESTION_TYPES: [
      'main_idea',
      'detail',
      'inference',
      'speaker_attitude',
      'function'
    ],
    CONTENT_TYPES: [
      'conversation',
      'lecture',
      'announcement',
      'interview',
      'discussion'
    ]
  },
  GRAMMAR: {
    TOTAL_QUESTIONS: 25,
    TIME_LIMIT: 2700, // 45 minutes
    QUESTION_TYPES: [
      'sentence_completion',
      'error_identification',
      'sentence_transformation',
      'multiple_choice_grammar'
    ],
    GRAMMAR_AREAS: [
      'tenses',
      'conditionals',
      'passive_voice',
      'reported_speech',
      'modal_verbs',
      'relative_clauses',
      'gerunds_infinitives',
      'prepositions',
      'articles',
      'subject_verb_agreement'
    ]
  },
  VOCABULARY: {
    TOTAL_QUESTIONS: 15,
    TIME_LIMIT: 1800, // 30 minutes
    QUESTION_TYPES: [
      'synonym',
      'antonym',
      'definition',
      'context_meaning',
      'word_formation',
      'phrasal_verbs',
      'idioms',
      'collocations'
    ],
    VOCABULARY_LEVELS: [
      'basic',
      'intermediate',
      'advanced',
      'academic'
    ]
  }
};

// Utility functions
const calculateYDSScore = (attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;
  
  // Group attempts by skill and calculate weighted score
  const skillGroups: Record<string, QuestionAttempt[]> = {};
  attempts.forEach(attempt => {
    if (!skillGroups[attempt.skillId]) {
      skillGroups[attempt.skillId] = [];
    }
    skillGroups[attempt.skillId].push(attempt);
  });
  
  const skillWeights = {
    reading: 0.4,    // 40%
    listening: 0.2,  // 20%
    grammar: 0.25,   // 25%
    vocabulary: 0.15 // 15%
  };
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  Object.entries(skillGroups).forEach(([skillId, skillAttempts]) => {
    const skillCode = skillAttempts[0]?.question?.skill?.skillCode || 'reading';
    const weight = skillWeights[skillCode as keyof typeof skillWeights] || 0.25;
    
    const skillScore = skillAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / skillAttempts.length * 100;
    totalWeightedScore += skillScore * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
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
  private scoringScale = ENHANCED_YDS_CONFIG.SCORING;

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

      // Generate skill-specific question
      return await this.generateSkillSpecificQuestion(skillCode, targetDifficulty, excludeIds, examType.id, skill.id);
    } catch (error) {
      console.error('Error getting next YDS question:', error);
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
      case 'vocabulary':
        return await this.generateVocabularyQuestion(difficulty, excludeIds, examTypeId, skillId);
      case 'grammar':
        return await this.generateGrammarQuestion(difficulty, excludeIds, examTypeId, skillId);
      case 'listening':
        return await this.generateListeningQuestion(difficulty, excludeIds, examTypeId, skillId);
      default:
        throw new Error(`Unsupported YDS skill: ${skillCode}`);
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

    // Generate new reading question based on YDS format
    const questionTypes = ENHANCED_YDS_CONFIG.READING.QUESTION_TYPES;
    const passageTypes = ENHANCED_YDS_CONFIG.READING.PASSAGE_TYPES;
    
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    const passageType = passageTypes[Math.floor(Math.random() * passageTypes.length)];
    
    const passage = this.getReadingPassageByType(passageType, difficulty);
    const questions = this.generateReadingQuestions(passage, questionType, difficulty);
    
    return {
      id: `yds_reading_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'READING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `YDS Reading - ${passageType.replace('_', ' ').toUpperCase()}`,
      content: passage.text,
      instructions: this.getReadingInstructions(questionType),
      timeLimit: ENHANCED_YDS_CONFIG.READING.TIME_LIMIT / 4, // Per passage
      points: 5, // Questions per passage
      metadata: {
        passageType,
        questionType,
        passage,
        questions,
        skillCode: 'reading'
      }
    };
  }

  private async generateVocabularyQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
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

    const questionTypes = ENHANCED_YDS_CONFIG.VOCABULARY.QUESTION_TYPES;
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    const vocabularyItem = this.getVocabularyItem(questionType, difficulty);
    
    return {
      id: `yds_vocabulary_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'VOCABULARY',
      difficultyLevel: difficulty.toUpperCase(),
      title: `YDS Vocabulary - ${questionType.replace('_', ' ').toUpperCase()}`,
      content: vocabularyItem.question,
      instructions: this.getVocabularyInstructions(questionType),
      options: vocabularyItem.options,
      correctAnswer: vocabularyItem.correctAnswer,
      timeLimit: ENHANCED_YDS_CONFIG.VOCABULARY.TIME_LIMIT / 15, // Per question
      points: 1,
      metadata: {
        questionType,
        vocabularyLevel: this.getVocabularyLevel(difficulty),
        explanation: vocabularyItem.explanation,
        skillCode: 'vocabulary'
      }
    };
  }

  private async generateGrammarQuestion(difficulty: Difficulty, excludeIds: string[], examTypeId: string, skillId: string) {
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

    const questionTypes = ENHANCED_YDS_CONFIG.GRAMMAR.QUESTION_TYPES;
    const grammarAreas = ENHANCED_YDS_CONFIG.GRAMMAR.GRAMMAR_AREAS;
    
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    const grammarArea = grammarAreas[Math.floor(Math.random() * grammarAreas.length)];
    
    const grammarItem = this.getGrammarItem(questionType, grammarArea, difficulty);
    
    return {
      id: `yds_grammar_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'GRAMMAR',
      difficultyLevel: difficulty.toUpperCase(),
      title: `YDS Grammar - ${grammarArea.replace('_', ' ').toUpperCase()}`,
      content: grammarItem.question,
      instructions: this.getGrammarInstructions(questionType),
      options: grammarItem.options,
      correctAnswer: grammarItem.correctAnswer,
      timeLimit: ENHANCED_YDS_CONFIG.GRAMMAR.TIME_LIMIT / 25, // Per question
      points: 1,
      metadata: {
        questionType,
        grammarArea,
        explanation: grammarItem.explanation,
        skillCode: 'grammar'
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

    const contentTypes = ENHANCED_YDS_CONFIG.LISTENING.CONTENT_TYPES;
    const questionTypes = ENHANCED_YDS_CONFIG.LISTENING.QUESTION_TYPES;
    
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    const listeningContent = this.getListeningContent(contentType, difficulty);
    const questions = this.generateListeningQuestions(listeningContent, questionType, difficulty);
    
    return {
      id: `yds_listening_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'LISTENING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `YDS Listening - ${contentType.toUpperCase()}`,
      content: listeningContent.transcript,
      instructions: this.getListeningInstructions(questionType),
      audioUrl: listeningContent.audioUrl,
      timeLimit: ENHANCED_YDS_CONFIG.LISTENING.TIME_LIMIT / 10, // Per audio clip
      points: 2, // Questions per clip
      metadata: {
        contentType,
        questionType,
        audioScript: listeningContent.transcript,
        questions,
        skillCode: 'listening'
      }
    };
  }

  async evaluateAnswer(question: any, answer: string, audioUrl?: string) {
    try {
      const skillCode = question.skill?.skillCode || this.extractSkillFromMetadata(question);
      
      switch (skillCode) {
        case 'reading':
          return await this.evaluateReadingAnswer(question, answer);
        case 'vocabulary':
          return await this.evaluateVocabularyAnswer(question, answer);
        case 'grammar':
          return await this.evaluateGrammarAnswer(question, answer);
        case 'listening':
          return await this.evaluateListeningAnswer(question, answer);
        default:
          return this.evaluateObjectiveAnswer(question, answer);
      }
    } catch (error) {
      console.error('Error evaluating YDS answer:', error);
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
    
    const score = correctCount;
    const percentage = (correctCount / questions.length) * 100;
    
    return {
      isCorrect: correctCount === questions.length,
      score,
      rawScore: correctCount,
      feedback: this.generateReadingFeedback(score, correctCount, questions.length, percentage),
      suggestions: this.generateReadingSuggestions(percentage, detailedResults),
      criteriaScores: {
        comprehension: percentage,
        accuracy: (correctCount / questions.length) * 100
      }
    };
  }

  private async evaluateVocabularyAnswer(question: any, answer: string): Promise<Evaluation> {
    const isCorrect = answer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
    const score = isCorrect ? 1 : 0;
    
    return {
      isCorrect,
      score,
      rawScore: score,
      feedback: this.generateVocabularyFeedback(isCorrect, question.metadata?.questionType, question.correctAnswer),
      suggestions: this.generateVocabularySuggestions(isCorrect, question.metadata?.questionType, question.metadata?.vocabularyLevel),
      criteriaScores: {
        accuracy: isCorrect ? 100 : 0
      }
    };
  }

  private async evaluateGrammarAnswer(question: any, answer: string): Promise<Evaluation> {
    const isCorrect = answer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
    const score = isCorrect ? 1 : 0;
    
    return {
      isCorrect,
      score,
      rawScore: score,
      feedback: this.generateGrammarFeedback(isCorrect, question.metadata?.grammarArea, question.correctAnswer),
      suggestions: this.generateGrammarSuggestions(isCorrect, question.metadata?.grammarArea, question.metadata?.questionType),
      criteriaScores: {
        accuracy: isCorrect ? 100 : 0
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
        isCorrect
      });
    });
    
    const score = correctCount;
    const percentage = (correctCount / questions.length) * 100;
    
    return {
      isCorrect: correctCount === questions.length,
      score,
      rawScore: correctCount,
      feedback: this.generateListeningFeedback(score, correctCount, questions.length, percentage),
      suggestions: this.generateListeningSuggestions(percentage, detailedResults),
      criteriaScores: {
        comprehension: percentage,
        accuracy: (correctCount / questions.length) * 100
      }
    };
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
          overallYDSScore: this.calculateOverallYDSScore(progress),
          skillWeights: this.getSkillWeights()
        }
      };
    } catch (error) {
      console.error('Error getting YDS progress report:', error);
      throw error;
    }
  }

  // YDS-specific helper methods
  getValidSkills(): string[] {
    return ENHANCED_YDS_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return ENHANCED_YDS_CONFIG.TIME_LIMITS[skillCode as keyof typeof ENHANCED_YDS_CONFIG.TIME_LIMITS] || 300;
  }

  getScoreDescription(score: number): string {
    if (score >= 85) return "Çok İyi";
    if (score >= 70) return "İyi";
    if (score >= 60) return "Geçer";
    if (score >= 50) return "Zayıf";
    return "Başarısız";
  }

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

  // Private helper methods for question generation and evaluation
  private extractSkillFromMetadata(question: any): string {
    return question.metadata?.skillCode || 'reading';
  }

  private getReadingPassageByType(passageType: string, difficulty: Difficulty) {
    const passages = {
      academic_article: {
        easy: {
          text: "Climate change is one of the most pressing issues of our time. Scientists around the world have been studying this phenomenon for decades. The evidence shows that human activities, particularly the burning of fossil fuels, are the primary cause of recent climate change. This has led to rising global temperatures, melting ice caps, and changing weather patterns.",
          title: "Understanding Climate Change",
          wordCount: 200
        },
        medium: {
          text: "The concept of artificial intelligence has evolved significantly since its inception in the 1950s. Initially, researchers focused on creating machines that could perform specific tasks that required human intelligence. However, modern AI systems utilize machine learning algorithms that can adapt and improve their performance over time. These systems have found applications in various fields, from healthcare to autonomous vehicles, revolutionizing how we approach complex problems.",
          title: "The Evolution of Artificial Intelligence",
          wordCount: 300
        },
        hard: {
          text: "Quantum mechanics represents one of the most profound paradigm shifts in our understanding of the physical universe. Unlike classical physics, which describes a deterministic world where the position and momentum of particles can be precisely determined, quantum mechanics introduces fundamental uncertainty at the microscopic level. The wave-particle duality of matter and energy, along with phenomena such as quantum entanglement and superposition, challenges our intuitive understanding of reality and has led to revolutionary applications in computing and cryptography.",
          title: "Quantum Mechanics and Modern Physics",
          wordCount: 400
        }
      }
    };
    
    return passages[passageType as keyof typeof passages]?.[difficulty] || passages.academic_article.easy;
  }

  private getReadingInstructions(questionType: string): string {
    const instructions = {
      main_idea: "Metnin ana fikrini belirleyin.",
      detail: "Metinde verilen detayları bulun.",
      inference: "Metinden çıkarılabilecek sonucu belirleyin.",
      vocabulary_in_context: "Altı çizili kelimenin metindeki anlamını bulun.",
      author_purpose: "Yazarın amacını belirleyin.",
      text_organization: "Metnin organizasyonunu analiz edin.",
      reference: "Belirtilen kelimenin neyi ifade ettiğini bulun.",
      negative_detail: "Metinde bahsedilmeyen seçeneği bulun."
    };
    
    return instructions[questionType as keyof typeof instructions] || instructions.main_idea;
  }

  private generateReadingQuestions(passage: any, questionType: string, difficulty: Difficulty) {
    // Generate mock questions based on passage and type
    return [
      {
        id: `rq1_${Date.now()}`,
        type: questionType,
        question: `Bu metne göre, ${questionType === 'main_idea' ? 'ana fikir nedir?' : 'hangi ifade doğrudur?'}`,
        options: ['A) Seçenek A', 'B) Seçenek B', 'C) Seçenek C', 'D) Seçenek D'],
        correctAnswer: 'A',
        explanation: 'Bu doğru cevaptır çünkü...'
      }
    ];
  }

  private getVocabularyItem(questionType: string, difficulty: Difficulty) {
    const items = {
      synonym: {
        easy: {
          question: "Choose the word closest in meaning to 'happy':",
          options: ['A) Sad', 'B) Joyful', 'C) Angry', 'D) Tired'],
          correctAnswer: 'B',
          explanation: "'Joyful' means happy or cheerful."
        },
        medium: {
          question: "Choose the word closest in meaning to 'elaborate':",
          options: ['A) Simple', 'B) Detailed', 'C) Quick', 'D) Small'],
          correctAnswer: 'B',
          explanation: "'Elaborate' means detailed or complex."
        },
        hard: {
          question: "Choose the word closest in meaning to 'ubiquitous':",
          options: ['A) Rare', 'B) Everywhere', 'C) Hidden', 'D) Ancient'],
          correctAnswer: 'B',
          explanation: "'Ubiquitous' means present everywhere."
        }
      },
      antonym: {
        easy: {
          question: "Choose the word opposite in meaning to 'hot':",
          options: ['A) Warm', 'B) Cold', 'C) Cool', 'D) Mild'],
          correctAnswer: 'B',
          explanation: "'Cold' is the opposite of 'hot'."
        }
      }
    };
    
    const questionTypeItems = items[questionType as keyof typeof items];
    if (questionTypeItems && typeof questionTypeItems === 'object' && difficulty in questionTypeItems) {
      return (questionTypeItems as any)[difficulty];
    }
    return items.synonym.easy;
  }

  private getVocabularyInstructions(questionType: string): string {
    const instructions = {
      synonym: "En yakın anlamlı kelimeyi seçin.",
      antonym: "Zıt anlamlı kelimeyi seçin.",
      definition: "Kelimenin tanımını seçin.",
      context_meaning: "Kelimenin cümledeki anlamını seçin.",
      word_formation: "Doğru kelime türevini seçin.",
      phrasal_verbs: "Doğru phrasal verb'ü seçin.",
      idioms: "Deyimin anlamını seçin.",
      collocations: "Doğru kelime eşleşmesini seçin."
    };
    
    return instructions[questionType as keyof typeof instructions] || instructions.synonym;
  }

  private getVocabularyLevel(difficulty: Difficulty): string {
    const levels = {
      easy: 'basic',
      medium: 'intermediate',
      hard: 'advanced'
    };
    
    return levels[difficulty];
  }

  private getGrammarItem(questionType: string, grammarArea: string, difficulty: Difficulty) {
    const items = {
      sentence_completion: {
        easy: {
          question: "I _____ to school every day.",
          options: ['A) go', 'B) goes', 'C) going', 'D) gone'],
          correctAnswer: 'A',
          explanation: "Simple present tense with 'I' requires base form of verb."
        }
      },
      error_identification: {
        easy: {
          question: "Find the error: 'She don't like coffee.'",
          options: ['A) She', 'B) don\'t', 'C) like', 'D) coffee'],
          correctAnswer: 'B',
          explanation: "Should be 'doesn't' with third person singular."
        }
      }
    };
    
    return items[questionType as keyof typeof items]?.easy || items.sentence_completion.easy;
  }

  private getGrammarInstructions(questionType: string): string {
    const instructions = {
      sentence_completion: "Cümleyi tamamlayın.",
      error_identification: "Hatayı bulun.",
      sentence_transformation: "Cümleyi dönüştürün.",
      multiple_choice_grammar: "Doğru seçeneği işaretleyin."
    };
    
    return instructions[questionType as keyof typeof instructions] || instructions.sentence_completion;
  }

  private getListeningContent(contentType: string, difficulty: Difficulty) {
    const content = {
      conversation: {
        audioUrl: '/audio/yds_conversation_sample.mp3',
        transcript: 'Sample conversation transcript in English...',
        duration: 120
      },
      lecture: {
        audioUrl: '/audio/yds_lecture_sample.mp3',
        transcript: 'Sample academic lecture transcript...',
        duration: 180
      }
    };
    
    return content[contentType as keyof typeof content] || content.conversation;
  }

  private getListeningInstructions(questionType: string): string {
    const instructions = {
      main_idea: "Dinlediğiniz metnin ana fikrini belirleyin.",
      detail: "Dinlediğiniz metindeki detayları bulun.",
      inference: "Dinlediğiniz metinden çıkarım yapın.",
      speaker_attitude: "Konuşmacının tutumunu belirleyin.",
      function: "Konuşmacının amacını belirleyin."
    };
    
    return instructions[questionType as keyof typeof instructions] || instructions.main_idea;
  }

  private generateListeningQuestions(content: any, questionType: string, difficulty: Difficulty) {
    return [
      {
        id: `lq1_${Date.now()}`,
        question: `Bu dinleme metnine göre, ${questionType === 'main_idea' ? 'ana fikir nedir?' : 'hangi ifade doğrudur?'}`,
        options: ['A) Seçenek A', 'B) Seçenek B', 'C) Seçenek C', 'D) Seçenek D'],
        correctAnswer: 'A'
      },
      {
        id: `lq2_${Date.now()}`,
        question: "İkinci soru metne göre hangi ifade doğrudur?",
        options: ['A) Seçenek A', 'B) Seçenek B', 'C) Seçenek C', 'D) Seçenek D'],
        correctAnswer: 'B'
      }
    ];
  }

  private generateReadingFeedback(score: number, correctCount: number, totalQuestions: number, percentage: number): string {
    if (percentage >= 80) {
      return `Mükemmel okuma performansı! ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Akademik metinleri çok iyi anlıyorsunuz.`;
    } else if (percentage >= 60) {
      return `İyi okuma performansı. ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Detay sorularında daha dikkatli olun.`;
    } else {
      return `Okuma becerinizi geliştirmeniz gerekiyor. ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Daha fazla pratik yapın.`;
    }
  }

  private generateReadingSuggestions(percentage: number, detailedResults: any[]): string {
    if (percentage >= 80) {
      return "Harika! Akademik metinler okumaya devam edin ve zaman yönetimi stratejilerinizi geliştirin.";
    } else if (percentage >= 60) {
      return "İyi bir temel var. Ana fikir ve detay sorularını ayırt etme konusunda çalışın. Kelime dağarcığınızı geliştirin.";
    } else {
      return "Temel okuma stratejilerine odaklanın: hızlı okuma, tarama ve paragraf yapısını anlama. Kısa akademik metinlerle başlayın.";
    }
  }

  private generateVocabularyFeedback(isCorrect: boolean, questionType: string, correctAnswer: string): string {
    if (isCorrect) {
      return `Doğru! ${questionType} sorusunu başarıyla çözdünüz.`;
    } else {
      return `Yanlış. Doğru cevap: ${correctAnswer}. ${questionType} konusunda daha fazla çalışmanız gerekiyor.`;
    }
  }

  private generateVocabularySuggestions(isCorrect: boolean, questionType: string, vocabularyLevel: string): string {
    if (isCorrect) {
      return "Kelime bilginiz iyi! Daha zor seviyedeki kelimelerle pratik yapmaya devam edin.";
    } else {
      return `${questionType} konusunda çalışın. ${vocabularyLevel} seviyesindeki kelimeleri tekrar edin. Kelime kartları kullanabilirsiniz.`;
    }
  }

  private generateGrammarFeedback(isCorrect: boolean, grammarArea: string, correctAnswer: string): string {
    if (isCorrect) {
      return `Doğru! ${grammarArea} konusundaki bilginiz iyi.`;
    } else {
      return `Yanlış. Doğru cevap: ${correctAnswer}. ${grammarArea} kurallarını tekrar gözden geçirin.`;
    }
  }

  private generateGrammarSuggestions(isCorrect: boolean, grammarArea: string, questionType: string): string {
    if (isCorrect) {
      return "Gramer bilginiz iyi! Daha karmaşık yapılarla pratik yapmaya devam edin.";
    } else {
      return `${grammarArea} konusunda çalışın. ${questionType} türü sorularda daha fazla pratik yapın. Gramer kitaplarından yararlanın.`;
    }
  }

  private generateListeningFeedback(score: number, correctCount: number, totalQuestions: number, percentage: number): string {
    if (percentage >= 80) {
      return `Mükemmel dinleme performansı! ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Akademik dinleme metinlerini çok iyi anlıyorsunuz.`;
    } else if (percentage >= 60) {
      return `İyi dinleme performansı. ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Detay sorularında daha dikkatli olun.`;
    } else {
      return `Dinleme becerinizi geliştirmeniz gerekiyor. ${correctCount}/${totalQuestions} soruyu doğru yanıtladınız (%${percentage.toFixed(1)}). Daha fazla pratik yapın.`;
    }
  }

  private generateListeningSuggestions(percentage: number, detailedResults: any[]): string {
    if (percentage >= 80) {
      return "Harika dinleme becerisi! Akademik konuşmalar ve dersler dinlemeye devam edin.";
    } else if (percentage >= 60) {
      return "İyi bir temel var. Not alma tekniklerini geliştirin ve anahtar kelimelere odaklanın.";
    } else {
      return "Temel dinleme becerilerine odaklanın: ana fikirleri belirleme, konuşmacı amacını anlama. Başlangıçta altyazılı içerikler kullanın.";
    }
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
      const lowScoreAttempts = attempts.filter(a => a.score < 0.6);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Ana fikir bulma', 'Detay soruları', 'Çıkarım yapma');
      }
    } else if (skill === 'vocabulary') {
      const lowScoreAttempts = attempts.filter(a => a.score < 0.6);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Eş anlamlı kelimeler', 'Zıt anlamlı kelimeler', 'Kelime türetme');
      }
    } else if (skill === 'grammar') {
      const lowScoreAttempts = attempts.filter(a => a.score < 0.6);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Zaman uyumu', 'Cümle yapısı', 'Modal fiiller');
      }
    } else if (skill === 'listening') {
      const lowScoreAttempts = attempts.filter(a => a.score < 0.6);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Ana fikir belirleme', 'Detay yakalama', 'Konuşmacı tutumu');
      }
    }
    
    return weakAreas;
  }

  private calculateOverallYDSScore(progress: any[]): number {
    if (progress.length === 0) return 0;
    
    const skillWeights = this.getSkillWeights();
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    progress.forEach((p: any) => {
      const skillCode = p.skill?.skillCode || 'reading';
      const weight = skillWeights[skillCode] || 0.25;
      const skillScore = p.averageScore || 0;
      
      totalWeightedScore += skillScore * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }
}