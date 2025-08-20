import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useQuestionStore } from '@/store/questionStore';
import { ExamType, SkillType, Difficulty } from '@openenglishttutor/shared';

export default function PracticePage() {
  const router = useRouter();
  const { examType, skill, difficulty } = router.query;
  const { isAuthenticated, user } = useAuthStore();
  const {
    currentQuestion,
    userAnswer,
    timeRemaining,
    isTimerActive,
    isSubmitting,
    result,
    error,
    setExamConfig,
    loadNextQuestion,
    setUserAnswer,
    submitAnswer,
    startTimer,
    stopTimer,
    resetQuestion,
    clearError,
  } = useQuestionStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!examType || !skill) {
      router.push('/');
      return;
    }

    // Set up the exam configuration
    setExamConfig(
      examType as ExamType,
      skill as SkillType,
      (difficulty as Difficulty) || 'medium'
    );

    // Load the first question
    loadNextQuestion().then(() => {
      setIsLoading(false);
    });
  }, [examType, skill, difficulty, isAuthenticated, router, setExamConfig, loadNextQuestion]);

  useEffect(() => {
    // Start timer when question loads
    if (currentQuestion && !isTimerActive && !result) {
      startTimer();
    }

    // Cleanup timer on unmount
    return () => {
      stopTimer();
    };
  }, [currentQuestion, isTimerActive, result, startTimer, stopTimer]);

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      alert('Please provide an answer before submitting.');
      return;
    }

    stopTimer();
    await submitAnswer();
  };

  const handleNextQuestion = () => {
    resetQuestion();
    loadNextQuestion().then(() => {
      clearError();
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Question</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href={`/exam/${examType}`} className="text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                {examType?.toString().toUpperCase()} - {skill ? skill.toString().charAt(0).toUpperCase() + skill.toString().slice(1) : ''}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeRemaining > 60 
                  ? 'bg-green-100 text-green-800' 
                  : timeRemaining > 30 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <span className="text-gray-700">
                {user?.firstName || user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!result ? (
          // Question Display
          <div className="bg-white rounded-xl shadow-lg p-8">
            {currentQuestion ? (
              <>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentQuestion.title}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {currentQuestion.difficultyLevel}
                      </span>
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                        {currentQuestion.points} points
                      </span>
                    </div>
                  </div>
                  
                  {currentQuestion.instructions && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                      <p className="text-blue-800">{currentQuestion.instructions}</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
                  </div>
                  
                  {currentQuestion.imageUrl && (
                    <div className="mt-4">
                      <img 
                        src={currentQuestion.imageUrl} 
                        alt="Question image" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                  
                  {currentQuestion.audioUrl && (
                    <div className="mt-4">
                      <audio controls className="w-full">
                        <source src={currentQuestion.audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>

                {/* Answer Input */}
                <div className="mb-6">
                  <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer:
                  </label>
                  {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options ? (
                    <div className="space-y-2">
                      {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="radio"
                            name="answer"
                            value={key}
                            checked={userAnswer === key}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            className="mr-3"
                          />
                          <span>{key}. {value}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      id="answer"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      rows={currentQuestion.questionType === 'essay' ? 10 : 4}
                      placeholder="Enter your answer here..."
                    />
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !userAnswer.trim()}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed btn-hover"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="loading-spinner h-5 w-5 mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Answer'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No question available.</p>
              </div>
            )}
          </div>
        ) : (
          // Results Display
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                result.attempt.isCorrect ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <svg
                  className={`h-8 w-8 ${result.attempt.isCorrect ? 'text-green-600' : 'text-red-600'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {result.attempt.isCorrect ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {result.attempt.isCorrect ? 'Correct!' : 'Incorrect'}
              </h2>
              <p className="text-lg text-gray-600">
                Score: {result.attempt.score}/{currentQuestion?.points || 1}
              </p>
            </div>

            {result.attempt.evaluationFeedback && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Feedback:</h3>
                <p className="text-blue-800">{result.attempt.evaluationFeedback}</p>
              </div>
            )}

            {result.attempt.suggestions && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Suggestions:</h3>
                <p className="text-yellow-800">{result.attempt.suggestions}</p>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleNextQuestion}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 btn-hover"
              >
                Next Question
              </button>
              <Link
                href={`/exam/${examType}`}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 btn-hover"
              >
                Back to Exam
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}