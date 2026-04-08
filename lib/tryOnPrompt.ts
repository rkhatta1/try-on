export const NANO_BANANA_2_MODEL = "gemini-3.1-flash-image-preview";

export const TRY_ON_EDIT_PROMPT = `Create one photorealistic sneaker try-on image using the provided references.

Reference order:
1. The first image is the original photo of the person.
2. The second image is the sneaker reference.

Task:
Edit the first image so the person is naturally wearing the sneaker from the second image. Preserve the person's identity, face, body proportions, pose, clothing, background, camera angle, lens perspective, lighting direction, color temperature, and overall realism from the original photo.

Quality constraints:
Match the sneaker's scale, perspective, foot contact, shadows, reflections, and occlusion so it looks physically present in the original scene. Preserve the sneaker's silhouette, color blocking, materials, sole shape, laces, texture, and visible logo or branding details as closely as possible. If the feet are partially hidden, edit only the visible areas needed for a believable try-on and keep the rest of the image coherent. Do not create a catalog shot, collage, split view, text overlay, label, watermark, or extra person.

Output:
Return a single realistic edited photo.`;

export function buildTryOnPrompt() {
  return TRY_ON_EDIT_PROMPT;
}
