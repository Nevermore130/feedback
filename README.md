# InsightFlow - UX Analytics

User feedback analysis platform with visualization and management features.

## Project Structure

```
feedback/
├── server/                    # Node.js API server
│   ├── src/
│   │   ├── index.ts           # Express server entry
│   │   ├── types.ts           # Type definitions
│   │   ├── data/mockData.ts   # Mock data
│   │   └── routes/feedback.ts # API routes
│   ├── package.json
│   └── tsconfig.json
├── components/                # React components
├── services/
│   ├── api.ts                 # API service
│   └── geminiService.ts       # Gemini AI service
├── App.tsx                    # App entry
├── types.ts                   # Frontend types
└── vite.config.ts             # Vite config
```

## Quick Start

### Install Dependencies

```bash
npm run install:all
```

### Start Development Server

```bash
# Start both frontend and backend
npm run dev:all
```

Or start separately:

```bash
# Start Node server (port 3001)
npm run dev:server

# Start frontend (port 3000)
npm run dev
```

### Access

- Frontend: http://localhost:3000
- API: http://localhost:3001/api

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback` | Get all feedback |
| GET | `/api/feedback/:id` | Get single feedback |
| POST | `/api/feedback` | Create feedback |
| PUT | `/api/feedback/:id` | Update feedback |
| DELETE | `/api/feedback/:id` | Delete feedback |
| GET | `/api/feedback/team/members` | Get team members |
| GET | `/api/health` | Health check |

## Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Recharts
- Tailwind CSS
- Lucide Icons

**Backend:**
- Node.js
- Express
- TypeScript
