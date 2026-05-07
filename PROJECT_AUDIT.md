# NOTED — Comprehensive Project Audit

> **AI-Powered Collaborative Study & Knowledge Management Platform**

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Name** | Noted |
| **Version** | 0.1.0 |
| **License** | MIT |
| **Node.js** | 22.18+ |
| **Type** | Full-Stack Web Application |
| **Category** | EdTech / Productivity / Collaboration |

**Description:** Noted is a modern, full-stack collaborative note-taking and learning platform that combines a rich text editor, real-time multi-user collaboration, AI-powered content generation, spaced repetition flashcards, quiz generation, a Pomodoro productivity timer, file management, and tiered subscription billing — all in one unified interface.

---

## 2. Tech Stack

### Frontend

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.1.6 | React framework with App Router, SSR, and API routes |
| React | 19.2.3 | UI rendering library |
| TypeScript | 5.x | Static type safety across the entire codebase |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| Sass | 1.97.2 | SCSS preprocessing for complex component styles |

### Rich Text Editor

| Technology | Version | Role |
|------------|---------|------|
| TipTap | 3.15.3+ | ProseMirror-based rich text editor framework |
| 15+ TipTap Extensions | 3.15–3.16 | Tables, code blocks, images, lists, alignment, highlight, collaboration, and more |
| highlight.js / lowlight | 11.11.1 / 3.3.0 | Syntax highlighting for code blocks (100+ languages) |

### Real-Time Collaboration

| Technology | Version | Role |
|------------|---------|------|
| Y.js | 13.6.29 | CRDT (Conflict-free Replicated Data Type) for conflict-free concurrent editing |
| Socket.io (client) | 4.8.3 | WebSocket client for real-time event transport |
| Socket.io (server) | 4.7.0 | WebSocket server handling rooms and broadcasting |
| @socket.io/redis-adapter | 8.2.0 | Redis pub/sub adapter for horizontal scaling across multiple server instances |
| y-indexeddb | 9.0.12 | Client-side IndexedDB persistence for offline Y.js documents |

### Database & ORM

| Technology | Version | Role |
|------------|---------|------|
| PostgreSQL | — | Primary relational database (hosted on Supabase) |
| Drizzle ORM | 0.45.1 | TypeScript-first ORM for schema definition, queries, and migrations |
| Drizzle Kit | 0.18.1 | CLI tool for migration generation and Drizzle Studio |

### Authentication

| Technology | Version | Role |
|------------|---------|------|
| better-auth | 1.4.16 | Full-featured auth framework with email/password and OAuth |
| bcryptjs | 3.0.3 | Password hashing |
| OAuth Providers | — | Google and GitHub social login |

### AI / LLM Integration

| Provider | Models | Role |
|----------|--------|------|
| Groq | Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B, Compound Beta | Primary AI provider (fast inference) |
| OpenAI | GPT-4o-mini | Secondary AI provider |
| Ollama | Llama 3.1:8b, Mistral:7b | Local/self-hosted AI inference |

### Payment Processing

| Technology | Version | Role |
|------------|---------|------|
| Stripe | 20.2.0 | Server-side payment processing |
| @stripe/stripe-js | 8.6.3 | Client-side Stripe SDK |
| @stripe/react-stripe-js | 5.4.1 | React components for Stripe Elements |

### Visualization & Drawing

| Technology | Version | Role |
|------------|---------|------|
| Mermaid | 10.9.5 | Flowcharts, sequence diagrams, Gantt charts, and more |
| Excalidraw | 0.17.6 | Hand-drawn style whiteboard and diagramming |
| react-colorful | 5.6.1 | Color picker for tags, folders, and drawing tools |

### Document Processing

| Technology | Version | Role |
|------------|---------|------|
| pdfjs-dist | 5.4.530 | Server-side PDF text extraction |
| react-pdf | 10.3.0 | In-app PDF viewer |
| html2pdf.js | 0.14.0 | Export notes to PDF |
| react-markdown | 10.1.0 | Markdown rendering |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown support |

