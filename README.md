# Noted

> AI-powered collaborative study & knowledge management platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Noted transforms note-taking into an all-in-one study platform combining **real-time collaboration**, **AI-assisted content generation**, **spaced repetition flashcards**, **quizzes**, and a **Pomodoro timer** - all in one unified experience.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [AI Features](#ai-features)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features

### Core Note-Taking
- **Rich Text Editor** - TipTap-based editor with formatting, code blocks, tables, images, and embeds
- **Real-time Collaboration** - Simultaneous editing with cursor tracking and presence awareness
- **Block-based Content** - Modular content blocks for flexible document structure
- **Markdown Support** - Write in markdown with live preview

### AI-Powered Tools
- **Smart Summarization** - Auto-generate concise summaries
- **Content Expansion** - Elaborate on topics with AI assistance
- **Flowchart Generation** - Auto-create Mermaid diagrams
- **Translation** - Multi-language support
- **Quiz Generation** - Create quizzes from your notes
- **Flashcard Creation** - Generate study cards automatically

### Study Tools
- **Flashcards** - Spaced repetition with SM-2 algorithm
- **Quizzes** - Multiple question types with instant feedback
- **Pomodoro Timer** - Floating, draggable productivity timer

### Organization & Sharing
- **Hierarchical Folders** - Organize notes with nested folders
- **Tags** - Flexible tagging system
- **Sharing** - Public/private links with password protection
- **File Library** - Upload and manage PDFs, images, and documents

---

## Architecture

### High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Browser"]
        Editor["TipTap Editor"]
        YJS["Y.js Client"]
    end

    subgraph Frontend["Next.js Application :3000"]
        Pages["App Router Pages"]
        API["API Routes"]
        Context["React Context"]
        Components["152 Components"]
    end

    subgraph Realtime["WebSocket Server :3001"]
        Socket["Socket.io"]
        YServer["Y.js Server"]
    end

    subgraph Backend["Backend Services"]
        Auth["Better-Auth"]
        AI["AI Provider Layer"]
        Stripe["Stripe Payments"]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        Redis[(Redis)]
        S3[(S3/R2 Storage)]
    end

    subgraph External["External Services"]
        Groq["Groq API"]
        OpenAI["OpenAI API"]
        Ollama["Ollama (Local)"]
    end

    Browser --> Pages
    Editor --> YJS
    YJS <--> Socket
    Pages --> API
    API --> Auth
    API --> AI
    API --> Stripe
    Auth --> PG
    API --> PG
    Socket --> Redis
    Socket --> YServer
    YServer --> PG
    AI --> Groq
    AI --> OpenAI
    AI --> Ollama
    API --> S3
```

### User Authentication Flow

```mermaid
flowchart TD
    Start([User Visits App]) --> Check{Has Session?}
    Check -->|Yes| Validate[Validate Session Token]
    Check -->|No| Login[Show Login Page]

    Validate -->|Valid| Dashboard[Load Dashboard]
    Validate -->|Invalid/Expired| Login

    Login --> AuthMethod{Auth Method}
    AuthMethod -->|Email/Password| EmailAuth[Email Authentication]
    AuthMethod -->|OAuth| OAuthFlow[OAuth2 Flow]

    EmailAuth --> Verify[Verify Credentials]
    Verify -->|Success| CreateSession[Create Session]
    Verify -->|Fail| Error[Show Error]

    OAuthFlow --> Provider{Provider}
    Provider -->|Google| Google[Google OAuth]
    Provider -->|GitHub| GitHub[GitHub OAuth]
    Google --> Callback[OAuth Callback]
    GitHub --> Callback
    Callback --> CreateSession

    CreateSession --> SetCookie[Set Session Cookie]
    SetCookie --> Dashboard

    Error --> Login
```

### Real-Time Collaboration Flow

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant WS as WebSocket Server
    participant YJS as Y.js CRDT
    participant DB as PostgreSQL

    U1->>WS: Connect to document room
    WS->>DB: Load Y.js state
    DB-->>WS: Return saved state
    WS-->>U1: Sync initial state

    U2->>WS: Connect to same room
    WS-->>U2: Sync current state
    WS-->>U1: User 2 presence update

    U1->>WS: Edit operation (delta)
    WS->>YJS: Merge CRDT changes
    YJS-->>WS: Resolved state
    WS-->>U2: Broadcast changes
    WS->>DB: Persist Y.js state

    U2->>WS: Edit operation (delta)
    WS->>YJS: Merge CRDT changes
    YJS-->>WS: Resolved state
    WS-->>U1: Broadcast changes
```

### AI Generation Pipeline

```mermaid
flowchart LR
    subgraph Input
        User[User Request]
        Context[Note Context]
        Mode[AI Mode]
    end

    subgraph Processing
        Validate[Validate Quota]
        Truncate[Truncate Context]
        Prompt[Build System Prompt]
        Select[Select Model]
    end

    subgraph Generation
        Stream[Stream Response]
        Parse[Parse Markdown]
    end

    subgraph Output
        Display[Display to User]
        Track[Track Usage]
        Save[Save to Block]
    end

    User --> Validate
    Context --> Truncate
    Mode --> Prompt
    Validate -->|OK| Truncate
    Validate -->|Over Quota| Error[Show Upgrade]
    Truncate --> Prompt
    Prompt --> Select
    Select --> Stream
    Stream --> Parse
    Parse --> Display
    Stream --> Track
    Display --> Save
```

### Flashcard Spaced Repetition (SM-2 Algorithm)

```mermaid
flowchart TD
    Start([Review Card]) --> Show[Show Question]
    Show --> Reveal[User Reveals Answer]
    Reveal --> Grade{User Self-Grade}

    Grade -->|Again| G0[Quality = 0]
    Grade -->|Hard| G1[Quality = 1]
    Grade -->|Good| G2[Quality = 3]
    Grade -->|Easy| G3[Quality = 5]

    G0 --> Calculate[Calculate New Interval]
    G1 --> Calculate
    G2 --> Calculate
    G3 --> Calculate

    Calculate --> Update[Update Ease Factor]
    Update --> Schedule[Schedule Next Review]
    Schedule --> Next{More Cards?}

    Next -->|Yes| Start
    Next -->|No| Complete([Session Complete])

    subgraph SM2["SM-2 Formula"]
        EF["EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))"]
        Int["Interval = Previous * EF"]
    end
```

### Request/Response Flow

```mermaid
flowchart TD
    Request([HTTP Request]) --> Middleware{Middleware}

    Middleware --> RateLimit[Rate Limiting]
    RateLimit -->|Exceeded| R429[429 Too Many Requests]
    RateLimit -->|OK| Auth[Authentication Check]

    Auth -->|Public Route| Handler[Route Handler]
    Auth -->|Protected Route| Session{Valid Session?}

    Session -->|No| R401[401 Unauthorized]
    Session -->|Yes| Subscription[Check Subscription]

    Subscription --> Limits{Within Limits?}
    Limits -->|No| R403[403 Forbidden]
    Limits -->|Yes| Handler

    Handler --> DB[(Database)]
    DB --> Response[Build Response]
    Response --> Client([Return to Client])
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.4 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| TipTap | 3.15.3 | Rich text editor |
| Y.js | 13.6.29 | CRDT for collaboration |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.18+ | Runtime |
| Socket.io | 4.8.3 | WebSocket server |
| Better-Auth | 1.4.16 | Authentication |
| Drizzle ORM | 0.45.1 | Database ORM |
| Stripe | 20.2.0 | Payments |

### AI/ML
| Provider | Models | Purpose |
|----------|--------|---------|
| Groq | Llama 3.3 70B, Mixtral 8x7B | Primary AI inference |
| OpenAI | GPT-4o-mini | Alternative provider |
| Ollama | Llama 3.1, Mistral | Local inference |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| PostgreSQL 16 | Primary database |
| Redis 7 | Caching & pub/sub |
| S3/R2 | File storage |
| Docker | Containerization |

---

## Getting Started

### Prerequisites

- Node.js 22.18 or higher
- PostgreSQL 16
- Redis 7 (optional for development)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/noted.git
cd noted
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
npm run db:generate
npm run db:push
```

5. **Start the development servers**

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Backend API + WebSocket server
npm run dev:backend
```

6. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

### Using Docker

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/noted"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI Configuration
AI_PROVIDER="groq"  # groq | openai | ollama
GROQ_API_KEY="your-groq-api-key"
OPENAI_API_KEY="your-openai-api-key"
ENABLE_AI_FEATURES="true"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# File Storage
S3_BUCKET="your-bucket"
S3_REGION="us-east-1"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ pages : creates
    users ||--o{ folders : owns
    users ||--o{ sessions : has
    users ||--o{ accounts : links
    users ||--o{ subscriptions : subscribes
    users ||--o{ ai_usage : tracks

    folders ||--o{ pages : contains
    folders ||--o{ folders : nests

    pages ||--o{ page_collaborators : shares
    pages ||--o{ page_tags : tagged
    pages ||--o{ share_links : publishes

    tags ||--o{ page_tags : applies

    users {
        uuid id PK
        string email UK
        string name
        string password_hash
        boolean email_verified
        timestamp created_at
    }

    folders {
        uuid id PK
        uuid user_id FK
        uuid parent_id FK
        string name
        string color
        int sort_order
    }

    pages {
        uuid id PK
        uuid folder_id FK
        uuid user_id FK
        string title
        jsonb blocks
        binary ydoc_state
        boolean is_public
        timestamp updated_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        string tier
        string stripe_id
        timestamp current_period_end
    }

    ai_usage {
        uuid id PK
        uuid user_id FK
        int month
        int year
        int request_count
    }
```

### Core Tables (27 Total)

| Category | Tables |
|----------|--------|
| **Auth** | `users`, `accounts`, `sessions`, `verifications` |
| **Content** | `pages`, `folders`, `blocks` |
| **Collaboration** | `page_collaborators`, `folder_collaborators`, `collaboration_sessions`, `presence` |
| **Sharing** | `share_links` |
| **Files** | `files`, `file_folders` |
| **Learning** | `tags`, `page_tags`, `folder_tags`, `todos` |
| **Billing** | `subscriptions`, `ai_usage`, `rate_limits` |

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...all]` | ALL | Better-Auth handler |

### Pages
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pages` | GET | List user's pages |
| `/api/pages` | POST | Create new page |
| `/api/pages/[id]` | GET | Get page by ID |
| `/api/pages/[id]` | PUT | Update page |
| `/api/pages/[id]` | DELETE | Delete page |
| `/api/pages/[id]/save` | POST | Save page content |
| `/api/pages/[id]/share` | POST | Generate share link |
| `/api/pages/[id]/collaborators` | POST | Add collaborator |

