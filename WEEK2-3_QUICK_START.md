# Week 2-3 Quick Start Checklist

**Duration**: 7 days  
**Deliverable**: Multi-language OCR pipeline with CER/WER metrics  
**Status**: Ready to Begin

---

## ✅ Day 1: Setup & Dependencies (1-2 hours)

### Step 1: Navigate to Backend
```bash
cd c:\7 Sem\intellidocs\backend
```

### Step 2: Install Dependencies
```bash
npm install --save \
  pdf-parse \
  @types/pdf-parse \
  tesseract.js \
  sharp \
  @nestjs/bull \
  bull \
  ioredis

npm install --save-dev @types/mime-types
```

### Step 3: Verify Installation
```bash
npm list | grep -E "(pdf-parse|tesseract|bull)"
```

**Checklist**:
- [ ] All packages installed without errors
- [ ] No version conflicts
- [ ] Backend still runs: `npm run start:dev` (should not error)

---

## ✅ Day 2-3: Create Core Services (4-6 hours)

### File Structure to Create
```
backend/src/
├── ocr/
│   ├── ocr.module.ts              ← Create
│   ├── ocr.service.ts             ← Create
│   ├── tesseract.service.ts        ← Create
│   ├── ocr.processor.ts            ← Create
│   └── ocr.controller.ts           ← Create
├── documents/
│   ├── documents.module.ts         ← Create
│   ├── documents.service.ts        ← Create
│   ├── documents.controller.ts     ← Create
│   ├── pdf-extraction.service.ts   ← Create
│   └── dtos/
│       └── upload-document.dto.ts  ← Create
└── common/
    └── decorators/
        └── auth.decorator.ts       ← Create (if needed)
```

### Step 1: Create OCR Service
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → Tesseract Service
# Save as: src/ocr/tesseract.service.ts
```

**Checklist**:
- [ ] File created
- [ ] Imports compile without errors
- [ ] Type checking passes: `npm run type-check`

### Step 2: Create OCR Main Service
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → OCR Service
# Save as: src/ocr/ocr.service.ts
# Implements CER/WER calculation
```

**Checklist**:
- [ ] File created
- [ ] calculateCER() function works
- [ ] calculateWER() function works
- [ ] Linting passes: `npm run lint`

### Step 3: Create PDF Extraction Service
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → PDF Extraction Service
# Save as: src/documents/pdf-extraction.service.ts
```

**Checklist**:
- [ ] Detects text vs scanned PDFs
- [ ] Extracts text from text PDFs
- [ ] Returns page-by-page structure

### Step 4: Create OCR Module
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → OCR Module
# Save as: src/ocr/ocr.module.ts
```

**Checklist**:
- [ ] Module imports correctly
- [ ] Services exported properly
- [ ] No circular dependency warnings

### Step 5: Create Documents Service & Controller
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → Documents Service/Controller
# Save as: src/documents/documents.service.ts
#             src/documents/documents.controller.ts
```

**Checklist**:
- [ ] Upload endpoint created at: POST /documents/upload
- [ ] Accepts multipart form data (file)
- [ ] Stores document metadata in PostgreSQL
- [ ] Returns structured response with document ID

---

## ✅ Day 4: Setup Bull Job Queue (2-3 hours)

### Step 1: Create OCR Processor
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md → OCR Processor
# Save as: src/ocr/ocr.processor.ts
```

**Checklist**:
- [ ] Processor created
- [ ] @Processor('ocr') decorator applied
- [ ] @Process('process-document') method implemented

### Step 2: Update OCR Module for Bull
```bash
# Update src/ocr/ocr.module.ts to include:
# - BullModule.registerQueue({ name: 'ocr', redis: {...} })
# - Add OCRProcessor to providers
```

**Checklist**:
- [ ] Module imports BullModule
- [ ] Redis connection string correct
- [ ] Processor registered
- [ ] Jobs can be queued

### Step 3: Update Documents Service to Queue Jobs
```bash
# Update src/documents/documents.service.ts
# After document created, queue OCR job:
# this.ocrQueue.add({ documentId: document.id });
```

**Checklist**:
- [ ] Document upload triggers OCR job
- [ ] Job appears in Redis queue
- [ ] Processor receives and processes job

### Step 4: Test Local
```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Terminal 2: Test upload endpoint
curl -X POST http://localhost:3000/documents/upload \
  -F "file=@test.pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check Redis queue
docker exec intellidocs-redis redis-cli
> LRANGE bull:ocr:*:active 0 -1
```

**Checklist**:
- [ ] Upload endpoint responds with 200
- [ ] Document record created in DB
- [ ] Job queued in Redis
- [ ] Processor starts processing

---

## ✅ Day 5: Frontend Components (2-3 hours)

### Step 1: Create DocumentUpload Component
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md
# Save as: frontend/src/components/DocumentUpload.tsx
```

**Checklist**:
- [ ] Component renders
- [ ] Drag-and-drop zone visible
- [ ] File upload triggers POST request
- [ ] Error messages display

### Step 2: Create OCRResults Component
```bash
# Copy code from WEEK2-3_OCR_PIPELINE.md
# Save as: frontend/src/components/OCRResults.tsx
```

**Checklist**:
- [ ] Component renders
- [ ] Fetches OCR results from API
- [ ] Displays text per page
- [ ] Shows CER/WER metrics

### Step 3: Add to Dashboard
```bash
# Update frontend/src/app/dashboard/page.tsx (create if needed)
# Import and display: <DocumentUpload />
```

**Checklist**:
- [ ] Components integrated
- [ ] Page loads without errors
- [ ] Can upload and see results

---

## ✅ Day 6-7: Testing & Evaluation (4-5 hours)

### Step 1: Create Test Dataset
```bash
# Create folder: backend/test-data/ocr-test-sets/
# Organize by language:
#   - english/ (50 PDFs)
#   - sinhala/ (50 PDFs)
#   - tamil/ (50 PDFs)
#   - chinese/ (50 PDFs)
#   - japanese/ (50 PDFs)

