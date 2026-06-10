# Bot Admin Dashboard

A Next.js dashboard that connects to your remote Bot Express API for real-time monitoring and control.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS v4, Lucide Icons
- **Backend:** Next.js API Routes (proxy to remote bot)
- **Real-time:** Server-Sent Events (SSE) with 2–3s polling of remote bot

## Environment Variables

Copy `.env.example` to `.env.local` (local) or set in Vercel:

```env
NEXT_PUBLIC_BOT_API_URL=http://your-vps-ip:4000
BOT_API_KEY=your-secret-api-key
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BOT_API_URL` | Base URL of your remote Bot Express server |
| `BOT_API_KEY` | API key sent as `x-api-key` header (server-side only) |

## Getting Started

```bash
npm install
cp .env.example .env.local   # configure your bot URL + API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Remote Bot API Contract

Your Bot Express server must expose these endpoints (authenticated via `x-api-key`):

### `GET /api/bot-data?scope=<scope>`

| Scope | Response `data` field |
|-------|----------------------|
| `stats` | `{ stats: DashboardStats }` |
| `metrics` | `{ metrics: { cpu: number, ram: number } }` |
| `status` | `{ status: { api: "connected", gateway: "connected" } }` |
| `messages` | `{ messages: BotMessage[] }` |
| `commands` | `{ commands: BotCommand[] }` |
| `groups` | `{ groups: BotGroup[] }` |
| `logs` | `{ logs: SystemLog[] }` |

Optional query params: `limit` (for messages/logs).

Example response:

```json
{
  "success": true,
  "data": {
    "stats": {
      "todayMessages": 1284,
      "totalGroups": 47,
      "totalUsers": 3892,
      "uptimeSeconds": 1048320,
      "messageTrend": "+12% from yesterday"
    }
  }
}
```

### `POST /api/bot-command`

```json
{ "action": "restart" }
{ "action": "clear_cache" }
{ "action": "reload_commands" }
{ "action": "toggle_command", "commandId": "1", "enabled": true }
{ "action": "send_message", "groupId": "g1", "message": "Hello" }
{ "action": "kick", "groupId": "g1", "userId": "123456" }
{ "action": "promote", "groupId": "g1", "userId": "123456" }
{ "action": "purge", "groupId": "g1", "confirm": "CONFIRM" }
```

## Dashboard API Routes (Next.js proxy)

| Method | Endpoint | Remote call |
|--------|----------|-------------|
| GET | `/api/stats` | `bot-data?scope=stats` |
| GET | `/api/status` | `bot-data?scope=status` |
| GET | `/api/messages` | `bot-data?scope=messages` |
| GET | `/api/logs` | `bot-data?scope=logs` |
| GET | `/api/commands` | `bot-data?scope=commands` |
| PATCH | `/api/commands/[id]` | `bot-command` toggle |
| POST | `/api/commands/reload` | `bot-command` reload |
| GET | `/api/groups` | `bot-data?scope=groups` |
| POST | `/api/groups/[id]/message` | `bot-command` send_message |
| POST | `/api/groups/[id]/kick` | `bot-command` kick |
| POST | `/api/groups/[id]/promote` | `bot-command` promote |
| POST | `/api/groups/[id]/purge` | `bot-command` purge |
| POST | `/api/system/restart` | `bot-command` restart |
| POST | `/api/system/clear-cache` | `bot-command` clear_cache |

## SSE Streams (poll remote bot)

| Endpoint | Poll interval | Data |
|----------|---------------|------|
| `/api/stream/metrics` | 2s | CPU & RAM from remote bot |
| `/api/stream/messages` | 2.5s | New messages (deduplicated) |
| `/api/stream/logs` | 3s | New logs (deduplicated) |

## Vercel Deployment

1. Push to GitHub — Vercel auto-deploys
2. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_BOT_API_URL`
   - `BOT_API_KEY`
3. Ensure your VPS bot allows requests from Vercel (firewall / CORS not needed for server-side proxy)
