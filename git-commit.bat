@echo off
echo ========================================
echo Git Commit Script for Week 2-3 Changes
echo ========================================
echo.

REM Stage all modified files
echo Staging modified files...
git add backend/package.json
git add backend/prisma/schema.prisma
git add backend/src/app.module.ts
git add backend/src/ocr/ocr.module.ts
git add backend/src/ocr/tesseract.service.ts
git add docker-compose.yml
git add frontend/package.json

REM Stage new backend files
echo Staging new backend files...
git add backend/Dockerfile
git add backend/.dockerignore
git add backend/init-schema.sql
git add backend/eng.traineddata
git add backend/sample-ocr.png
git add backend/scripts/
git add backend/src/database/
git add backend/src/documents/
git add backend/src/ocr/ocr.processor.ts
git add backend/src/ocr/ocr.service.ts
git add backend/src/storage/

REM Stage new frontend files
echo Staging new frontend files...
git add frontend/next-env.d.ts
git add frontend/next.config.js
git add frontend/postcss.config.js
git add frontend/tailwind.config.ts
git add frontend/tsconfig.json
git add frontend/src/

REM Stage documentation
echo Staging documentation...
git add CURRENT_STATUS.md
git add QUICK_START_GUIDE.md
git add README.md

REM Stage deleted files
echo Staging deleted files...
git add -u

REM Show status
echo.
echo ========================================
echo Current Git Status:
echo ========================================
git status

echo.
echo ========================================
echo Ready to commit!
echo ========================================
echo.
echo To commit, run:
echo git commit -F COMMIT_MESSAGE.txt
echo.
echo To push, run:
echo git push origin main
echo.
pause
