# IntelliDocs AI - Implementation Guide

**Status**: Week 1 (Infrastructure Setup) - Ready to Begin  
**Last Updated**: May 30, 2026  
**Next Milestone**: Week 2-3 (OCR Pipeline)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Docker Services
```bash
cd c:\7 Sem\intellidocs
docker-compose up -d
docker-compose ps  # Verify all green
```

### Step 2: Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### Step 4: Verify
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- MinIO: http://localhost:9001 (user: minioadmin / pass: minioadmin_password)
- Prisma Studio: `npm run prisma:studio` (in backend folder)

---

## 📖 Implementation Roadmap

### Week 1: Foundation ✅ (IN PROGRESS)
**Goal**: All infrastructure running locally

- [x] Project structure initialized
- [x] Docker Compose configuration (PostgreSQL, Redis, MinIO, Ollama)
- [x] Environment variables template (.env.example)
- [x] Database schema (Prisma)
- [x] NestJS backend scaffolding (package.json)
- [x] Next.js frontend scaffolding (package.json)
- [x] Comprehensive documentation (README.md files)
- [ ] Docker services running
- [ ] Prisma migrations executed
- [ ] Ollama model downloaded (llama2)

**What to do this week:**
```bash
# Follow WEEK1_CHECKLIST.md in root directory
```

### Week 2-3: OCR Pipeline 🎯 (NEXT)
**Goal**: Multi-language OCR with CER/WER metrics

**Backend Tasks:**
- [ ] Create OCR service module (`src/ocr/`)
  - [ ] Tesseract.js wrapper
  - [ ] Bull job queue integration
  - [ ] CER/WER calculation
  - [ ] Per-language metrics
  
- [ ] Create document upload endpoint
  - [ ] Multer file validation
  - [ ] MinIO storage integration
  - [ ] Queue OCR job
  
- [ ] Create OCR results endpoint
  - [ ] Return extracted text per page
  - [ ] Return CER/WER per language
  - [ ] Return confidence scores

**Frontend Tasks:**
- [ ] Document upload UI component
  - [ ] Drag-and-drop zone
  - [ ] File validation
  - [ ] Progress indicator
  
- [ ] OCR results viewer
  - [ ] Display extracted text
  - [ ] Show metrics per language
  - [ ] Page-by-page breakdown

**Evaluation:**
- [ ] Create 50-document test dataset (per language)
- [ ] Measure CER/WER for English, Sinhala, Tamil, Chinese, Japanese
- [ ] Target: CER < 5% for English
- [ ] Document baseline in report

---

### Week 4-7: RAG Single-Document Chat 🎯
**Goal**: Upload PDF → Ask questions → Get cited answers

**Backend Tasks:**
- [ ] Document chunking service
  - [ ] LangChain RecursiveTextSplitter (500 tokens, 50 overlap)
  - [ ] Preserve page metadata
  
- [ ] Embedding generation service
  - [ ] nomic-embed-text via Ollama
  - [ ] Store in ChromaDB with metadata
  
- [ ] Retrieval service
  - [ ] Similarity search (cosine, top-k=5)
  - [ ] Re-rank results
  
- [ ] LLM integration
  - [ ] Ollama + Groq API fallback
  - [ ] System prompt enforce context-only
  - [ ] Temperature/max_tokens tuning
  
- [ ] Chat endpoints
  - [ ] POST /chat/ask (uploadDocId, question)
  - [ ] GET /chat/history/:docId

**Frontend Tasks:**
- [ ] Chat interface
  - [ ] Question input field
  - [ ] Real-time answer streaming
  - [ ] Source citations display (clickable)
  - [ ] Chat history sidebar

**Evaluation:**
- [ ] Answer Relevance: 4.0/5 (50 test questions)
- [ ] Retrieval Accuracy: > 85% (correct chunk in top-5)
- [ ] Faithfulness: > 90% (RAGAS framework)
- [ ] Citation Accuracy: > 95% (correct page numbers)

---

### Week 8-10: Cross-Document Search 🎯
**Goal**: Upload 2-10 PDFs → Ask ONE question across all → Get comparative answers

**Backend Tasks:**
- [ ] Document collection model
  - [ ] CREATE DocumentCollection
  - [ ] AddDocument to collection
  
- [ ] Multi-document search
  - [ ] Share ChromaDB collection for all docs
  - [ ] Tag chunks with doc_id + page
  - [ ] Search all simultaneously
  
- [ ] Comparative answer generation
  - [ ] Retrieve top-k from multiple docs
  - [ ] LLM synthesizes comparison
  - [ ] Cite all relevant docs/pages

**Frontend Tasks:**
- [ ] Collection management UI
  - [ ] Create collection
  - [ ] Add/remove documents
  - [ ] View collection members
  
- [ ] Cross-document chat UI
  - [ ] Same chat interface as single-doc
  - [ ] Results cite multiple documents

**Evaluation:**
- [ ] Latency: < 5 seconds (Ollama), < 2 seconds (Groq)
- [ ] Citation accuracy across multiple docs: > 95%
- [ ] Hallucination rate: < 10%

