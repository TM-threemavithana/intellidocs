# IntelliDocs Backend - NestJS API Server

## Overview

The backend is a **NestJS + GraphQL/REST** API server that handles:
- User authentication (Passport.js + JWT)
- Document upload & storage (MinIO)
- OCR pipeline orchestration (Bull queue)
- RAG retrieval & generation (LangChain + ChromaDB)
- Database management (PostgreSQL + Prisma)

## Folder Structure (TBD - To Be Defined)

```
backend/
├── src/
│   ├── auth/              # Authentication module (JWT, Passport)
│   ├── documents/         # Document upload, storage, metadata
│   ├── ocr/               # OCR pipeline (Tesseract.js wrapper)
│   ├── rag/               # RAG system (LangChain + ChromaDB)
│   ├── chat/              # Chat history & Q&A
│   ├── pdf-toolkit/       # PDF utilities (merge, split, etc.)
│   ├── resume/            # Resume analyzer
│   ├── detector/          # AI content detector
│   ├── storage/           # MinIO integration
│   ├── database/          # Prisma ORM
│   ├── jobs/              # Bull job queue
│   ├── common/            # Shared utilities, guards, decorators
│   ├── main.ts            # App entry point
│   └── app.module.ts      # Root module
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── test/                  # Unit & integration tests
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

**Key dependencies:**
```json
{
  "nestjs": "^10.x",
  "graphql": "^16.x",
  "@apollo/server": "^4.x",
  "prisma": "^5.x",
  "@prisma/client": "^5.x",
  "passport": "^0.7.x",
  "passport-jwt": "^4.x",
  "jsonwebtoken": "^9.x",
  "bull": "^4.x",
  "ioredis": "^5.x",
  "minio": "^7.x",
  "langchain": "^0.1.x",
  "tesseract.js": "^5.x",
  "chromadb": "^1.x"
}
```

### 2. Setup Environment

```bash
cp ../.env.example ../.env
# Edit .env with your settings
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# Seed initial data (optional)
npm run seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server runs on: **http://localhost:3000**

---

## Key Modules

### 🔐 Auth Module (Passport.js + JWT)
- User registration & login
- JWT token generation
- Protected route guards
- Role-based access control (Admin, User)

### 📄 Documents Module
- Document upload via Multer
- Storage in MinIO (S3-compatible)
- Metadata tracking (filename, size, pages, OCR status)
- Document deletion with cascade cleanup

### 🔍 OCR Module
- Tesseract.js async processing via Bull queue
- Multi-language support (English, Sinhala, Tamil, Chinese, Japanese)
- Per-page text extraction with confidence scores
- CER/WER metric calculation

### 💬 RAG Module (Retrieval-Augmented Generation)
- **Ingest Pipeline**:
  1. Document chunking via LangChain (500 tokens, 50 overlap)
  2. Embedding generation (nomic-embed-text via Ollama)
  3. ChromaDB vector storage with metadata
- **Query Pipeline**:
  1. Query embedding
  2. Similarity search (cosine, top-k=5)
  3. Prompt construction with context
  4. LLM generation (Ollama / Groq API)
  5. Citation extraction & formatting

### 📊 Chat Module
- Store conversation history
- Link chats to documents/collections
- Track answer sources with page references

### 🛠️ PDF Toolkit
- Merge PDFs (pdf-lib)
- Split PDFs by page range
- Convert formats (LibreOffice backend)
- Compress documents

### 📄 Resume Analyzer
- Parse resume via RAG
- ATS score calculation (keyword matching)
- Missing keyword identification
- Interview readiness checklist generation

### 🛡️ AI Content Detector (Optional Tier 3)
- Perplexity score calculation (Ollama)
- Burstiness scoring (sentence length variance)
- Logistic regression classifier (scikit-learn via Python subprocess)
- Confidence level reporting

---

## API Endpoints

### REST API

#### Authentication
```
POST   /auth/register         - User registration
POST   /auth/login            - User login (returns JWT)
POST   /auth/refresh          - Refresh JWT token
POST   /auth/logout           - Logout
```

#### Documents
```
POST   /documents/upload      - Upload PDF
GET    /documents             - List user's documents
GET    /documents/:id         - Get document details
DELETE /documents/:id         - Delete document
```

#### Chat & RAG
```
POST   /chat/ask              - Ask question on single document
POST   /collections           - Create document collection
POST   /chat/ask-collection   - Ask across multiple documents
GET    /chat/history/:docId   - Get chat history
```

#### OCR
```
GET    /documents/:id/ocr     - Get OCR results
GET    /ocr/metrics           - Get CER/WER metrics
```

#### Resume
```
POST   /resume/analyze        - Analyze resume
GET    /resume/:id            - Get analysis result
```

#### Detector
```
POST   /detector/analyze      - Detect AI content
```

