# IntelliDocs AI - Week 1 Implementation Checklist

**Goal**: Complete Week 1 "Environment Setup" so all services are running locally by end of week.

## ✅ Phase 1: Infrastructure Setup (Days 1-2)

### Docker & Services
- [ ] **Install Docker Desktop** (Windows)
  - Download from: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version` && `docker-compose --version`

- [ ] **Verify docker-compose.yml**
  - Location: `c:\7 Sem\intellidocs\docker-compose.yml`
  - Contains: PostgreSQL, Redis, MinIO, Ollama
  - Status: ✅ Created

- [ ] **Start services**
  ```bash
  cd c:\7 Sem\intellidocs
  docker-compose up -d
  ```
  - Check: `docker-compose ps` (all services should be "Up")

- [ ] **Verify each service**
  ```bash
  # PostgreSQL on port 5432
  docker exec -it intellidocs-postgres psql -U intellidocs -d intellidocs_db -c "SELECT 1"
  
  # Redis on port 6379
  docker exec -it intellidocs-redis redis-cli PING  # Should return "PONG"
  
  # MinIO on port 9000/9001
  curl http://localhost:9000/minio/health/live
  
  # Ollama on port 11434
  curl http://localhost:11434/api/tags
  ```

### Environment Setup
- [ ] **Copy .env template**
  ```bash
  cd c:\7 Sem\intellidocs
  cp .env.example .env
  ```

- [ ] **Review .env values**
  - Database credentials match docker-compose.yml ✅
  - Redis URL correct ✅
  - MinIO credentials ✅
  - Ollama base URL ✅

---

## ✅ Phase 2: Backend Initialization (Days 2-3)

### NestJS Setup
- [ ] **Navigate to backend**
  ```bash
  cd backend
  ```

- [ ] **Review package.json**
  - Status: ✅ Created
  - Contains all dependencies

- [ ] **Install dependencies**
  ```bash
  npm install
  # Expected: ~500 packages installed
  # Time: ~3-5 minutes
  ```

- [ ] **Verify Node version**
  ```bash
  node --version  # Should be 18+
  npm --version   # Should be 9+
  ```

### Prisma Setup
- [ ] **Review Prisma schema**
  - Location: `prisma/schema.prisma`
  - Status: ✅ Created
  - Tables: Users, Documents, Embeddings, Chats, OCRResults, etc.

- [ ] **Generate Prisma client**
  ```bash
  npm run prisma:generate
  # Creates: node_modules/.prisma/client
  ```

- [ ] **Create & run migrations**
  ```bash
  npm run prisma:migrate
  # Prompts for migration name: "init" or "initial_schema"
  # Creates all tables in PostgreSQL
  # Time: ~30 seconds
  ```

- [ ] **Verify database tables**
  ```bash
  npm run prisma:studio
  # Opens web GUI at http://localhost:5555
  # Verify tables exist: User, Document, Chat, etc.
  # Close when done (Ctrl+C)
  ```

### Backend Structure
- [ ] **Create folder structure**
  ```bash
  # Create empty folders for modules (detailed in backend/README.md)
  mkdir -p src/{auth,documents,ocr,rag,chat,storage,database,common}
  ```

- [ ] **Create basic NestJS files**
  - TBD: `src/main.ts` (app entry)
  - TBD: `src/app.module.ts` (root module)
  - Status: Will create in Week 2-3 when coding starts

### Database Seed (Optional but recommended)
- [ ] **Review seed script** (TBD in `prisma/seed.ts`)
- [ ] **Run seed** (when ready)
  ```bash
  npm run seed
  ```

---

## ✅ Phase 3: Frontend Initialization (Days 3-4)

### Next.js Setup
- [ ] **Navigate to frontend**
  ```bash
  cd ../frontend
  ```

- [ ] **Review package.json**
  - Status: ✅ Created
  - Contains Next.js 14, React 18, Tailwind, TypeScript

- [ ] **Install dependencies**
  ```bash
  npm install
  # Expected: ~800 packages installed
  # Time: ~5-7 minutes
  ```

### Next.js Configuration
- [ ] **Check TypeScript config**
  - File: `tsconfig.json` (auto-generated)
  - Status: Will be auto-created on first run

- [ ] **Check Tailwind config**
  - File: `tailwind.config.ts` (auto-generated)
  - Status: Will be auto-created on first run

- [ ] **Create basic App Router structure**
  ```bash
  mkdir -p src/app
  # TBD: Create page.tsx, layout.tsx
  ```

### Frontend Start
- [ ] **Start dev server**
  ```bash
  npm run dev
  # Should output: ▲ Next.js 14.0.4
  #                ✓ Ready in X.Xs
  #                ◇ Local: http://localhost:3001
  ```

- [ ] **Verify in browser**
  - Open: http://localhost:3001
  - Should see Next.js default page (or your custom page)

---

## ✅ Phase 4: Verification & Integration Testing (Days 4-5)

### API Server Health
- [ ] **Test Backend on startup**
  ```bash
  cd backend
  npm run start:dev
  # Should output: [NestFactory] Nest application successfully started
  # Listening on port 3000
  ```

- [ ] **Verify API is running**
  ```bash
  curl http://localhost:3000/health  # TBD: implement health endpoint
  ```

### Frontend-Backend Connection
- [ ] **Test API client setup**
  - Files TBD: `frontend/src/lib/api.ts`
  - Should be able to create axios client pointing to http://localhost:3000

- [ ] **Test GraphQL endpoint** (when implemented)
  ```bash
  curl http://localhost:3000/graphql
  ```

### Services Health Check
- [ ] **Verify all services still running**
  ```bash
  docker-compose ps
  # All should show "Up"
  ```

- [ ] **Test data persistence**
  ```bash
  # Create a test User in Prisma Studio
  npm run prisma:studio  # In backend folder
  # Add a user manually
  # Verify it persists after closing and reopening
  ```

### Ollama Model Download
- [ ] **Download Llama 2 model**
  ```bash
  docker exec intellidocs-ollama ollama pull llama2
  # Downloads ~4GB model
  # Time: ~5-10 minutes (depends on internet speed)
  # Note: First time only, model cached locally
  ```

- [ ] **Verify model is available**
  ```bash
  curl http://localhost:11434/api/tags
  # Should see: {"models": [{"name": "llama2:latest", ...}]}
  ```

---

## ✅ Phase 5: Documentation & Planning (Day 5)

### Documentation Review
- [ ] **Read project documentation**
  - Root README: `c:\7 Sem\intellidocs\README.md` ✅
  - Backend README: `backend/README.md` ✅
  - Frontend README: `frontend/README.md` ✅
  - Proposal document: Already studied ✅

### Git Setup (Optional but recommended)
- [ ] **Initialize Git repo**
  ```bash
  cd c:\7 Sem\intellidocs
  git init
  git add .
  git commit -m "Initial commit: Week 1 setup complete"
  ```

### Planning for Week 2-3
- [ ] **Review OCR module requirements** (from proposal Section 8, TIER 1-A)
  - Multi-language support
  - CER/WER metrics
  - Tesseract.js integration

- [ ] **Plan OCR architecture**
  - Document upload endpoint (NestJS)
  - OCR job queue (Bull + Redis)
  - Result storage (PostgreSQL)
  - Metrics calculation

---

## 🚨 Troubleshooting During Setup

### Docker won't start
```bash
# Try reset
docker system prune
docker-compose down -v
docker-compose up -d
```

### PostgreSQL connection fails
```bash
# Check logs
docker-compose logs postgres

