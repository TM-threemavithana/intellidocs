# IntelliDocs Frontend - Next.js UI

## Overview

The frontend is a **Next.js 14 + React + TypeScript** web application that provides:
- 📤 Document upload interface
- 💬 Real-time chat with AI responses
- 📊 Document management dashboard
- 🔍 OCR results viewer
- 📈 RAG evaluation metrics
- 🎨 Responsive Tailwind CSS UI

## Folder Structure (TBD - To Be Defined)

```
frontend/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # Home page
│   │   ├── dashboard/     # Main app dashboard
│   │   ├── auth/          # Login/Register
│   │   ├── documents/     # Document management
│   │   ├── chat/          # Chat interface
│   │   ├── ocr/           # OCR results
│   │   └── layout.tsx     # Root layout
│   ├── components/        # Reusable React components
│   │   ├── DocumentUpload.tsx
│   │   ├── ChatBox.tsx
│   │   ├── DocumentList.tsx
│   │   ├── PDFViewer.tsx
│   │   └── Navigation.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useDocuments.ts
│   │   └── useRAG.ts
│   ├── lib/               # Utilities & helpers
│   │   ├── api.ts         # API client
│   │   ├── auth.ts        # Auth utilities
│   │   └── constants.ts
│   ├── styles/            # Global styles
│   └── types/             # TypeScript interfaces
├── public/                # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

**Key dependencies:**
```json
{
  "next": "^14.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "axios": "^1.x",
  "@apollo/client": "^3.x",
  "graphql": "^16.x",
  "react-dropzone": "^14.x",
  "framer-motion": "^10.x",
  "zustand": "^4.x"
}
```

### 2. Setup Environment

```bash
cp ../.env.example ../.env
# Edit .env.local with your settings
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

Frontend runs on: **http://localhost:3001**

---

## Key Pages & Components

### Pages (Next.js App Router)

#### Home / Landing
- `src/app/page.tsx` - Marketing/intro page
- Quick feature overview
- CTA to sign up

#### Authentication
- `src/app/auth/login` - Login page (email/password)
- `src/app/auth/register` - Sign up page
- `src/app/auth/forgot-password` - Password reset

#### Dashboard
- `src/app/dashboard/page.tsx` - Main overview
- Recent documents
- Quick stats (OCR accuracy, chat count)
- Top metrics

#### Documents
- `src/app/documents/page.tsx` - Document list
  - Upload new PDFs
  - View file metadata
  - Delete documents
  - Create collections

#### Chat Interface
- `src/app/chat/[docId]/page.tsx` - Single-document chat
- `src/app/chat/collection/[collectionId]/page.tsx` - Cross-document chat
- Real-time Q&A
- Source citations display
- Chat history

#### OCR Results
- `src/app/ocr/[docId]/page.tsx` - OCR metrics
- Per-language CER/WER scores
- Extracted text preview
- Page-by-page breakdown

#### Tools (Secondary Features)
- `src/app/tools/pdf-toolkit` - PDF operations
- `src/app/tools/resume` - Resume analyzer
- `src/app/tools/detector` - AI content detector

### Components

#### DocumentUpload
- Drag-and-drop zone
- File validation
- Upload progress indicator
- Success/error feedback

#### ChatBox
- Question input field
- Answer display with streaming
- Source citations (clickable)
- Chat history sidebar
- Copy/share answer buttons

#### DocumentList
- DataTable with sorting/filtering
- File size, pages, OCR status
- Action buttons (view, delete, analyze)

#### PDFViewer
- Embedded PDF.js viewer
- Page navigation
- Zoom controls
- Search highlighting (from OCR results)

#### Navigation
- Header with logo
- Navigation menu
- User profile dropdown
- Logout

---

## API Integration

### REST Endpoints (axios client)

```typescript
// src/lib/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const auth = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => 
    api.post('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
};

// Documents
export const documents = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData);
  },
  list: () => api.get('/documents'),
  get: (id: string) => api.get(`/documents/${id}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Chat & RAG
