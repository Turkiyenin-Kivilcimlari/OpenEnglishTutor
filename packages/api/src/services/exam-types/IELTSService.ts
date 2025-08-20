import { prisma } from '@/config/database';
import { ExamService } from '../ExamServiceFactory';

// Local type definitions (using shared types structure)
import { QuestionAttempt, Difficulty, Evaluation, WritingEvaluation, SpeakingEvaluation } from '@openenglishttutor/shared/types';


// Enhanced IELTS configuration with skill-specific settings
const ENHANCED_IELTS_CONFIG = {
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
  },
  READING: {
    PASSAGES_PER_TEST: 3,
    QUESTIONS_PER_PASSAGE: 13,
    TOTAL_QUESTIONS: 40,
    TIME_LIMIT: 3600, // 60 minutes
    QUESTION_TYPES: [
      'multiple_choice',
      'true_false_not_given',
      'matching_headings',
      'matching_information',
      'matching_features',
      'sentence_completion',
      'summary_completion',
      'diagram_labeling',
      'short_answer'
    ]
  },
  LISTENING: {
    SECTIONS: 4,
    QUESTIONS_PER_SECTION: 10,
    TOTAL_QUESTIONS: 40,
    TIME_LIMIT: 1800, // 30 minutes
    QUESTION_TYPES: [
      'multiple_choice',
      'matching',
      'plan_map_diagram_labeling',
      'form_note_table_flow_chart_summary_completion',
      'sentence_completion'
    ]
  },
  WRITING: {
    TASKS: 2,
    TASK1: {
      MIN_WORDS: 150,
      TIME_LIMIT: 1200, // 20 minutes
      TYPES: ['graph', 'chart', 'table', 'diagram', 'map']
    },
    TASK2: {
      MIN_WORDS: 250,
      TIME_LIMIT: 2400, // 40 minutes
      TYPES: ['opinion', 'discussion', 'problem_solution', 'two_part']
    }
  },
  SPEAKING: {
    PARTS: 3,
    PART1: {
      TIME_LIMIT: 300, // 4-5 minutes
      TOPICS: ['home', 'work_study', 'hobbies', 'family', 'food', 'transport']
    },
    PART2: {
      PREPARATION_TIME: 60, // 1 minute
      SPEAKING_TIME: 120, // 2 minutes
      TOPICS: ['person', 'place', 'object', 'event', 'activity']
    },
    PART3: {
      TIME_LIMIT: 300, // 4-5 minutes
      DISCUSSION_TOPICS: ['abstract_concepts', 'social_issues', 'future_predictions']
    }
  }
};

// Utility functions
const calculateIELTSBandScore = (attempts: QuestionAttempt[]): number => {
  if (attempts.length === 0) return 0;
  const totalScore = attempts.reduce((sum: number, attempt: QuestionAttempt) => sum + attempt.score, 0);
  const averageScore = totalScore / attempts.length;
  return Math.round(averageScore * 2) / 2;
};

