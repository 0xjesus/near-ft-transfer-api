# NEAR FT Transfer Dashboard 🚀

A production-grade, real-time dashboard for monitoring and testing the NEAR FT Transfer API. Built with Next.js 14, React, TypeScript, Tailwind CSS, and shadcn/ui with a stunning glassmorphism design featuring NEAR brand colors.

![NEAR Dashboard](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ Features

### Real-Time Monitoring
- **Live Metrics** - Total transfers, success rate, throughput (tx/s), queue size updating every second
- **Performance Charts** - Beautiful animated charts showing throughput, success rate, and queue size over time
- **Nonce Manager Status** - Monitor active, available, and locked nonces in real-time
- **System Health** - Visual health status with uptime tracking and automatic alerts

### Transfer Testing
- **Single Transfers** - Quick testing of individual transfers with validation
- **Batch Transfers** - Test multiple transfers simultaneously with dynamic form controls
- **Real-Time Status** - Instant feedback on transfer creation with toast notifications

### Advanced Table Features
- **Recent Transfers Table** - View and manage all transfers with real-time updates
- **Search & Filter** - Search by ID, receiver, or transaction hash with status filtering
- **One-Click Copy** - Copy IDs and transaction hashes to clipboard instantly
- **CSV Export** - Export filtered transfers to CSV for analysis
- **NEAR Explorer Links** - Direct links to transaction details on NEAR Explorer

### Premium UX/UI
- **Glassmorphism Design** - Modern frosted glass effects with backdrop blur
- **NEAR Brand Colors** - Teal, purple, and blue gradients throughout
- **Smooth Animations** - Framer Motion powered transitions and micro-interactions
- **Dark Mode Default** - Beautiful dark theme optimized for extended viewing
- **Fully Responsive** - Perfect experience on desktop, tablet, and mobile
- **Skeleton Loaders** - Elegant loading states (no spinners)
- **Accessible** - WCAG compliant with keyboard navigation support

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

## 📦 Installation

### Prerequisites

- Node.js 18+ (recommended: v20 LTS)
- npm, yarn, or pnpm
- NEAR FT Transfer API running on `localhost:3000` (or configure in `.env.local`)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   PORT=3001
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open dashboard**
   Navigate to [http://localhost:3001](http://localhost:3001)

## 🚀 Production Deployment

### Build for Production

```bash
npm run build
npm run start
```

The dashboard will be available at `http://localhost:3001`

### Docker Deployment (Optional)

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT 3001

CMD ["node", "server.js"]
```

### Nginx Configuration

See `nginx.conf.example` for production-ready Nginx configuration with:
- Reverse proxy to Next.js (port 3001)
- API proxy to NEAR FT Transfer API (port 3000)
- SSL/TLS support
- Gzip compression
- Security headers
- WebSocket support

## 📁 Project Structure

```
near-dashboard/
├── app/
│   ├── page.tsx           # Main dashboard page
│   ├── layout.tsx         # Root layout with dark mode
│   └── globals.css        # Global styles with NEAR colors
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── health-status.tsx  # Health monitoring component
│   ├── metric-card.tsx    # Metric display cards
│   ├── performance-charts.tsx # Real-time charts
│   ├── transfer-form.tsx  # Transfer testing forms
│   └── transfers-table.tsx # Transfers data table
├── lib/
│   ├── api-client.ts      # API client for backend
│   ├── hooks.ts           # Custom React hooks
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── .env.example           # Environment variables template
├── .env.local             # Local environment config (gitignored)
├── nginx.conf.example     # Nginx configuration example
└── README.md              # This file
```

## 🎨 Customization

### Update API URL

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Change Port

Edit `.env.local` or `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p YOUR_PORT",
    "start": "next start -p YOUR_PORT"
  }
}
```

### Modify Colors

Edit `app/globals.css` to customize the color scheme:
```css
:root {
  --primary: YOUR_COLOR;
  --secondary: YOUR_COLOR;
  /* ... */
}
```

### Update Polling Intervals

In `app/page.tsx`:
```tsx
const { stats } = useStats(1000); // Update every 1 second
const metrics = usePerformanceMetrics(60); // Keep last 60 data points
```

## 🔧 API Integration

The dashboard expects the following API endpoints:

### GET `/health`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-07T12:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### GET `/stats`
```json
{
  "stats": {
    "totalTransfers": 1000,
    "successfulTransfers": 980,
    "failedTransfers": 20,
    "successRate": 98.0,
    "throughput": 5.2,
    "queueSize": 10,
    "pendingTransfers": 5
  },
  "nonceManager": {
    "activeNonces": 50,
    "availableNonces": 45,
    "lockedNonces": 5
  },
  "timestamp": "2025-10-07T12:00:00Z"
}
```

### POST `/transfer`
```json
{
  "receiverId": "alice.near",
  "amount": "1.5",
  "memo": "Payment for services"
}
```

### POST `/transfer/batch`
```json
{
  "transfers": [
    {
      "receiverId": "alice.near",
      "amount": "1.5"
    }
  ]
}
```

### GET `/transfer/:id`
```json
{
  "id": "transfer-123",
  "status": "completed",
  "receiverId": "alice.near",
  "amount": "1.5",
  "transactionHash": "ABC123...",
  "createdAt": "2025-10-07T12:00:00Z",
  "completedAt": "2025-10-07T12:00:05Z"
}
```

## 🐛 Troubleshooting

### Dashboard won't connect to API

1. Check API is running: `curl http://localhost:3000/health`
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check CORS settings on API server
4. Review browser console for errors

### Charts not updating

1. Verify API `/stats` endpoint is responding
2. Check network tab for failed requests
3. Ensure polling interval is reasonable (1000ms recommended)

### Build errors

1. Clear Next.js cache: `rm -rf .next`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall dependencies: `npm install`
4. Rebuild: `npm run build`

## 📄 License

MIT License - feel free to use this dashboard for your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Open an issue in the repository
- Check existing documentation
- Review API integration guide above

---

Built with ❤️ for the NEAR ecosystem
