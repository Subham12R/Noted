# Noted Backend

Standalone Hono API server + Socket.io WebSocket server. Deployed on DigitalOcean. The Next.js frontend on Vercel calls this server for all data operations.

## Stack

- **Hono** — HTTP API framework
- **Socket.io** — Real-time collaboration WebSocket
- **Drizzle ORM** — PostgreSQL queries
- **better-auth** — Authentication (email/password, Google, GitHub)
- **Stripe** — Subscription billing
- **Cloudflare R2** — File storage (S3-compatible)
- **Redis** — Socket.io pub/sub adapter for multi-instance scaling

## Setup

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Encryption (for user API keys stored in DB)
NODE_ENCRYPTION_KEY=   # 32-byte hex: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# AI providers
GROQ_API_KEY=
OPENAI_API_KEY=        # optional
GEMINI_API_KEY=        # optional
NVIDIA_API_KEY=        # optional
MINIMAX_API_KEY=       # optional

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_TEAM_MONTHLY=
STRIPE_PRICE_TEAM_YEARLY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Redis (optional — falls back to single-instance mode)
REDIS_URL=

# Server
PORT=8080
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio |

## API Routes

| Prefix | Description |
|---|---|
| `POST /api/auth/*` | better-auth (sign in, sign up, OAuth, session) |
| `GET/POST /api/folders` | Folder CRUD |
| `GET/POST /api/pages` | Page CRUD |
| `GET/POST /api/todos` | Todo list |
| `GET/POST /api/tags` | Tags |
| `GET/POST /api/files` | File upload (R2) |
| `GET/POST /api/flashcards/decks` | Flashcard decks |
| `GET/POST /api/ai/generate` | AI generation (streaming SSE) |
| `GET /api/ai/models` | Available AI models |
| `POST /api/ai/actions` | AI actions on pages |
| `GET /api/share/:token` | View shared page |
| `POST /api/share/:token/claim` | Claim shared page access |
| `GET /api/shared-with-me` | Pages/folders shared with user |
| `POST /api/stripe/checkout` | Create Stripe checkout session |
| `POST /api/stripe/portal` | Customer billing portal |
| `POST /api/stripe/webhook` | Stripe webhook handler |
| `GET /api/subscription` | User subscription info |
| `GET/PATCH /api/users/profile` | User profile |
| `PATCH /api/users/password` | Change password |
| `GET /api/users/search` | Find user by email |
| `GET/POST /api/user/api-keys` | Saved LLM API keys |
| `GET /api/users/me` | Current user |
| `GET /api/health` | Health check |

## WebSocket Events

Handled by Socket.io on the same port as the HTTP server.

| Event | Direction | Description |
|---|---|---|
| `join-page` | client→server | Join a page room for collaboration |
| `leave-page` | client→server | Leave page room |
| `doc-update` | bidirectional | Yjs document update (base64) |
| `sync-state` | server→client | Full document state on join |
| `cursor-update` | bidirectional | Cursor position |
| `presence-update` | client→server | Active/idle/away status |
| `content-update` | bidirectional | HTML content sync (TipTap) |
| `excalidraw-update` | bidirectional | Canvas element sync |
| `room-users` | server→client | List of users in the room |
| `user-joined` | server→client | New user joined |
| `user-left` | server→client | User left |

## Deployment (DigitalOcean)

```bash
# Build image
docker build -t noted-backend .

# Run
docker run -p 8080:8080 --env-file .env noted-backend
```

Or use DigitalOcean App Platform with the included Dockerfile. Set all environment variables in the App Platform dashboard.

### CORS

The server allows requests from `NEXT_PUBLIC_APP_URL`. Set this to your Vercel frontend URL in production.