**✅ TIER 1 COMPLETE at Week 10**

---

### Week 11: PDF Toolkit 📦
**Goal**: Merge, split, compress, convert PDFs

**Backend Tasks:**
- [ ] PDF merge endpoint: `/pdf/merge`
- [ ] PDF split endpoint: `/pdf/split`
- [ ] PDF compress endpoint: `/pdf/compress`
- [ ] PDF convert endpoint: `/pdf/convert` (to images, etc.)

**Frontend Tasks:**
- [ ] PDF toolkit UI
  - [ ] Multi-file selection
  - [ ] Operation buttons
  - [ ] Download results

**Effort**: ~1 week (library integration, not research)

---

### Week 12: Resume Analyzer 📄
**Goal**: ATS scoring + keyword gaps + interview checklist

**Backend Tasks:**
- [ ] Resume analyzer endpoint
  - [ ] Parse resume via RAG pipeline
  - [ ] Extract keywords
  - [ ] Calculate ATS score (keyword matching)
  - [ ] Identify missing keywords
  - [ ] Generate interview checklist

**Frontend Tasks:**
- [ ] Resume upload & analyzer UI
- [ ] Results display (ATS score, keywords, checklist)

**Effort**: ~3-5 days (reuse RAG with structured prompt)

**✅ TIER 1 + TIER 2 COMPLETE at Week 12**

---

### Week 13-15: AI Content Detector (Optional) 🛡️
**Goal**: Probabilistic AI detection (perplexity + burstiness)

**Backend Tasks:**
- [ ] Signal 1: Perplexity calculation (Ollama)
- [ ] Signal 2: Burstiness calculation (sentence variance)
- [ ] Logistic regression classifier (scikit-learn, Python subprocess)
- [ ] Train on HC3 dataset (HuggingFace)
- [ ] Endpoint: `/detector/analyze`

**Frontend Tasks:**
- [ ] Text input area for detection
- [ ] Results display (probability, confidence, highlighted sentences)
- [ ] Clear disclaimer: probabilistic only

**Evaluation:**
- [ ] Precision: > 80%
- [ ] Recall: > 75%
- [ ] F1: > 0.78

---

### Week 16: AI Text Humanizer (Optional) ✍️
**Goal**: Rewrite AI text to sound natural

**Backend Tasks:**
- [ ] Endpoint: `/humanizer/rewrite`
- [ ] 4 modes: Academic, Professional, Casual, Creative
- [ ] Integrated workflow: Detect → Humanize → Re-check

**Frontend Tasks:**
- [ ] Text input & mode selection
- [ ] Results display with before/after

---

### Week 17-18: Testing & Evaluation 🧪
**Goal**: Evaluate all components rigorously

**Unit Tests:**
- [ ] OCR module: CER/WER calculation
- [ ] RAG module: Retrieval accuracy
- [ ] Chat module: Source extraction

**Integration Tests:**
- [ ] End-to-end document upload → chat workflow
- [ ] Cross-document search workflow
- [ ] Error handling

**Evaluation Runs:**
- [ ] RAGAS framework: Faithfulness, context precision
- [ ] Load testing: Concurrent users, latency
- [ ] OCR benchmarking: 250-doc test sets per language

---

### Week 19: Deployment & Demo 🚀
**Goal**: Live demo for viva

**Tasks:**
- [ ] Deploy to Railway.app or Render.com (free tier)
- [ ] Create demo video (3-5 minutes)
  - Show document upload
  - Show single-document RAG chat
  - Show cross-document search
  - Show cited answers with page refs
  - Show OCR metrics
  
**Demo should highlight:**
- ✅ Cited answers (unique feature)
- ✅ Cross-document search (unique feature)
- ✅ Multi-language OCR
- ✅ Fast inference (Groq API)

---

### Week 20: Report & Viva Prep 📚
**Goal**: Complete FYP report + viva preparation

**Report Chapters:**
1. Introduction (problem statement, motivation)
2. Literature Review (RAG, OCR, AI detection)
3. Methodology (system design, metrics)
4. Implementation (tech stack, architecture)
5. Evaluation (results, CER/WER, RAGAS, F1 scores)
6. Discussion (strengths, limitations, future work)
7. Conclusion

**Viva Preparation:**
- [ ] Practice answers to 7 anticipated questions
- [ ] Create slides (15-20 slides)
- [ ] Record demo video
- [ ] Prepare backup: local deployment if cloud fails

---

## 🏗️ Architecture Overview

### Services & Ports

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| PostgreSQL | 5432 | Prisma | Persistent data |
| Redis | 6379 | Bull + ioredis | Job queue, cache |
| MinIO | 9000/9001 | S3-compatible | Document storage |
| Ollama | 11434 | Llama 2 | Local LLM |
| NestJS Backend | 3000 | Express | REST/GraphQL API |
| Next.js Frontend | 3001 | Node | Web UI |

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│ User Interface (Next.js + React)                    │
│ - Document upload, Chat, Results display            │
└────────────────┬────────────────────────────────────┘
                 │
                 │ REST/GraphQL
                 │
