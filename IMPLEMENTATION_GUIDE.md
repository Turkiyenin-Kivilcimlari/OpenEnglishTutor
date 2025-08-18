# OpenEnglishTutor - Implementation Guide

## Quick Start

### Prerequisites
```bash
# Required software
Node.js 18+
npm or yarn
Docker & Docker Compose
PostgreSQL
Redis
```

### Project Setup
```bash
# Create project structure
mkdir openenglishttutor
cd openenglishttutor

# Initialize monorepo
npm init -y
mkdir -p packages/{web,api,shared}
mkdir -p docs scripts

# Setup workspace
echo '{
  "name": "openenglishttutor",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  }
}' > package.json

# Install Turborepo
npm install -D turbo
```

### Environment Setup
```bash
# Start development services
docker-compose up -d postgres redis

# Environment variables
cp .env.example .env.local
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/openenglishttutor"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_KEY_FILE="./service-account.json"

# Application
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

## 4-Month Implementation Timeline

### Month 1: Foundation + IELTS Module

#### Week 1-2: Core Infrastructure
```bash
# Backend Setup
cd packages/api
npm init -y
npm install express cors helmet morgan dotenv
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install openai @google-cloud/speech
npm install -D @types/express @types/cors @types/bcryptjs

# Initialize Prisma
npx prisma init

# Frontend Setup
cd packages/web
npx create-next-app@latest . --typescript --tailwind --eslint --app
npm install @tanstack/react-query zustand @hookform/react-hook-form zod

# Shared Package
cd packages/shared
npm init -y
npm install zod
npm install -D typescript
```

#### Week 3-4: IELTS Implementation
```typescript
// packages/api/src/services/exam-types/IELTSService.ts
export class IELTSService implements ExamService {
  private examTypeId = 'ielts';
  private scoringScale = { min: 0, max: 9, increment: 0.5 };

  async getNextQuestion(userId: string, skillCode: string, difficulty?: string) {
    const skill = await this.getSkillByCode(skillCode);
    return await this.questionService.getNextQuestion(
      userId, 
      this.examTypeId, 
      skill.id, 
      difficulty
    );
  }

  async evaluateAnswer(question: Question, answer: string, audioUrl?: string) {
    if (question.skill.evaluation_type === 'objective') {
      return this.evaluateObjective(question, answer);
    } else {
      return this.evaluateWithAI(question, answer, audioUrl);
    }
  }

  private async evaluateWithAI(question: Question, answer: string, audioUrl?: string) {
    const criteria = await this.getEvaluationCriteria(question.skill.id);
    
    if (question.skill.code === 'writing') {
      return await this.aiService.evaluateIELTSWriting(question, answer, criteria);
    } else if (question.skill.code === 'speaking') {
      return await this.aiService.evaluateIELTSSpeaking(question, audioUrl!, criteria);
    }
  }

  async calculateScore(attempts: QuestionAttempt[]) {
    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const averageScore = totalScore / attempts.length;
    return Math.round(averageScore * 2) / 2; // Round to nearest 0.5
  }
}
```

### Month 2: TOEFL Integration

#### Week 1-2: TOEFL Service
```typescript
// packages/api/src/services/exam-types/TOEFLService.ts
export class TOEFLService implements ExamService {
  private examTypeId = 'toefl';
  private scoringScale = { min: 0, max: 120, increment: 1 };

  async evaluateAnswer(question: Question, answer: string, audioUrl?: string) {
    if (question.skill.evaluation_type === 'objective') {
      return this.evaluateObjective(question, answer);
    } else {
      return this.evaluateWithAI(question, answer, audioUrl);
    }
  }

  private async evaluateWithAI(question: Question, answer: string, audioUrl?: string) {
    const criteria = await this.getEvaluationCriteria(question.skill.id);
    
    if (question.skill.code === 'writing') {
      return await this.aiService.evaluateTOEFLWriting(question, answer, criteria);
    } else if (question.skill.code === 'speaking') {
      return await this.aiService.evaluateTOEFLSpeaking(question, audioUrl!, criteria);
    }
  }

  async calculateScore(attempts: QuestionAttempt[]) {
    // TOEFL scoring: 0-30 per skill, total 0-120
    const skillScores = this.groupBySkill(attempts);
    return Object.values(skillScores).reduce((total, score) => total + score, 0);
  }
}
```

#### Week 3-4: Universal UI Components
```typescript
// packages/web/src/components/exam/ExamSelector.tsx
export function ExamSelector() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  
  useEffect(() => {
    loadExamTypes();
  }, []);

  const loadExamTypes = async () => {
    const types = await examApi.getAvailableExamTypes();
    setExamTypes(types);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {examTypes.map(examType => (
        <ExamTypeCard
          key={examType.id}
          examType={examType}
          onSelect={() => router.push(`/exam/${examType.code}`)}
        />
      ))}
    </div>
  );
}

// packages/web/src/components/question/UniversalQuestionFlow.tsx
export function UniversalQuestionFlow({ examType, skillCode }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const loadNextQuestion = async () => {
    const question = await questionApi.getNext(examType, skillCode);
    setCurrentQuestion(question);
    setResult(null);
  };

  const handleSubmit = async (answer: string, audioUrl?: string, timeSpent?: number) => {
    if (!currentQuestion) return;

    const evaluation = await questionApi.submitAnswer(
      currentQuestion.id,
      answer,
      audioUrl,
      timeSpent
    );
    
    setResult(evaluation);
  };

  if (result) {
    return (
      <InstantFeedback
        result={result}
        examType={examType}
        onNext={loadNextQuestion}
        onFinish={() => router.push(`/dashboard/${examType}`)}
      />
    );
  }

  return (
    <QuestionCard
      question={currentQuestion}
      examType={examType}
      onSubmit={handleSubmit}
    />
  );
}
```

### Month 3: YDS Integration

#### Week 1-2: YDS Service
```typescript
// packages/api/src/services/exam-types/YDSService.ts
export class YDSService implements ExamService {
  private examTypeId = 'yds';
  private scoringScale = { min: 0, max: 100, increment: 1 };