### UI Components & Utilities

| Technology | Version | Role |
|------------|---------|------|
| Radix UI | 1.1–2.1 | Accessible, unstyled UI primitives (dialog, dropdown, popover, tabs, etc.) |
| Lucide React | 0.562.0 | Icon library |
| HugeIcons | 3.1.1 | Additional icon set |
| Floating UI | 0.27.16 | Tooltip and popover positioning |
| Sonner | 2.0.7 | Toast notification system |
| react-hotkeys-hook | 5.2.3 | Keyboard shortcut management |
| @lottiefiles/dotlottie-react | 0.17.13 | Lottie animations |
| lodash.throttle | 4.1.1 | Function call throttling |

### Deployment & Infrastructure

| Technology | Role |
|------------|------|
| Docker | Multi-stage containerization for Next.js and WebSocket server |
| Nginx | Reverse proxy with SSL termination |
| Redis | Caching, pub/sub for Socket.io, and Y.Doc persistence |
| GitHub Actions | CI/CD pipelines |

---

## 3. Application Architecture

### High-Level Diagram

```
                         ┌──────────────────────────────┐
                         │          NGINX               │
                         │   (Reverse Proxy + SSL)       │
                         └──────┬──────────────┬────────┘
                                │              │
                     ┌──────────▼──────┐ ┌─────▼────────────┐
                     │  Next.js App    │ │  WebSocket Server │
                     │  (Port 3000)    │ │  (Port 3001)      │
                     │                 │ │                    │
                     │  - SSR/RSC      │ │  - Socket.io       │
                     │  - 34 API Routes│ │  - Y.js CRDT Sync  │
                     │  - React 19 UI  │ │  - Presence        │
                     │  - TipTap Editor│ │  - Cursor Tracking │
                     └────────┬────────┘ └──────┬─────────────┘
                              │                 │
                    ┌─────────▼─────────────────▼──────┐
                    │          PostgreSQL               │
                    │       (27 Tables)                 │
                    └──────────────────────────────────┘
                              │
                    ┌─────────▼───────────────────────┐
                    │          Redis                    │
                    │  - Y.Doc State Persistence        │
                    │  - Socket.io Pub/Sub Adapter      │
                    │  - Session Caching                │
                    └──────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
  ┌───────▼──────┐   ┌───────▼──────┐   ┌───────▼──────┐
  │    Groq      │   │   OpenAI     │   │   Ollama     │
  │  (Primary)   │   │ (Secondary)  │   │  (Local)     │
  └──────────────┘   └──────────────┘   └──────────────┘
```

### Directory Structure

