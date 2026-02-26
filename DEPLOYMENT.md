# Deployment Guide - Zippy Builder v2

Zippy Builder employs a **Redundant Self-Hosted Deployment (Dual-Node)** architecture to ensure high availability and high-performance builds.

## 🏗️ Architecture Overview

The application is hosted on two local server nodes managed via GitHub Actions:

-   **Primary Node**: Mac Mini (Apple Silicon ARM64, 192.168.0.245)
    -   Role: Main production host, high-speed build executor.
    -   Process Manager: `pm2`
-   **Backup Node**: Ubuntu dev-box (Linux x64, 192.168.0.28)
    -   Role: Redundant standby, secondary build executor.
    -   Process Manager: `pm2`

## 🚀 CI/CD Pipeline (GitHub Actions)

Deployments are fully automated via the **Automated Production Deployment** workflow (`.github/workflows/deploy.yml`).

1.  **Trigger**: Every push or merge to the `main` branch.
2.  **Dual Execution**: The workflow uses a **parallel matrix strategy** to deploy to both nodes simultaneously.
3.  **Resilience**: The pipeline uses `fail-fast: false`. If one node is offline or fails, the other will still complete the deployment.

### Workflow Steps
For each node, the pipeline:
1.  **Checks out** latest code.
2.  **Installs** Node.js and dependencies.
3.  **Builds** the Next.js production payload (`npm run build`).
4.  **Restarts** the application using `pm2 restart`.

## 🛠️ Infrastructure Management

### Process Management (PM2)
The application is run in the background using PM2.

- **Check Status**: `pm2 list`
- **View Logs**: `pm2 logs zippy-builder`
- **Manual Restart**: `pm2 restart zippy-builder`
- **Stop**: `pm2 stop zippy-builder`

### GitHub Runners
Each server runs a local GitHub Actions Runner:
-   **Mac Mini**: `macmini-runner` (labels: `self-hosted, macmini`)
-   **Ubuntu**: `dev-box` (labels: `self-hosted, linux`)

#### Starting a Runner (if offline)
If a runner shows as offline in GitHub Actions settings:
- **Mac Mini**: `cd ~/actions-runner && ./run.sh`
- **Ubuntu**: `ssh sdunn22@192.168.0.28 "cd ~/zippy-builder-v2/actions-runner && ./run.sh"`

## 🛡️ Maintenance Tasks

### Disk Space Recovery (Ubuntu Node)
The Ubuntu node has limited disk space. If builds fail with "No space left on device":
1.  Run `npm cache clean --force`
2.  Prune old builds: `rm -rf /home/sdunn22/zippy-builder-v2/.next`
3.  Run `docker system prune -f` (if Docker is used elsewhere).

### environment Variables
Both nodes require a local `.env.local` file containing:
-   `NEXT_PUBLIC_FIREBASE_*` (Firebase Configuration)
-   `GEMINI_API_KEY` (AI Engine)
