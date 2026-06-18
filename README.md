# Marketplace Frontend

Next.js 14 App Router frontend for the Marketplace platform.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables (already configured for local dev)
# .env.local is pre-created — no changes needed for local development

# 3. Start development server
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:5000/api) |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL (default: http://localhost:5000) |

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@marketplace.com | admin123456 |

Register new Customer and Worker accounts via `/register`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Build for production |
| `npm start` | Start production build |
| `npm run typecheck` | Check TypeScript types |

## Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL + `/api`
   - `NEXT_PUBLIC_SOCKET_URL` = your Render backend URL
4. Deploy

## Pages

| Route | Role | Description |
|---|---|---|
| `/login` | All | Login page |
| `/register` | All | Register as Customer or Worker |
| `/customer/dashboard` | Customer | Order stats + quick create |
| `/customer/orders` | Customer | All orders list |
| `/customer/orders/:id` | Customer | Track order + action buttons |
| `/customer/wallet` | Customer | Payment history |
| `/worker/dashboard` | Worker | Stats + online toggle |
| `/worker/marketplace` | Worker | Available orders to accept |
| `/worker/orders` | Worker | Assigned order history |
| `/worker/orders/:id` | Worker | Submit credentials / verification code |
| `/worker/wallet` | Worker | Earnings + withdrawal request |
| `/admin/dashboard` | Admin | Platform analytics + charts |
| `/admin/orders` | Admin | All orders with status filter |
| `/admin/users` | Admin | Worker approval + user management |
| `/admin/withdrawals` | Admin | Process withdrawal requests |
| `/admin/disputes` | Admin | Resolve customer disputes |
