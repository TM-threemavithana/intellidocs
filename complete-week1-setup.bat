@echo off
echo ========================================
echo IntelliDocs Week 1 - Final Setup Steps
echo ========================================
echo.

echo Step 1: Checking Docker services...
docker-compose ps
echo.

echo Step 2: Setting up Prisma database...
cd backend
call npm run prisma:generate
call npm run prisma:migrate
echo.

echo Step 3: Downloading Ollama llama2 model (this may take 5-10 minutes)...
docker exec intellidocs-ollama ollama pull llama2
echo.

echo Step 4: Verifying services...
echo Testing PostgreSQL...
docker exec intellidocs-postgres psql -U intellidocs -d intellidocs_db -c "SELECT 1"
echo.

echo Testing Redis...
docker exec intellidocs-redis redis-cli PING
echo.

echo Testing MinIO...
curl http://localhost:9000/minio/health/live
echo.

echo Testing Ollama...
curl http://localhost:11434/api/tags
echo.

echo ========================================
echo Week 1 Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& npm run start:dev
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo 3. Begin Week 2-3: OCR Pipeline implementation
echo.
pause