```
noted/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group (login, register)
│   │   ├── api/                      # 34 API route handlers
│   │   │   ├── ai/                   # AI generation endpoints
│   │   │   ├── auth/[...all]/        # better-auth catch-all
│   │   │   ├── files/                # File upload & extraction
│   │   │   ├── folders/              # Folder CRUD
│   │   │   ├── pages/                # Page CRUD, save, share, collab
│   │   │   ├── search/               # Full-text search
│   │   │   ├── share/                # Public share access
│   │   │   ├── stripe/               # Checkout, portal, webhooks
│   │   │   ├── subscription/         # Tier management
│   │   │   ├── tags/                 # Tag management
│   │   │   ├── todos/                # Task management
│   │   │   └── health/               # Health check
│   │   ├── note/[id]/                # Note editor page
│   │   ├── folder/[id]/              # Folder view page
│   │   ├── noteboard/                # Scratch pad page
│   │   ├── pricing/                  # Subscription pricing page
│   │   ├── profile/                  # User profile page
│   │   └── share/[token]/            # Shared document view
│   ├── components/                   # 197 React components
│   │   ├── ai/                       # AI panel, controls, response display
│   │   ├── auth/                     # Login/register forms
│   │   ├── collaboration/            # Cursors, presence avatars
│   │   ├── dashboard/                # Dashboard layout and widgets
│   │   ├── editor/                   # Note editor wrapper
│   │   ├── file-library/             # File browser, uploader
│   │   ├── flashcards/               # Deck management, review, SM-2
│   │   ├── layout/                   # App layout, toolbar
│   │   ├── pdf-viewer/               # PDF display
│   │   ├── pomodoro/                 # Timer widget
│   │   ├── quiz/                     # Quiz taking, results
│   │   ├── search/                   # Advanced search UI
│   │   ├── sidebar/                  # Navigation sidebar
│   │   ├── study-toolbar/            # Study tools toolbar
│   │   ├── tags/                     # Tag badges, management
│   │   ├── tiptap-extension/         # Custom TipTap extensions
│   │   ├── tiptap-icons/             # Editor toolbar icons
│   │   └── tiptap-node/              # Custom TipTap node views
│   ├── context/                      # 10 React Context providers
│   ├── hooks/                        # 15 custom React hooks
│   ├── lib/                          # Business logic & utilities
│   │   ├── ai/                       # AI provider config & generation
│   │   ├── collaboration/            # Y.js document handling
│   │   ├── auth.ts                   # better-auth server setup
│   │   ├── rate-limit.ts             # Rate limiting logic
│   │   ├── stripe.ts                 # Stripe server config
│   │   ├── subscription.ts           # Tier limits & checks
│   │   ├── validation.ts             # Zod schemas & sanitization
│   │   └── export-utils.ts           # PDF/HTML export
│   ├── db/
│   │   ├── index.ts                  # PostgreSQL client init
│   │   └── schema.ts                 # Drizzle ORM schema (27 tables)
│   ├── types/                        # TypeScript type definitions
│   └── styles/                       # Global stylesheets
├── backend/                          # Backend API + WebSocket server
│   ├── index.ts                      # Socket.io + Y.js + Redis
│   ├── socket-handlers/              # Event handler modules
│   ├── Dockerfile                    # Server container
│   └── package.json                  # Server dependencies
├── drizzle/                          # Database migration files
├── public/                           # Static assets
├── docker-compose.yml                # Development containers
├── docker-compose.prod.yml           # Production containers
├── Dockerfile                        # Next.js app container
├── nginx.conf                        # Nginx reverse proxy config
├── deploy.sh                         # Deployment automation
└── init-ssl.sh                       # SSL certificate setup
```

### Codebase Stats

| Metric | Count |
|--------|-------|
| React Components | 197 |
| API Routes | 34 |
| Database Tables | 27 |
| Context Providers | 10 |
| Custom Hooks | 15 |
| Type Definition Files | 5 |
| Production Dependencies | 67+ |
| TipTap Extensions | 15+ |

---

## 4. Complete Feature Inventory

### 4.1 Rich Text Editor

Built on TipTap (ProseMirror), the editor provides a professional document editing experience:

**Text Formatting:**
- Bold, italic, underline, strikethrough, subscript, superscript
- Text color and background highlight
- Text alignment (left, center, right, justify)
- Font size control

**Block Elements:**
- Headings (H1–H6)
- Paragraphs, blockquotes
- Ordered and unordered lists
- Task lists with interactive checkboxes
- Tables with full in-editor manipulation (add/remove rows/columns, merge cells)
- Code blocks with syntax highlighting (100+ languages via highlight.js)
- Horizontal rules

**Advanced Nodes:**
- Resizable images with drag-drop upload and aspect ratio control
- Multi-column layouts for document organization
- Whiteboard node — built-in drawing canvas with shapes, text, and eraser
- Excalidraw node — embedded hand-drawn style diagramming
- Mermaid diagram node — flowcharts, sequence diagrams, Gantt charts rendered from text
- AI block node — special blocks for AI-generated content with approve/reject workflow

