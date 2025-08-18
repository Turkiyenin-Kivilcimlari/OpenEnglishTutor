import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ExamType, SkillType } from '@openenglishttutor/shared';

const examConfigs = {
  ielts: {
    name: 'IELTS',
    description: 'International English Language Testing System',
    skills: [
      { code: 'reading' as SkillType, name: 'Reading', description: 'Reading comprehension and analysis' },
      { code: 'listening' as SkillType, name: 'Listening', description: 'Audio comprehension skills' },
      { code: 'writing' as SkillType, name: 'Writing', description: 'Essay and report writing' },
      { code: 'speaking' as SkillType, name: 'Speaking', description: 'Oral communication skills' },
    ],
  },
  toefl: {
    name: 'TOEFL',
    description: 'Test of English as a Foreign Language',
    skills: [
      { code: 'reading' as SkillType, name: 'Reading', description: 'Academic reading comprehension' },
      { code: 'listening' as SkillType, name: 'Listening', description: 'Academic listening skills' },
      { code: 'writing' as SkillType, name: 'Writing', description: 'Academic writing tasks' },
      { code: 'speaking' as SkillType, name: 'Speaking', description: 'Academic speaking tasks' },
    ],
  },
  yds: {
    name: 'YDS',
    description: 'Yabancı Dil Sınavı (Foreign Language Exam)',
    skills: [
      { code: 'reading' as SkillType, name: 'Reading', description: 'Reading comprehension' },
      { code: 'grammar' as SkillType, name: 'Grammar', description: 'Grammar and structure' },
      { code: 'vocabulary' as SkillType, name: 'Vocabulary', description: 'Vocabulary and word usage' },
    ],
  },
};

export default function ExamTypePage() {
  const router = useRouter();
  const { examType } = router.query;
  const { isAuthenticated, user } = useAuthStore();
  const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!examType || typeof examType !== 'string' || !(examType in examConfigs)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Exam Type</h1>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  const config = examConfigs[examType as keyof typeof examConfigs];

  const handleStartPractice = () => {
    if (!selectedSkill) {
      alert('Please select a skill to practice');
      return;
    }

    router.push(`/practice?examType=${examType}&skill=${selectedSkill}&difficulty=${selectedDifficulty}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {config.name} Practice
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.firstName || user?.email}!
              </span>
              <Link
                href="/dashboard"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {config.name} Practice
          </h2>
          <p className="text-xl text-gray-600">
            {config.description}
          </p>
        </div>

        {/* Skill Selection */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Select a Skill to Practice
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.skills.map((skill) => (
              <div
                key={skill.code}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedSkill === skill.code
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedSkill(skill.code)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {skill.name}
                  </h4>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedSkill === skill.code
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedSkill === skill.code && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Select Difficulty Level
          </h3>
          <div className="flex space-x-4">
            {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedDifficulty === difficulty
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Start Practice Button */}
        <div className="text-center">
          <button
            onClick={handleStartPractice}
            disabled={!selectedSkill}
            className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-hover"
          >
            Start Practice Session
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Your {config.name} Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">0</div>
              <div className="text-gray-600">Questions Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">0%</div>
              <div className="text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
              <div className="text-gray-600">Study Sessions</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}