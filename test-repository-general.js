const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

class RepositoryTester {
  constructor() {
    this.results = {
      structure: {},
      dependencies: {},
      configuration: {},
      docker: {},
      build: {},
      tests: {},
      issues: [],
      recommendations: []
    };
  }

  async testRepositoryStructure() {
    console.log('📁 Testing Repository Structure...\n');
    
    const requiredFiles = [
      'package.json',
      'docker-compose.yml',
      'turbo.json',
      '.env',
      'README.md',
      'packages/api/package.json',
      'packages/web/package.json',
      'packages/shared/package.json'
    ];

    const requiredDirs = [
      'packages',
      'packages/api',
      'packages/web', 
      'packages/shared',
      'packages/api/src',
      'packages/web/src',
      'packages/shared/src'
    ];

    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      this.results.structure[file] = exists;
      console.log(`${exists ? '✅' : '❌'} ${file}`);
      if (!exists) this.results.issues.push(`Missing required file: ${file}`);
    }

    for (const dir of requiredDirs) {
      const exists = fs.existsSync(dir);
      this.results.structure[dir] = exists;
      console.log(`${exists ? '✅' : '❌'} ${dir}/`);
      if (!exists) this.results.issues.push(`Missing required directory: ${dir}`);
    }
  }

  async testPackageJsonFiles() {
    console.log('\n📦 Testing Package.json Files...\n');
    
    const packageFiles = [
      { path: 'package.json', name: 'Root' },
      { path: 'packages/api/package.json', name: 'API' },
      { path: 'packages/web/package.json', name: 'Web' },
      { path: 'packages/shared/package.json', name: 'Shared' }
    ];

    for (const pkg of packageFiles) {
      try {
        if (fs.existsSync(pkg.path)) {
          const content = JSON.parse(fs.readFileSync(pkg.path, 'utf8'));
          console.log(`✅ ${pkg.name}: ${content.name}@${content.version}`);
          this.results.dependencies[pkg.name] = {
            name: content.name,
            version: content.version,
            scripts: Object.keys(content.scripts || {}),
            dependencies: Object.keys(content.dependencies || {}),
            devDependencies: Object.keys(content.devDependencies || {})
          };
        } else {
          console.log(`❌ ${pkg.name}: File not found`);
          this.results.issues.push(`${pkg.name} package.json not found`);
        }
      } catch (error) {
        console.log(`❌ ${pkg.name}: Invalid JSON - ${error.message}`);
        this.results.issues.push(`${pkg.name} package.json has invalid JSON`);
      }
    }
  }

  async testEnvironmentConfiguration() {
    console.log('\n⚙️ Testing Environment Configuration...\n');
    
    const envFiles = ['.env', 'packages/api/.env'];
    
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const hasDbUrl = content.includes('DATABASE_URL');
        const hasRedisUrl = content.includes('REDIS_URL');
        const hasJwtSecret = content.includes('JWT_SECRET');
        
        console.log(`✅ ${envFile} exists`);
        console.log(`  ${hasDbUrl ? '✅' : '❌'} DATABASE_URL configured`);
        console.log(`  ${hasRedisUrl ? '✅' : '❌'} REDIS_URL configured`);
        console.log(`  ${hasJwtSecret ? '✅' : '❌'} JWT_SECRET configured`);
        
        this.results.configuration[envFile] = {
          exists: true,
          hasDbUrl,
          hasRedisUrl,
          hasJwtSecret
        };
      } else {
        console.log(`❌ ${envFile} not found`);
        this.results.configuration[envFile] = { exists: false };
        this.results.issues.push(`Environment file ${envFile} missing`);
      }
    }
  }

  async testDockerConfiguration() {
    console.log('\n🐳 Testing Docker Configuration...\n');
    
    try {
      // Test docker-compose.yml
      if (fs.existsSync('docker-compose.yml')) {
        const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf8');
        const hasPostgres = dockerCompose.includes('postgres');
        const hasRedis = dockerCompose.includes('redis');
        const hasAdminer = dockerCompose.includes('adminer');
        
        console.log('✅ docker-compose.yml exists');
        console.log(`  ${hasPostgres ? '✅' : '❌'} PostgreSQL service`);
        console.log(`  ${hasRedis ? '✅' : '❌'} Redis service`);
        console.log(`  ${hasAdminer ? '✅' : '❌'} Adminer service`);
        
        this.results.docker.compose = {
          exists: true,
          hasPostgres,
          hasRedis,
          hasAdminer
        };
      }

      // Test Docker availability
      try {
        await execAsync('docker --version');
        console.log('✅ Docker is available');
        this.results.docker.available = true;
      } catch (error) {
        console.log('❌ Docker not available');
        this.results.docker.available = false;
        this.results.issues.push('Docker is not installed or not running');
      }

    } catch (error) {
      console.log(`❌ Docker configuration error: ${error.message}`);
      this.results.issues.push(`Docker configuration error: ${error.message}`);
    }
  }

  async testBuildProcess() {
    console.log('\n🔨 Testing Build Process...\n');
    
    const buildTests = [
      { name: 'Shared Package', cmd: 'npm run build', cwd: 'packages/shared' },
      { name: 'API Package', cmd: 'npm run build', cwd: 'packages/api' },
      { name: 'Web Package', cmd: 'npm run build', cwd: 'packages/web' }
    ];

    for (const test of buildTests) {
      try {
        console.log(`Testing ${test.name} build...`);
        const result = await execAsync(test.cmd, { cwd: test.cwd });
        console.log(`✅ ${test.name}: Build successful`);
        this.results.build[test.name] = { success: true, output: result.stdout };
      } catch (error) {
        console.log(`❌ ${test.name}: Build failed`);
        console.log(`   Error: ${error.message.split('\n')[0]}`);
        this.results.build[test.name] = { 
          success: false, 
          error: error.message,
          output: error.stdout 
        };
        this.results.issues.push(`${test.name} build fails`);
      }
    }
  }

  async testAvailableScripts() {
    console.log('\n📜 Testing Available Scripts...\n');
    
    const scriptTests = [
      { name: 'Root Lint', cmd: 'npm run lint --if-present' },
      { name: 'Root Test', cmd: 'npm run test --if-present' },
      { name: 'API Lint', cmd: 'npm run lint --if-present', cwd: 'packages/api' },
      { name: 'API Test', cmd: 'npm run test --if-present', cwd: 'packages/api' },
      { name: 'Web Lint', cmd: 'npm run lint --if-present', cwd: 'packages/web' }
    ];

    for (const test of scriptTests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await execAsync(test.cmd, { 
          cwd: test.cwd || '.',
          timeout: 30000 
        });
        console.log(`✅ ${test.name}: Available and working`);
        this.results.tests[test.name] = { success: true };
      } catch (error) {
        if (error.message.includes('missing script')) {
          console.log(`⚠️ ${test.name}: Script not available`);
          this.results.tests[test.name] = { success: false, reason: 'missing' };
        } else {
          console.log(`❌ ${test.name}: Failed - ${error.message.split('\n')[0]}`);
          this.results.tests[test.name] = { success: false, reason: 'error', error: error.message };
        }
      }
    }
  }

  async testDatabaseSchema() {
    console.log('\n🗄️ Testing Database Schema...\n');
    
    const schemaFile = 'packages/api/prisma/schema.prisma';
    const migrationDir = 'packages/api/prisma/migrations';
    
    if (fs.existsSync(schemaFile)) {
      console.log('✅ Prisma schema exists');
      const schema = fs.readFileSync(schemaFile, 'utf8');
      const models = (schema.match(/model \w+/g) || []).length;
      console.log(`✅ Database models: ${models} found`);
      this.results.configuration.database = { schema: true, models };
    } else {
      console.log('❌ Prisma schema not found');
      this.results.issues.push('Database schema file missing');
    }

    if (fs.existsSync(migrationDir)) {
      const migrations = fs.readdirSync(migrationDir).filter(f => f !== 'migration_lock.toml');
      console.log(`✅ Database migrations: ${migrations.length} found`);
      this.results.configuration.database = { 
        ...this.results.configuration.database, 
        migrations: migrations.length 
      };
    } else {
      console.log('❌ Migration directory not found');
      this.results.issues.push('Database migrations directory missing');
    }
  }

  generateRecommendations() {
    console.log('\n💡 Generating Recommendations...\n');
    
    // Check for common issues and generate recommendations
    if (this.results.issues.length === 0) {
      this.results.recommendations.push('Repository structure is excellent!');
    }

    if (!this.results.docker.available) {
      this.results.recommendations.push('Install Docker to enable containerized development');
    }

    if (this.results.issues.some(issue => issue.includes('build fails'))) {
      this.results.recommendations.push('Fix build issues before deployment');
      this.results.recommendations.push('Check TypeScript configuration and import paths');
    }

    if (!this.results.configuration['.env']?.hasJwtSecret) {
      this.results.recommendations.push('Set a strong JWT_SECRET in environment variables');
    }

    this.results.recommendations.push('Consider adding automated CI/CD pipeline');
    this.results.recommendations.push('Add comprehensive integration tests');
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPOSITORY TEST SUMMARY');
    console.log('='.repeat(60));
    
    const totalIssues = this.results.issues.length;
    const structureOk = Object.values(this.results.structure).every(v => v);
    const dockerOk = this.results.docker.available && this.results.docker.compose?.exists;
    
    console.log(`\n🏗️  Structure: ${structureOk ? '✅ Good' : '❌ Issues found'}`);
    console.log(`🐳 Docker: ${dockerOk ? '✅ Ready' : '❌ Issues found'}`);
    console.log(`📦 Dependencies: ${Object.keys(this.results.dependencies).length} packages`);
    console.log(`🔨 Build Status: ${Object.values(this.results.build).some(b => b.success) ? '⚠️ Partial' : '❌ Failed'}`);
    console.log(`🚨 Issues Found: ${totalIssues}`);
    
    if (totalIssues > 0) {
      console.log('\n🚨 Issues:');
      this.results.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Overall Status: ${totalIssues === 0 ? '✅ EXCELLENT' : totalIssues < 5 ? '⚠️ GOOD WITH ISSUES' : '❌ NEEDS WORK'}`);
    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🧪 COMPREHENSIVE REPOSITORY TEST\n');
    console.log('Testing OpenEnglishTutor repository...\n');
    
    await this.testRepositoryStructure();
    await this.testPackageJsonFiles();
    await this.testEnvironmentConfiguration();
    await this.testDockerConfiguration();
    await this.testDatabaseSchema();
    await this.testBuildProcess();
    await this.testAvailableScripts();
    
    this.generateRecommendations();
    this.printSummary();
    
    return this.results;
  }
}

// Run the comprehensive test
const tester = new RepositoryTester();
tester.runAllTests().then(results => {
  // Save results to file
  fs.writeFileSync('repository-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to: repository-test-results.json');
  
  process.exit(results.issues.length === 0 ? 0 : 1);
}).catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});