  async evaluateAnswer(question: Question, answer: string) {
    // YDS is primarily objective questions
    return this.evaluateObjective(question, answer);
  }

  private evaluateObjective(question: Question, answer: string) {
    const isCorrect = answer.toLowerCase().trim() === 
                     question.correctAnswer?.toLowerCase().trim();
    
    return {
      isCorrect,
      score: isCorrect ? question.points : 0,
      rawScore: isCorrect ? question.points : 0,
      feedback: isCorrect ? 
        "Correct! Well done." : 
        `Incorrect. The correct answer is: ${question.correctAnswer}`,
      suggestions: "Keep practicing to improve your accuracy.",
      criteriaScores: null
    };
  }

  async calculateScore(attempts: QuestionAttempt[]) {
    const totalPoints = attempts.reduce((sum, attempt) => sum + attempt.question.points, 0);
    const earnedPoints = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round((earnedPoints / totalPoints) * 100);
  }
}
```

#### Week 3-4: Complete Integration
```typescript
// packages/web/src/components/dashboard/MultiExamDashboard.tsx
export function MultiExamDashboard() {
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const [progress, recs] = await Promise.all([
      progressApi.getAllProgress(),
      recommendationApi.getRecommendations()
    ]);
    
    setUserProgress(progress);
    setRecommendations(recs);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Progress Cards */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userProgress.map(progress => (
              <ExamProgressCard
                key={progress.examType}
                progress={progress}
                onClick={() => router.push(`/exam/${progress.examType}`)}
              />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recommendations</h2>
          <RecommendationPanel recommendations={recommendations} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
        <RecentActivityList />
      </div>
    </div>
  );
}
```

### Month 4: Testing & Launch

#### Week 1-2: Testing
```typescript
// packages/api/tests/unit/services/ExamService.test.ts
describe('ExamService', () => {
  let examService: ExamService;

  beforeEach(() => {
    examService = ExamServiceFactory.createService('ielts');
  });

  describe('evaluateAnswer', () => {
    it('should evaluate IELTS writing correctly', async () => {
      const question = createMockWritingQuestion();
      const answer = "This is a sample writing response.";
      
      const evaluation = await examService.evaluateAnswer(question, answer);
      
      expect(evaluation.bandScore).toBeGreaterThan(0);
      expect(evaluation.feedback).toBeDefined();
      expect(evaluation.suggestions).toBeDefined();
    });
  });
});

// packages/web/tests/e2e/question-flow.test.ts
describe('Question Flow', () => {
  it('should complete full question flow for IELTS', async () => {
    await page.goto('/exam/ielts');
    
    // Select skill
    await page.click('[data-testid="reading-skill"]');
    
    // Answer question
    await page.fill('[data-testid="answer-input"]', 'Test answer');
    await page.click('[data-testid="submit-button"]');
    
    // Check feedback
    await expect(page.locator('[data-testid="feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="score"]')).toBeVisible();
  });
});
```

#### Week 3-4: Production Deployment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  web:
    build: ./packages/web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.openenglishttutor.com

  api:
    build: ./packages/api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: openenglishttutor
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Key Implementation Patterns

### Factory Pattern for Exam Services
```typescript
// Centralized service creation
const examService = ExamServiceFactory.createService(examType);
const evaluation = await examService.evaluateAnswer(question, answer);
```

### Universal Question Flow
```typescript
// Same component works for all exam types
<UniversalQuestionFlow examType="ielts" skillCode="writing" />
<UniversalQuestionFlow examType="toefl" skillCode="speaking" />
<UniversalQuestionFlow examType="yds" skillCode="grammar" />
```

### Immediate Evaluation Pattern
```typescript
// Submit answer → Immediate AI evaluation → Instant feedback
const result = await questionApi.submitAnswer(questionId, answer);
// result contains: evaluation, progress update, next question suggestion
```

## Development Commands

```bash
# Start development environment
npm run dev

# Run database migrations
cd packages/api && npx prisma migrate dev

# Generate Prisma client
cd packages/api && npx prisma generate

# Run tests
npm run test

# Build for production
npm run build

# Start production
npm start

# Deploy to production
npm run deploy
```

## Monitoring & Analytics

### Error Tracking
```typescript
// Sentry integration
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Performance Monitoring
```typescript
// Performance tracking
import { performance } from 'perf_hooks';

const startTime = performance.now();
const evaluation = await aiService.evaluateWriting(question, answer);
const endTime = performance.now();

logger.info('AI Evaluation Performance', {
  duration: endTime - startTime,
  examType: question.examType,
  skillType: question.skill
});
```

### User Analytics
```typescript
// Track user interactions
analytics.track('Question Answered', {
  examType: question.examType,
  skillType: question.skill,
  difficulty: question.difficulty,
  timeSpent: timeSpent,
  score: evaluation.score
});
```

This implementation guide provides a clear, step-by-step approach to building the OpenEnglishTutor platform with all three exam types (IELTS, TOEFL, YDS) in a modular, scalable architecture.