### Folders
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/folders` | GET | List folders |
| `/api/folders` | POST | Create folder |
| `/api/folders/[id]` | PUT | Update folder |
| `/api/folders/[id]` | DELETE | Delete folder |

### AI
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/generate` | POST | Generate AI response (streaming) |
| `/api/ai/actions` | POST | Execute AI-requested actions |
| `/api/ai/models` | GET | List available models |

### Files
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files` | GET | List files |
| `/api/files` | POST | Upload file |
| `/api/files/[id]` | DELETE | Delete file |
| `/api/files/extract-text` | POST | Extract text from PDF |

---

## AI Features

### Available AI Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `answer` | Q&A about content | Ask questions about notes |
| `expand` | Elaborate with details | Add more information |
| `summarize` | Create TL;DR | Quick overviews |
| `translate` | Multi-language | Translate content |
| `explain` | Simplify topics | Learn complex concepts |
| `improve` | Writing enhancement | Polish your writing |
| `flowchart` | Generate diagrams | Visualize processes |
| `quiz` | Create questions | Test your knowledge |
| `flashcard` | Study cards | Spaced repetition |

### AI Provider Configuration

```mermaid
flowchart LR
    Config[AI_PROVIDER env] --> Check{Provider}
    Check -->|groq| Groq[Groq API]
    Check -->|openai| OpenAI[OpenAI API]
    Check -->|ollama| Ollama[Local Ollama]

    Groq --> Models1[Llama 3.3 70B<br/>Mixtral 8x7B<br/>Compound-Beta]
    OpenAI --> Models2[GPT-4o-mini]
    Ollama --> Models3[Llama 3.1 8B<br/>Mistral 7B]
