# Week 2-3: OCR Pipeline Implementation

**Status**: Ready to Begin  
**Duration**: 2 weeks (Week 2-3)  
**Tier**: Tier 1-A (Core Academic Contribution)  
**Goal**: Multi-language OCR with CER/WER evaluation metrics

---

## 📊 Overview

### What You're Building

An **OCR (Optical Character Recognition) pipeline** that:
- ✅ Accepts PDF files (text + scanned images)
- ✅ Extracts text from 5 languages (English, Sinhala, Tamil, Chinese, Japanese)
- ✅ Calculates accuracy metrics (CER - Character Error Rate, WER - Word Error Rate)
- ✅ Returns structured results with page numbers and confidence scores

### Key Features

| Feature | Tech | Why |
|---------|------|-----|
| **Text Extraction** | pdfplumber | Fast extraction from text PDFs |
| **OCR for Images** | Tesseract.js | Open-source, multi-language |
| **Async Processing** | Bull + Redis | Non-blocking, scalable |
| **Evaluation** | Custom formula | CER/WER calculated per page/language |
| **Storage** | PostgreSQL | Metrics persistence |

### Evaluation Targets

- **CER** (Character Error Rate): < 5% for English
- **WER** (Word Error Rate): < 8% for English
- **Speed**: < 3 seconds per page
- **Languages**: English (primary), Sinhala, Tamil, Chinese, Japanese (breadth)

---

## 🏗️ Architecture Design

### Data Flow

```
[User Upload PDF]
       ↓
[Document Validation]
       ↓
[Detect: Text PDF or Scanned Image?]
       ├─→ Text PDF: Use pdfplumber
       └─→ Scanned: Queue Tesseract.js job
       ↓
[Bull Job Queue]
       ↓
[Tesseract.js OCR Processing]
       ├─ Perform OCR for each page
       ├─ Get per-block confidence
       └─ Extract language confidence
       ↓
[Text Extraction Results]
       ├─ Raw text per page
       ├─ Detected language
       └─ Confidence scores
       ↓
[Store Results]
       ├─ Save to OCRResult table
       └─ Update Document.ocrApplied = true
       ↓
[Calculate Metrics] (if test set)
       ├─ CER: (Subs + Del + Ins) / Total Chars
       ├─ WER: (Subs + Del + Ins) / Total Words
       └─ Store language-specific scores
       ↓
[Return to Frontend]
       └─ Display extracted text + metrics
```

### Database Schema (Already defined)

```prisma
model OCRResult {
  id                 String    @id @default(cuid())
  documentId         String
  pageNumber         Int       // Which page (1-indexed)
  rawText            String    @db.Text
  language           String    // "en", "si", "ta", "zh", "ja"
  cerScore           Float?    // 0-1 (null if not evaluated)
  werScore           Float?    // 0-1 (null if not evaluated)
  tesseractConfidence Float?    // 0-100 (Tesseract's own confidence)
  createdAt          DateTime  @default(now())
  document           Document  @relation(fields: [documentId], references: [id])
}
```

---

## 📝 Implementation Checklist

### Phase 1: Backend Setup (Days 1-3)

#### [ ] Create NestJS Project Structure
```bash
cd backend

# Create the following folder structure:
mkdir -p src/ocr
mkdir -p src/documents
mkdir -p src/common/decorators
mkdir -p src/common/guards
mkdir -p src/common/filters
```

#### [ ] Install Additional Dependencies
```bash
npm install --save \
  pdfplumber \
  pdf-parse \
  @types/pdf-parse \
  tesseract.js \
  sharp \
  file-type \
  mime-types

npm install --save-dev @types/mime-types
```

**Note**: `pdfplumber` is Python-based. For Node.js, use alternatives:
- `pdf-parse` for text extraction
- `pdfjs-dist` for advanced parsing
- See implementation notes below

#### [ ] Create Tesseract.js Service

**File**: `src/ocr/tesseract.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';

@Injectable()
export class TesseractService {
  private readonly logger = new Logger('TesseractService');

  async extractTextFromImage(
    imagePath: string,
    language: string = 'eng'
  ): Promise<{
    text: string;
    confidence: number;
    detectedLanguage: string;
  }> {
    try {
      this.logger.log(`Starting OCR for image: ${imagePath}, language: ${language}`);

      const result = await Tesseract.recognize(imagePath, language, {
        logger: (m) => this.logger.debug(m),
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        detectedLanguage: language,
      };
    } catch (error) {
      this.logger.error(`OCR failed for ${imagePath}:`, error);
      throw error;
    }
  }

  /**
   * Supported languages:
   * - eng: English
   * - sin: Sinhala
   * - tam: Tamil
   * - chi_sim: Chinese (Simplified)
   * - jpn: Japanese
   */
  async supportsLanguage(lang: string): Promise<boolean> {
    const supported = ['eng', 'sin', 'tam', 'chi_sim', 'jpn'];
    return supported.includes(lang);
  }
}
```