**Editor UX:**
- Drag handles on every block for drag-and-drop reordering
- Grid-based drop zones for flexible layout arrangement
- Slash command menu (type `/` to insert any block type)
- Undo/redo history
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Shift+X, etc.)
- Debounced auto-save with save status indicator
- Optimistic locking with version control to prevent conflicting saves

---

### 4.2 AI Integration

Multi-provider AI system supporting 9 generation modes:

**Providers:**
- **Groq** (default) — Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B, Compound Beta models
- **OpenAI** — GPT-4o-mini
- **Ollama** — Local models (Llama 3.1:8b, Mistral:7b)

All providers use an OpenAI-compatible SDK interface, making them interchangeable.

**AI Modes:**

| Mode | Description | Output |
|------|-------------|--------|
| Answer | Answer questions about selected or full page content | Text |
| Summarize | Create concise summaries | Text |
| Expand | Add detail and depth to ideas | Text |
| Improve | Enhance grammar, clarity, and style | Text |
| Translate | Translate content to another language | Text |
| Explain | Simplify complex topics with examples | Text |
| Flowchart | Generate visual diagrams from content | Mermaid code |
| Quiz | Auto-generate quiz questions from notes | Structured JSON |
| Flashcard | Auto-generate flashcard decks from notes | Structured JSON |

**AI Panel Features:**
- Floating, expandable panel UI
- Real-time streaming responses (SSE)
- Insert, replace, copy, regenerate, and discard controls
- Context-aware — uses selected text or entire page content
- Model selection dropdown
- Rate limiting based on subscription tier (Free: 10/month, Pro: 500/month, Team: unlimited)
- Monthly usage tracking stored in database

**AI Data Flow:**
```
User selects text → Chooses AI mode → POST /api/ai/generate
    → Authenticate user
    → Check AI quota
    → Build system prompt + user message with context
    → Stream request to Groq/OpenAI/Ollama
    → SSE stream response back to client
    → Increment usage counter in ai_usage table
    → User approves → Content inserted into editor
```

---

### 4.3 Flashcard System (Spaced Repetition)

A full spaced repetition learning system built into the platform:

**Features:**
- Create and manage multiple flashcard decks
- Add cards with front (question) and back (answer) pairs
- Support for multiple card types: basic, cloze deletion, image-based
- **SM-2 spaced repetition algorithm** — scientifically proven scheduling that adjusts review intervals based on recall performance
- Progress tracking with intervals, ease factors, and next review dates
- Review sessions with card flip animation
- Rating buttons: Again (forgot) / Hard / Good / Easy — each adjusts the next review interval differently
- Visual progress bars during review sessions
- AI-powered flashcard generation from notes (pass note content to AI, receive structured flashcard JSON)
- Deck-level statistics: total cards, due cards, mastered cards, average ease factor

---

### 4.4 Quiz System

Comprehensive quiz creation and testing engine:

**Question Types:**
- Multiple choice (single and multi-select)
- True/False
- Fill in the blank
- Short answer

**Quiz Features:**
- Create custom quizzes manually
- AI-powered quiz generation from any note content
- Difficulty levels: easy, medium, hard
- Configurable settings:
  - Time limit per question
  - Instant feedback mode with explanations
  - Shuffle questions and answer options
  - Show/hide back navigation
  - Pass/fail scoring threshold
- Full-screen and modal display modes
- Question navigation with visual progress indicators
- Detailed result analysis: score, breakdown by difficulty, correct/incorrect review
- Quiz attempt history tracking

---

### 4.5 Pomodoro Timer

Integrated productivity timer with full customization:

**Features:**
- Three modes: Focus (25 min), Short Break (5 min), Long Break (15 min)
- Customizable durations for each mode
- Auto-start next session option
- Session tracking (daily count and cumulative totals)
- Daily goals setting with progress visualization
- Sound notifications with volume control
- Browser push notifications
- Draggable floating widget — position persists across sessions
- Minimize/maximize UI toggle
- Link sessions to specific notes/pages for context

---

### 4.6 Real-Time Collaboration

