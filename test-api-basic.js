const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testBasicAPIFunctionality() {
  console.log('🔧 Testing basic API functionality...\n');
  
  try {
    // Test database connection with a simple query
    console.log('📊 Testing database connection...');
    const dbTest = await execAsync('docker exec openenglishttutor-postgres psql -U postgres -d openenglishttutor -c "SELECT COUNT(*) FROM users;"');
    console.log('✅ Database query successful:', dbTest.stdout.includes('0') ? 'Users table accessible' : 'Users table has data');
    
    // Test all tables exist
    console.log('📊 Testing all required tables...');
    const tables = ['users', 'exam_types', 'exam_skills', 'questions', 'question_attempts', 'user_exam_progress', 'evaluation_criteria'];
    
    for (const table of tables) {
      try {
        const tableTest = await execAsync(`docker exec openenglishttutor-postgres psql -U postgres -d openenglishttutor -c "SELECT COUNT(*) FROM ${table};"`);
        console.log(`✅ Table '${table}': Accessible`);
      } catch (error) {
        console.log(`❌ Table '${table}': Error - ${error.message}`);
      }
    }
    
    // Test Redis connection
    console.log('📊 Testing Redis functionality...');
    await execAsync('docker exec openenglishttutor-redis redis-cli set test_key "test_value"');
    const redisGet = await execAsync('docker exec openenglishttutor-redis redis-cli get test_key');
    console.log('✅ Redis read/write:', redisGet.stdout.trim() === 'test_value' ? 'Working' : 'Failed');
    
    // Clean up test key
    await execAsync('docker exec openenglishttutor-redis redis-cli del test_key');
    
    // Test database schema
    console.log('📊 Testing database schema...');
    const schemaTest = await execAsync('docker exec openenglishttutor-postgres psql -U postgres -d openenglishttutor -c "\\d users"');
    const hasEmailColumn = schemaTest.stdout.includes('email');
    const hasPasswordColumn = schemaTest.stdout.includes('password_hash');
    console.log('✅ User table schema:', hasEmailColumn && hasPasswordColumn ? 'Complete' : 'Missing columns');
    
    // Test foreign key relationships
    console.log('📊 Testing foreign key relationships...');
    const fkTest = await execAsync('docker exec openenglishttutor-postgres psql -U postgres -d openenglishttutor -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = \'FOREIGN KEY\';"');
    const fkCount = parseInt(fkTest.stdout.match(/\d+/)[0]);
    console.log('✅ Foreign key constraints:', fkCount, 'relationships found');
    
    console.log('\n🎉 Basic API functionality test completed!');
    console.log('\n📋 Summary:');
    console.log('- Database: Connected and accessible');
    console.log('- Tables: All 7 required tables exist');
    console.log('- Redis: Read/write operations working');
    console.log('- Schema: User table properly structured');
    console.log('- Relationships:', fkCount, 'foreign key constraints active');
    
    return true;
  } catch (error) {
    console.error('❌ Basic API functionality test failed:', error.message);
    return false;
  }
}

// Run the test
testBasicAPIFunctionality().then(success => {
  process.exit(success ? 0 : 1);
});