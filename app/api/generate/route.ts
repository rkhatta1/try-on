import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildTryOnPrompt, NANO_BANANA_2_MODEL } from "@/lib/tryOnPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ASPECT_RATIOS = new Set(["1:1", "3:4", "4:5", "9:16", "16:9"]);
const ALLOWED_IMAGE_SIZES = new Set(["1K", "2K", "4K"]);

type InlineImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type ApiError = {
  error: string;
  field?: string;
};

function errorResponse(body: ApiError, status: number) {
  return NextResponse.json(body, { status });
}

function normalizeMimeType(mimeType: string | null) {
  return mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isAllowedMimeType(mimeType: string) {
  return ALLOWED_MIME_TYPES.has(normalizeMimeType(mimeType));
}

function parseText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function fileToInlinePart(value: FormDataEntryValue | null, field: string) {
  if (!(value instanceof File)) {
    throw new RequestValidationError("Expected an uploaded image file.", field);
  }

  if (value.size <= 0) {
    throw new RequestValidationError("Image file is empty.", field);
  }

  if (value.size > MAX_IMAGE_BYTES) {
    throw new RequestValidationError("Image file must be 12 MB or smaller.", field);
  }

  if (!isAllowedMimeType(value.type)) {
    throw new RequestValidationError("Use a JPEG, PNG, or WebP image.", field);
  }

  const buffer = Buffer.from(await value.arrayBuffer());

  return {
    inlineData: {
      mimeType: normalizeMimeType(value.type),
      data: buffer.toString("base64"),
    },
  } satisfies InlineImagePart;
}

async function imageUrlToInlinePart(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new RequestValidationError("Shoe image URL is not a valid URL.", "shoeImageUrl");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new RequestValidationError("Shoe image URL must use http or https.", "shoeImageUrl");
  }

  // Step 1: try as direct image URL
  const probe = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
  });

  if (probe.ok) {
    const mimeType = normalizeMimeType(probe.headers.get("content-type"));
    if (isAllowedMimeType(mimeType)) {
      const buffer = Buffer.from(await probe.arrayBuffer());
      if (buffer.byteLength <= 0) {
        throw new RequestValidationError("Shoe image URL returned an empty image.", "shoeImageUrl");
      }
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new RequestValidationError("Shoe image URL must be 12 MB or smaller.", "shoeImageUrl");
      }
      return {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      } satisfies InlineImagePart;
    }
  }

  // Step 2: not a direct image; try Firecrawl to extract the product image
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    throw new RequestValidationError(
      "URL did not point to a direct image. Set FIRECRAWL_API_KEY to paste product page URLs.",
      "shoeImageUrl",
    );
  }

  const extractedImageUrl = await extractImageFromPage(rawUrl, firecrawlKey);
  if (!extractedImageUrl) {
    throw new RequestValidationError(
      "Could not find a sneaker image on that page. Paste a direct image URL instead.",
      "shoeImageUrl",
    );
  }

  const imageResponse = await fetch(extractedImageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
  });

  if (!imageResponse.ok) {
    throw new RequestValidationError("Could not download the extracted sneaker image.", "shoeImageUrl");
  }

  const mimeType = normalizeMimeType(imageResponse.headers.get("content-type"));
  if (!isAllowedMimeType(mimeType)) {
    throw new RequestValidationError("Extracted image has an unsupported format.", "shoeImageUrl");
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  if (buffer.byteLength <= 0) {
    throw new RequestValidationError("Extracted sneaker image is empty.", "shoeImageUrl");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new RequestValidationError("Extracted sneaker image is too large (12 MB max).", "shoeImageUrl");
  }

  return {
    inlineData: {
      mimeType,
      data: buffer.toString("base64"),
    },
  } satisfies InlineImagePart;
}

async function extractImageFromPage(pageUrl: string, apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: pageUrl,
      formats: ["images"],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    success?: boolean;
    data?: {
      images?: string[];
      metadata?: {
        ogImage?: string;
      };
    };
  };

  if (!data.success || !data.data) return null;

  // Prefer the Open Graph image. On product pages this is often the main product image.
  if (data.data.metadata?.ogImage) {
    return data.data.metadata.ogImage;
  }

  // Fall back to the largest image by URL length heuristic
  const images = data.data.images ?? [];
  if (images.length === 0) return null;
  return images.reduce((a, b) => (a.length > b.length ? a : b));
}

class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse({ error: "GEMINI_API_KEY is not configured." }, 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse({ error: "Request must be multipart form data." }, 400);
  }

  try {
    const personImage = await fileToInlinePart(formData.get("personImage"), "personImage");
    const shoeImageFile = formData.get("shoeImage");
    const shoeImageUrl = parseText(formData.get("shoeImageUrl"));
    const shoeImage =
      shoeImageFile instanceof File && shoeImageFile.size > 0
        ? await fileToInlinePart(shoeImageFile, "shoeImage")
        : shoeImageUrl
          ? await imageUrlToInlinePart(shoeImageUrl)
          : null;

    if (!shoeImage) {
      return errorResponse(
        { error: "Provide either a shoe image upload or a direct shoe image URL.", field: "shoeImage" },
        400,
      );
    }

    const aspectRatio = parseText(formData.get("aspectRatio")) || "3:4";
    const imageSize = parseText(formData.get("imageSize")) || "1K";

    if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      return errorResponse({ error: "Unsupported aspect ratio.", field: "aspectRatio" }, 400);
    }

    if (!ALLOWED_IMAGE_SIZES.has(imageSize)) {
      return errorResponse({ error: "Unsupported image size.", field: "imageSize" }, 400);
    }

    const prompt = buildTryOnPrompt();
    const model = process.env.GEMINI_MODEL || NANO_BANANA_2_MODEL;
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents: [{ text: prompt }, personImage, shoeImage],
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const generatedPart = parts.find((part) => part.inlineData?.data);
    const generatedText = parts
      .map((part) => part.text)
      .filter((text): text is string => Boolean(text))
      .join("\n\n");

    if (!generatedPart?.inlineData?.data) {
      return errorResponse(
        {
          error:
            generatedText ||
            "Gemini did not return an image. Try a clearer full-body photo and a direct shoe reference.",
        },
        502,
      );
    }

    const mimeType = generatedPart.inlineData.mimeType || "image/png";

    return NextResponse.json({
      image: {
        mimeType,
        data: generatedPart.inlineData.data,
        dataUrl: `data:${mimeType};base64,${generatedPart.inlineData.data}`,
      },
      model,
      prompt,
      text: generatedText,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse({ error: error.message, field: error.field }, 400);
    }

    console.error(error);
    return errorResponse({ error: "Image generation failed." }, 500);
  }
}
