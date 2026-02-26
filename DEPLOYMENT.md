# Deployment Guide - Zippy Builder v2

Zippy Builder uses **Vercel** for production hosting, while utilizing a **Redundant Self-Hosted Runner** architecture for high-performance builds and local development previews.

## 🏗️ Architecture Overview

The system is split into two layers:

### 1. Production Hosting (Vercel)
- **Role**: Public-facing application host.
- **URL**: [vercel.com](https://vercel.com)
- **Deployment**: Automatic via GitHub Integration (Linked to `main` branch).

### 2. Dev/CI Infrastructure (Local Nodes)
Managed via GitHub Actions runners on local hardware:
- **Primary Node**: Mac Mini (Apple Silicon ARM64, 192.168.0.245)
    - Role: High-speed build executor, local dev environment.
- **Backup Node**: Ubuntu dev-box (Linux x64, 192.168.0.28)
    - Role: Redundant CI runner, standby environment.

## 🚀 CI/CD Pipeline (GitHub Actions)

The pipeline (`.github/workflows/deploy.yml`) automates the synchronization between GitHub and the local development environments.

1. **Trigger**: Every push or merge to the `main` branch.
2. **Dual Execution**: The workflow uses a **parallel matrix strategy** to execute build/test cycles on both local nodes.
3. **Local Deployment**: On each node, the application is built (`npm run build`) and restarted via `pm2` for internal testing/review.
4. **Vercel Deployment**: Concurrent with the GitHub Actions flow, Vercel automatically deploys the latest `main` branch to the production URL.

## 🛠️ Infrastructure Management (Local Nodes)

### Process Management (PM2)
Local dev instances are managed via PM2.
- **Check Status**: `pm2 list`
- **View Logs**: `pm2 logs zippy-builder`

### GitHub Runners
- **Mac Mini**: `macmini-runner` (labels: `self-hosted, macmini`)
- **Ubuntu**: `dev-box` (labels: `self-hosted, linux`)

#### Starting a Runner (if offline)
- **Mac Mini**: `cd ~/actions-runner && ./run.sh`
- **Ubuntu**: `ssh sdunn22@192.168.0.28 "cd ~/zippy-builder-v2/actions-runner && ./run.sh"`

## 🛡️ Maintenance Tasks

### Disk Space (Ubuntu Node)
If builds fail due to space:
1. `npm cache clean --force`
2. `rm -rf /home/sdunn22/zippy-builder-v2/.next`

### Environment Variables
Both the Vercel dashboard and local nodes require a `.env` file containing:
- `NEXT_PUBLIC_FIREBASE_*`
- `GEMINI_API_KEY`
