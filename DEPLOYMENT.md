
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

## Post-Deployment

*   **Custom Domains:** You can add a custom domain in the Vercel project settings under "Domains".
*   **Automatic Deployments:** Every push to your `main` branch will now automatically trigger a new deployment on Vercel.