┌────────────────▼────────────────────────────────────┐
│ NestJS API Server                                   │
│ - Auth, Document handling, RAG orchestration        │
└────┬──────────────────┬──────────────────┬──────────┘
     │                  │                  │
┌────▼───┐ ┌───────────▼───┐ ┌───────────▼────┐
│PostgreSQL Redis           MinIO              │
│(Data)  (Queue)           (Storage)          │
└────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ AI/Processing Layer                          │
│ - Ollama (LLM)                              │
│ - Tesseract.js (OCR)                        │
│ - ChromaDB (Vector DB)                      │
│ - LangChain (Orchestration)                 │
└──────────────────────────────────────────────┘
```

---

## 📊 Evaluation Metrics Checklist

### OCR Pipeline
- [ ] **CER (Character Error Rate)**
  - Formula: (Substitutions + Deletions + Insertions) / Total Characters
  - Target: < 5% for English
  - Test on: 50 documents per language

- [ ] **WER (Word Error Rate)**
  - Formula: (Substitutions + Deletions + Insertions) / Total Words
  - Target: < 8% for English
  - Test on: Same 50 documents

- [ ] **Processing Speed**
  - Target: < 3 seconds per page
  - Measure on: Test hardware

- [ ] **Language Coverage**
  - Report CER/WER for: English, Sinhala, Tamil, Chinese, Japanese
  - English = primary
  - Others = breadth + gap analysis

### RAG System
- [ ] **Answer Relevance**
  - Method: Human evaluation (1-5 Likert)
  - Sample: 50 test questions
  - Target: >= 4.0/5

- [ ] **Retrieval Accuracy**
  - Method: % of queries with correct chunk in top-5
  - Target: > 85%

- [ ] **Faithfulness** (RAGAS)
  - Method: Is answer grounded in context?
  - Tool: RAGAS framework (free, open-source)
  - Target: > 90%

- [ ] **Context Precision**
  - Method: % of retrieved chunks relevant to query
  - Target: > 80%

- [ ] **Query Latency**
  - Method: Time from question to full answer
  - Target: < 5 seconds (local), < 2 seconds (Groq API)

- [ ] **Hallucination Rate**
  - Method: % answers with info absent from document
  - Target: < 10%

- [ ] **Citation Accuracy**
  - Method: % of answers where page numbers correct
  - Target: > 95%

### AI Content Detector
- [ ] **Precision**: TP / (TP + FP) > 80%
- [ ] **Recall**: TP / (TP + FN) > 75%
- [ ] **F1 Score**: 2 * P * R / (P + R) > 0.78
- [ ] **False Positive Rate**: < 15%
- [ ] **Dataset**: 2,000+ samples (HC3 + synthetic)

---

## 🔧 Development Tips

### 1. Use Environment Variables
- Never hardcode secrets
- `.env.example` for template
- `.env` in `.gitignore`

### 2. Database Changes
```bash
# Make schema changes in prisma/schema.prisma
# Then run migration:
npm run prisma:migrate

# Preview without applying:
npm run prisma:migrate --skip-generate --skip-seed
```

### 3. Testing Endpoints
```bash
# REST: Use curl or Postman
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}'

# GraphQL: Visit http://localhost:3000/graphql
# Playground available (when configured)
```

### 4. Debugging
```bash
# View service logs
docker-compose logs [service-name] -f

# Access database directly
docker exec -it intellidocs-postgres psql -U intellidocs -d intellidocs_db

# View Prisma data
npm run prisma:studio
```

### 5. Code Organization
- Keep modules focused (single responsibility)
- Group related files in folders
- Use TypeScript interfaces/types
- Comment complex logic

---

## 🎯 Success Criteria (Week-by-Week)

**Week 1**: All services running, database ready
**Week 3**: OCR pipeline working, metrics calculated
**Week 7**: RAG single-document chat complete
**Week 10**: Cross-document search complete (Tier 1 done!)
**Week 12**: Tier 2 features done (PDF toolkit + Resume)
**Week 18**: All tests passing, evaluation metrics met
**Week 19**: Live deployment working
**Week 20**: Report submitted, viva ready

---

## 📚 Learning Resources

### Technologies
- [NestJS Docs](https://docs.nestjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [LangChain.js](https://js.langchain.com)
- [ChromaDB](https://docs.trychroma.com)

### Academic Papers
- Lewis et al. (2020) - RAG paper
- Gao et al. (2023) - RAG survey
- Guo et al. (2023) - HC3 dataset

### Tools
- [Docker Docs](https://docs.docker.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Redis Docs](https://redis.io/docs)
- [MinIO Docs](https://docs.min.io)

---

## 🆘 Getting Help

1. **Check README files** (root, backend, frontend)
2. **Review WEEK1_CHECKLIST.md** for setup issues
3. **Check service logs**: `docker-compose logs [service]`
4. **Consult proposal document** (Section references in parentheses)
5. **Search issues** in documentation

---

## ✅ Next Step

You're ready to start Week 1! Follow the **WEEK1_CHECKLIST.md** for step-by-step setup.

Good luck! 🚀