Enterprise-grade real-time collaboration using Y.js CRDT:

**How It Works:**
1. User opens a note → WebSocket connection established to Socket.io server
2. Joins a room (`page:<pageId>`)
3. Y.js document state loaded from Redis (or created fresh)
4. Initial state synced to client
5. All edits encoded as Y.js updates → broadcast to all clients in the room
6. CRDT guarantees conflict-free merging — no manual conflict resolution needed
7. Y.Doc state persisted to Redis every 30 seconds
8. On room empty → graceful 5-minute cleanup delay, then save to database

**Collaboration Features:**
- Live collaborative cursors with color-coded user identification (10 deterministic colors)
- User presence avatars showing who is currently viewing/editing
- Presence status: online, away, offline
- Role-based access: viewer (read-only), editor (full edit), admin (manage collaborators)
- Stale connection cleanup (5-minute timeout)

**Scaling:**
- Redis adapter enables Socket.io to work across multiple server instances
- Redis TLS support for secure production deployments
- Graceful fallback to single-instance mode if Redis is unavailable

---

### 4.7 File Library & Document Processing

**File Management:**
- Upload images, PDFs, videos, audio, and documents
- Organize files in virtual folders
- Star/favorite important files
- Grid and list view modes
- File type filtering
- Storage quota tracking
- Search within file library
- Batch operations (multi-select, bulk delete)

**PDF Processing:**
- Server-side text extraction from PDFs using pdfjs-dist
- Text sanitization: remove garbled Unicode, normalize whitespace
- In-app PDF viewer with page navigation
- Maximum extracted text: 50,000 characters (~12,500 tokens)
- Processing timeout: 60 seconds
- Supports multiple input types: file upload, URL, base64, or fileId reference

**Export:**
- Export notes to PDF (via html2pdf.js)
- Export notes to HTML
- Full formatting preservation

---

### 4.8 Sharing & Access Control

**Sharing Features:**
- Share individual notes or entire folders
- Role-based permissions: viewer, editor, admin
- Shareable public links with configurable permissions
- Password-protected share links
- Link expiration dates
- View count tracking on shared links
- "Shared with me" dashboard view
- Claim shared content to your own workspace

**Access Control Hierarchy:**
- Owner → full control (delete, manage collaborators, change visibility)
- Admin → manage collaborators, edit content
- Editor → edit content only
- Viewer → read-only access

---

### 4.9 Advanced Search

**Search Capabilities:**
- Full-text search across notes, folders, and files
- Filter by content type (pages, folders, files)
- Tag-based filtering
- Date range filtering
- Sort by relevance, date, or name
- Match scoring for ranked results
- Snippet previews showing matched text in context

---

### 4.10 Tags & Organization

- Create custom tags with user-chosen colors
- Apply tags to notes and folders
- Filter content by tags
- Tag autocomplete in search
- Hierarchical tag support (parent/child tags)
- Global tag management interface
- Visual color-coded tag badges

---

### 4.11 Folder Organization

- Unlimited nested folder hierarchy
- Custom folder colors
- Optional cover images
- Expand/collapse folder tree
- Drag-and-drop pages between folders
- Move folders with their contents
- Folder-level sharing and collaboration

---

### 4.12 Todo / Task Management

- Built-in task list on the dashboard
- Create, complete, and reorder tasks
- Sort order persistence
- Quick access from the main interface

---

### 4.13 Whiteboard & Diagramming

- **Built-in Whiteboard:** Canvas drawing node with shapes, freehand drawing, text, and eraser
- **Excalidraw Integration:** Full hand-drawn style diagramming embedded in notes
- **Mermaid Diagrams:** Flowcharts, sequence diagrams, Gantt charts, pie charts — all rendered from simple text syntax

---

### 4.14 Study Toolbar

An expandable side toolbar providing quick access to all study tools:
- Pomodoro timer
- Flashcard decks
- Quizzes
- File library
- Advanced search
- Collapsible UI (56px collapsed / 192px expanded)
- Badge notifications for overdue items