# Verify credentials in .env match docker-compose.yml
# Restart container
docker-compose restart postgres
```

### Port already in use
```bash
# Find what's using ports
netstat -ano | findstr :5432    # PostgreSQL
netstat -ano | findstr :6379    # Redis
netstat -ano | findstr :9000    # MinIO
netstat -ano | findstr :11434   # Ollama

# Kill process or change port in docker-compose.yml
```

### npm install fails
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -r node_modules package-lock.json

# Reinstall
npm install
```

### Can't connect to database after migration
```bash
# Reset Prisma
npm run prisma:reset  # WARNING: Deletes all data

# Run migrations again
npm run prisma:migrate
```

---

## 📋 Summary

By end of Week 1, you should have:

✅ **Infrastructure**
- Docker Compose running (PostgreSQL, Redis, MinIO, Ollama)
- All services accessible on their ports
- Ollama with Llama 2 model downloaded

✅ **Database**
- PostgreSQL initialized with Prisma schema
- All 10 tables created
- Ready for data

✅ **Backend**
- NestJS dependencies installed
- Prisma client generated
- Folder structure ready for Week 2-3

✅ **Frontend**
- Next.js 14 dependencies installed
- TypeScript + Tailwind configured
- Basic app structure ready

✅ **Development Environment**
- All .env variables set
- All services verified healthy
- Ready to start coding Week 2

---

## 🎯 Next Week (Week 2-3: OCR Pipeline)

With infrastructure ready, Week 2-3 will focus on:
1. Create OCR service in NestJS
2. Implement Tesseract.js integration
3. Create Bull job queue for async processing
4. Create React component for document upload
5. Build OCR metrics calculation (CER/WER)
6. Create 5-language test dataset

---

## 📞 Support

If you get stuck:
1. Check docker logs: `docker-compose logs [service-name]`
2. Verify .env matches service configurations
3. Restart services: `docker-compose restart`
4. Review README files for debugging tips
5. Check that Node/npm versions are 18+

Good luck! 🚀
