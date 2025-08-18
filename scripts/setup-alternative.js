#!/usr/bin/env node

/**
 * Alternative Setup Script
 * 
 * This script provides multiple setup options for resolving database issues:
 * 1. Quick fix for constraint conflicts
 * 2. Full reset (Docker + Database)
 * 3. Database-only reset
 * 4. Manual constraint removal
 * 5. Fresh installation
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, cwd = process.cwd(), ignoreError = false) {
  try {
    log(`Executing: ${command}`, 'blue');
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return result;
  } catch (error) {
    if (!ignoreError) {
      log(`Error executing command: ${command}`, 'red');
      log(`Error: ${error.message}`, 'red');
      throw error;
    } else {
      log(`Command failed (ignored): ${command}`, 'yellow');
      return null;
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function quickConstraintFix() {
  log('\n🔧 Quick Constraint Fix', 'bold');
  log('This will attempt to remove the conflicting constraint directly.', 'yellow');
  
  const apiPath = path.join(__dirname, '..', 'packages', 'api');
  
  try {
    // Create a temporary SQL script to fix the constraint
    const fixSql = `
-- Remove the conflicting constraint if it exists
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'users_username_key' 
               AND table_name = 'users') THEN
        ALTER TABLE users DROP CONSTRAINT users_username_key;
        RAISE NOTICE 'Dropped constraint users_username_key';
    END IF;
    
    -- Drop the index if it exists
    IF EXISTS (SELECT 1 FROM pg_indexes 
               WHERE indexname = 'users_username_key') THEN
        DROP INDEX users_username_key;
        RAISE NOTICE 'Dropped index users_username_key';
    END IF;
    
    -- Drop username column if it exists and is not needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users DROP COLUMN username;
        RAISE NOTICE 'Dropped column username';
    END IF;
END $$;
`;

    const tempSqlFile = path.join(apiPath, 'temp_fix.sql');
    fs.writeFileSync(tempSqlFile, fixSql);
    
    log('Running constraint fix...', 'blue');
    execCommand(`docker-compose exec -T postgres psql -U postgres -d openenglishttutor -f /tmp/temp_fix.sql`, path.join(__dirname, '..'));
    
    // Clean up temp file
    fs.unlinkSync(tempSqlFile);
    
    // Run migrations
    log('Running Prisma migrations...', 'blue');
    execCommand('npx prisma migrate deploy', apiPath);
    execCommand('npx prisma generate', apiPath);
    
    log('✅ Quick fix completed!', 'green');
    return true;
    
  } catch (error) {
    log('❌ Quick fix failed. Try a full reset instead.', 'red');
    return false;
  }
}

async function fullReset() {
  log('\n🔄 Full Reset (Docker + Database)', 'bold');
  log('This will reset everything: Docker containers, volumes, and database.', 'yellow');
  
  try {
    // Run Docker reset
    log('Step 1: Resetting Docker environment...', 'cyan');
    execCommand('node scripts/reset-docker.js --force', path.join(__dirname, '..'));
    
    // Wait a bit for containers to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Run database reset
    log('Step 2: Resetting database...', 'cyan');
    execCommand('node scripts/reset-database.js', path.join(__dirname, '..'));
    
    log('✅ Full reset completed!', 'green');
    return true;
    
  } catch (error) {
    log('❌ Full reset failed.', 'red');
    return false;
  }
}

async function databaseOnlyReset() {
  log('\n💾 Database-Only Reset', 'bold');
  log('This will reset only the database, keeping Docker containers running.', 'yellow');
  
  try {
    execCommand('node scripts/reset-database.js', path.join(__dirname, '..'));
    log('✅ Database reset completed!', 'green');
    return true;
    
  } catch (error) {
    log('❌ Database reset failed.', 'red');
    return false;
  }
}

async function manualConstraintRemoval() {
  log('\n🛠️  Manual Constraint Removal', 'bold');
  log('Follow these steps to manually remove the conflicting constraint:', 'yellow');
  log('');
  
  log('1. Connect to PostgreSQL:', 'blue');
  log('   docker-compose exec postgres psql -U postgres -d openenglishttutor', 'cyan');
  log('');
  
  log('2. Check existing constraints:', 'blue');
  log('   \\d users', 'cyan');
  log('');
  
  log('3. Remove the conflicting constraint:', 'blue');
  log('   ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;', 'cyan');
  log('   DROP INDEX IF EXISTS users_username_key;', 'cyan');
  log('   ALTER TABLE users DROP COLUMN IF EXISTS username;', 'cyan');
  log('');
  
  log('4. Exit PostgreSQL and run migrations:', 'blue');
  log('   \\q', 'cyan');
  log('   cd packages/api', 'cyan');
  log('   npx prisma migrate deploy', 'cyan');
  log('   npx prisma generate', 'cyan');
  log('');
  
  const answer = await askQuestion('Have you completed these steps? (y/n): ');
  return answer.toLowerCase() === 'y';
}

async function freshInstallation() {
  log('\n🆕 Fresh Installation', 'bold');
  log('This will create a completely new database with a different name.', 'yellow');
  
  const apiPath = path.join(__dirname, '..', 'packages', 'api');
  const envPath = path.join(apiPath, '.env');
  
  try {
    // Read current .env
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Generate new database name
    const timestamp = Date.now();
    const newDbName = `openenglishttutor_${timestamp}`;
    
    // Update DATABASE_URL
    const newDatabaseUrl = `postgresql://postgres:password@localhost:5432/${newDbName}`;
    
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${newDatabaseUrl}"`);
    } else {
      envContent += `\nDATABASE_URL="${newDatabaseUrl}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    log(`Created new database configuration: ${newDbName}`, 'green');
    
    // Create the new database
    log('Creating new database...', 'blue');
    execCommand(`docker-compose exec postgres createdb -U postgres ${newDbName}`, path.join(__dirname, '..'), true);
    
    // Run migrations
    log('Running migrations on new database...', 'blue');
    execCommand('npx prisma migrate deploy', apiPath);
    execCommand('npx prisma generate', apiPath);
    
    // Seed if available
    const seedPath = path.join(apiPath, 'src', 'scripts', 'seed.ts');
    if (fs.existsSync(seedPath)) {
      log('Seeding new database...', 'blue');
      execCommand('npx prisma db seed', apiPath);
    }
    
    log('✅ Fresh installation completed!', 'green');
    log(`New database: ${newDbName}`, 'cyan');
    return true;
    
  } catch (error) {
    log('❌ Fresh installation failed.', 'red');
    return false;
  }
}

async function showMenu() {
  log('\n🔧 OpenEnglishTutor Database Setup - Alternative Methods', 'bold');
  log('Choose a setup method to resolve database constraint issues:', 'yellow');
  log('');
  log('1. 🚀 Quick Constraint Fix (Recommended first try)', 'green');
  log('2. 🔄 Full Reset (Docker + Database)', 'blue');
  log('3. 💾 Database-Only Reset', 'cyan');
  log('4. 🛠️  Manual Constraint Removal', 'yellow');
  log('5. 🆕 Fresh Installation (New Database)', 'cyan');
  log('6. ❌ Exit', 'red');
  log('');
  
  const choice = await askQuestion('Enter your choice (1-6): ');
  return choice;
}

async function main() {
  try {
    const choice = await showMenu();
    
    let success = false;
    
    switch (choice) {
      case '1':
        success = await quickConstraintFix();
        break;
      case '2':
        success = await fullReset();
        break;
      case '3':
        success = await databaseOnlyReset();
        break;
      case '4':
        success = await manualConstraintRemoval();
        break;
      case '5':
        success = await freshInstallation();
        break;
      case '6':
        log('Exiting...', 'yellow');
        process.exit(0);
        break;
      default:
        log('Invalid choice. Please run the script again.', 'red');
        process.exit(1);
    }
    
    if (success) {
      log('\n🎉 Setup completed successfully!', 'green');
      log('You can now start the application:', 'blue');
      log('  npm run dev', 'cyan');
    } else {
      log('\n❌ Setup failed. You may need to try a different method.', 'red');
      const retry = await askQuestion('Would you like to try another method? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        await main();
      }
    }
    
  } catch (error) {
    log('\n❌ An error occurred during setup.', 'red');
    log(`Error: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Alternative Setup Script', 'bold');
  log('');
  log('This script provides multiple options to resolve database setup issues.', 'yellow');
  log('It will guide you through different methods to fix constraint conflicts.', 'yellow');
  log('');
  log('Usage:', 'blue');
  log('  node scripts/setup-alternative.js', 'cyan');
  log('');
  process.exit(0);
}

// Run the main function
main().catch((error) => {
  log('\n💥 Unexpected error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});