#### [ ] Create PDF Extraction Service

**File**: `src/documents/pdf-extraction.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PDFExtractionService {
  private readonly logger = new Logger('PDFExtractionService');

  async detectPDFType(filePath: string): Promise<'text' | 'scanned'> {
    /**
     * Heuristic: 
     * - Text PDFs have extractable text via pdf-parse
     * - Scanned PDFs have minimal text, need OCR
     * 
     * Implementation: Use pdf-parse to try extraction
     * If text length < 100 chars per page, mark as 'scanned'
     */
    try {
      const pdfParser = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParser(dataBuffer);

      // Calculate average text per page
      const totalChars = data.text.length;
      const avgCharsPerPage = totalChars / data.numpages;

      this.logger.log(
        `PDF analysis: ${data.numpages} pages, avg ${avgCharsPerPage.toFixed(0)} chars/page`
      );

      // If average < 100 chars per page, likely scanned
      return avgCharsPerPage < 100 ? 'scanned' : 'text';
    } catch (error) {
      this.logger.warn(`PDF type detection failed, assuming scanned:`, error);
      return 'scanned'; // Default to OCR
    }
  }

  async extractTextFromTextPDF(filePath: string): Promise<{
    pages: Array<{ pageNumber: number; text: string }>;
  }> {
    try {
      const pdfParser = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParser(dataBuffer);

      // Parse by page
      const pages = [];
      for (let i = 0; i < data.numpages; i++) {
        pages.push({
          pageNumber: i + 1,
          text: `Page ${i + 1} text...`, // Placeholder
        });
      }

      return { pages };
    } catch (error) {
      this.logger.error(`Text extraction failed:`, error);
      throw error;
    }
  }
}
```

#### [ ] Create OCR Module

**File**: `src/ocr/ocr.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TesseractService } from './tesseract.service';
import { OCRService } from './ocr.service';

@Module({
  providers: [TesseractService, OCRService],
  exports: [OCRService],
})
export class OCRModule {}
```

**File**: `src/ocr/ocr.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TesseractService } from './tesseract.service';

@Injectable()
export class OCRService {
  private readonly logger = new Logger('OCRService');

  constructor(
    private prisma: PrismaService,
    private tesseract: TesseractService,
  ) {}

  /**
   * Process OCR for a document
   */
  async processDocument(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) throw new Error(`Document ${documentId} not found`);

    this.logger.log(`Starting OCR for document: ${doc.fileName}`);

    // For each page, extract text
    // Save to OCRResult table
    // Update Document.ocrApplied = true
  }

  /**
   * Calculate CER (Character Error Rate)
   * CER = (Substitutions + Deletions + Insertions) / Total Characters
   */
  calculateCER(reference: string, hypothesis: string): number {
    const [subs, dels, ins] = this.calculateEditDistance(reference, hypothesis);
    const total = reference.length;
    return total === 0 ? 0 : (subs + dels + ins) / total;
  }

  /**
   * Calculate WER (Word Error Rate)
   * WER = (Substitutions + Deletions + Insertions) / Total Words
   */
  calculateWER(reference: string, hypothesis: string): number {
    const refWords = reference.split(/\s+/).filter(w => w.length > 0);
    const hypWords = hypothesis.split(/\s+/).filter(w => w.length > 0);

    const [subs, dels, ins] = this.calculateEditDistance(
      refWords.join(' '),
      hypWords.join(' ')
    );

    const total = refWords.length;
    return total === 0 ? 0 : (subs + dels + ins) / total;
  }

  /**
   * Calculate Levenshtein distance (substitutions, deletions, insertions)
   * Returns: [substitutions, deletions, insertions]
   */
  private calculateEditDistance(ref: string, hyp: string): [number, number, number] {
    // Simplified: return total edit distance
    // Full implementation uses Wagner-Fischer algorithm
    const matrix = Array(ref.length + 1)
      .fill(null)
      .map(() => Array(hyp.length + 1).fill(0));

    for (let i = 0; i <= ref.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= hyp.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= ref.length; i++) {
      for (let j = 1; j <= hyp.length; j++) {
        const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    // For simplicity, return total edits as [edits, 0, 0]
    return [matrix[ref.length][hyp.length], 0, 0];
  }
}
```

#### [ ] Create Document Upload Endpoint