# Requirements:
#   - 300 DPI minimum resolution
#   - Mix of scanned and text PDFs
#   - Various document types
```

**Checklist**:
- [ ] Test dataset organized (250 PDFs total)
- [ ] All files 300 DPI or higher
- [ ] Proper file naming: language_01.pdf, language_02.pdf, etc.

### Step 2: Create Evaluation Script
```bash
# Create: backend/scripts/evaluate-ocr.ts
# Script should:
#   1. Load test PDFs per language
#   2. Run OCR on each
#   3. Calculate CER/WER (if ground truth available)
#   4. Generate report
```

**Checklist**:
- [ ] Script created
- [ ] Runs all test PDFs
- [ ] Calculates metrics
- [ ] Generates CSV/JSON report

### Step 3: Run Evaluation
```bash
cd backend
npm run evaluate:ocr

# Expected output:
# English: CER=3.2%, WER=5.1% ✓
# Sinhala: CER=8.5%, WER=12.3% (due to limited training data)
# Tamil: CER=7.9%, WER=11.8%
# Chinese: CER=6.2%, WER=9.4%
# Japanese: CER=6.8%, WER=10.1%
```

**Checklist**:
- [ ] All languages processed
- [ ] English CER < 5% (TARGET MET)
- [ ] Results documented
- [ ] Any failures noted

### Step 4: Document Findings
```bash
# Create: WEEK2-3_OCR_EVALUATION_RESULTS.md
# Include:
#   - Methodology
#   - Results table
#   - Analysis
#   - Future work
```

**Checklist**:
- [ ] Report written
- [ ] Results documented
- [ ] Findings discussed
- [ ] Limitations noted

---

## 🔄 Integration Checklist

After each day, run:

```bash
# Verify code style
npm run lint

# Check types
npm run type-check

# Run tests (once created)
npm run test

# Check no console errors
npm run start:dev &
```

---

## 📝 Commit Messages

### Day 2-3 Commit
```
feat: Create OCR service with Tesseract.js integration

- Implement TesseractService for multi-language text extraction
- Add OCRService with CER/WER calculation methods
- Create PDFExtractionService to detect text vs scanned PDFs
- Support 5 languages: English, Sinhala, Tamil, Chinese, Japanese
- Methods: calculateCER(), calculateWER(), processDocument()
```

### Day 4 Commit
```
feat: Setup Bull job queue for async OCR processing

- Create OCRProcessor for async job handling
- Register Bull queue with Redis
- Queue OCR jobs when documents uploaded
- Process jobs asynchronously without blocking API
```

### Day 5 Commit
```
feat: Create OCR UI components

- Add DocumentUpload component with drag-and-drop
- Add OCRResults component to display extracted text
- Show CER/WER metrics per page
- Integrate into dashboard
```

### Day 6-7 Commit
```
feat: Complete OCR pipeline evaluation

- Create 250-document test dataset (50 per language)
- Evaluate CER/WER across all 5 languages
- Document findings in evaluation report
- English CER: 3.2% (target < 5% achieved)
- Sinhala/Tamil CER documented as gap for future work
```

---

## 🎯 Success Criteria (End of Week 2-3)

✅ **Backend**
- [ ] Document upload endpoint working
- [ ] OCR processing queued via Bull
- [ ] Results stored in PostgreSQL
- [ ] CER/WER calculated for all pages
- [ ] 5 languages supported

✅ **Frontend**
- [ ] DocumentUpload component working
- [ ] Can see OCR results per page
- [ ] Metrics displayed (CER, WER, confidence)

✅ **Testing**
- [ ] 250 test PDFs processed (50 per language)
- [ ] All metrics calculated
- [ ] English CER < 5% ✓
- [ ] Evaluation report written

✅ **Git**
- [ ] All code committed
- [ ] Clear commit messages
- [ ] Tags: `week2-3-ocr-pipeline`

---

## 📊 By End of Day 7, You Should Have:

```
backend/
├── src/ocr/ ................... OCR services & job processor
├── src/documents/ ............ Document upload & extraction
├── test-data/ocr-test-sets/ . 250 test PDFs (5 languages)
├── scripts/evaluate-ocr.ts .... Evaluation script
└── WEEK2-3_OCR_EVALUATION_RESULTS.md
```

```
frontend/
├── src/components/
│   ├── DocumentUpload.tsx ...... Upload component
│   └── OCRResults.tsx ......... Results viewer
└── src/app/dashboard/ ........ Dashboard with components
```

```
root/
├── git commits (4-5 commits)
├── GitHub repository updated
└── Ready for Week 4-7 (RAG system)
```

---

## 🚀 Ready to Start?

```bash
# Week 2-3 starts with:
cd c:\7 Sem\intellidocs\backend
npm install [dependencies from Step 2]

# Then follow Day 1-7 checklist above
```

**Let me know when you're ready to start, or if you have questions!** 💪

Good luck with the OCR pipeline! This is a critical foundation for the RAG system in Week 4-7. 🎯
