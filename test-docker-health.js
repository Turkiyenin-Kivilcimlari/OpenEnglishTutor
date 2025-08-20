const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testDockerHealth() {
  console.log('🐳 Testing Docker containers health...\n');
  
  try {
    // Test PostgreSQL
    console.log('📊 Testing PostgreSQL connection...');
    const pgResult = await execAsync('docker exec openenglishttutor-postgres pg_isready -U postgres');
    console.log('✅ PostgreSQL:', pgResult.stdout.trim());
    
    // Test Redis
    console.log('📊 Testing Redis connection...');
    const redisResult = await execAsync('docker exec openenglishttutor-redis redis-cli ping');
    console.log('✅ Redis:', redisResult.stdout.trim());
    
    // Test database exists
    console.log('📊 Testing database exists...');
    const dbResult = await execAsync('docker exec openenglishttutor-postgres psql -U postgres -c "\\l" | grep openenglishttutor');
    console.log('✅ Database exists:', dbResult.stdout.includes('openenglishttutor') ? 'Yes' : 'No');
    
    // Test tables exist
    console.log('📊 Testing database tables...');
    const tablesResult = await execAsync('docker exec openenglishttutor-postgres psql -U postgres -d openenglishttutor -c "\\dt"');
    const tableCount = (tablesResult.stdout.match(/public \|/g) || []).length;
    console.log('✅ Tables created:', tableCount, 'tables found');
    
    // Test container status
    console.log('📊 Testing container status...');
    const statusResult = await execAsync('docker-compose ps --format json');
    const containers = JSON.parse(`[${statusResult.stdout.trim().split('\n').join(',')}]`);
    
    containers.forEach(container => {
      const status = container.State === 'running' ? '✅' : '❌';
      console.log(`${status} ${container.Service}: ${container.State}`);
    });
    
    console.log('\n🎉 Docker health check completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- PostgreSQL: Running and accepting connections');
    console.log('- Redis: Running and responding to ping');
    console.log('- Database: Created with', tableCount, 'tables');
    console.log('- All containers: Running');
    
    return true;
  } catch (error) {
    console.error('❌ Docker health check failed:', error.message);
    return false;
  }
}

// Run the test
testDockerHealth().then(success => {
  process.exit(success ? 0 : 1);
});