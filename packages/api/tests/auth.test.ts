import request from 'supertest';
import app from '../src/index';

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockPrisma = require('@prisma/client');
      mockPrisma.PrismaClient.mockImplementationOnce(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'user-id-123',
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            createdAt: new Date()
          })
        }
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockPrisma = require('@prisma/client');
      mockPrisma.PrismaClient.mockImplementationOnce(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' })
        }
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockPrisma = require('@prisma/client');
      mockPrisma.PrismaClient.mockImplementationOnce(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-id-123',
            email: loginData.email,
            passwordHash: '$2a$10$hashedpassword', // Mock bcrypt hash
            firstName: 'Test',
            lastName: 'User'
          })
        }
      }));

      // Mock bcrypt compare
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockPrisma = require('@prisma/client');
      mockPrisma.PrismaClient.mockImplementationOnce(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue(null)
        }
      }));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });
});