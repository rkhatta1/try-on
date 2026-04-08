# Frontend Brief

## Backend API

`POST /api/generate`

Purpose: sends one person photo and one sneaker reference to Gemini Nano Banana 2, then returns a generated try-on image. There is no server-side storage.

Request type: `multipart/form-data`

Fields:
- `personImage`: required file. JPEG, PNG, or WebP, max 12 MB.
- `shoeImage`: optional file. JPEG, PNG, or WebP, max 12 MB.
- `shoeImageUrl`: optional string. Use this only when `shoeImage` is not provided. Direct JPEG, PNG, and WebP image URLs work with only `GEMINI_API_KEY`. Product page URLs require `FIRECRAWL_API_KEY` so the backend can extract the page image.
- `aspectRatio`: optional string. Allowed: `1:1`, `3:4`, `4:5`, `9:16`, `16:9`. Defaults to `3:4`.
- `imageSize`: optional string. Allowed: `1K`, `2K`, `4K`. Defaults to `1K`.

Successful response:

```json
{
  "image": {
    "mimeType": "image/png",
    "data": "base64...",
    "dataUrl": "data:image/png;base64,..."
  },
  "model": "gemini-3.1-flash-image-preview",
  "prompt": "Create a photorealistic fashion try-on image...",
  "text": "",
  "createdAt": "2026-04-08T09:30:00.000Z"
}
```

Error response:

```json
{
  "error": "Use a JPEG, PNG, or WebP image.",
  "field": "personImage"
}
```

## Browser Storage

Keep the latest 10 generations in browser storage. The current frontend uses IndexedDB because generated image data URLs can exceed `localStorage` quota quickly.

IndexedDB:
- database: `sneaker-try-on`
- object store: `keyval`
- key: `sneaker-try-on:generations:v1`

Suggested entry shape:

```json
{
  "id": "uuid",
  "imageDataUrl": "data:image/png;base64,...",
  "createdAt": "2026-04-08T09:30:00.000Z",
  "model": "gemini-3.1-flash-image-preview",
  "prompt": "Create a photorealistic fashion try-on image...",
  "personName": "photo.jpg",
  "shoeSource": "shoe.png"
}
```

## Prompting Notes

The server uses one cookie-cutter edit prompt for every generation. It follows Google's current image prompting guidance: describe the scene in narrative form, be specific, provide context and intent, use photographic language, and give step-by-step instructions for complex image edits. The prompt tells the model to treat the first image as the person and the second image as the sneaker, then preserve identity, pose, clothing, lighting, camera angle, background, sneaker details, scale, shadows, reflections, and occlusion.

Docs checked with Firecrawl on 2026-04-08:
- Gemini Nano Banana image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Gemini 3.1 Flash Image / Nano Banana 2: https://aistudio.google.com/models/gemini-3-1-flash-image
- Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Vercel function duration: https://vercel.com/docs/functions/configuring-functions/duration
- Firecrawl scrape formats: https://docs.firecrawl.dev/features/scrape
