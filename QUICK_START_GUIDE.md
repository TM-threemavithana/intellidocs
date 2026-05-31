# IntelliDocs Quick Start Guide

**Last Updated**: May 31, 2026  
**Status**: ✅ All Systems Operational

---

## 🚀 Starting the Application

### 1. Start All Docker Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (ports 9000, 9001)
- Ollama (port 11434)
- Backend API (port 3000)

### 2. Start Frontend (if not using Docker)
```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3001

---

## 🔍 Checking System Status

### Check All Containers
```bash
docker ps
```

Expected output:
```
✅ intellidocs-backend   - Up (port 3000)
✅ intellidocs-postgres  - Up (healthy) (port 5432)
✅ intellidocs-redis     - Up (healthy) (port 6379)
✅ intellidocs-minio     - Up (healthy) (ports 9000-9001)
✅ intellidocs-ollama    - Up (port 11434)
```

### Check Backend Logs
```bash
docker logs intellidocs-backend --tail 50
```

Look for:
```
✅ Connected to PostgreSQL database
✅ Created MinIO bucket: intellidocs-documents
Backend listening on http://localhost:3000
```

### Check Frontend Status
Frontend should show:
```
✓ Ready in 3.1s
- Local: http://localhost:3001
```

---

## 🧪 Testing the System

### 1. Test Backend API
```bash
# Should return 404 (expected - no root route)
curl http://localhost:3000

# Should return "Document not found" (database working)
curl http://localhost:3000/documents/test-id
```

### 2. Access Frontend
Open browser: http://localhost:3001

You should see:
- IntelliDocs dashboard
- Document upload area
- Job status monitor
- OCR results display

### 3. Upload a Test Document
1. Go to http://localhost:3001
2. Drag & drop a PDF file or click to browse
3. Click "Upload Document"
4. Monitor job status in real-time
5. View OCR results when complete

---

## 🛠️ Common Commands

### Docker Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart backend only
docker-compose restart backend

# Rebuild backend after code changes
docker-compose build backend
docker-compose up -d backend

# View logs
docker logs intellidocs-backend -f
docker logs intellidocs-postgres -f
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it intellidocs-postgres psql -U intellidocs -d intellidocs_db

# Run Prisma migrations
docker exec -it intellidocs-backend npx prisma migrate dev

# View database schema
docker exec -it intellidocs-backend npx prisma studio
```

### Redis Management
```bash
# Access Redis CLI
docker exec -it intellidocs-redis redis-cli

# View queued jobs
docker exec -it intellidocs-redis redis-cli KEYS "bull:ocr:*"

# Monitor Redis in real-time
docker exec -it intellidocs-redis redis-cli MONITOR
```

### MinIO Management
```bash
# Access MinIO Console
# Open browser: http://localhost:9001
# Username: minioadmin
# Password: minioadmin_password

# List buckets
docker exec -it intellidocs-minio mc ls minio/

# List files in bucket
docker exec -it intellidocs-minio mc ls minio/intellidocs-documents/
```

---

## 🔧 Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker logs intellidocs-backend

# Rebuild container
docker-compose build --no-cache backend
docker-compose up -d backend

# Check database connection
docker exec -it intellidocs-backend npx prisma db pull
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection from backend container
docker exec -it intellidocs-backend npx prisma db pull

# Check PostgreSQL logs
docker logs intellidocs-postgres
```

### Frontend Not Loading
```bash
# Check if frontend is running
# Should see process on port 3001

# Restart frontend
cd frontend
npm run dev

# Check for errors
# Look for TypeScript or build errors in terminal
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it intellidocs-redis redis-cli PING
# Should return: PONG

# Check Redis logs
docker logs intellidocs-redis
```

---

## 📊 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | - |
| Backend API | http://localhost:3000 | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin_password |
| PostgreSQL | localhost:5432 | intellidocs / intellidocs_dev_password |
| Redis | localhost:6379 | - |
| Ollama | http://localhost:11434 | - |

---

## 🗄️ Database Schema

### Key Tables
- **User** - User accounts
- **Document** - Uploaded PDF documents
- **OCRResult** - OCR extraction results per page
- **Embedding** - Text chunks and vector IDs
- **Chat** - Conversation history
- **DetectionResult** - AI content detection

### Useful Queries
```sql
-- View all documents
SELECT id, fileName, pageCount, ocrApplied, createdAt FROM "Document";

-- View OCR results
SELECT d.fileName, o.pageNumber, o.language, o.cerScore, o.werScore 
FROM "OCRResult" o 
JOIN "Document" d ON o.documentId = d.id;

-- Check job queue status
-- (Use Redis CLI for this)
```

---

## 🎯 Development Workflow

### Making Backend Changes
1. Edit files in `backend/src/`
2. Changes auto-reload (watch mode enabled)
3. Check logs: `docker logs intellidocs-backend -f`
4. If schema changes: `docker exec -it intellidocs-backend npx prisma migrate dev`

### Making Frontend Changes
1. Edit files in `frontend/src/`
2. Changes auto-reload (Next.js hot reload)
3. Check browser console for errors
4. Refresh browser if needed

### Adding New Dependencies
```bash
# Backend
docker exec -it intellidocs-backend npm install <package>
docker-compose restart backend

# Frontend
cd frontend
npm install <package>
# Frontend auto-reloads
```

---

## 🧹 Cleanup

### Remove All Containers and Volumes
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker rmi intellidocs-backend
```

### Fresh Start
```bash
# Complete cleanup
docker-compose down -v
docker rmi intellidocs-backend

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d

# Restart frontend
cd frontend
npm run dev
```

---

## 📝 Environment Variables

### Backend (.env or docker-compose.yml)
```env
DATABASE_URL=postgresql://intellidocs@postgres:5432/intellidocs_db
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_password
OLLAMA_BASE_URL=http://ollama:11434
PORT=3000
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🎓 Tips & Best Practices

1. **Always check logs first** when something doesn't work
2. **Use Docker Compose** for managing all services
3. **Keep frontend and backend running** during development
4. **Monitor Redis** to see job queue activity
5. **Use MinIO Console** to verify file uploads
6. **Check database** to verify data persistence
7. **Restart services** if behavior seems inconsistent

---

## 🆘 Getting Help

### Check Documentation
- `README.md` - Project overview
- `WEEK2-3_PROGRESS.md` - Implementation progress
- `WEEK2-3_DAY5_FINAL_SUMMARY.md` - Containerization details
- `backend/README.md` - Backend-specific docs
- `frontend/README.md` - Frontend-specific docs

### Common Issues
1. **Port already in use**: Stop conflicting services
2. **Database connection failed**: Check PostgreSQL is healthy
3. **Redis connection failed**: Check Redis is running
4. **File upload fails**: Check MinIO is running
5. **OCR not processing**: Check Redis queue and backend logs

---

**Happy Coding! 🚀**