**File**: `src/documents/documents.controller.ts`

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files allowed');
    }

    const userId = req.user.id; // From JWT

    const document = await this.documentsService.uploadDocument(
      userId,
      file.originalname,
      file.buffer,
      file.size,
    );

    return {
      id: document.id,
      fileName: document.fileName,
      fileSize: document.fileSize,
      status: 'uploaded',
      message: 'Document uploaded. OCR processing queued.',
    };
  }
}
```

**File**: `src/documents/documents.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MinioService } from '../storage/minio.service';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger('DocumentsService');

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async uploadDocument(
    userId: string,
    fileName: string,
    fileBuffer: Buffer,
    fileSize: number,
  ) {
    this.logger.log(`Uploading document: ${fileName} for user: ${userId}`);

    // 1. Parse PDF to get page count
    const pdfData = await pdfParse(fileBuffer);
    const pageCount = pdfData.numpages;

    // 2. Upload to MinIO
    const storagePath = `documents/${userId}/${Date.now()}-${fileName}`;
    await this.minio.uploadFile(storagePath, fileBuffer);

    // 3. Create document record in DB
    const document = await this.prisma.document.create({
      data: {
        userId,
        fileName,
        fileSize,
        pageCount,
        storageUrl: storagePath,
        ocrApplied: false,
      },
    });

    // 4. Queue OCR job (will implement with Bull)
    // await this.ocrQueue.add({ documentId: document.id });

    this.logger.log(`Document created: ${document.id}`);
    return document;
  }
}
```

### Phase 2: Job Queue Setup (Days 3-4)

#### [ ] Install Bull Processor

```bash
npm install --save @nestjs/bull
npm install --save bull
```

#### [ ] Create OCR Job Processor

**File**: `src/ocr/ocr.processor.ts`

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { OCRService } from './ocr.service';

@Processor('ocr')
export class OCRProcessor {
  constructor(private ocrService: OCRService) {}

  @Process('process-document')
  async handleOCRJob(job: Job<{ documentId: string }>) {
    console.log(`Processing OCR for document: ${job.data.documentId}`);
    
    try {
      await this.ocrService.processDocument(job.data.documentId);
      console.log(`✓ OCR completed for document: ${job.data.documentId}`);
      return { success: true };
    } catch (error) {
      console.error(`✗ OCR failed:`, error);
      throw error; // Bull will retry
    }
  }
}
```

#### [ ] Integrate Bull into OCR Module

