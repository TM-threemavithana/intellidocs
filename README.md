# IntelliDocs AI - Document Intelligence Platform

**Status**: FYP v4.0 Implementation (Week 1: Environment Setup)
**Timeline**: 20 Weeks
**Version**: Development

## Overview

IntelliDocs AI is an AI-powered document intelligence platform that enables users to:
- 🔍 Extract text from scanned PDFs using multi-language OCR (English, Sinhala, Tamil, Chinese, Japanese)
- 💬 Chat with documents using RAG (Retrieval-Augmented Generation) with cited page references
- 📄 Search across multiple documents simultaneously with comparative answers
- 🎯 Analyze resumes with ATS scoring
- 🛡️ Detect AI-generated content probabilistically

## Project Structure

```
intellidocs/
├── backend/              # NestJS API server
├── frontend/             # Next.js UI
├── docker/               # Docker configurations
├── docs/                 # Documentation
├── docker-compose.yml    # All services orchestration
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Quick Start (Week 1: Environment Setup)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Git

### 1. Start Infrastructure Services

```bash
# Clone and navigate to project
cd c:\7 Sem\intellidocs

# Copy environment template
cp .env.example .env

# Start all services (PostgreSQL, Redis, MinIO, Ollama)
docker-compose up -d

# Verify services are running
docker-compose ps
```

**What's Running:**
- **PostgreSQL** (port 5432) - User data, documents, metadata
- **Redis** (port 6379) - Job queue, session cache
- **MinIO** (ports 9000/9001) - Document storage (S3-compatible)
- **Ollama** (port 11434) - Local LLM (Llama 2 model)

### 2. Initialize PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it intellidocs-postgres psql -U intellidocs -d intellidocs_db

# Create initial schema (detailed setup in backend README)
```

### 3. Setup Backend (NestJS API)

```bash
cd backend

# Install dependencies
npm install

# Setup database with Prisma
npm run prisma:migrate

# Seed initial data (optional)
npm run seed

# Start development server
npm run start:dev
```

Backend runs on: http://localhost:3000

### 4. Setup Frontend (Next.js UI)

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: http://localhost:3001

---

## Architecture Overview

### Technology Stack (100% FREE)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + Tailwind + TypeScript | Web UI |
| **Backend** | NestJS + GraphQL + REST | API Server |
| **Database** | PostgreSQL | Persistent data |
| **Cache/Queue** | Redis + Bull | Job processing |
| **File Storage** | MinIO | Document storage |
| **OCR** | Tesseract.js | Text extraction |
| **LLM (Local)** | Ollama + Llama 2 | Local AI |
| **LLM (Cloud)** | Groq API (free tier) | Fallback AI |
| **Embeddings** | nomic-embed-text | Vector generation |
| **Vector DB** | ChromaDB | Semantic search |
| **RAG Framework** | LangChain.js | Retrieval pipeline |

### System Architecture

```
┌─────────────────────────────────┐
│   Browser / Mobile (Next.js)    │
│   - File Upload, Chat, PDF View │
└────────────────┬────────────────┘
                 │
                 │ REST/GraphQL
                 │
┌────────────────▼────────────────┐
│     NestJS API Server           │
│  - Auth, File Handling, Jobs    │
└────┬────────────┬───────────────┘
     │            │
     │            ├──────────────────┐
┌────▼───┐   ┌────▼──┐   ┌─────────▼───┐
│PostgreSQL  Redis   MinIO  │ Bull Queue │
│(Data)    (Cache) (Files) │(OCR/Index) │
└──────────────────────────────────────┘

┌─────────────────────────────────┐
│    AI / RAG Layer               │
│  - Ollama + Groq API            │
│  - LangChain + ChromaDB         │
│  - Tesseract.js (OCR)           │
└─────────────────────────────────┘
```

---

## Implementation Timeline

### Week 1: Environment Setup ✅ (IN PROGRESS)
- [x] Project initialization
- [x] Docker Compose setup
- [x] Database schemas
- [ ] Ollama model download
- [ ] Redis + MinIO initialization

### Week 2-3: OCR Pipeline
- Tesseract.js multi-language support
- CER/WER evaluation metrics
- 5-language benchmarking

### Week 4-7: RAG Single-Document Chat
- Document upload & chunking
- Vector embedding generation
- Semantic search & retrieval
- LLM prompt + answer generation
- Page-level citation

### Week 8-10: Cross-Document Search
- Document collections
- Multi-doc simultaneous search
- Comparative answer generation

### Week 11-12: Secondary Features
- PDF Toolkit (merge, split, convert)
- Resume Analyzer (ATS scoring)

### Week 13-18: Optional Features & Testing
- AI Content Detector (perplexity + burstiness)
- Integration testing
- Load testing
- RAGAS evaluation