---

### 4.15 Keyboard Shortcuts

Full keyboard shortcut system via react-hotkeys-hook:
- Standard formatting: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)
- Ctrl+Shift+X (strikethrough)
- Ctrl+Z / Ctrl+Shift+Z (undo/redo)
- Slash command palette for quick block insertion
- Escape to close panels/modals
- Keyboard shortcuts help modal

---

## 5. Database Schema (27 Tables)

### Authentication (4 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `user` | id, email, name, image, emailVerified, createdAt | User accounts |
| `account` | userId, providerId, accountId, accessToken, refreshToken | OAuth provider links |
| `session` | userId, token, expiresAt, ipAddress, userAgent | Session management |
| `verification` | identifier, value, expiresAt | Email verification tokens |

### Content (6 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `folders` | id, name, ownerId, parentId, color, coverImage, isExpanded, sortOrder | Nested folder hierarchy |
| `pages` | id, name, folderId, ownerId, content, blocks[], ydocState, version, isPublic | Notes/documents with Y.js state |
| `tags` | id, userId, name, color, parentId | Custom tag definitions |
| `pageTags` | pageId, tagId | Page-to-tag associations |
| `folderTags` | folderId, tagId | Folder-to-tag associations |
| `todos` | id, userId, text, completed, sortOrder | Task items |

### Collaboration (4 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `pageCollaborators` | pageId, userId, role, addedBy | Per-page sharing with roles |
| `folderCollaborators` | folderId, userId, role, addedBy | Per-folder access control |
| `collaborationSessions` | pageId, userId, socketId, cursorPosition, cursorColor | Active editing sessions |
| `presence` | userId, pageId, status, lastSeen, metadata | User presence tracking |

### Learning (6 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `flashcardDecks` | id, userId, pageId, name, description | Flashcard deck collections |
| `flashcards` | id, deckId, front, back, type, sortOrder | Individual flashcards |
| `flashcardProgress` | id, userId, cardId, interval, easeFactor, nextReview, repetitions | SM-2 progress tracking |
| `quizzes` | id, userId, pageId, title, settings, status | Quiz definitions |
| `quizQuestions` | id, quizId, type, question, options, correctAnswer, difficulty, explanation | Quiz questions |
| `quizAttempts` | id, quizId, userId, score, totalQuestions, answers, completedAt | Quiz attempt history |

### Files (2 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `files` | id, userId, pageId, name, mimeType, size, storageKey, url, type | Uploaded file metadata |
| `fileFolders` | id, userId, name, parentId | Virtual file organization |

### Sharing (2 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `shareLinks` | id, pageId, token, permission, password, expiresAt, viewCount | Public share links |
| `shareClaims` | id, shareLinkId, userId | Share link claims |

### Billing & System (3 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `subscriptions` | userId, tier, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd | Subscription management |
| `aiUsage` | userId, month, requestCount | Monthly AI quota tracking |
| `rateLimits` | identifier, endpoint, count, windowStart | Per-endpoint rate limiting |

---

## 6. API Reference (34 Endpoints)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| ALL | `/api/auth/[...all]` | better-auth catch-all handler (login, register, OAuth, session, logout) |