**File**: `src/ocr/ocr.module.ts` (updated)

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TesseractService } from './tesseract.service';
import { OCRService } from './ocr.service';
import { OCRProcessor } from './ocr.processor';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  providers: [TesseractService, OCRService, OCRProcessor, PrismaService],
  exports: [OCRService],
})
export class OCRModule {}
```

### Phase 3: Frontend Implementation (Days 4-5)

#### [ ] Create Document Upload Component

**File**: `frontend/src/components/DocumentUpload.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export function DocumentUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          'http://localhost:3000/documents/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        setMessage(`✓ ${response.data.message}`);
      } catch (error) {
        setMessage(`✗ Upload failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600 font-semibold">Drop PDF here...</p>
        ) : (
          <div>
            <p className="text-lg font-semibold text-gray-700">
              Drag & drop PDF here
            </p>
            <p className="text-gray-500">or click to select file</p>
          </div>
        )}
      </div>

      {loading && <p className="mt-4 text-blue-600">Uploading...</p>}
      {message && <p className="mt-4 font-semibold">{message}</p>}
    </div>
  );
}
```

#### [ ] Create OCR Results Component

**File**: `frontend/src/components/OCRResults.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export function OCRResults({ documentId }: { documentId: string }) {
  const [ocrData, setOcrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOCRResults = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/documents/${documentId}/ocr`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setOcrData(response.data);
      } catch (error) {
        console.error('Failed to fetch OCR results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOCRResults();
  }, [documentId]);

  if (loading) return <p>Loading OCR results...</p>;
  if (!ocrData) return <p>No OCR data available</p>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">OCR Results</h2>

      <div className="space-y-6">
        {ocrData.pages.map((page) => (
          <div key={page.pageNumber} className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg">Page {page.pageNumber}</h3>
            <p className="text-sm text-gray-600 mb-2">
              Language: <span className="font-mono">{page.language}</span> | 
              Confidence: <span className="font-mono">{(page.confidence * 100).toFixed(1)}%</span>
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">{page.text}</p>

            {page.cerScore && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                CER: {(page.cerScore * 100).toFixed(2)}% | 
                WER: {(page.werScore * 100).toFixed(2)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 4: Testing & Evaluation (Days 5-7)

#### [ ] Create Test Dataset

Create 50 PDF documents per language:
- **English**: Academic papers, articles
- **Sinhala**: Books, news articles
- **Tamil**: Books, news articles
- **Chinese**: Books, articles
- **Japanese**: Books, articles

**Minimum Requirements**:
- 300 DPI resolution (scan quality)
- Variety: printed text, handwriting, poor quality

#### [ ] Run Evaluation

```bash
# Create test runner script
cd backend

# Evaluate CER/WER for each language
npm run test:ocr

# Expected output:
# English: CER=3.2%, WER=5.1% ✓
# Sinhala: CER=8.5%, WER=12.3%
# Tamil: CER=7.9%, WER=11.8%
# Chinese: CER=6.2%, WER=9.4%
# Japanese: CER=6.8%, WER=10.1%
```

#### [ ] Document Findings

Create a report: `Week2-3_OCR_EVALUATION.md`

```markdown
# OCR Pipeline Evaluation Report

## Methodology
- Test set: 50 PDFs per language
- Resolution: 300 DPI minimum
- Metric: CER and WER per language

## Results

| Language | CER (%) | WER (%) | Confidence | Status |
|----------|---------|---------|----------|--------|
| English | 3.2 | 5.1 | High | ✓ |
| Sinhala | 8.5 | 12.3 | Medium | ✓ |
| Tamil | 7.9 | 11.8 | Medium | ✓ |
| Chinese | 6.2 | 9.4 | High | ✓ |
| Japanese | 6.8 | 10.1 | High | ✓ |

## Analysis
- English achieves target CER < 5%
- Sinhala/Tamil higher due to limited Tesseract training data
- This is a documented research gap, not a failure

## Future Work
- Fine-tune custom Tesseract models for Sinhala/Tamil
- Higher resolution scans for improved accuracy
```

---

## 🚀 Getting Started

### Prerequisites
```bash
# Ensure you have Week 1 setup complete
docker-compose ps  # All services should be "Up"

# Navigate to backend
cd backend
```

### Day 1: Install Dependencies
```bash
npm install --save \
  pdfplumber \
  pdf-parse \
  tesseract.js \
  sharp \
  @nestjs/bull

npm install --save-dev @types/pdf-parse
```

### Day 2: Create Tesseract Service
- Create `src/ocr/tesseract.service.ts`
- Create `src/ocr/ocr.service.ts` with CER/WER calculation
- Create `src/ocr/ocr.module.ts`

### Day 3: Create Document Upload
- Create `src/documents/documents.service.ts`
- Create `src/documents/documents.controller.ts`
- Create `src/documents/pdf-extraction.service.ts`

### Day 4: Setup Job Queue
- Create `src/ocr/ocr.processor.ts`
- Integrate Bull into OCR module
- Setup Redis connection

### Day 5-7: Frontend + Testing
- Create React components
- Build test dataset
- Run evaluation
- Document results

---

## 📊 Success Criteria

✅ **Backend**
- [ ] Document upload endpoint works
- [ ] OCR processing queued via Bull
- [ ] Results stored in PostgreSQL
- [ ] CER/WER calculated for all 5 languages

✅ **Frontend**
- [ ] Drag-and-drop upload component
- [ ] OCR results display
- [ ] Shows extracted text per page
- [ ] Displays metrics (CER, WER, confidence)

✅ **Testing**
- [ ] 50 test documents per language
- [ ] CER/WER scores calculated
- [ ] Evaluation report written
- [ ] Results match targets or documented

✅ **Git**
- [ ] Code committed with message: `feat: Implement OCR pipeline with Tesseract.js and CER/WER metrics`

---

## 📚 Resources

- [Tesseract.js Docs](https://tesseract.projectnaptha.com/)
- [pdf-parse NPM](https://www.npmjs.com/package/pdf-parse)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)

---

## 🚨 Common Issues & Solutions

**Issue**: Tesseract.js downloads huge models  
**Solution**: Models auto-download on first use. Cache them: `tesseract.data.cacheMethod = 'imdb'`

**Issue**: Bull jobs not processing  
**Solution**: Check Redis is running: `docker-compose ps | grep redis` should show "Up"

**Issue**: PDF parsing fails  
**Solution**: Validate file before upload. Check PDF is valid: `pdfinfo file.pdf`

**Issue**: OCR too slow  
**Solution**: Process pages in parallel using Promise.all()

---

## 🎯 Next: Week 4-7 RAG System

Once Week 2-3 is complete:
- OCR pipeline working ✓
- Multi-language evaluation done ✓
- Ready for Week 4-7: RAG system (single-document chat)

---

**Good luck!** This is the foundation for everything that comes next. 🚀
