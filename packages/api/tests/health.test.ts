import request from 'supertest';
import app from '../src/index';

describe('Health Check Endpoint', () => {
  it('should return 200 and health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Server is healthy',
      environment: 'test'
    });

    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBeDefined();
  });

  it('should handle database connection errors gracefully', async () => {
    // Mock database error
    const mockPrisma = require('@prisma/client');
    mockPrisma.PrismaClient.mockImplementationOnce(() => ({
      $queryRaw: jest.fn().mockRejectedValue(new Error('Database connection failed'))
    }));

    const response = await request(app)
      .get('/health')
      .expect(503);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Service unavailable'
    });
  });
});