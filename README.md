# Sneaker Try-On

A small Next.js 16 app for visualizing a sneaker on a person from two image references. The server uses Gemini Nano Banana 2 (`gemini-3.1-flash-image-preview`) through `@google/genai`; generated history is stored only in the browser.

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Add your keys:

```bash
GEMINI_API_KEY=your_key_here
FIRECRAWL_API_KEY=your_key_here    # optional: enables pasting product page URLs
```

Run locally:

```bash
pnpm dev
```

## API

See `docs/frontend-brief.md` for the `POST /api/generate` contract and the browser storage shape.