```

### Usage Limits by Tier

| Tier | AI Requests/Month | Price |
|------|-------------------|-------|
| Free | 10 | $0 |
| Pro | 500 | $9/mo |
| Team | Unlimited | $29/mo |

---

## Deployment

### Docker Production Deployment

```yaml
# docker-compose.prod.yml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  websocket:
    build:
      context: .
      dockerfile: Dockerfile.ws
    ports:
      - "3001:3001"
    depends_on:
      - redis

  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: noted
      POSTGRES_USER: noted
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Deployment Steps

1. **Build the application**
```bash
npm run build
```

2. **Run database migrations**
```bash
npm run db:push
```

3. **Start production services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Set up SSL (optional)**
```bash
./init-ssl.sh your-domain.com
```

---

## Project Structure

```
noted/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── api/                # 34 API routes
│   │   ├── note/[id]/          # Note editor page
│   │   ├── folder/[id]/        # Folder view
│   │   └── pricing/            # Subscription pricing
│   ├── components/             # 152 React components
│   │   ├── dashboard/          # Main dashboard UI
│   │   ├── editor/             # TipTap editor components
│   │   ├── ai/                 # AI integration UI
│   │   ├── flashcards/         # Spaced repetition UI
│   │   ├── pomodoro/           # Timer widget
│   │   └── collaboration/      # Real-time features
│   ├── context/                # 10 React Context providers
│   ├── lib/                    # Business logic
│   │   ├── ai/                 # AI provider configuration
│   │   ├── auth.ts             # Authentication setup
│   │   └── subscription.ts     # Tier management
│   ├── db/                     # Database layer
│   │   └── schema.ts           # Drizzle ORM schema
│   └── types/                  # TypeScript definitions
├── backend/                    # Backend API + WebSocket server
│   └── src/index.ts            # Hono + Socket.io + Y.js handler
├── drizzle/                    # Database migrations
├── public/                     # Static assets
└── docker-compose.yml          # Docker configuration
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:backend` | Start backend API + WebSocket server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [TipTap](https://tiptap.dev/) - Rich text editor framework
- [Y.js](https://yjs.dev/) - CRDT implementation
- [Groq](https://groq.com/) - Fast AI inference
- [Better-Auth](https://better-auth.com/) - Authentication library

---

<p align="center">
  Made with dedication for learners everywhere
</p>
