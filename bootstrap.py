import pathlib

STRIPE_PAYMENT_LINK = "https://buy.stripe.com/YOUR_LIVE_STRIPE_LINK"
ADSENSE_CLIENT_ID = "ca-pub-0000000000000000"
ADSENSE_SLOT_ID = "0000000000"
SITE_DOMAIN = "https://your-project.vercel.app"

def create_file(path: str, content: str):
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"✅ Created: {path}")

create_file("output_app/package.json", """
{
  "name": "autonomous-micro-tools",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
""")

create_file("output_app/tsconfig.json", """
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
""")

create_file("output_app/tailwind.config.js", """
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
""")

create_file("output_app/postcss.config.js", """
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
""")

create_file("output_app/app/globals.css", """
@tailwind base;
@tailwind components;
@tailwind utilities;
""")

pub_num = ADSENSE_CLIENT_ID.replace("ca-pub-", "")
create_file("output_app/public/ads.txt", f"google.com, pub-{pub_num}, DIRECT, f08c47fec0942fa0")

create_file("output_app/app/layout.tsx", f"""
import './globals.css';
import Script from 'next/script';
import type {{ Metadata }} from 'next';

export const metadata: Metadata = {{
  title: 'Instant Web Utilities & Calculators',
  description: 'Free browser-based calculators, converters, and developer tools.',
}};

export default function RootLayout({{ children }}: {{ children: React.ReactNode }}) {{
  return (
    <html lang="en">
      <head>
        <Script id="stripe-pro-unlock" strategy="beforeInteractive">
          {{`
            if (typeof window !== 'undefined' && window.location.search.includes('pro_unlocked=true')) {{
              localStorage.setItem('micro_tools_pro', 'true');
              window.history.replaceState({{}}, '', window.location.pathname);
            }}
          `}}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT_ID}"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased">{{children}}</body>
    </html>
  );
}}
""")

create_file("output_app/tools_registry.json", "[]")
create_file("output_app/app/page.tsx", """
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold mb-3">Autonomous Micro-Tool Factory Ready 🚀</h1>
        <p className="text-slate-400">Run your GitHub Action workflow to generate and publish your first tool.</p>
      </div>
    </main>
  );
}
""")

create_file(".github/workflows/daily_factory.yml", """
name: 15-Agent Autonomous Micro-Tool Factory

on:
  schedule:
    - cron: '0 7 * * *'
  workflow_dispatch:

jobs:
  build-and-ship-tool:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Gemini SDK
        run: pip install google-genai

      - name: Run the 15-Agent Factory
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: python factory.py

      - name: Commit and Push New Micro-Tool
        run: |
          git config --global user.name "15-Agent Bot"
          git config --global user.email "bot@users.noreply.github.com"
          git add output_app/
          git diff --staged --quiet || git commit -m "Auto-built new micro-tool"
          git push
""")
