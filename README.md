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
- PostgreSQL 12+
- Redis (optional, for caching)
- Docker (optional, for easy database setup)

### Installation

#### Option 1: Automated Setup (Recommended)
```bash
# Clone repository
git clone <repository-url>
cd openenglishttutor

# Install dependencies
npm install

# Run automated setup (creates .env, runs migrations, seeds database)
npm run setup

# Start the API server
npm run dev:api
```

#### Option 2: Manual Setup
```bash
# Clone repository
git clone <repository-url>
cd openenglishttutor

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database configuration

# Start PostgreSQL (using Docker)
docker-compose up -d postgres

# Setup database
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed with sample data

# Start the API server
npm run dev:api
```

### Environment Configuration

Copy `.env.example` to `.env` and update the following required variables:

```bash
# Required - Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/openenglishttutor"

# Required - Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"

# Optional - AI Services (for AI-powered evaluations)
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project-id"

# Optional - Redis (for caching and rate limiting)
REDIS_URL="redis://localhost:6379"
```

### Testing the Setup

After setup, test your installation:

```bash
# Check API health
curl http://localhost:3001/health

# Run tests
npm test

# View database in Prisma Studio
npm run db:studio
```

### Available Scripts

```bash
# Development
npm run dev:api          # Start API server in development mode
npm run setup           # Automated database setup

# Database Management
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with sample data
npm run db:studio       # Open Prisma Studio
npm run db:setup        # Complete database setup (generate + migrate + seed)

# Troubleshooting & Reset
npm run troubleshoot    # Interactive troubleshooting guide
npm run setup:fix       # Alternative setup methods
npm run db:reset        # Reset database only
npm run docker:reset    # Reset Docker containers and volumes

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode

# Production
npm run build           # Build for production
npm run start:api       # Start API server in production mode
```

## 🚨 Troubleshooting

### Common Database Setup Issues

If you encounter database constraint errors like:
```
ERROR: cannot drop index users_username_key because constraint users_username_key on table users requires it
```

**Quick Fix:**
```bash
npm run troubleshoot
# Choose option 1: Quick Constraint Fix
```

**Alternative Solutions:**
```bash
# Full reset (Docker + Database)
npm run docker:reset
npm run db:reset

# Database only reset
npm run db:reset

# Interactive troubleshooting
npm run setup:fix
```

For detailed troubleshooting steps, see [docs/DATABASE_TROUBLESHOOTING.md](./docs/DATABASE_TROUBLESHOOTING.md).

## API Documentation

For detailed API documentation including all endpoints, request/response formats, and examples, see [docs/API.md](./docs/API.md).

### Quick API Reference

- **Health Check**: `GET /health`
- **Authentication**: `POST /api/auth/register`, `POST /api/auth/login`
- **Questions**: `GET /api/questions/next`, `POST /api/questions/:id/submit`
- **Progress**: `GET /api/questions/progress/:examType`

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