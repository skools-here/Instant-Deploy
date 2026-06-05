# Instant Deploy PaaS

**Instant Deploy** is a dark-theme, developer-first Platform-as-a-Service (PaaS) similar to Render or Railway. It allows users to authenticate with Google, create projects, and deploy public Docker images (e.g. `nginx:latest`, `redis:latest`) to a local or remote Kubernetes cluster.

---

## 🛠️ Stack & Technology

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styles**: [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma Client](https://www.prisma.io/)
- **Authentication**: [NextAuth.js (v5 / Auth.js)](https://authjs.dev/)
- **State Management**: [TanStack Query v5 (React Query)](https://tanstack.com/query/latest)
- **Container Engine**: [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)

---

## ⚡ Key Features

1. **Google OAuth**: Authenticated workspace protection where users can only view their own projects and deployments.
2. **Kubernetes Workload Deployments**: Automatic generation and orchestration of Kubernetes `Deployment` and `Service` (ClusterIP) resources matching pod scales.
3. **Live DevOps Console**: Logs streamed from active pods inside the Kubernetes cluster with log text-filtering, pausing, and auto-scroll control.
4. **Replicas Dynamic Scale**:snappy scaling of pod workloads updating live replicas in the Kubernetes deployment manifest.
5. **Robust Mock Mode**: Fallback simulation that enables full UX testing (including fake pods, scaling status changes, and simulated image logs) when a Kubernetes cluster is not active.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js v18+](https://nodejs.org/)
- [Docker & Docker Compose](https://www.docker.com/)
- A running Kubernetes Cluster (e.g., Docker Desktop, Minikube, k3d, k3s) *[Optional - Mock mode active by default if config is absent]*

---

### Step 1: Environment Variables Setup

Copy the env template file and create a `.env` configuration file:

```bash
cp .env.example .env
```

Configure the credentials inside `.env`:
- Generate a NextAuth secret: `openssl rand -base64 32` and place it in `AUTH_SECRET`.
- Retrieve Google Client ID and Google Client Secret from [Google Cloud Developer Console](https://console.cloud.google.com/). Set the Authorized Redirect URI to:
  `http://localhost:3000/api/auth/callback/google`

---

### Step 2: Spin up PostgreSQL Database

Use Docker Compose to run a local PostgreSQL instance:

```bash
docker-compose up -d db
```

*This spins up a database container mapped to port `5432` with credentials matching the default `DATABASE_URL` in `.env`.*

---

### Step 3: Run Database Migrations

Apply the Prisma schema models to your PostgreSQL database:

```bash
npx prisma db push
```

*This creates the `users`, `accounts`, `sessions`, `projects`, and `deployments` tables in the database.*

---

### Step 4: Run Development Server

Start the local Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Running with Docker

To build and orchestrate both PostgreSQL and the compiled Next.js standalone application inside Docker Compose, run:

```bash
docker-compose up --build
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 🗂️ Project Structure

```
├── prisma/
│   └── schema.prisma        # Prisma Database Schemas (User, Project, Deployment)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/        # Auth.js Wildcard API handlers
│   │   │   ├── projects/    # Projects and Deployments CRUD API Routes
│   │   │   └── ...
│   │   ├── dashboard/       # DevOps PaaS aggregate metrics
│   │   ├── projects/        # Project Detail, Deployment scale, and logs console
│   │   ├── layout.tsx       # Standard Dark-theme wrappers
│   │   ├── providers.tsx    # TanStack Query & NextAuth Session providers
│   │   └── page.tsx         # Login landing screen
│   ├── components/
│   │   ├── ui/              # shadcn components (Table, Dialog, Card, Badges)
│   │   └── Navbar.tsx       # Nav menu & avatar dropdowns
│   ├── lib/
│   │   ├── auth.ts          # Auth.js Provider configurations
│   │   ├── k8s.ts           # Kubernetes Node Client orchestration Layer
│   │   ├── prisma.ts        # Database client singleton instance
│   │   └── validation.ts    # Zod payload validation rules
```
