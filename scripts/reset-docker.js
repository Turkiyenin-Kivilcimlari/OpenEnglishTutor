#!/usr/bin/env node

/**
 * Docker Reset Script
 * 
 * This script completely resets the Docker environment by:
 * 1. Stopping all containers
 * 2. Removing containers and volumes
 * 3. Starting fresh containers
 * 4. Waiting for services to be ready
 * 
 * Use this when you have persistent Docker-related database issues.
 */

const { execSync } = require('child_process');
const path = require('path');

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForService(serviceName, command, maxRetries = 30) {
  log(`⏳ Waiting for ${serviceName} to be ready...`, 'yellow');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      execCommand(command, process.cwd(), true);
      log(`✅ ${serviceName} is ready!`, 'green');
      return true;
    } catch (error) {
      if (i < maxRetries - 1) {
        await sleep(2000); // Wait 2 seconds before retry
      }
    }
  }
  
  log(`❌ ${serviceName} failed to start after ${maxRetries} attempts`, 'red');
  return false;
}

async function resetDocker() {
  const projectRoot = path.join(__dirname, '..');
  
  log('🐳 Starting Docker reset process...', 'bold');
  
  try {
    // Step 1: Stop all containers
    log('\n🛑 Step 1: Stopping all containers...', 'yellow');
    execCommand('docker-compose down', projectRoot, true);

    // Step 2: Remove volumes (this will delete all data)
    log('\n🗑️  Step 2: Removing volumes and containers...', 'yellow');
    execCommand('docker-compose down -v --remove-orphans', projectRoot, true);

    // Step 3: Remove any dangling containers/images related to the project
    log('\n🧹 Step 3: Cleaning up Docker resources...', 'yellow');
    execCommand('docker system prune -f', projectRoot, true);

    // Step 4: Start fresh containers
    log('\n🚀 Step 4: Starting fresh containers...', 'yellow');
    execCommand('docker-compose up -d', projectRoot);

    // Step 5: Wait for services to be ready
    log('\n⏳ Step 5: Waiting for services to be ready...', 'yellow');
    
    // Wait for PostgreSQL
    const pgReady = await waitForService(
      'PostgreSQL', 
      'docker-compose exec -T postgres pg_isready -U postgres'
    );
    
    if (!pgReady) {
      throw new Error('PostgreSQL failed to start');
    }

    // Wait for Redis
    const redisReady = await waitForService(
      'Redis',
      'docker-compose exec -T redis redis-cli ping'
    );

    if (!redisReady) {
      log('⚠️  Redis failed to start, but continuing...', 'yellow');
    }

    log('\n✅ Docker reset completed successfully!', 'green');
    log('All containers are running with fresh data.', 'green');
    log('\n💡 Next steps:', 'blue');
    log('1. Run database migrations: node scripts/reset-database.js', 'blue');
    log('2. Or run the full setup: npm run setup', 'blue');

  } catch (error) {
    log('\n❌ Docker reset failed!', 'red');
    log('Please check the error messages above.', 'yellow');
    showTroubleshootingTips();
    process.exit(1);
  }
}

function showTroubleshootingTips() {
  log('\n🔧 Troubleshooting Tips:', 'bold');
  log('');
  log('1. Make sure Docker is running:', 'yellow');
  log('   docker --version', 'blue');
  log('   docker-compose --version', 'blue');
  log('');
  log('2. Check if ports are available:', 'yellow');
  log('   netstat -an | findstr :5432  # PostgreSQL', 'blue');
  log('   netstat -an | findstr :6379  # Redis', 'blue');
  log('');
  log('3. Manual cleanup if needed:', 'yellow');
  log('   docker-compose down -v --remove-orphans', 'blue');
  log('   docker system prune -a -f', 'blue');
  log('   docker volume prune -f', 'blue');
  log('');
  log('4. Check Docker logs:', 'yellow');
  log('   docker-compose logs postgres', 'blue');
  log('   docker-compose logs redis', 'blue');
}

function showStatus() {
  log('📊 Current Docker Status:', 'bold');
  log('');
  try {
    execCommand('docker-compose ps');
    log('');
    execCommand('docker-compose logs --tail=10 postgres');
  } catch (error) {
    log('Could not get Docker status. Make sure Docker is running.', 'red');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Docker Reset Script', 'bold');
  log('');
  log('Usage:', 'yellow');
  log('  node scripts/reset-docker.js           # Reset Docker environment', 'blue');
  log('  node scripts/reset-docker.js --status  # Show current status', 'blue');
  log('  node scripts/reset-docker.js --help    # Show this help', 'blue');
  log('');
  log('This script will completely reset your Docker containers and volumes.', 'yellow');
  log('⚠️  WARNING: This will delete all data in your containers!', 'red');
  process.exit(0);
}

if (args.includes('--status')) {
  showStatus();
  process.exit(0);
}

// Confirm before proceeding
if (!args.includes('--force')) {
  log('⚠️  WARNING: This will delete all data in your Docker containers!', 'red');
  log('Press Ctrl+C to cancel, or wait 5 seconds to continue...', 'yellow');
  
  setTimeout(() => {
    resetDocker().catch((error) => {
      log('\n💡 If Docker reset failed, try:', 'yellow');
      log('1. Check Docker status: node scripts/reset-docker.js --status', 'blue');
      log('2. Manual cleanup and try again', 'blue');
      process.exit(1);
    });
  }, 5000);
} else {
  resetDocker().catch((error) => {
    process.exit(1);
  });
}