# 🚨 Quick Database Fix Guide

## Database Constraint Error?

```
ERROR: cannot drop index users_username_key because constraint users_username_key on table users requires it
```

### ⚡ Instant Fix (30 seconds)
```bash
npm run troubleshoot
# Choose option 1: Quick Constraint Fix
```

### 🔄 Full Reset (2 minutes)
```bash
npm run docker:reset
npm run db:reset
```

### 💾 Database Only Reset (1 minute)
```bash
npm run db:reset
```

---

## Other Common Issues

| Problem | Quick Command | Time |
|---------|---------------|------|
| Docker won't start | `npm run docker:reset` | 2 min |
| Migration fails | `npm run db:reset` | 1 min |
| Port conflicts | `docker-compose down && docker-compose up -d` | 30 sec |
| Connection refused | `docker-compose restart postgres` | 30 sec |

---

## Emergency Reset (Nuclear Option)
```bash
# This will delete EVERYTHING and start fresh
npm run docker:reset
npm run db:reset
npm run setup
```

---

## Need More Help?
- **Detailed Guide**: [docs/DATABASE_TROUBLESHOOTING.md](./docs/DATABASE_TROUBLESHOOTING.md)
- **Interactive Help**: `npm run troubleshoot`
- **Script Help**: Add `--help` to any script

---

*Keep this file handy for quick reference!*