import { PrismaClient } from '@prisma/client';

// Mock Prisma for tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    examType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  })),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test timeout
jest.setTimeout(10000);