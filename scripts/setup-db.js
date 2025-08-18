#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up OpenEnglishTutor database...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from .env.example...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
    console.log('⚠️  Please update the DATABASE_URL and other settings in .env file\n');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Function to run command and handle errors
function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ Error during ${description.toLowerCase()}:`, error.message);
    process.exit(1);
  }
}

// Check if PostgreSQL is running
console.log('🔍 Checking database connection...');
try {
  execSync('cd packages/api && npx prisma db push --accept-data-loss', { 
    stdio: 'pipe', 
    cwd: path.join(__dirname, '..') 
  });
  console.log('✅ Database connection successful\n');
} catch (error) {
  console.error('❌ Database connection failed. Please ensure:');
  console.error('   1. PostgreSQL is running');
  console.error('   2. DATABASE_URL in .env is correct');
  console.error('   3. Database exists or user has permission to create it\n');
  console.error('Error details:', error.message);
  process.exit(1);
}

// Generate Prisma client
runCommand('npm run db:generate', 'Generating Prisma client');

// Run migrations
runCommand('npm run db:migrate', 'Running database migrations');

// Seed database
runCommand('npm run db:seed', 'Seeding database with sample data');

console.log('🎉 Database setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Review and update your .env file with correct values');
console.log('   2. Run "npm run dev:api" to start the development server');
console.log('   3. Visit http://localhost:3001/health to test the API');
console.log('   4. Use "npm run db:studio" to view your data in Prisma Studio\n');