### Week 19: Deployment & Demo
- Production deployment (Railway/Render)
- Demo video recording

### Week 20: Report & Viva Prep
- FYP report writing
- Viva presentation slides

---

## Service Ports & URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **PostgreSQL** | localhost:5432 | user: `intellidocs`, pass: `intellidocs_dev_password` |
| **Redis CLI** | localhost:6379 | `redis-cli` |
| **MinIO API** | http://localhost:9000 | user: `minioadmin`, pass: `minioadmin_password` |
| **MinIO Console** | http://localhost:9001 | user: `minioadmin`, pass: `minioadmin_password` |
| **Ollama API** | http://localhost:11434 | No auth |
| **Backend API** | http://localhost:3000 | See JWT auth |
| **Frontend** | http://localhost:3001 | None |

---

## Development Commands

### Docker Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Remove all volumes (WARNING: deletes data)
docker-compose down -v
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Run migrations
npm run prisma:migrate

# Start dev server with hot reload
npm run start:dev

# Run tests
npm run test

# Run linter
npm run lint

# Check types
npm run type-check
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

---

## Database Schema Overview

### Key Tables
- **users** - Authentication & user profiles
- **documents** - PDF metadata, OCR tracking
- **document_collections** - Groups of documents for cross-doc search
- **chats** - Conversations with Q&A history
- **embeddings** - Vector store metadata
- **ocr_results** - OCR accuracy metrics
- **detection_results** - AI content detection results

See `backend/prisma/schema.prisma` for full schema.

---

## Environment Variables

All environment variables are defined in `.env.example`. Copy to `.env` and customize:

```bash
cp .env.example .env
```

**Key Variables:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `OLLAMA_BASE_URL` - Local LLM endpoint
- `GROQ_API_KEY` - Optional cloud LLM backup
- `JWT_SECRET` - Authentication key
- `MAX_FILE_SIZE` - Upload limit (default: 50MB)

---

## Evaluation Metrics

### OCR Pipeline
- **CER** (Character Error Rate) - Target: < 5% for English
- **WER** (Word Error Rate) - Target: < 8% for English
- **Processing Speed** - Target: < 3 seconds per page

### RAG System
- **Answer Relevance** - Target: 4.0/5 (Likert scale)
- **Retrieval Accuracy** - Target: > 85%
- **Faithfulness** - Target: > 90% (RAGAS)
- **Citation Accuracy** - Target: > 95%
- **Latency** - Target: < 5 seconds (local), < 2 seconds (Groq)

### AI Content Detector
- **F1 Score** - Target: > 0.78
- **Precision** - Target: > 80%
- **Recall** - Target: > 75%

---

## Ethical Considerations

✅ **Privacy**
- Per-user data isolation
- Bcrypt password hashing (cost factor 12)
- Cascade deletion of documents & embeddings
- No third-party data sharing

✅ **Transparency**
- AI detector outputs are probabilistic (not definitive)
- Clear limitations documented
- Honest accuracy reporting per language

✅ **Fairness**
- Multi-language support (acknowledges limits)
- Documented biases in LLM-based features

---

## Troubleshooting

### Docker Issues

**Q: Services won't start**
```bash
# Check Docker daemon
docker --version

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

**Q: Port already in use**
```bash
# Check what's using the port (e.g., 5432)
netstat -ano | findstr :5432

# Change port in docker-compose.yml
```

### Database Issues

**Q: Can't connect to PostgreSQL**
```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs postgres

# Force restart
docker-compose restart postgres
```

### Ollama Issues

**Q: Model won't download**
```bash
# Pull model manually
docker exec -it intellidocs-ollama ollama pull llama2

# Verify model is available
curl http://localhost:11434/api/tags
```

---

## Resources

📚 **Documentation**
- [NestJS Docs](https://docs.nestjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [LangChain.js](https://js.langchain.com)
- [ChromaDB](https://docs.trychroma.com)
- [Tesseract.js](https://tesseract.projectnaptha.com)

🔗 **APIs**
- [Groq API](https://console.groq.com)
- [Google Gemini API](https://ai.google.dev)

📖 **Academic References**
- Lewis et al. (2020) - RAG paper
- Gao et al. (2023) - RAG survey
- Guo et al. (2023) - HC3 dataset

---

## Support & Questions

For questions or issues:
1. Check project docs in `/docs`
2. Review service logs: `docker-compose logs`
3. Consult proposal document: Section numbers in parentheses reference it

---

## License

This is a Final Year Project (FYP) - Check with your institution for licensing requirements.

**Created**: May 2026
**Version**: v0.1 (Development)
**Status**: Active Implementation