### Pages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pages` | List all user's pages |
| POST | `/api/pages` | Create a new page |
| GET | `/api/pages/[id]` | Fetch a single page with content |
| PUT | `/api/pages/[id]` | Update page metadata (name, folder, public) |
| DELETE | `/api/pages/[id]` | Delete a page (owner only) |
| POST | `/api/pages/[id]/save` | Save page content with version control |
| POST | `/api/pages/[id]/share` | Create or update a share link |
| GET | `/api/pages/[id]/collaborators` | List page collaborators |
| POST | `/api/pages/[id]/collaborators` | Add/update collaborator |
| GET | `/api/pages/[id]/tags` | List page tags |
| POST | `/api/pages/[id]/tags` | Add/remove tag from page |
| POST | `/api/pages/[id]/move` | Move page to a different folder |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List all user's folders |
| POST | `/api/folders` | Create a new folder |
| PUT | `/api/folders/[id]` | Update folder (name, color, expanded) |
| DELETE | `/api/folders/[id]` | Delete folder and contents |
| POST | `/api/folders/[id]/move` | Move folder to new parent |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate` | Stream AI-generated content |
| GET | `/api/ai/generate` | Check AI availability |
| GET | `/api/ai/models` | List available AI models |
| POST | `/api/ai/actions` | Execute batch AI actions |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List user's files with filters |
| POST | `/api/files` | Upload a file |
| GET | `/api/files/[id]` | Get file details |
| DELETE | `/api/files/[id]` | Delete a file |
| POST | `/api/files/extract-text` | Extract text from PDF |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/share/[token]` | Access a shared document |
| POST | `/api/share/[token]/claim` | Claim a shared document to workspace |

### Search & Organization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Full-text search across content |
| GET | `/api/tags` | List all tags |
| POST | `/api/tags` | Create/manage tags |
| GET | `/api/shared-with-me` | List content shared with user |
| POST | `/api/todos` | Manage todo items |

### Payments & Subscription
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/checkout` | Create Stripe checkout session |
| POST | `/api/stripe/portal` | Open Stripe billing portal |
| POST | `/api/stripe/webhook` | Handle Stripe webhook events |
| GET | `/api/subscription` | Get current subscription tier |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |

---

## 7. State Management

The application uses React Context API with 10 dedicated providers:

| Context | Purpose |
|---------|---------|
| `AuthContext` | User authentication state, session, login/logout |
| `NotesContext` | Notes, folders, CRUD operations, auto-save |
| `AIContext` | AI model list, generation state, streaming |
| `FlashcardContext` | Decks, cards, SM-2 progress, review sessions |
| `QuizContext` | Quizzes, questions, attempts, results |
| `PomodoroContext` | Timer state, settings, session tracking |
| `FileLibraryContext` | Files, folders, upload, quota tracking |
| `TagContext` | Tags, colors, page/folder associations |
| `SidebarContext` | Sidebar open/closed, active section |
| `StudyToolbarContext` | Toolbar expanded/collapsed, active tool |

### Custom Hooks (15)

| Hook | Purpose |
|------|---------|
| `use-collaboration` | Real-time collaboration management |
| `use-debounced-save` | Auto-save with configurable debounce |
| `use-presence` | User presence tracking |
| `use-realtime-sync` | Y.js document synchronization |
| `use-sidebar` | Sidebar state and controls |
| + 10 additional utility hooks | Various UI and data utilities |

---

## 8. Subscription Tiers

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Notes | 10 | 100 | Unlimited |
| Folders | 3 | 20 | Unlimited |
| Collaborators per note | 2 | 10 | Unlimited |
| Storage | 100 MB | 5 GB | 50 GB |
| Max file size | 5 MB | 100 MB | 500 MB |
| AI requests / month | 10 | 500 | Unlimited |
| Real-time collaboration | Yes | Yes | Yes |
| Priority support | No | Yes | Yes |
| Custom branding | No | No | Yes |
| Price (monthly) | $0 | — | — |
| Price (yearly) | $0 | 20% discount | 20% discount |

Billing handled end-to-end by Stripe: checkout sessions, customer portal, webhook-driven subscription lifecycle management.

---

## 9. Security Implementation

| Category | Implementation |
|----------|---------------|
| **Authentication** | better-auth with session tokens, 7-day session duration, 24h update interval |
| **Password Security** | bcryptjs hashing, 8–128 character enforcement |
| **Session Security** | IP address and user agent tracking, unique token enforcement |
| **Input Validation** | Zod schemas on all API inputs |
| **XSS Prevention** | HTML sanitization — strips `<script>`, event handlers, `javascript:` URLs |
| **Rate Limiting** | Dual-layer: in-memory (dev) + database (prod), configurable per endpoint |
| **Content Limits** | Block content max 100KB, page content max 10MB, Y.Doc max 10MB |
| **CSRF Protection** | Built-in via Next.js |
| **Authorization** | Owner/admin/editor/viewer role checks on every operation |
| **Optimistic Locking** | Version-based conflict detection on page saves |
| **OAuth Security** | Google and GitHub OAuth with proper token handling |
| **Container Security** | Non-root user (nextjs:1001) in Docker containers |
| **Transport Security** | TLS/SSL via Nginx, Redis TLS support |

### Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10 requests/minute |
| Page Save | 10 requests/minute |
| Folder Create | 20 requests/minute |
| General API | 100 requests/minute |

---

## 10. Deployment Architecture

### Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Next.js App | Custom (multi-stage build) | 3000 | Frontend + API |
| WebSocket Server | Custom (Node.js) | 3001 | Real-time collaboration |
| PostgreSQL | postgres:latest | 5432 | Database |
| Redis | redis:latest | 6379 | Cache + pub/sub |
| Nginx | nginx:latest | 80/443 | Reverse proxy + SSL |

### Build & Deploy

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run dev:backend` | Start backend API + WebSocket server |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint checks |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio (visual DB editor) |
| `deploy.sh` | Automated production deployment |
| `init-ssl.sh` | SSL certificate setup |

