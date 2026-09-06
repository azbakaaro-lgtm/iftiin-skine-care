import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export type LabelScanResult = {
  qoraalka: string;
  caddeyn: "cad" | "qayb ahaan cad" | "aan caddayn";
};

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Reads whatever is printed on a product package photo (usage instructions,
 * ingredients, warnings, etc.) and returns it as plain Somali text for the
 * store admin to review. The admin can edit or clear this text afterwards —
 * this function never writes to the database, it only proposes text.
 */
export async function scanProductLabel(labelImage: string): Promise<LabelScanResult> {
  const response = await invokeLLM({
    model: ENV.llmModel,
    messages: [
      {
        role: "system",
        content:
          "You are a careful product-label transcriber. Read only text that is actually visible and legible on the package in the photo — usage instructions, directions, warnings, or key ingredient callouts. Never invent, guess, or add information that isn't visibly printed. Translate/write the result in clear, natural Somali, keeping any brand names, scientific ingredient names, or percentages in their original form. If the photo is too blurry, dark, or the label doesn't show enough legible text, say so honestly instead of guessing. Return JSON only: {text: string, clarity: 'clear' | 'partial' | 'unclear'}.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Akhri baakadkan sawirka ku jira, oo Soomaali cad ugu soo saar qoraalka lagu qoray (sida loo isticmaalo, digniinaha, ama waxa muhiimka ah)." },
          { type: "image_url", image_url: { url: labelImage, detail: "high" as const } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  let parsed: { text?: unknown; clarity?: unknown } = {};
  try {
    parsed = JSON.parse(typeof content === "string" ? content.replace(/^```json\s*/i, "").replace(/\s*```$/, "") : "{}") as { text?: unknown; clarity?: unknown };
  } catch {
    parsed = {};
  }

  const clarity = parsed.clarity === "clear" ? "cad" : parsed.clarity === "partial" ? "qayb ahaan cad" : "aan caddayn";
  const qoraalka = clarity === "aan caddayn"
    ? ""
    : asText(parsed.text, "");

  return { qoraalka, caddeyn: clarity };
}
