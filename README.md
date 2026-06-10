# Bot Admin Dashboard

A comprehensive web dashboard to manage and monitor your bot in real-time.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS v4, Lucide Icons, Shadcn-style UI components
- **Charts:** Recharts
- **Real-time (Phase 2):** Socket.io / SSE
- **Backend (Phase 2):** Next.js API Routes + PM2 integration

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard overview — stats cards + CPU/RAM charts |
| `/messages` | Live message feed with search and filters |
| `/commands` | Command management with enable/disable toggles |
| `/groups` | Group management with send/kick/promote/purge actions |
| `/settings` | System controls, connection status, live log viewer |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Dashboard home
│   ├── messages/
│   ├── commands/
│   ├── groups/
│   └── settings/
├── components/
│   ├── ui/               # Reusable UI primitives
│   ├── layout/           # Sidebar, header, shell
│   └── dashboard/        # Dashboard-specific components
└── lib/
    └── utils.ts          # Utilities
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/status` | API/Gateway connection state |
| GET | `/api/messages` | Message history |
| GET | `/api/commands` | List commands |
| PATCH | `/api/commands/[id]` | Toggle command enabled state |
| POST | `/api/commands/reload` | Reload plugins/commands |
| GET | `/api/groups` | List groups |
| POST | `/api/groups/[id]/message` | Send message to group |
| POST | `/api/groups/[id]/kick` | Kick member |
| POST | `/api/groups/[id]/promote` | Promote member |
| POST | `/api/groups/[id]/purge` | Purge all members |
| POST | `/api/system/restart` | PM2 restart bot |
| POST | `/api/system/clear-cache` | Clear bot cache |

## SSE Streams

| Endpoint | Interval | Data |
|----------|----------|------|
| `/api/stream/metrics` | 2s | CPU & RAM percentages |
| `/api/stream/messages` | Real-time | New chat messages |
| `/api/stream/logs` | Real-time | PM2 error log + system events |

## Bot Integration

Swap mock data with your real bot in `src/lib/bot-bridge.ts`:

```typescript
import { botBridge } from "@/lib/bot-bridge";
botBridge.setBotInstance(yourBot);
```

Set `BOT_PM2_NAME` in `.env` for PM2 restart and log tailing.
