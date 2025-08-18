# OpenEnglishTutor Web Frontend

This is the frontend web application for the OpenEnglishTutor platform, built with Next.js, React, and Tailwind CSS.

## Features

- **Authentication**: Login and registration with JWT tokens
- **Exam Types**: Support for IELTS, TOEFL, and YDS exams
- **Question Interface**: Interactive question solving with real-time feedback
- **Progress Tracking**: Dashboard with learning analytics
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable React components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (API client, etc.)
├── pages/              # Next.js pages
│   ├── auth/           # Authentication pages
│   ├── exam/           # Exam selection pages
│   ├── practice.tsx    # Question solving interface
│   └── dashboard.tsx   # User dashboard
├── store/              # Zustand state management
├── styles/             # Global styles and Tailwind CSS
└── types/              # TypeScript type definitions
```

## API Integration

The frontend communicates with the backend API through:

- **Authentication**: JWT-based auth with automatic token refresh
- **Questions**: Real-time question fetching and submission
- **Progress**: User progress tracking and analytics

## State Management

Uses Zustand for state management:

- `authStore` - User authentication and profile
- `questionStore` - Question flow and exam state

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom components** with consistent design system
- **Responsive design** for mobile and desktop

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

Build the application:

```bash
npm run build
```

The built application will be in the `.next` directory.