### GraphQL API

GraphQL endpoint: **http://localhost:3000/graphql**

```graphql
type Query {
  me: User!
  documents: [Document!]!
  document(id: ID!): Document
  chatHistory(docId: ID!): [Chat!]!
}

type Mutation {
  createDocument(file: Upload!): Document!
  askQuestion(docId: ID!, question: String!): Chat!
  askCollectionQuestion(collectionIds: [ID!]!, question: String!): Chat!
  analyzeResume(docId: ID!): ResumeAnalysis!
  detectAIContent(text: String!): AIDetectionResult!
}
```

---

## Database Schema (Prisma)

Key models:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String?
  role      String   @default("user") // user, admin
  documents Document[]
  chats     Chat[]
  createdAt DateTime @default(now())
}

model Document {
  id          String  @id @default(cuid())
  userId      String
  fileName    String
  fileSize    Int
  pageCount   Int
  storageUrl  String  // MinIO path
  ocrApplied  Boolean @default(false)
  language    String? // detected language
  createdAt   DateTime @default(now())
  
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  chats       Chat[]
  embeddings  Embedding[]
  ocrResults  OCRResult[]
}

model Embedding {
  id          String  @id @default(cuid())
  docId       String
  chunkText   String  @db.Text
  vectorId    String  // ChromaDB reference
  pageNumber  Int
  chunkIndex  Int
  createdAt   DateTime @default(now())
  
  document    Document @relation(fields: [docId], references: [id], onDelete: Cascade)
}

model Chat {
  id          String  @id @default(cuid())
  docId       String?
  collectionId String?
  question    String
  answer      String  @db.Text
  sources     Json    // [{doc, page, chunk_index}]
  latencyMs   Int
  model       String  // "ollama", "groq", "gemini"
  createdAt   DateTime @default(now())
  
  document    Document? @relation(fields: [docId], references: [id], onDelete: SetNull)
}

model OCRResult {
  id                String   @id @default(cuid())
  docId             String
  pageNumber        Int
  rawText           String   @db.Text
  cerScore          Float    // (0-1) Character error rate
  werScore          Float    // (0-1) Word error rate
  language          String   // Detected language
  tesseractConf     Float    // Tesseract confidence (0-100)
  createdAt         DateTime @default(now())
  
  document          Document @relation(fields: [docId], references: [id], onDelete: Cascade)
}
```

---

## Environment Variables (Backend-Specific)

```env
# Database
DATABASE_URL=postgresql://intellidocs:intellidocs_dev_password@localhost:5432/intellidocs_db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_password
MINIO_BUCKET_NAME=intellidocs-documents

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Groq API (free tier)
GROQ_API_KEY=your_key_here

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRATION=7d

# Application
NODE_ENV=development
PORT=3000
```

---

## Running Services

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
npm run test              # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report
```

---

## Key Features (Week-by-Week)

### Week 1-3: Foundation
- [x] NestJS project setup
- [x] Database schema (Prisma)
- [x] Authentication module
- [ ] Document upload & storage

### Week 2-3: OCR Integration
- [ ] Tesseract.js wrapper
- [ ] Bull job queue integration
- [ ] CER/WER metric calculation

### Week 4-7: RAG Pipeline
- [ ] LangChain integration
- [ ] ChromaDB setup
- [ ] Embedding generation
- [ ] Retrieval & ranking
- [ ] LLM integration (Ollama/Groq)
- [ ] Citation formatting

### Week 8-10: Cross-Document
- [ ] Collection support
- [ ] Multi-document queries
- [ ] Comparative answer generation

### Week 11-12: Features
- [ ] PDF toolkit endpoints
- [ ] Resume analyzer

### Week 13-18: Testing & Evaluation
- [ ] Unit tests for each module
- [ ] E2E tests for workflows
- [ ] RAGAS evaluation
- [ ] Load testing

---

## Useful Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npm run prisma:reset

# Open Prisma Studio (GUI)
npm run prisma:studio

# Generate API docs
npm run generate:docs

# Format code
npm run format

# Lint all files
npm run lint

# Type checking
npm run type-check
```

---

## Next Steps

1. ✅ Create NestJS project structure
2. ⏳ Initialize Prisma & database
3. ⏳ Implement authentication module
4. ⏳ Setup document upload service
5. ⏳ Integrate OCR pipeline
6. ⏳ Build RAG system
7. ⏳ Add cross-document search

---

## Troubleshooting

**Q: Can't connect to PostgreSQL?**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Q: Prisma migrations fail?**
```bash
npm run prisma:reset  # WARNING: Deletes data
npm run prisma:migrate
```

**Q: Port 3000 in use?**
```bash
npm run start:dev -- --port 3001
```

---

## Further Reading

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [LangChain.js](https://js.langchain.com)
- [MinIO JS SDK](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
