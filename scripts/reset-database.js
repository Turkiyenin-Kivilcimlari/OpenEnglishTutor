#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * This script completely resets the database by:
 * 1. Dropping all existing tables and constraints
 * 2. Running fresh Prisma migrations
 * 3. Seeding the database with initial data
 * 
 * Use this when you encounter constraint conflicts or schema issues.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, cwd = process.cwd()) {
  try {
    log(`Executing: ${command}`, 'blue');
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return result;
  } catch (error) {
    log(`Error executing command: ${command}`, 'red');
    log(`Error: ${error.message}`, 'red');
    throw error;
  }
}

async function resetDatabase() {
  const apiPath = path.join(__dirname, '..', 'packages', 'api');
  
  log('🔄 Starting database reset process...', 'bold');
  
  try {
    // Step 1: Check if .env file exists
    const envPath = path.join(apiPath, '.env');
    if (!fs.existsSync(envPath)) {
      log('❌ .env file not found in packages/api/', 'red');
      log('Please create .env file with DATABASE_URL before running this script.', 'yellow');
      process.exit(1);
    }

    // Step 2: Reset Prisma migrations
    log('\n📋 Step 1: Resetting Prisma migrations...', 'yellow');
    execCommand('npx prisma migrate reset --force', apiPath);

    // Step 3: Generate Prisma client
    log('\n🔧 Step 2: Generating Prisma client...', 'yellow');
    execCommand('npx prisma generate', apiPath);

    // Step 4: Run fresh migrations
    log('\n🚀 Step 3: Running fresh migrations...', 'yellow');
    execCommand('npx prisma migrate deploy', apiPath);

    // Step 5: Seed database (if seed script exists)
    const seedPath = path.join(apiPath, 'src', 'scripts', 'seed.ts');
    if (fs.existsSync(seedPath)) {
      log('\n🌱 Step 4: Seeding database...', 'yellow');
      execCommand('npx prisma db seed', apiPath);
    } else {
      log('\n⚠️  No seed script found, skipping seeding...', 'yellow');
    }

    log('\n✅ Database reset completed successfully!', 'green');
    log('Your database is now clean and ready to use.', 'green');

  } catch (error) {
    log('\n❌ Database reset failed!', 'red');
    log('Please check the error messages above and try the manual reset steps.', 'yellow');
    process.exit(1);
  }
}

// Manual reset instructions
function showManualInstructions() {
  log('\n📖 Manual Reset Instructions:', 'bold');
  log('If the automatic reset fails, follow these steps manually:', 'yellow');
  log('');
  log('1. Connect to your PostgreSQL database:', 'blue');
  log('   psql -h localhost -U postgres -d openenglishttutor', 'blue');
  log('');
  log('2. Drop all tables manually:', 'blue');
  log('   DROP SCHEMA public CASCADE;', 'blue');
  log('   CREATE SCHEMA public;', 'blue');
  log('   GRANT ALL ON SCHEMA public TO postgres;', 'blue');
  log('   GRANT ALL ON SCHEMA public TO public;', 'blue');
  log('');
  log('3. Run Prisma migrations:', 'blue');
  log('   cd packages/api', 'blue');
  log('   npx prisma migrate deploy', 'blue');
  log('   npx prisma generate', 'blue');
  log('');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Database Reset Script', 'bold');
  log('');
  log('Usage:', 'yellow');
  log('  node scripts/reset-database.js          # Reset database automatically', 'blue');
  log('  node scripts/reset-database.js --help   # Show this help', 'blue');
  log('  node scripts/reset-database.js --manual # Show manual instructions', 'blue');
  log('');
  log('This script will completely reset your database and run fresh migrations.', 'yellow');
  log('Make sure Docker containers are running before executing this script.', 'yellow');
  process.exit(0);
}

if (args.includes('--manual')) {
  showManualInstructions();
  process.exit(0);
}

// Run the reset
resetDatabase().catch((error) => {
  log('\n💡 If automatic reset failed, try manual reset:', 'yellow');
  log('node scripts/reset-database.js --manual', 'blue');
  process.exit(1);
});