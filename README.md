# Clockify Clone (Full-Stack Next.js 15)

A self-hosted, multi-tenant time tracking and productivity management web application replicating Clockify's core capabilities. Built with Next.js 15 (App Router), Prisma ORM, PostgreSQL, Tailwind CSS, and optional Redis caching.

---

## 🚀 Features

- **Live & Manual Time Tracking**: Real-time timer with instant auto-stop on new timer start, tag assignment, project associations, and billability toggles.
- **Timesheets**: Grouped chronological daily logs and interactive weekly time matrices.
- **Projects, Clients & Tasks**: Hierarchical organization, custom color tags, hourly billing rate overrides, and soft-archiving.
- **Workspaces & Team Management**: Multi-tenant workspace isolation with role-based permissions (`ADMIN`, `MANAGER`, `MEMBER`).
- **Reports & Analytics**: Visual charts, revenue/billable breakdown filters, and one-click CSV exports.
- **Authentication**: JWT-based session management with secure httpOnly cookies.

---

## ⚡ 100% Free Deployment on Vercel

You can deploy this application completely free of charge using:
- **Vercel** (Hobby Plan - Free hosting & serverless functions)
- **Neon** (Free serverless PostgreSQL with connection pooling)
- **Upstash** (Free serverless Redis for real-time timers — optional, automatic fallback to PostgreSQL)

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ and npm
- Docker & Docker Compose (for local PostgreSQL & Redis)

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local Database and Cache
```bash
docker compose up -d
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 5. Push Database Schema & Seed Data
```bash
npx prisma db push
npx prisma db seed
```

Default seeded credentials:
- **Admin**: `admin@company.com` / `password123`
- **Manager**: `manager@company.com` / `password123`
- **Developer**: `developer@company.com` / `password123`

### 6. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

- `npm run dev` - Start development server with Turbopack.
- `npm run build` - Generate Prisma client and create production build.
- `npm run start` - Run production server.
- `npm run lint` - Run ESLint.
- `npx prisma studio` - Open Prisma visual database browser.
