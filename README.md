This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🌟 Key Features

### 🧠 AI-Powered Equipment Ingestion
- **Automated Datasheet Parsing**: Drag-and-drop PDF datasheets to automatically extract technical specs using Google Gemini 1.5 Flash.
- **Smart Validation**: The AI validates extracted data against your defined metadata (e.g., ensuring "Interface Types" match your standard catalog).
- **Vendor-Specific Logic**: Custom parsing rules for different vendors (Cisco Catalyst, Meraki, etc.) to handle terminology differences.

### 🎛️ Dynamic Metadata Management
- **Admin Control**: Manage all dropdown options (Interface Types, Mounting Options, Use Cases) directly from the Admin UI.
- **No Code Required**: Adding a new "WiFi Standard" or "Form Factor" no longer requires a code deployment.
- **Universal Sync**: Changes in metadata instantly update the Ingestion Engine, Editor UI, and Search Filters.

### 🎨 Modern UX/UI
- **Layout Options**: Choose between High Density, Comfortable, or Card-based layouts for the equipment catalog.
- **Dark Mode**: Fully supported system-wide dark mode.

### 📊 Dynamic BOM Engine & Admin Hub
- **Visual Rule Editor**: Allows admins to modify BOM selection logic visually without coding.
- **Global Parameters Registry**: Centralized manage for BOM constants in Firestore.
- **Admin Hub**: Reorganized navigation and metrics dashboard for better scalability.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 💻 Local Development Setup

This project is optimized for development on macOS (Mac Mini ARM64).

1. **Install Dependencies**:
   ```bash
   npm install
   npx playwright install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env.local` and populate with your Firebase and Gemini API keys.

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Testing**:
   ```bash
   npm run test:e2e      # Run Playwright tests
   npm run test:e2e:ui   # Run with UI mode
   ```

## 🚀 Deployment

The project uses a **Redundant Self-Hosted Deployment** architecture:

- **Primary**: Mac Mini (Apple Silicon) - High-speed builds and primary application host.
- **Backup**: Ubuntu dev-box (Linux x64) - Secondary standby host.

The deployment pipeline is managed via **GitHub Actions** and triggers automatically on pushes to the `main` branch. 

For detailed infrastructure and maintenance instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
