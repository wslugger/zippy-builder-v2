
# Deploying Zippy Builder v2 to Vercel

This guide outlines the steps to deploy your Next.js application to Vercel.

## Prerequisites

1.  **Vercel Account:** If you don't have one, sign up at [vercel.com](https://vercel.com/signup).
2.  **Git Repository:** Ensure your project is pushed to a Git provider (GitHub, GitLab, or Bitbucket).

## Option A: Deploy via Vercel Dashboard (Recommended)

1.  **Log in** to your Vercel dashboard.
2.  **Add New Project:** Click "Add New..." -> "Project".
3.  **Import Git Repository:**
    *   Find your `zippy-builder-v2` repository in the list.
    *   Click "Import".
4.  **Configure Project:**
    *   **Framework Preset:** Vercel should automatically detect **Next.js**.
    *   **Root Directory:** `./` (default).
    *   **Build Command:** `next build` (default).
    *   **Output Directory:** `.next` (default).
    *   **Install Command:** `npm install` (default).
5.  **Environment Variables:**
    *   Expand the **Environment Variables** section.
    *   Copy the values from your local `.env.local` file.
    *   **Important:** You need to add all your Firebase configuration keys here:
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`
        *   Plus any other secrets (e.g., Google AI API keys if used server-side).
6.  **Deploy:** Click "Deploy".

## Option B: Deploy via Vercel CLI

If you prefer the command line:

1.  **Install Vercel CLI:**
    ```bash
    npm i -g vercel
    ```
2.  **Login:**
    ```bash
    vercel login
    ```
3.  **Deploy:**
    Run this command in your project root:
    ```bash
    vercel
    ```
4.  **Follow Prompts:**
    *   Set up and deploy? [Y]
    *   Which scope? [Select your account]
    *   Link to existing project? [N]
    *   Project name? [zippy-builder-v2]
    *   Directory? [./]
    *   Want to modify settings? [N] (unless you need to override defaults)
5.  **Environment Variables:**
    You can set these in the dashboard project settings after the first deployment (which might fail if they are missing), or use:
    ```bash
    vercel env add <variable_name>
    ```

## Development Workflow

We use a staged deployment workflow with a `develop` branch for pre-production and `main` for production.

### Daily Development
1.  **Checkout Develop**: Start your day or when starting a new feature.
    ```bash
    git checkout develop
    git pull origin develop
    ```
2.  **Create Feature Branch**: Create a new branch for your work.
    ```bash
    git checkout -b feature/my-new-feature
    ```
3.  **Work and Commit**: Make your changes and commit them as usual.
4.  **Open Pull Request**: Push your feature branch and open a PR against `develop`.
5.  **Merge to Develop**: Once approved, merge the PR. This will trigger a deployment to the **Pre-production** environment.

### Production Release
1.  **Release Preparation**: Switch to `main` and pull latest.
    ```bash
    git checkout main
    git pull origin main
    ```
2.  **Merge Develop**: Merge the tested changes from `develop`.
    ```bash
    git merge develop
    ```
3.  **Push to Production**: Pushing to `main` triggers the **Production** deployment.
    ```bash
    git push origin main
    ```

## Post-Deployment

*   **Custom Domains**: You can add a custom domain in the Vercel project settings under "Domains". You can assign specific domains to branches (e.g., `dev.zippy-builder.com` to `develop`).
*   **Automatic Deployments**: 
    - Every push to `develop` triggers a **Pre-production** deployment.
    - Every push to `main` triggers a **Production** deployment.
    - Pushes to other branches trigger **Preview** deployments.

