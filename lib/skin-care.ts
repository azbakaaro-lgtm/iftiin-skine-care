export type ChoiceAnswer = string | string[];

export type Question = {
  id: string;
  title: string;
  options: string[];
  multiple?: boolean;
  hint?: string;
};

export type VisualObservation = {
  calaamado: string[];
  caddeyn: "cad" | "qayb ahaan cad" | "aan caddayn";
  sooKoobid: string;
};

export type SkinProfile = {
  skinType: string;
  concerns: string[];
  sensitivity: string;
  goal: string;
  routineStyle: string;
};

export type Assessment = {
  id: string;
  createdAt: string;
  daySlot: "Maalinta 1" | "Maalinta 7" | "Maalinta 14" | "Maalinta 21" | "Maalinta 28";
  photoUri: string;
  answers: Record<string, ChoiceAnswer>;
  profile: SkinProfile;
  visual?: VisualObservation;
};

export type RoutineProgress = { completedDays: number[]; dailyItems: Record<string, boolean> };
export const SCAN_DAY_SLOTS = ["Maalinta 1", "Maalinta 7", "Maalinta 14", "Maalinta 21", "Maalinta 28"] as const;

export const QUESTIONNAIRE: Question[] = [
  { id: "skinType", title: "Sidee ayaad u qeexi lahayd maqaarkaaga?", options: ["Aad u qallalan", "Qallalan", "Caadi", "Isku-dhafan", "Dufan badan", "Ma hubo"] },
  { id: "sensitivity", title: "Maqaarkaagu ma cuncun, gubasho ama casaanka ayuu si fudud ugu falceliyaa?", options: ["Haa, inta badan", "Mararka qaarkood", "Maya", "Ma hubo"] },
  { id: "previousUse", title: "Ma isticmaashay alaab daryeel maqaarka ama dawo wejiga hore?", options: ["Haa, weli waan isticmaalaa", "Haa, waan joojiyay", "Maya", "Ma hubo"] },
  { id: "reaction", title: "Alaab hore ma kuu keentay cuncun, gubasho ama finan dheeraad ah?", options: ["Haa", "Mararka qaarkood", "Maya", "Ma hubo"] },
  { id: "weather", title: "Cimilada aad inta badan joogto sidee ayay tahay?", options: ["Kulayl iyo qorrax badan", "Qabow ama dabayl", "Qoyaan badan", "Isbeddel badan"] },
  { id: "ageGroup", title: "Da’daada qiyaas ahaan kooxdee ayay ku jirtaa?", options: ["Ka yar 18", "18 ilaa 24", "25 ilaa 34", "35 ilaa 44", "45 ama ka weyn", "Ma rabo inaan sheego"] },
  { id: "goal", title: "Maxaad rabtaa in daryeelkaagu ugu horreyn kaa caawiyo?", options: ["Finan muuqda", "Midab aan sinnayn", "Qallayl", "Dufan badan", "Muuqaal jilicsan", "Daryeel joogto ah"] },
];

function one(answers: Record<string, ChoiceAnswer>, id: string) {
  const value = answers[id];
  return Array.isArray(value) ? value[0] : value;
}

export function createProfile(answers: Record<string, ChoiceAnswer>): SkinProfile {
  const concernsValue = answers.visibleConcerns ?? answers.concerns;
  const concerns = Array.isArray(concernsValue) ? concernsValue.filter((item) => item !== "Lama hubin") : concernsValue ? [concernsValue] : [];
  const sensitivity = one(answers, "sensitivity");
  return {
    skinType: one(answers, "skinType") || "Lama hubin",
    concerns: concerns.length ? concerns.slice(0, 3) : [one(answers, "goal") || "Daryeel joogto ah"],
    sensitivity: sensitivity === "Haa, inta badan" ? "Sare" : sensitivity === "Mararka qaarkood" || sensitivity === "Ma hubo" ? "Dhexdhexaad" : "Hoose",
    goal: one(answers, "goal") || "Daryeel joogto ah",
    routineStyle: "Fudud",
  };
}

export type SomaliRecommendation = { noocaAlaabta: string; maaddooyinkaLaDoorbiday: string[]; sababta: string; digniin?: string };

export function createSomaliRecommendations(answers: Record<string, ChoiceAnswer>, visual?: VisualObservation): SomaliRecommendation[] {
  const calaamado = visual?.calaamado ?? [];
  const has = (value: string) => calaamado.includes(value) || one(answers, "goal") === value;
  const talooyin: SomaliRecommendation[] = [];
  if (has("Finan muuqda") || has("Dufan badan")) talooyin.push({ noocaAlaabta: "Dareeraha maqaarka ee khafiifka ah", maaddooyinkaLaDoorbiday: ["Niacinamide"], sababta: "Waxay ku habboon tahay in si tartiib ah loo taageero maqaarka dufanka leh ama finan muuqda leh." });
  if (has("Midab aan sinnayn")) talooyin.push({ noocaAlaabta: "Dareeraha maqaarka ee fiidkii", maaddooyinkaLaDoorbiday: ["TXA", "Niacinamide"], sababta: "Waxay taageeri karaan daryeelka muuqaalka midabka aan sinnayn; ku bilow si tartiib ah." });
  if (has("Qallayl muuqda") || one(answers, "skinType") === "Aad u qallalan" || one(answers, "skinType") === "Qallalan") talooyin.push({ noocaAlaabta: "Kareem qoyaansiin leh", maaddooyinkaLaDoorbiday: ["Ceramides", "Hyaluronic Acid", "Glycerin"], sababta: "Waxay caawin karaan xajinta qoyaanka iyo dareenka jiidashada ee maqaarka." });
  talooyin.push({ noocaAlaabta: "Kareemka ka ilaaliya qorraxda", maaddooyinkaLaDoorbiday: ["SPF 30 ama ka sarreeya"], sababta: "Waxay taageertaa ilaalinta maqaarka maalintii, gaar ahaan marka qorraxdu badan tahay." });
  const xasaasi = one(answers, "sensitivity") === "Haa, inta badan" || one(answers, "reaction") === "Haa";
  return talooyin.map((talo) => xasaasi ? { ...talo, digniin: "Maadaama aad sheegtay xasaasiyad ama falcelin hore, ku tijaabi meel yar oo maqaarka ah 24 saacadood ka hor. Haddii aad aragto caro, cuncun, gubasho ama finan daran, jooji isticmaalka oo la xiriir xirfadle caafimaad." } : talo);
}

export function concernLevel(answers: Record<string, ChoiceAnswer>, concern: string) {
  const selected = answers.visibleConcerns ?? answers.concerns;
  const values = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const has = (targets: string[]) => targets.some((target) => values.includes(target));
  if (concern === "Finan") return has(["Finan muuqda", "Finan"]) ? "Dhexdhexaad" : "Hoose";
  if (concern === "Dhibco madow") return has(["Midab aan sinnayn", "Dhibco madow"]) ? "Dhexdhexaad" : "Hoose";
  if (concern === "Midabka maqaarka") return has(["Midab aan sinnayn"]) ? "Wax yar oo aan sinnayn" : "Isku dheelli tiran";
  if (concern === "Qallayl") return has(["Qallayl muuqda"]) || one(answers, "skinType") === "Qallalan" ? "Dhexdhexaad" : "Hoose";
  if (concern === "Dufan") return has(["Dufan muuqda"]) || one(answers, "skinType") === "Dufan badan" ? "Sare" : "Hoose";
  return has(["Xariijimo khafiif ah"]) ? "Dhexdhexaad" : "Jilicsan";
}
