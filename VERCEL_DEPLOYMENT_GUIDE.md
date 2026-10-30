# Free Vercel Deployment Guide for Clockify Clone

This guide walks you step-by-step through deploying this full-stack Next.js Clockify Clone **100% free** using Vercel and complementary free-tier cloud services.

---

## 🏗️ Architecture & 100% Free Stack

| Component | Service | Free Tier Allowance | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend & API Routes** | [Vercel](https://vercel.com) | Hobby Plan (Free forever) | Next.js Server Actions, SSR & static assets |
| **Relational Database** | [Neon](https://neon.tech) | 0.5 GB storage, serverless compute | PostgreSQL database for all app entities |
| **In-Memory Cache (Optional)** | [Upstash](https://upstash.com) | 10,000 commands / day | Redis cache for live running timers |
| **Git Repository** | [GitHub](https://github.com) | Free public/private repositories | Continuous deployment trigger for Vercel |

> [!NOTE]
> **Redis is optional**: The codebase (`src/lib/redis.ts`) includes a built-in fallback. If `REDIS_URL` is omitted, the application works normally by storing and reading active timers directly from PostgreSQL.

---

## 📋 Prerequisites

Before starting, make sure you have:
1. A **GitHub account** ([github.com](https://github.com))
2. A **Vercel account** ([vercel.com](https://vercel.com) — sign up with GitHub)
3. A **Neon account** ([neon.tech](https://neon.tech) — sign up with GitHub)
4. *(Optional)* An **Upstash account** ([upstash.com](https://upstash.com)) if you want Redis caching
5. Node.js 18+ and Git installed on your computer

---

## Step 1: Push Your Code to GitHub

If your repository is not yet pushed to GitHub, run the following in your terminal:

```bash
# 1. Check git status
git status

# 2. Stage all files (sensitive .env is already ignored in .gitignore)
git add .

# 3. Create your initial commit
git commit -m "feat: complete clockify clone with vercel deployment config"

# 4. Create a new repository on GitHub (via GitHub web UI or GitHub CLI: gh repo create)
# 5. Link and push to GitHub:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create a Free Serverless PostgreSQL Database on Neon

Vercel functions run serverless, so a serverless PostgreSQL instance with built-in connection pooling like Neon is the best choice.

1. Go to [neon.tech](https://neon.tech) and log in.
2. Click **"Create a project"**.
3. Name your project (e.g. `clockify-db`), select the region closest to your Vercel deployment region (e.g. `US East (N. Virginia)` or `Frankfurt`), and click **"Create project"**.
4. On the Neon dashboard, locate the **Connection Details** card.
5. Ensure **"Pooled connection"** checkbox is checked (this appends `-pooler` to the host, preventing connection exhaustion in serverless environments).
6. Copy the connection string. It will look similar to:
   ```text
   postgresql://alex:AbC123xYz@ep-cool-cloud-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 3: Initialize Database Schema & Seed Data

Push the database tables to your Neon database and populate it with initial seed users and demo projects.

Run the following commands in your local project terminal (replace `<YOUR_NEON_DATABASE_URL>` with your Neon connection string from Step 2):

```bash
# 1. Push database tables and indexes to Neon
DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npx prisma db push

# 2. Seed default users, demo workspace, projects, tags, and sample time entries
DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npx prisma db seed
```

### 🔑 Seeded Demo Credentials:
After seeding, the database contains three ready-to-use accounts (all use password: `password123`):

- **Admin Account**: `admin@company.com` / `password123` (Full workspace access, team settings, hourly rates)
- **Manager Account**: `manager@company.com` / `password123` (Team reporting, client & project management)
- **Developer Account**: `developer@company.com` / `password123` (Time tracking and personal timesheet)

---

## Step 4: (Optional) Set Up Free Redis on Upstash

*If you prefer to run purely on PostgreSQL without Redis, skip to Step 5.*

1. Log in to [upstash.com](https://upstash.com).
2. Click **"Create Database"**.
3. Name your database (e.g. `clockify-cache`), select the same region as your Neon database, and select **"Free"** tier.
4. Once created, scroll down to the **"Connect"** section.
5. Click on the **"ioredis"** tab or copy the **Redis URL**:
   ```text
   rediss://default:your_password@your_endpoint.upstash.io:6379
   ```
   *(Note: ensure the scheme is `rediss://` for TLS).*

---

## Step 5: Deploy to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** → **"Project"**.
3. Under **"Import Git Repository"**, find your `clockify` repository and click **"Import"**.
4. In the **Configure Project** screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build and Output Settings**: Defaults are pre-configured (`npm run build` runs `prisma generate && next build`).
5. Expand the **"Environment Variables"** section and add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Your pooled Neon connection string from Step 2 |
| `JWT_SECRET` | *(Random 32+ char string)* | Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-clockify.vercel.app` | Leave as your anticipated Vercel domain or update after deploy |
| `REDIS_URL` | `rediss://...` *(Optional)* | Upstash Redis connection string (if configured in Step 4) |

> [!TIP]
> To quickly generate a secure `JWT_SECRET`, run in your terminal:
> ```bash
> openssl rand -base64 32
> ```

6. Click **"Deploy"**.
7. Vercel will install dependencies, generate the Prisma Client, compile Next.js pages and Server Actions, and deploy your site in ~60–90 seconds.

---

## Step 6: Post-Deployment Verification

1. Once the deployment finishes, click on your project's preview thumbnail or visit the generated URL: `https://<your-project>.vercel.app`.
2. Open `/login` and sign in with the seed credentials:
   - Email: `admin@company.com`
   - Password: `password123`
3. Test core functionality:
   - **Time Tracker**: Start a timer, select a project/tags, and stop it.
   - **Timesheet**: View daily and weekly timesheets.
   - **Projects & Clients**: Create a new client and billable project.
   - **Reports**: Review summary charts and export CSV reports.
   - **Team Management**: Invite new members with roles (`ADMIN`, `MANAGER`, `MEMBER`).
4. In your Vercel Project Settings → **Environment Variables**, ensure `NEXT_PUBLIC_APP_URL` matches your actual production URL (e.g. `https://clockify-production.vercel.app`), then trigger a redeploy if you had to change it.

---

## 🛠️ Common Questions & Troubleshooting

### Q: Why do we use Neon's Pooled connection instead of Direct connection?
Serverless platforms like Vercel create ephemeral function instances. Direct PostgreSQL connections can quickly saturate the database connection pool during traffic spikes. Neon's built-in PgBouncer pooler (`-pooler` in the host) allows thousands of concurrent serverless requests without exhausting database connection limits.

### Q: How do I apply future schema changes after deploying?
Whenever you modify `prisma/schema.prisma`:
1. Push changes to Neon:
   ```bash
   DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npx prisma db push
   ```
2. Commit and push your code to GitHub:
   ```bash
   git add prisma/schema.prisma
   git commit -m "update schema"
   git push origin main
   ```
3. Vercel automatically detects the push, executes `prisma generate`, and rebuilds the application.

### Q: Can I connect a custom domain?
Yes! In Vercel:
1. Navigate to your project → **Settings** → **Domains**.
2. Enter your custom domain (e.g., `time.yourdomain.com`).
3. Follow the DNS records instructions (CNAME / A record). Vercel provides automatic SSL certificates for free.

### Q: Is there any cost or expiration?
No. Vercel Hobby, Neon Free Tier, and Upstash Free Tier have no expiration date and require no credit card to start. As long as you stay within the generous free-tier limits, running this Clockify clone is 100% free forever.
