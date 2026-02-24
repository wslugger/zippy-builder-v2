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

## Deployment

This project is deployed using **Vercel**. 

For detailed deployment instructions, please examine [DEPLOYMENT.md](DEPLOYMENT.md).

The deployment pipeline is triggered automatically on pushes to the `main` branch. Environment variables for Firebase and Google AI are required for the build.
