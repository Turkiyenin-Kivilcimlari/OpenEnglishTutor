import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ExamType } from '@openenglishttutor/shared';

const examTypes = [
  {
    code: 'ielts' as ExamType,
    name: 'IELTS',
    description: 'International English Language Testing System',
    color: 'bg-blue-500',
    skills: ['Reading', 'Listening', 'Writing', 'Speaking'],
  },
  {
    code: 'toefl' as ExamType,
    name: 'TOEFL',
    description: 'Test of English as a Foreign Language',
    color: 'bg-green-500',
    skills: ['Reading', 'Listening', 'Writing', 'Speaking'],
  },
  {
    code: 'yds' as ExamType,
    name: 'YDS',
    description: 'Yabancı Dil Sınavı (Foreign Language Exam)',
    color: 'bg-purple-500',
    skills: ['Reading', 'Grammar', 'Vocabulary'],
  },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Redirect to login if not authenticated
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                OpenEnglishTutor
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Exam Type
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the English proficiency exam you want to practice for and start improving your skills today.
          </p>
        </div>

        {/* Exam Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {examTypes.map((exam) => (
            <div
              key={exam.code}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden card-hover"
            >
              <div className={`${exam.color} h-2`}></div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {exam.name}
                  </h3>
                  <div className={`${exam.color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                    Practice
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">
                  {exam.description}
                </p>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Skills Covered:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {exam.skills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/exam/${exam.code}`}
                  className={`block w-full ${exam.color} text-white text-center py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity btn-hover`}
                >
                  Start Practice
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Your Progress Overview
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
              <div className="text-gray-600">Study Hours</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}