### Production Configuration

- **Next.js standalone output** — optimized for Docker with minimal image size
- **Multi-stage Docker build** — separate dependency, build, and runtime stages
- **Nginx reverse proxy** — routes HTTP traffic to Next.js and WebSocket traffic to Socket.io server
- **SSL termination** at Nginx layer
- **GitHub Actions** for CI/CD pipelines

---

## 11. Key Design Patterns

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **CRDT (Y.js)** | Real-time collaboration | Conflict-free concurrent editing without central authority |
| **Optimistic Locking** | Page saves | Prevent conflicting overwrites via version checking |
| **Provider Abstraction** | AI integration | Swap AI providers (Groq/OpenAI/Ollama) without changing application code |
| **SSE Streaming** | AI responses | Real-time token-by-token display of AI output |
| **Debounced Auto-Save** | Editor | Reduce API calls while ensuring no data loss |
| **SM-2 Algorithm** | Flashcards | Scientifically-backed spaced repetition scheduling |
| **Role-Based Access** | Sharing & collaboration | Granular permission control (owner/admin/editor/viewer) |
| **Block-Based Content** | Editor | Structured content model enabling AI processing and reordering |
| **Context Providers** | State management | Modular, composable state across 10 feature domains |
| **Graceful Degradation** | Redis dependency | App works in single-instance mode if Redis is unavailable |

---

## 12. Summary

**Noted** is a production-ready, enterprise-grade knowledge management platform that uniquely combines:

1. **Document editing** — Professional rich text editor with 40+ formatting options, drag-and-drop blocks, tables, code highlighting, and embedded diagrams
2. **AI intelligence** — Multi-provider AI system with 9 generation modes including quiz and flashcard generation from any note content
3. **Active learning** — SM-2 spaced repetition flashcards and comprehensive quiz engine transform passive notes into active learning tools
4. **Real-time collaboration** — Y.js CRDT ensures conflict-free multi-user editing with live cursors and presence
5. **Productivity tools** — Integrated Pomodoro timer, todo lists, and study toolbar keep users focused
6. **File management** — Upload, organize, view PDFs, and extract text for AI processing
7. **Security & scale** — Role-based access, rate limiting, input sanitization, optimistic locking, Redis-backed horizontal scaling, and Docker deployment

The platform bridges the gap between note-taking apps (like Notion), learning tools (like Anki), and collaboration platforms (like Google Docs) — delivering all three in a single, modern, AI-enhanced experience.

---

*Generated: February 2026*