const getAdaptiveDifficulty = (
  recentAttempts: QuestionAttempt[],
  currentDifficulty: Difficulty = 'easy'
): Difficulty => {
  if (recentAttempts.length < 3) return currentDifficulty;
  
  const recentAccuracy = recentAttempts.reduce((sum: number, attempt: QuestionAttempt) =>
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
  private scoringScale = ENHANCED_IELTS_CONFIG.SCORING;

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

      // Generate skill-specific question
      return await this.generateSkillSpecificQuestion(skillCode, targetDifficulty, excludeIds, examType.id, skill.id);
    } catch (error) {
      console.error('Error getting next IELTS question:', error);
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
        throw new Error(`Unsupported IELTS skill: ${skillCode}`);
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

    // Generate new reading question based on IELTS format
    const readingQuestionTypes = ENHANCED_IELTS_CONFIG.READING.QUESTION_TYPES;
    const questionType = readingQuestionTypes[Math.floor(Math.random() * readingQuestionTypes.length)];
    
    const passages = this.getReadingPassagesByDifficulty(difficulty);
    const selectedPassage = passages[Math.floor(Math.random() * passages.length)];
    
    return {
      id: `ielts_reading_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'READING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `IELTS Reading - ${questionType.replace('_', ' ').toUpperCase()}`,
      content: selectedPassage.text,
      instructions: this.getReadingInstructions(questionType),
      timeLimit: ENHANCED_IELTS_CONFIG.READING.TIME_LIMIT / 3, // Per passage
      points: 13, // Questions per passage
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

    const sections = [1, 2, 3, 4];
    const selectedSection = sections[Math.floor(Math.random() * sections.length)];
    const listeningContent = this.getListeningContentBySection(selectedSection, difficulty);
    
    return {
      id: `ielts_listening_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'LISTENING_COMPREHENSION',
      difficultyLevel: difficulty.toUpperCase(),
      title: `IELTS Listening - Section ${selectedSection}`,
      content: listeningContent.transcript,
      instructions: this.getListeningInstructions(selectedSection),
      audioUrl: listeningContent.audioUrl,
      timeLimit: ENHANCED_IELTS_CONFIG.LISTENING.TIME_LIMIT / 4, // Per section
      points: 10, // Questions per section
      metadata: {
        section: selectedSection,
        audioScript: listeningContent.transcript,
        questions: this.generateListeningQuestions(listeningContent, selectedSection, difficulty)
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

    const tasks = [1, 2];
    const selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
    const writingPrompt = this.getWritingPrompt(selectedTask, difficulty);
    
    return {
      id: `ielts_writing_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'ESSAY',
      difficultyLevel: difficulty.toUpperCase(),
      title: `IELTS Writing Task ${selectedTask}`,
      content: writingPrompt.prompt,
      instructions: writingPrompt.instructions,
      timeLimit: selectedTask === 1 ? ENHANCED_IELTS_CONFIG.WRITING.TASK1.TIME_LIMIT : ENHANCED_IELTS_CONFIG.WRITING.TASK2.TIME_LIMIT,
      points: selectedTask === 1 ? 33 : 67, // Task 1: 1/3, Task 2: 2/3 of writing score
      metadata: {
        task: selectedTask,
        minWords: selectedTask === 1 ? ENHANCED_IELTS_CONFIG.WRITING.TASK1.MIN_WORDS : ENHANCED_IELTS_CONFIG.WRITING.TASK2.MIN_WORDS,
        taskType: writingPrompt.type,
        sampleData: (writingPrompt as any).sampleData
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

    const parts = [1, 2, 3];
    const selectedPart = parts[Math.floor(Math.random() * parts.length)];
    const speakingContent = this.getSpeakingContent(selectedPart, difficulty);
    
    return {
      id: `ielts_speaking_${Date.now()}`,
      examTypeId,
      skillId,
      questionType: 'SPEAKING',
      difficultyLevel: difficulty.toUpperCase(),
      title: `IELTS Speaking Part ${selectedPart}`,
      content: speakingContent.topic,
      instructions: speakingContent.instructions,
      timeLimit: this.getSpeakingTimeLimit(selectedPart),
      points: 33, // Each part contributes equally
      metadata: {
        part: selectedPart,
        topic: speakingContent.topic,
        questions: speakingContent.questions,
        preparationTime: speakingContent.preparationTime,
        speakingTime: speakingContent.speakingTime
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
      console.error('Error evaluating IELTS answer:', error);
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
    const bandScore = this.convertReadingScoreToBand(rawScore, questions.length);
    
    return {
      isCorrect: correctCount === questions.length,
      score: bandScore,
      rawScore,
      feedback: this.generateReadingFeedback(bandScore, correctCount, questions.length),
      suggestions: this.generateReadingSuggestions(bandScore, detailedResults),
      criteriaScores: {
        accuracy: (correctCount / questions.length) * 9,
        comprehension: bandScore
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
    const bandScore = this.convertListeningScoreToBand(rawScore, questions.length);
    
    return {
      isCorrect: correctCount === questions.length,
      score: bandScore,
      rawScore,
      feedback: this.generateListeningFeedback(bandScore, correctCount, questions.length),
      suggestions: this.generateListeningSuggestions(bandScore, detailedResults),
      criteriaScores: {
        accuracy: (correctCount / questions.length) * 9,
        comprehension: bandScore
      }
    };
  }

  private async evaluateWritingAnswer(question: any, answer: string): Promise<WritingEvaluation> {
    const task = question.metadata?.task || 1;
    const minWords = question.metadata?.minWords || 150;
    const wordCount = answer.split(/\s+/).length;
    
    // Mock AI evaluation - in production, this would call actual AI services
    const mockScores = this.generateMockWritingScores(answer, task, wordCount >= minWords);
    
    const overallBandScore = (mockScores.taskAchievement + mockScores.coherenceCohesion + mockScores.lexicalResource + mockScores.grammaticalRange) / 4;
    const finalBandScore = Math.round(overallBandScore * 2) / 2;
    
    return {
      isCorrect: undefined,
      score: finalBandScore,
      rawScore: finalBandScore,
      feedback: this.generateWritingFeedback(task, finalBandScore, wordCount, minWords),
      suggestions: this.generateWritingSuggestions(task, finalBandScore, mockScores),
      // taskAchievement: mockScores.taskAchievement, // Removed - not in WritingEvaluation type
      // coherenceCohesion: mockScores.coherenceCohesion, // Removed - not in WritingEvaluation type
      // lexicalResource: mockScores.lexicalResource, // Removed - not in WritingEvaluation type
      // grammaticalRange: mockScores.grammaticalRange, // Removed - not in WritingEvaluation type
      // overallBandScore: finalBandScore, // Removed - not in WritingEvaluation type
      // criteriaScores: mockScores // Removed - not in WritingEvaluation type
    };
  }

  private async evaluateSpeakingAnswer(question: any, answer: string, audioUrl?: string): Promise<SpeakingEvaluation> {
    const part = question.metadata?.part || 1;
    
    // Mock AI evaluation - in production, this would call actual AI services
    const mockScores = this.generateMockSpeakingScores(answer, part);
    const mockTranscription = this.generateMockTranscription(audioUrl);
    
    const overallBandScore = (mockScores.fluencyCoherence + mockScores.lexicalResource + mockScores.grammaticalRange + mockScores.pronunciation) / 4;
    const finalBandScore = Math.round(overallBandScore * 2) / 2;
    
    return {
      isCorrect: undefined,
      score: finalBandScore,
      rawScore: finalBandScore,
      feedback: this.generateSpeakingFeedback(part, finalBandScore),
      suggestions: this.generateSpeakingSuggestions(part, finalBandScore, mockScores),
      // fluencyCoherence: mockScores.fluencyCoherence, // Removed - not in SpeakingEvaluation type
      // lexicalResource: mockScores.lexicalResource, // Removed - not in SpeakingEvaluation type
      // grammaticalRange: mockScores.grammaticalRange, // Removed - not in SpeakingEvaluation type
      // pronunciation: mockScores.pronunciation, // Removed - not in SpeakingEvaluation type
      // overallBandScore: finalBandScore, // Removed - not in SpeakingEvaluation type
      // transcription: mockTranscription, // Removed - not in SpeakingEvaluation type
      // criteriaScores: mockScores // Removed - not in SpeakingEvaluation type
    };
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
          overallBandScore: this.calculateOverallBandScore(progress)
        }
      };
    } catch (error) {
      console.error('Error getting IELTS progress report:', error);
      throw error;
    }
  }

  // IELTS-specific helper methods
  getValidSkills(): string[] {
    return ENHANCED_IELTS_CONFIG.SKILLS;
  }

  getTimeLimitForSkill(skillCode: string): number {
    return ENHANCED_IELTS_CONFIG.TIME_LIMITS[skillCode as keyof typeof ENHANCED_IELTS_CONFIG.TIME_LIMITS] || 300;
  }

  getBandScoreDescription(score: number): string {
    if (score >= 8.5) return "Very good user";
    if (score >= 7.5) return "Good user";
    if (score >= 6.5) return "Competent user";
    if (score >= 5.5) return "Modest user";
    if (score >= 4.5) return "Limited user";
    return "Extremely limited user";
  }

  // Private helper methods for question generation and evaluation
  private extractSkillFromMetadata(question: any): string {
    return question.metadata?.skillCode || 'reading';
  }

  private getSpeakingTimeLimit(part: number): number {
    const timeLimits = {
      1: 300, // 4-5 minutes
      2: 180, // 3 minutes (1 min prep + 2 min speaking)
      3: 300  // 4-5 minutes
    };
    return timeLimits[part as keyof typeof timeLimits] || 300;
  }

  private convertReadingScoreToBand(rawScore: number, totalQuestions: number): number {
    const percentage = (rawScore / totalQuestions) * 100;
    if (percentage >= 90) return 9.0;
    if (percentage >= 80) return 8.0;
    if (percentage >= 70) return 7.0;
    if (percentage >= 60) return 6.0;
    if (percentage >= 50) return 5.0;
    if (percentage >= 40) return 4.0;
    return 3.0;
  }

  private convertListeningScoreToBand(rawScore: number, totalQuestions: number): number {
    return this.convertReadingScoreToBand(rawScore, totalQuestions);
  }

  private generateReadingFeedback(bandScore: number, correctCount: number, totalQuestions: number): string {
    const percentage = (correctCount / totalQuestions) * 100;
    if (bandScore >= 7.0) {
      return `Excellent reading comprehension! You answered ${correctCount}/${totalQuestions} questions correctly (${percentage.toFixed(1)}%). Your understanding of the passage and ability to locate specific information is very good.`;
    } else if (bandScore >= 6.0) {
      return `Good reading performance. You got ${correctCount}/${totalQuestions} questions right (${percentage.toFixed(1)}%). You show solid comprehension skills but could improve on detail recognition.`;
    } else {
      return `Your reading needs improvement. You answered ${correctCount}/${totalQuestions} correctly (${percentage.toFixed(1)}%). Focus on understanding main ideas and scanning for specific information.`;
    }
  }

  private generateReadingSuggestions(bandScore: number, detailedResults: any[]): string {
    if (bandScore >= 7.0) {
      return "Excellent work! Continue practicing with academic texts to maintain this high level. Focus on time management during the actual test.";
    } else if (bandScore >= 6.0) {
      return "Good progress! Work on identifying keywords in questions and scanning techniques. Practice with more complex academic vocabulary.";
    } else {
      return "Focus on basic reading strategies: skimming for main ideas, scanning for details, and understanding question types. Build your academic vocabulary.";
    }
  }

  private generateListeningFeedback(bandScore: number, correctCount: number, totalQuestions: number): string {
    const percentage = (correctCount / totalQuestions) * 100;
    if (bandScore >= 7.0) {
      return `Great listening skills! You got ${correctCount}/${totalQuestions} answers correct (${percentage.toFixed(1)}%). You can follow conversations and lectures effectively.`;
    } else if (bandScore >= 6.0) {
      return `Solid listening performance with ${correctCount}/${totalQuestions} correct answers (${percentage.toFixed(1)}%). You understand main ideas well but could improve on catching specific details.`;
    } else {
      return `Your listening needs work. You answered ${correctCount}/${totalQuestions} correctly (${percentage.toFixed(1)}%). Practice with different accents and focus on key information.`;
    }
  }

  private generateListeningSuggestions(bandScore: number, detailedResults: any[]): string {
    if (bandScore >= 7.0) {
      return "Excellent listening! Continue exposure to various English accents and academic content. Practice note-taking during longer passages.";
    } else if (bandScore >= 6.0) {
      return "Good listening foundation. Work on predicting answers and listening for specific information. Practice with academic lectures and conversations.";
    } else {
      return "Focus on basic listening skills: identifying main ideas, listening for specific information, and familiarizing yourself with different question types.";
    }
  }

  private generateMockWritingScores(answer: string, task: number, meetsWordCount: boolean): Record<string, number> {
    // Mock scoring - in production, this would use AI evaluation
    const baseScore = meetsWordCount ? 6.0 : 5.0;
    const variation = (Math.random() - 0.5) * 2; // ±1 point variation
    
    return {
      taskAchievement: Math.max(1, Math.min(9, baseScore + variation)),
      coherenceCohesion: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2)),
      lexicalResource: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2)),
      grammaticalRange: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2))
    };
  }

  private generateWritingFeedback(task: number, bandScore: number, wordCount: number, minWords: number): string {
    let feedback = `Task ${task} Writing Assessment (Band ${bandScore})\n\n`;
    
    if (wordCount < minWords) {
      feedback += `⚠️ Word count: ${wordCount}/${minWords} - You need to write more to fully address the task.\n\n`;
    } else {
      feedback += `✓ Word count: ${wordCount}/${minWords} - Good length.\n\n`;
    }

    if (bandScore >= 7.0) {
      feedback += "Strong writing with clear ideas and good language control. Your response addresses the task effectively with appropriate examples and explanations.";
    } else if (bandScore >= 6.0) {
      feedback += "Adequate response that addresses the task. Some areas for improvement in vocabulary range, grammatical accuracy, and idea development.";
    } else {
      feedback += "Basic response with limited development. Focus on expanding your ideas, improving language accuracy, and better task achievement.";
    }

    return feedback;
  }

  private generateWritingSuggestions(task: number, bandScore: number, scores: any): string {
    const suggestions = [];
    
    if (scores.taskAchievement < 6.0) {
      suggestions.push("• Address all parts of the task more fully");
      suggestions.push("• Provide more relevant examples and explanations");
    }
    
    if (scores.coherenceCohesion < 6.0) {
      suggestions.push("• Use more linking words and phrases");
      suggestions.push("• Organize ideas more clearly with better paragraphing");
    }
    
    if (scores.lexicalResource < 6.0) {
      suggestions.push("• Use a wider range of vocabulary");
      suggestions.push("• Work on word choice accuracy and collocation");
    }
    
    if (scores.grammaticalRange < 6.0) {
      suggestions.push("• Use more complex sentence structures");
      suggestions.push("• Improve grammatical accuracy");
    }

    return suggestions.length > 0 ? suggestions.join('\n') : "Continue practicing to maintain your good performance!";
  }

  private generateMockSpeakingScores(answer: string, part: number): Record<string, number> {
    // Mock scoring - in production, this would use AI evaluation
    const baseScore = 6.0 + (Math.random() * 2); // 6.0-8.0 range
    
    return {
      fluencyCoherence: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2)),
      lexicalResource: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2)),
      grammaticalRange: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2)),
      pronunciation: Math.max(1, Math.min(9, baseScore + (Math.random() - 0.5) * 2))
    };
  }

  private generateMockTranscription(audioUrl?: string): string {
    if (!audioUrl) return "No audio provided for transcription.";
    return "Mock transcription: This is a sample transcription of the user's speaking response. In production, this would be generated by speech recognition services.";
  }

  private generateSpeakingFeedback(part: number, bandScore: number): string {
    let feedback = `Speaking Part ${part} Assessment (Band ${bandScore})\n\n`;
    
    if (bandScore >= 7.0) {
      feedback += "Excellent speaking performance! You communicate fluently with good pronunciation and natural language use. Your ideas are well-developed and clearly expressed.";
    } else if (bandScore >= 6.0) {
      feedback += "Good speaking ability with generally clear communication. Some hesitation and minor errors, but your message is understood effectively.";
    } else {
      feedback += "Basic speaking level with frequent pauses and limited vocabulary. Focus on building fluency and expanding your range of expressions.";
    }

    return feedback;
  }

  private generateSpeakingSuggestions(part: number, bandScore: number, scores: any): string {
    const suggestions = [];
    
    if (scores.fluencyCoherence < 6.0) {
      suggestions.push("• Practice speaking regularly to improve fluency");
      suggestions.push("• Work on connecting ideas more smoothly");
    }
    
    if (scores.lexicalResource < 6.0) {
      suggestions.push("• Expand your vocabulary range");
      suggestions.push("• Practice using more precise and varied expressions");
    }
    
    if (scores.grammaticalRange < 6.0) {
      suggestions.push("• Use more complex grammatical structures");
      suggestions.push("• Focus on accuracy in basic grammar");
    }
    
    if (scores.pronunciation < 6.0) {
      suggestions.push("• Work on clear pronunciation of individual sounds");
      suggestions.push("• Practice word stress and intonation patterns");
    }

    return suggestions.length > 0 ? suggestions.join('\n') : "Great speaking! Keep practicing to maintain this level.";
  }

  private async getSkillSpecificProgress(userId: string, examTypeId: string, skillCode?: string) {
    // Get detailed progress for each skill
    const skills = skillCode ? [skillCode] : this.getValidSkills();
    const progressData: Record<string, any> = {};

    for (const skill of skills) {
      const skillRecord = await prisma.examSkill.findFirst({
        where: { examTypeId, skillCode: skill }
      });

      if (skillRecord) {
        const attempts = await prisma.questionAttempt.findMany({
          where: {
            userId,
            examTypeId,
            skillId: skillRecord.id
          },
          orderBy: { submittedAt: 'desc' },
          take: 20
        });

        progressData[skill] = {
          totalAttempts: attempts.length,
          averageScore: attempts.length > 0 
            ? attempts.reduce((sum: number, attempt: any) => sum + attempt.score, 0) / attempts.length
            : 0,
          bestScore: Math.max(...attempts.map((a: any) => a.score), 0),
          recentTrend: this.calculateTrend(attempts.slice(0, 10)),
          weakAreas: this.identifyWeakAreas(attempts, skill)
        };
      }
    }

    return progressData;
  }

  private calculateTrend(attempts: any[]): 'improving' | 'declining' | 'stable' {
    if (attempts.length < 5) return 'stable';
    
    const recent = attempts.slice(0, 3).reduce((sum, a) => sum + a.score, 0) / 3;
    const older = attempts.slice(-3).reduce((sum, a) => sum + a.score, 0) / 3;
    
    if (recent > older + 0.5) return 'improving';
    if (recent < older - 0.5) return 'declining';
    return 'stable';
  }

  private identifyWeakAreas(attempts: any[], skill: string): string[] {
    // Analyze attempts to identify weak areas
    const weakAreas = [];
    
    if (skill === 'reading') {
      // Analyze reading-specific weak areas
      const lowScoreAttempts = attempts.filter(a => a.score < 6.0);
      if (lowScoreAttempts.length > attempts.length * 0.3) {
        weakAreas.push('Reading comprehension');
      }
    }
    
    return weakAreas;
  }

  private calculateOverallBandScore(progress: any[]): number {
    if (progress.length === 0) return 0;
    
    const skillScores = progress.map(p => p.averageScore || 0);
    const overallScore = skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length;
    
    return Math.round(overallScore * 2) / 2; // Round to nearest 0.5
  }

  private getReadingPassagesByDifficulty(difficulty: Difficulty) {
    // Mock passages - in production, these would come from a database
    const passages = {
      easy: [
        {
          type: 'general_interest',
          text: 'The benefits of regular exercise are well-documented. Physical activity helps maintain a healthy weight, strengthens muscles and bones, and improves cardiovascular health. Regular exercise also has mental health benefits, including reduced stress and improved mood. Studies show that people who exercise regularly have lower rates of depression and anxiety. Additionally, exercise can improve cognitive function and memory, making it beneficial for people of all ages.',
          topic: 'Health and Fitness'
        }
      ],
      medium: [
        {
          type: 'academic',
          text: 'Climate change represents one of the most significant challenges facing humanity in the 21st century. The scientific consensus indicates that human activities, particularly the burning of fossil fuels, are the primary drivers of recent climate change. Rising global temperatures have led to melting ice caps, rising sea levels, and more frequent extreme weather events. These changes have far-reaching consequences for ecosystems, agriculture, and human societies worldwide.',
          topic: 'Environmental Science'
        }
      ],
      hard: [
        {
          type: 'academic_complex',
          text: 'The paradigm shift in quantum computing has profound implications for cryptography and information security. Quantum algorithms such as Shor\'s algorithm threaten the security of current encryption methods, while quantum key distribution offers unprecedented security guarantees. The development of quantum-resistant cryptographic protocols has become a priority for governments and organizations worldwide, as the advent of practical quantum computers could render current security infrastructure obsolete.',
          topic: 'Technology and Science'
        }
      ]
    };
    
    return passages[difficulty as keyof typeof passages] || passages.medium;
  }

  private getReadingInstructions(questionType: string): string {
    const instructions = {
      'multiple_choice': 'Choose the correct letter, A, B, C or D.',
      'true_false_not_given': 'Do the following statements agree with the information given in the reading passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.',
      'matching_headings': 'Choose the correct heading for each paragraph from the list of headings below.',
      'fill_blanks': 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
      'short_answer': 'Answer the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer.'
    };
    
    return instructions[questionType as keyof typeof instructions] || 'Follow the instructions for each question.';
  }

  private generateReadingQuestions(passage: any, questionType: string, difficulty: Difficulty) {
    // Mock question generation - in production, this would use AI or predefined question banks
    const baseQuestions = [
      {
        id: '1',
        question: 'What is the main topic of the passage?',
        options: ['A) Health benefits', 'B) Exercise routines', 'C) Medical research', 'D) Lifestyle changes'],
        correctAnswer: 'A',
        explanation: 'The passage primarily discusses the benefits of regular exercise.'
      },
      {
        id: '2',
        question: 'According to the passage, exercise can improve which of the following?',
        options: ['A) Only physical health', 'B) Only mental health', 'C) Both physical and mental health', 'D) Neither physical nor mental health'],
        correctAnswer: 'C',
        explanation: 'The passage mentions both physical and mental health benefits of exercise.'
      }
    ];
    
    return baseQuestions;
  }

  private getListeningContentBySection(section: number, difficulty: Difficulty) {
    // Mock listening content - in production, this would come from audio files and transcripts
    const content = {
      1: {
        transcript: 'Good morning. I\'d like to book a room for next weekend. Do you have any availability? Yes, we do have rooms available. What type of room would you prefer? I\'d like a single room with a view if possible. Let me check our system. Yes, I can offer you a single room on the fifth floor with a city view.',
        audioUrl: '/audio/ielts/listening/section1_sample.mp3',
        context: 'Hotel booking conversation'
      },
      2: {
        transcript: 'Welcome to the university orientation. Today we\'ll cover the main facilities available to students. The library is open 24 hours during exam periods and until 10 PM during regular terms. The sports center offers various activities including swimming, tennis, and fitness classes. Student services are located in the main building and can help with accommodation, financial aid, and academic support.',
        audioUrl: '/audio/ielts/listening/section2_sample.mp3',
        context: 'University orientation monologue'
      },
      3: {
        transcript: 'Student A: I\'m having trouble with my research project. The data I collected doesn\'t seem to support my hypothesis. Student B: That\'s actually quite common in research. Have you considered alternative explanations for your findings? Student A: Not really. I was so focused on proving my original idea. Student B: Sometimes unexpected results can lead to more interesting discoveries.',
        audioUrl: '/audio/ielts/listening/section3_sample.mp3',
        context: 'Academic discussion'
      },
      4: {
        transcript: 'Today\'s lecture focuses on the impact of climate change on marine ecosystems. Rising ocean temperatures have led to coral bleaching events worldwide. Additionally, ocean acidification, caused by increased CO2 absorption, affects the ability of marine organisms to build shells and skeletons. These changes have cascading effects throughout the marine food chain.',
        audioUrl: '/audio/ielts/listening/section4_sample.mp3',
        context: 'Academic lecture'
      }
    };
    
    return content[section as keyof typeof content];
  }

  private getListeningInstructions(section: number): string {
    const instructions = {
      1: 'You will hear a conversation between two people. Answer the questions as you listen.',
      2: 'You will hear a monologue. Answer the questions as you listen.',
      3: 'You will hear a conversation between up to four people. Answer the questions as you listen.',
      4: 'You will hear a lecture or talk. Answer the questions as you listen.'
    };
    
    return instructions[section as keyof typeof instructions];
  }

  private generateListeningQuestions(content: any, section: number, difficulty: Difficulty) {
    // Mock question generation
    return [
      {
        id: '1',
        question: 'What is the main purpose of this conversation?',
        correctAnswer: 'booking a room',
        timeStamp: '0:15'
      },
      {
        id: '2',
        question: 'What type of room does the customer want?',
        correctAnswer: 'single room',
        timeStamp: '0:25'
      }
    ];
  }

  private getWritingPrompt(task: number, difficulty: Difficulty) {
    const prompts = {
      1: {
        easy: {
          prompt: 'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
          instructions: 'Write at least 150 words.',
          type: 'chart',
          sampleData: { chartType: 'line', data: 'mock_chart_data' }
        },
        medium: {
          prompt: 'The diagram below shows the process of recycling plastic bottles. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
          instructions: 'Write at least 150 words.',
          type: 'process',
          sampleData: { chartType: 'process', data: 'mock_process_data' }
        },
        hard: {
          prompt: 'The maps below show the development of a coastal town between 1950 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
          instructions: 'Write at least 150 words.',
          type: 'maps',
          sampleData: { chartType: 'maps', data: 'mock_maps_data' }
        }
      },
      2: {
        easy: {
          prompt: 'Some people think that parents should teach children how to be good members of society. Others, however, believe that school is the place to learn this. Discuss both these views and give your own opinion.',
          instructions: 'Write at least 250 words.',
          type: 'opinion'
        },
        medium: {
          prompt: 'In many countries, the amount of crime is increasing. What do you think are the main causes of crime? How can we deal with those causes?',
          instructions: 'Write at least 250 words.',
          type: 'problem_solution'
        },
        hard: {
          prompt: 'Some people believe that technological progress has made our lives more complex and stressful, while others argue that it has made life easier and more convenient. Discuss both views and give your own opinion.',
          instructions: 'Write at least 250 words.',
          type: 'discussion'
        }
      }
    };
    
    const taskPrompts = prompts[task as keyof typeof prompts];
    return taskPrompts[difficulty as keyof typeof taskPrompts] || taskPrompts.easy;
  }

  private getSpeakingContent(part: number, difficulty: Difficulty) {
    const content = {
      1: {
        topic: 'Work or Studies',
        instructions: 'The examiner will ask you questions about yourself, your home, work or studies and other familiar topics.',
        questions: [
          'Do you work or are you a student?',
          'What do you like most about your work/studies?',
          'What are your plans for the future?',
          'Do you enjoy your work/studies? Why?',
          'What did you study at school/university?'
        ],
        preparationTime: 0,
        speakingTime: 300
      },
      2: {
        topic: 'Describe a memorable journey you have taken',
        instructions: 'You will have 1 minute to prepare and then speak for 1-2 minutes.',
        questions: [
          'Where did you go?',
          'When did you take this journey?',
          'Who did you go with?',
          'Why was it memorable?'
        ],
        preparationTime: 60,
        speakingTime: 120
      },
      3: {
        topic: 'Travel and Tourism',
        instructions: 'The examiner will ask you more abstract questions related to the topic in Part 2.',
        questions: [
          'How has travel changed in recent years?',
          'What are the benefits of international travel?',
          'Do you think tourism has negative effects on local communities?',
          'How might travel change in the future?',
          'What role does technology play in modern travel?'
        ],
        preparationTime: 0,
        speakingTime: 300
      }
    };
    
    return content[part as keyof typeof content];
  }
}
