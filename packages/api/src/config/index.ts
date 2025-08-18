import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  
  // Database Configuration
  databaseUrl: string;
  redisUrl: string;
  
  // Authentication Configuration
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // AI Services Configuration
  openaiApiKey: string;
  googleCloudProjectId: string;
  googleCloudKeyFile: string;
  
  // File Storage Configuration
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsRegion: string;
  
  // Email Configuration
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  
  // Monitoring Configuration
  sentryDsn: string;
  mixpanelToken: string;
  
  // Rate Limiting Configuration
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // AI Evaluation Configuration
  maxWritingLength: number;
  maxSpeakingDuration: number;
  aiTimeoutMs: number;
}

const config: Config = {
  // Server Configuration
  port: parseInt(process.env.API_PORT || process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // AI Services Configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  googleCloudKeyFile: process.env.GOOGLE_CLOUD_KEY_FILE || '',
  
  // File Storage Configuration
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  
  // Email Configuration
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  
  // Monitoring Configuration
  sentryDsn: process.env.SENTRY_DSN || '',
  mixpanelToken: process.env.MIXPANEL_TOKEN || '',
  
  // Rate Limiting Configuration
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // AI Evaluation Configuration
  maxWritingLength: parseInt(process.env.MAX_WRITING_LENGTH || '1000', 10),
  maxSpeakingDuration: parseInt(process.env.MAX_SPEAKING_DURATION || '300', 10), // 5 minutes
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10), // 30 seconds
};

// Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
}

// Development warnings
if (config.nodeEnv === 'development') {
  if (config.jwtSecret === 'your-super-secret-jwt-key') {
    console.warn('⚠️  Using default JWT secret in development. Please set JWT_SECRET environment variable.');
  }
  
  if (!config.openaiApiKey) {
    console.warn('⚠️  OpenAI API key not set. AI evaluation features will not work.');
  }
  
  if (!config.googleCloudProjectId) {
    console.warn('⚠️  Google Cloud project ID not set. Speech recognition features will not work.');
  }
}

export default config;
export { Config };