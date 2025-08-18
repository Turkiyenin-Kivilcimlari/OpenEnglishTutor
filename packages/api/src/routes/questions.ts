import { Router } from 'express';
import { prisma } from '@/config/database';
import { authenticateToken } from '@/middleware/auth';
import ExamServiceFactory from '@/services/ExamServiceFactory';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/questions/next - Get next question for user
router.get('/next', async (req: any, res: any) => {
  try {
    const { examType, skillCode, difficulty } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!examType || !skillCode) {
      return res.status(400).json({
        success: false,
        error: 'examType and skillCode are required'
      });
    }

    // Validate exam type
    if (!ExamServiceFactory.isValidExamType(examType as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid exam type: ${examType}`
      });
    }

    // Get the appropriate service
    const examService = ExamServiceFactory.createService(examType as any);
    
    // Get next question
    const question = await examService.getNextQuestion(
      userId, 
      skillCode as string, 
      difficulty as string
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'No questions available for the specified criteria'
      });
    }

    // Remove sensitive information before sending to client
    const { correctAnswer, ...questionData } = question;

    res.json({
      success: true,
      data: {
        question: questionData,
        timeLimit: examService.getTimeLimitForSkill?.(skillCode as string) || 300
      }
    });

  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/questions/:id/submit - Submit answer for evaluation
router.post('/:id/submit', async (req: any, res: any) => {
  try {
    const { id: questionId } = req.params;
    const { answer, audioUrl, timeSpent } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'Answer is required'
      });
    }

    // Get the question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        examType: true,
        skill: true
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    // Get the appropriate service
    const examService = ExamServiceFactory.createService(question.examType.code as any);
    
    // Evaluate the answer
    const evaluation = await examService.evaluateAnswer(question, answer, audioUrl);

    // Save the attempt
    const attempt = await prisma.questionAttempt.create({
      data: {
        userId,
        questionId,
        examTypeId: question.examTypeId,
        skillId: question.skillId,
        userAnswer: answer,
        audioUrl,
        timeSpent: timeSpent || 0,
        submittedAt: new Date(),
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        rawScore: evaluation.rawScore,
        evaluationFeedback: evaluation.feedback,
        suggestions: evaluation.suggestions,
        criteriaScores: evaluation.criteriaScores,
        metadata: {
          transcription: evaluation.transcription
        }
      }
    });

    // Update user progress
    await updateUserProgress(userId, question.examTypeId, question.skillId, evaluation);

    res.json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          isCorrect: attempt.isCorrect,
          score: attempt.score,
          feedback: attempt.evaluationFeedback,
          suggestions: attempt.suggestions,
          criteriaScores: attempt.criteriaScores,
          submittedAt: attempt.submittedAt
        },
        evaluation,
        correctAnswer: question.correctAnswer // Show correct answer after submission
      }
    });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/questions/progress/:examType - Get progress report
router.get('/progress/:examType', async (req: any, res: any) => {
  try {
    const { examType } = req.params;
    const { skillCode } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate exam type
    if (!ExamServiceFactory.isValidExamType(examType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid exam type: ${examType}`
      });
    }

    // Get the appropriate service
    const examService = ExamServiceFactory.createService(examType as any);
    
    // Get progress report
    const progressReport = await examService.getProgressReport(userId, skillCode as string);

    res.json({
      success: true,
      data: progressReport
    });

  } catch (error) {
    console.error('Error getting progress report:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to update user progress
async function updateUserProgress(
  userId: string, 
  examTypeId: string, 
  skillId: string, 
  evaluation: any
) {
  try {
    // Get existing progress or create new one
    let progress = await prisma.userExamProgress.findFirst({
      where: {
        userId,
        examTypeId,
        skillId
      }
    });

    if (!progress) {
      progress = await prisma.userExamProgress.create({
        data: {
          userId,
          examTypeId,
          skillId,
          totalQuestions: 1,
          correctAnswers: evaluation.isCorrect ? 1 : 0,
          totalPoints: 1,
          earnedPoints: evaluation.score,
          averageScore: evaluation.score,
          bestScore: evaluation.score,
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Update existing progress
      const newTotalQuestions = progress.totalQuestions + 1;
      const newCorrectAnswers = progress.correctAnswers + (evaluation.isCorrect ? 1 : 0);
      const newTotalPoints = progress.totalPoints + 1;
      const newEarnedPoints = progress.earnedPoints + evaluation.score;
      const newAverageScore = newEarnedPoints / newTotalPoints;
      const newBestScore = Math.max(progress.bestScore || 0, evaluation.score);

      await prisma.userExamProgress.update({
        where: { id: progress.id },
        data: {
          totalQuestions: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          totalPoints: newTotalPoints,
          earnedPoints: newEarnedPoints,
          averageScore: newAverageScore,
          bestScore: newBestScore,
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error updating user progress:', error);
    // Don't throw error here to avoid breaking the main flow
  }
}

export default router;