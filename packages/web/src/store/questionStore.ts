import { create } from 'zustand';
import { 
  Question, 
  QuestionAttempt, 
  ExamType, 
  SkillType, 
  Difficulty,
  QuestionFlowState,
  EvaluationResult
} from '@openenglishttutor/shared';
import apiClient from '@/lib/api';

interface QuestionState extends QuestionFlowState {
  // Additional state
  examType: ExamType | null;
  skillType: SkillType | null;
  difficulty: Difficulty | null;
  timeLimit: number;
  timeRemaining: number;
  isTimerActive: boolean;
  error: string | null;
  
  // Actions
  setExamConfig: (examType: ExamType, skillType: SkillType, difficulty?: Difficulty) => void;
  loadNextQuestion: () => Promise<void>;
  setUserAnswer: (answer: string) => void;
  setAudioUrl: (url: string) => void;
  submitAnswer: () => Promise<void>;
  startTimer: () => void;
  stopTimer: () => void;
  updateTimeRemaining: (time: number) => void;
  resetQuestion: () => void;
  clearError: () => void;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  // Question flow state
  currentQuestion: null,
  userAnswer: '',
  audioUrl: '',
  timeSpent: 0,
  isSubmitting: false,
  result: null,
  
  // Additional state
  examType: null,
  skillType: null,
  difficulty: null,
  timeLimit: 300, // 5 minutes default
  timeRemaining: 300,
  isTimerActive: false,
  error: null,

  setExamConfig: (examType: ExamType, skillType: SkillType, difficulty?: Difficulty) => {
    set({
      examType,
      skillType,
      difficulty: difficulty || 'medium',
      error: null,
    });
  },

  loadNextQuestion: async () => {
    const { examType, skillType, difficulty } = get();
    
    if (!examType || !skillType) {
      set({ error: 'Exam type and skill type must be set' });
      return;
    }

    try {
      set({ error: null });
      const { question, timeLimit } = await apiClient.getNextQuestion(
        examType,
        skillType,
        difficulty || undefined
      );
      
      set({
        currentQuestion: question,
        timeLimit,
        timeRemaining: timeLimit,
        userAnswer: '',
        audioUrl: '',
        timeSpent: 0,
        result: null,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load question',
        currentQuestion: null,
      });
    }
  },

  setUserAnswer: (answer: string) => {
    set({ userAnswer: answer });
  },

  setAudioUrl: (url: string) => {
    set({ audioUrl: url });
  },

  submitAnswer: async () => {
    const { currentQuestion, userAnswer, audioUrl, timeSpent } = get();
    
    if (!currentQuestion) {
      set({ error: 'No question to submit' });
      return;
    }

    if (!userAnswer.trim()) {
      set({ error: 'Please provide an answer' });
      return;
    }

    try {
      set({ isSubmitting: true, error: null });
      
      const result = await apiClient.submitAnswer(
        currentQuestion.id,
        userAnswer,
        timeSpent,
        audioUrl || undefined
      );

      const evaluationResult: EvaluationResult = {
        attempt: result.attempt,
        evaluation: result.evaluation,
        progress: {} as any, // This would be populated by the API
      };

      set({
        result: evaluationResult,
        isSubmitting: false,
        isTimerActive: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to submit answer',
        isSubmitting: false,
      });
    }
  },

  startTimer: () => {
    set({ isTimerActive: true });
    
    const timer = setInterval(() => {
      const { timeRemaining, isTimerActive } = get();
      
      if (!isTimerActive || timeRemaining <= 0) {
        clearInterval(timer);
        set({ isTimerActive: false });
        
        // Auto-submit if time runs out
        if (timeRemaining <= 0) {
          get().submitAnswer();
        }
        return;
      }
      
      set((state) => ({
        timeRemaining: state.timeRemaining - 1,
        timeSpent: state.timeSpent + 1,
      }));
    }, 1000);
  },

  stopTimer: () => {
    set({ isTimerActive: false });
  },

  updateTimeRemaining: (time: number) => {
    set({ timeRemaining: time });
  },

  resetQuestion: () => {
    set({
      currentQuestion: null,
      userAnswer: '',
      audioUrl: '',
      timeSpent: 0,
      isSubmitting: false,
      result: null,
      timeRemaining: 300,
      isTimerActive: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));