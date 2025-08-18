# Database Troubleshooting Guide

This guide helps you resolve common database setup issues in the OpenEnglishTutor project.

## 🚨 Common Error: Constraint Conflict

### Error Message
```
ERROR: cannot drop index users_username_key because constraint users_username_key on table users requires it
HINT: You can drop constraint users_username_key on table users instead.
```

### What This Means
This error occurs when:
- Your database has an old schema with a `username` field
- The current Prisma schema only uses `email` for user identification
- There's a conflict between old and new database constraints

### 🎯 Quick Solutions (In Order of Preference)

## 1. 🚀 Automated Quick Fix (Recommended)
```bash
node scripts/setup-alternative.js
# Choose option 1: Quick Constraint Fix
```

## 2. 🔄 Full Reset (Nuclear Option)
```bash
# Reset everything (Docker + Database)
node scripts/reset-docker.js
node scripts/reset-database.js
```

## 3. 💾 Database Only Reset
```bash
# Keep Docker running, reset only database
node scripts/reset-database.js
```

---

## 📋 Manual Solutions

### Option A: Direct Constraint Removal
```bash
# 1. Connect to database
docker-compose exec postgres psql -U postgres -d openenglishttutor

# 2. Remove conflicting constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
DROP INDEX IF EXISTS users_username_key;
ALTER TABLE users DROP COLUMN IF EXISTS username;

# 3. Exit and run migrations
\q
cd packages/api
npx prisma migrate deploy
npx prisma generate
```

### Option B: Fresh Database
```bash
# 1. Create new database with timestamp
docker-compose exec postgres createdb -U postgres openenglishttutor_$(date +%s)

# 2. Update .env file with new database name
# DATABASE_URL="postgresql://postgres:password@localhost:5432/openenglishttutor_TIMESTAMP"

# 3. Run migrations
cd packages/api
npx prisma migrate deploy
npx prisma generate
```

---

## 🔧 Step-by-Step Troubleshooting

### Step 1: Identify the Problem
```bash
# Check current database schema
docker-compose exec postgres psql -U postgres -d openenglishttutor -c "\d users"

# Look for:
# - users_username_key constraint
# - username column
# - Conflicting indexes
```

### Step 2: Check Docker Status
```bash
# Verify containers are running
docker-compose ps

# Check logs for errors
docker-compose logs postgres
docker-compose logs redis
```

### Step 3: Verify Environment
```bash
# Check if .env exists
ls packages/api/.env

# Verify DATABASE_URL format
cat packages/api/.env | grep DATABASE_URL
```

### Step 4: Test Connection
```bash
# Test database connection
docker-compose exec postgres pg_isready -U postgres

# Test application connection
cd packages/api
npx prisma db pull
```

---

## 🛠️ Advanced Troubleshooting

### Problem: Docker Containers Won't Start
```bash
# Check port conflicts
netstat -an | findstr :5432  # PostgreSQL
netstat -an | findstr :6379  # Redis
netstat -an | findstr :8080  # Adminer

# Kill conflicting processes
# Windows: taskkill /F /PID <PID>
# Linux/Mac: kill -9 <PID>

# Clean Docker resources
docker system prune -a -f
docker volume prune -f
```

### Problem: Migration Fails
```bash
# Reset migration state
cd packages/api
npx prisma migrate reset --force

# Or manually reset migrations
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

### Problem: Prisma Client Issues
```bash
# Regenerate Prisma client
cd packages/api
rm -rf node_modules/.prisma
npx prisma generate

# Clear npm cache if needed
npm cache clean --force
```

---

## 📊 Diagnostic Commands

### Database Diagnostics
```bash
# List all databases
docker-compose exec postgres psql -U postgres -l

# Check table structure
docker-compose exec postgres psql -U postgres -d openenglishttutor -c "\dt"

# Check constraints
docker-compose exec postgres psql -U postgres -d openenglishttutor -c "
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;
"

# Check indexes
docker-compose exec postgres psql -U postgres -d openenglishttutor -c "
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';
"
```

### Application Diagnostics
```bash
# Check Prisma status
cd packages/api
npx prisma migrate status
npx prisma db pull --print

# Test database connection
npx prisma studio --port 5555
```

---

## 🚨 Emergency Recovery

### Complete Project Reset
```bash
# 1. Stop everything
docker-compose down -v --remove-orphans

# 2. Clean Docker
docker system prune -a -f
docker volume prune -f

# 3. Remove node_modules
rm -rf node_modules packages/*/node_modules

# 4. Fresh install
npm install

# 5. Start fresh
docker-compose up -d
node scripts/reset-database.js
```

### Backup Before Reset
```bash
# Backup current database
docker-compose exec postgres pg_dump -U postgres openenglishttutor > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup (if needed)
docker-compose exec -T postgres psql -U postgres openenglishttutor < backup_file.sql
```

---

## 🔍 Prevention Tips

### 1. Always Use Scripts
- Use provided scripts instead of manual commands
- Scripts handle edge cases and provide better error messages

### 2. Environment Consistency
```bash
# Always check .env before starting
cat packages/api/.env

# Ensure Docker is running
docker --version
docker-compose --version
```

### 3. Clean Development Workflow
```bash
# Daily development routine
docker-compose down
docker-compose up -d
npm run dev
```

### 4. Regular Maintenance
```bash
# Weekly cleanup
docker system prune -f
npm cache clean --force

# Monthly full reset
node scripts/reset-docker.js
node scripts/reset-database.js
```

---

## 📞 Getting Help

### Check These First
1. **Docker Status**: `docker-compose ps`
2. **Database Connection**: `docker-compose exec postgres pg_isready -U postgres`
3. **Environment File**: `cat packages/api/.env`
4. **Recent Logs**: `docker-compose logs --tail=50`

### Common Solutions Summary
| Problem | Quick Fix | Full Solution |
|---------|-----------|---------------|
| Constraint conflict | `node scripts/setup-alternative.js` (option 1) | Manual constraint removal |
| Docker issues | `docker-compose restart` | `node scripts/reset-docker.js` |
| Migration errors | `npx prisma migrate reset --force` | `node scripts/reset-database.js` |
| Connection refused | Check Docker containers | Restart Docker service |
| Port conflicts | Kill conflicting processes | Use different ports |

### Script Reference
- **Quick Fix**: `node scripts/setup-alternative.js`
- **Database Reset**: `node scripts/reset-database.js`
- **Docker Reset**: `node scripts/reset-docker.js`
- **Help**: Add `--help` to any script

---

## 🎯 Success Indicators

After successful setup, you should see:
```bash
# Docker containers running
docker-compose ps
# All services should show "Up" status

# Database accessible
docker-compose exec postgres pg_isready -U postgres
# Should return "accepting connections"

# Prisma working
cd packages/api && npx prisma migrate status
# Should show "Database is up to date"

# Application starting
npm run dev
# Should start without database errors
```

---

*Last updated: $(date)*
*For more help, check the main README.md or create an issue.*