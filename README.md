# OpenEnglishTutor - Multi-Exam English Preparation Platform

## Overview

OpenEnglishTutor is a comprehensive, AI-powered English exam preparation platform supporting **IELTS**, **TOEFL**, and **YDS** exams. The system uses individual question-based learning with immediate AI evaluation and feedback.

## Key Features

### 🎯 **Multi-Exam Support**
- **IELTS**: Reading, Listening, Writing, Speaking (Band Score 0-9)
- **TOEFL**: Reading, Listening, Writing, Speaking (Score 0-120)
- **YDS**: Reading, Listening, Grammar, Vocabulary (Score 0-100)

### 🤖 **AI-Powered Evaluation**
- **Writing Assessment**: OpenAI GPT-4 with exam-specific criteria
- **Speaking Assessment**: Google Speech-to-Text + AI evaluation
- **Immediate Feedback**: Instant scoring and improvement suggestions
- **Adaptive Difficulty**: Questions adapt to user performance

### 📱 **User Experience**
- **Individual Questions**: One question at a time with immediate feedback
- **Cross-Exam Progress**: Compare performance across different exam types
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Analytics**: Track progress and identify weak areas

## Technology Stack

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, Prisma ORM
- **Database**: PostgreSQL with multi-exam schema
- **AI Services**: OpenAI GPT-4, Google Speech-to-Text
- **Deployment**: Vercel (frontend) + AWS/GCP (backend)

## Project Structure

```
openenglishttutor/
├── packages/
│   ├── web/                    # Next.js web application
│   ├── api/                    # Backend API server
│   ├── mobile/                 # React Native app (future)
│   └── shared/                 # Shared utilities and types
├── docs/                       # Documentation
├── scripts/                    # Build and deployment scripts
└── docker-compose.yml          # Development environment
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Docker (optional)

### Installation
```bash
# Clone repository
git clone <repository-url>
cd openenglishttutor

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development services
docker-compose up -d postgres redis

# Run database migrations
cd packages/api
npx prisma migrate dev
npx prisma generate

# Start development servers
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/openenglishttutor"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-jwt-secret"

# AI Services
OPENAI_API_KEY="your-openai-key"
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_KEY_FILE="path/to/service-account.json"
```

## Development Timeline

### Month 1: Foundation + IELTS
- Core infrastructure and database setup
- User authentication system
- Complete IELTS module implementation
- AI integration for Writing and Speaking

### Month 2: TOEFL Integration
- TOEFL service with 0-120 scoring system
- TOEFL-specific question types
- Universal UI components
- Cross-exam progress tracking

### Month 3: YDS Integration
- YDS service with percentage scoring
- Grammar and vocabulary focus
- Complete platform integration
- Advanced features and optimization

### Month 4: Testing & Launch
- Comprehensive testing
- Beta user program
- Production deployment
- Performance optimization

## Architecture

The system uses a **modular, multi-exam architecture** with:

- **Factory Pattern**: Easy addition of new exam types
- **Individual Question Flow**: Questions presented one-by-one
- **Universal Components**: Shared UI with exam-specific customization
- **Flexible Database Schema**: Supports different scoring systems

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Implementation

For step-by-step implementation instructions, see [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions and support, please open an issue or contact the development team.