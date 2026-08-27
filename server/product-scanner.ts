import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export type ScannerProfileInput = {
  skinType: string;
  concerns: string[];
  sensitivity: string;
  goal: string;
};

export type ProductScannerResult = {
  imageIndex: number;
  productName: string;
  brand: string;
  observedText: string;
  visibleIngredients: string[];
  category: string;
  profileFit: string;
  rationale: string;
  recommendation: "Keep" | "Review" | "Not enough information";
  confidence: "clear" | "partial" | "unclear";
};

function asText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 12) : [];
}

function normalizeOne(value: unknown, imageIndex: number): ProductScannerResult {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const confidence = raw.confidence === "clear" || raw.confidence === "partial" ? raw.confidence : "unclear";
  const recommendation = raw.recommendation === "Keep" || raw.recommendation === "Review" ? raw.recommendation : "Not enough information";
  const visibleIngredients = confidence === "clear" || confidence === "partial" ? asList(raw.visibleIngredients) : [];
  return {
    imageIndex,
    productName: asText(raw.productName, "Lama aqoonsan karo"),
    brand: asText(raw.brand, "Lama aqoonsan karo"),
    observedText: asText(raw.observedText, "Qoraal cad lama arkin."),
    visibleIngredients,
    category: asText(raw.category, "Lama hubin"),
    profileFit: asText(raw.profileFit, "Skin profile-ku ma bixinayo xog ku filan oo go’aan lagu sameeyo."),
    rationale: asText(raw.rationale, "Sawirka ama label-ka ma cadda ku filan si loo bixiyo qiimeyn lagu kalsoonaan karo."),
    recommendation: confidence === "unclear" ? "Not enough information" : recommendation,
    confidence,
  };
}

export async function analyzeProductPhotos(input: { productImages: string[]; faceImage?: string; profile: ScannerProfileInput }) {
  const model = ENV.llmModel;

  const imageInputs = input.productImages.flatMap((url, index) => [
    { type: "text" as const, text: `PRODUCT PHOTO ${index + 1}` },
    { type: "image_url" as const, image_url: { url, detail: "high" as const } },
  ]);
  const faceInputs = input.faceImage ? [
    { type: "text" as const, text: "OPTIONAL FACE PHOTO: Do not diagnose or infer a condition from this image. It may only be used as context alongside the supplied profile." },
    { type: "image_url" as const, image_url: { url: input.faceImage, detail: "low" as const } },
  ] : [];

  const response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "You are a careful cosmetic product label reader. Return valid JSON only. You must never invent an ingredient, brand, product name, SPF, or category. Extract brand/name/ingredients only if visibly readable or unmistakably present in the image. If text is unclear, say it is unclear and use recommendation 'Not enough information'. Write observedText, category, profileFit, and rationale in clear Somali; productName, brand, scientific ingredient names, and the required recommendation/confidence enums may retain their original forms. Use the supplied profile only for non-medical cosmetic compatibility wording. Do not diagnose, claim treatment outcomes, or advise on medical conditions. Return exactly {products:[{imageIndex:number,productName:string,brand:string,observedText:string,visibleIngredients:string[],category:string,profileFit:string,rationale:string,recommendation:'Keep'|'Review'|'Not enough information',confidence:'clear'|'partial'|'unclear'}]}. Create one item for every PRODUCT PHOTO in order.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Profile supplied by the user: skin type ${input.profile.skinType}; main concerns ${input.profile.concerns.join(", ") || "not provided"}; sensitivity ${input.profile.sensitivity}; goal ${input.profile.goal}.` },
          ...faceInputs,
          ...imageInputs,
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  const rawText = typeof content === "string" ? content.replace(/^```json\s*/i, "").replace(/\s*```$/, "") : "{}";
  let parsed: { products?: unknown[] } = {};
  try { parsed = JSON.parse(rawText) as { products?: unknown[] }; } catch { parsed = {}; }
  const products = Array.isArray(parsed.products) ? parsed.products : [];
  return input.productImages.map((_, index) => normalizeOne(products[index], index));
}