export const chat = {
  ask: (docId: string, question: string) => 
    api.post('/chat/ask', { docId, question }),
  askCollection: (collectionIds: string[], question: string) => 
    api.post('/chat/ask-collection', { collectionIds, question }),
  history: (docId: string) => 
    api.get(`/chat/history/${docId}`),
};
```

### GraphQL Client (Apollo)

```typescript
// src/lib/graphql.ts

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

export const client = new ApolloClient({
  ssrMode: typeof window === 'undefined',
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql',
    credentials: 'include',
  }),
  cache: new InMemoryCache(),
});
```

---

## State Management (Zustand)

```typescript
// src/store/auth.store.ts

import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
  setUser: (user) => set({ user }),
}));

// Usage in components:
// const { user, logout } = useAuthStore();
```

---

## Custom Hooks

```typescript
// src/hooks/useAuth.ts
export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  const loginUser = async (email: string, password: string) => {
    const response = await auth.login(email, password);
    login(response.data.user, response.data.token);
  };
  
  return { user, isAuthenticated, loginUser, logout };
};

// src/hooks/useDocuments.ts
export const useDocuments = () => {
  const [docs, setDocs] = useState([]);
  
  const fetchDocuments = async () => {
    const response = await documents.list();
    setDocs(response.data);
  };
  
  return { docs, fetchDocuments };
};

// src/hooks/useRAG.ts
export const useRAG = (docId: string) => {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  
  const askQuestion = async (question: string) => {
    setLoading(true);
    const response = await chat.ask(docId, question);
    setAnswer(response.data.answer);
    setSources(response.data.sources);
    setLoading(false);
  };
  
  return { loading, answer, sources, askQuestion };
};
```

---

## Styling with Tailwind CSS

```tsx
// Example component: src/components/ChatBox.tsx

'use client';

export function ChatBox({ docId }: { docId: string }) {
  const { answer, sources, loading, askQuestion } = useRAG(docId);
  const [question, setQuestion] = useState('');

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900">Chat with Document</h2>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => askQuestion(question)}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </div>

      {answer && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Answer</h3>
          <p className="text-gray-700">{answer}</p>
          
          {sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-2">Sources:</p>
              <div className="space-y-1">
                {sources.map((source) => (
                  <p key={source.id} className="text-sm text-blue-600">
                    {source.document} - Page {source.page}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Authentication Flow

1. User navigates to `/auth/login`
2. Submits email & password
3. Backend validates & returns JWT token
4. Token stored in localStorage
5. Token included in all API requests (Authorization header)
6. Protected routes check for valid token
7. Redirect to login if unauthorized

```typescript
// src/lib/auth.ts

export const setToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

export const getToken = () => {
  return localStorage.getItem('authToken');
};

export const removeToken = () => {
  localStorage.removeItem('authToken');
};

// Add to API interceptor
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Environment Variables (Frontend)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/graphql

# Features
NEXT_PUBLIC_ENABLE_DETECTOR=true
NEXT_PUBLIC_ENABLE_HUMANIZER=false
NEXT_PUBLIC_ENABLE_RESUME=true

# Analytics (optional)
NEXT_PUBLIC_GTAG=your_gtag_id
```

---

## Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Export Static (Optional)
```bash
npm run export
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests (Playwright/Cypress)
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## Key Features (Week-by-Week)

### Week 1: Foundation
- [x] Next.js project setup
- [x] Tailwind CSS configuration
- [ ] Layout & navigation

### Week 4-7: Core Features
- [ ] Document upload UI
- [ ] Chat interface
- [ ] Source citations display
- [ ] Chat history

### Week 8-10: Advanced Features
- [ ] Document collections
- [ ] Cross-document search UI
- [ ] Comparative answer display

### Week 11-12: Tools
- [ ] PDF toolkit UI
- [ ] Resume analyzer form
- [ ] Results display

### Week 13+: Enhancements
- [ ] AI detector UI
- [ ] Text humanizer UI
- [ ] Dark mode
- [ ] Accessibility improvements

---

## Useful Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

---

## Next Steps

1. ✅ Create Next.js project
2. ⏳ Set up Tailwind CSS
3. ⏳ Create layout & navigation
4. ⏳ Build authentication pages
5. ⏳ Implement document upload
6. ⏳ Build chat interface
7. ⏳ Add source citations

---

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)

---

## Support

For issues or questions, check the main README.md or backend README.
