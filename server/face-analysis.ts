import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

const ALLOWED_FEATURES = ["Finan muuqda", "Midab aan sinnayn", "Dufan muuqda", "Qallayl muuqda", "Xariijimo khafiif ah", "Casaanka muuqda"] as const;
type AllowedFeature = typeof ALLOWED_FEATURES[number];

export type FaceObservationResult = { calaamado: AllowedFeature[]; caddeyn: "cad" | "qayb ahaan cad" | "aan caddayn"; sooKoobid: string };

function makeSummary(features: AllowedFeature[], clarity: FaceObservationResult["caddeyn"]) {
  if (clarity === "aan caddayn" || features.length === 0) return "Sawirka si cad ugama muujinayo calaamado lagu kalsoonaan karo. Fadlan qaado sawir iftiin wanaagsan leh oo aan filter lahayn.";
  if (features.length === 1) return `Sawirkaagu wuxuu si muuqaal ah u muujinayaa ${features[0].toLowerCase()}.`;
  const listed = features.slice(0, 3).map((feature) => feature.toLowerCase());
  return `Sawirkaagu wuxuu si muuqaal ah u muujinayaa ${listed.slice(0, -1).join(", ")} iyo ${listed[listed.length - 1]}.`;
}

export async function analyzeFacePhoto(faceImage: string): Promise<FaceObservationResult> {
  const response = await invokeLLM({
    model: ENV.llmModel,
    messages: [
      { role: "system", content: "You are a cautious visual observation assistant for cosmetic skincare. Analyze only visible, non-medical cosmetic features. Do not diagnose any condition, do not infer sensitivity or age, and do not invent features. Return JSON only: {features:string[], clarity:'clear'|'partial'|'unclear'}. The only permitted feature strings are: 'Finan muuqda', 'Midab aan sinnayn', 'Dufan muuqda', 'Qallayl muuqda', 'Xariijimo khafiif ah', 'Casaanka muuqda'. If you cannot see a feature clearly, leave it out. For blur, poor light, filters, or uncertainty, use clarity 'unclear'." },
      { role: "user", content: [{ type: "text", text: "U fiirso sawirkan wejiga; soo saar keliya calaamadaha muuqaal ahaan cad." }, { type: "image_url", image_url: { url: faceImage, detail: "high" as const } }] },
    ],
    response_format: { type: "json_object" },
  });
  const content = response.choices[0]?.message?.content;
  let parsed: { features?: unknown; clarity?: unknown } = {};
  try { parsed = JSON.parse(typeof content === "string" ? content.replace(/^```json\s*/i, "").replace(/\s*```$/, "") : "{}") as { features?: unknown; clarity?: unknown }; } catch { parsed = {}; }
  const calaamado = Array.isArray(parsed.features) ? parsed.features.filter((feature): feature is AllowedFeature => typeof feature === "string" && (ALLOWED_FEATURES as readonly string[]).includes(feature)).slice(0, 4) : [];
  const caddeyn = parsed.clarity === "clear" ? "cad" : parsed.clarity === "partial" ? "qayb ahaan cad" : "aan caddayn";
  return { calaamado: caddeyn === "aan caddayn" ? [] : calaamado, caddeyn, sooKoobid: makeSummary(calaamado, caddeyn) };
}
