import { describe, expect, it } from "vitest";
import { concernLevel, createProfile, createSomaliRecommendations, QUESTIONNAIRE, SCAN_DAY_SLOTS, type ChoiceAnswer, type VisualObservation } from "../lib/skin-care";

describe("Iftiin falanqaynta maxalliga ah", () => {
  const answers: Record<string, ChoiceAnswer> = {
    skinType: "Isku-dhafan",
    visibleConcerns: ["Finan muuqda", "Midab aan sinnayn"],
    sensitivity: "Haa, inta badan",
    reaction: "Haa",
    goal: "Midab aan sinnayn",
  };
  const visual: VisualObservation = { calaamado: ["Finan muuqda", "Midab aan sinnayn"], caddeyn: "cad", sooKoobid: "Sawirkaagu wuxuu muujinayaa finan muuqda iyo midab aan sinnayn." };

  it("wuxuu sameeyaa qoraal kooban oo ka yimaada jawaabaha Af-Soomaaliga", () => {
    expect(createProfile(answers)).toEqual({ skinType: "Isku-dhafan", concerns: ["Finan muuqda", "Midab aan sinnayn"], sensitivity: "Sare", goal: "Midab aan sinnayn", routineStyle: "Fudud" });
  });

  it("wuxuu xaddidaa su’aalaha faahfaahinta toddoba su’aalood", () => {
    expect(QUESTIONNAIRE).toHaveLength(7);
    expect(QUESTIONNAIRE.every((question) => question.title.length > 0 && question.options.length > 0)).toBe(true);
  });

  it("wuxuu ilaaliyaa talada aan diagnosis ahayn iyo digniinta xasaasiyadda", () => {
    expect(concernLevel(answers, "Finan")).toBe("Dhexdhexaad");
    const recommendations = createSomaliRecommendations(answers, visual);
    expect(recommendations.some((item) => item.maaddooyinkaLaDoorbiday.includes("TXA"))).toBe(true);
    expect(recommendations.every((item) => item.digniin?.includes("ku tijaabi meel yar") ?? false)).toBe(true);
    expect(recommendations.every((item) => item.digniin?.includes("la xiriir xirfadle caafimaad") ?? false)).toBe(true);
  });

  it("ma muujiyo digniin xasaasiyadeed marka jawaabaha labaduba yihiin maya", () => {
    const deggan: Record<string, ChoiceAnswer> = { skinType: "Caadi", sensitivity: "Maya", reaction: "Maya", goal: "Daryeel joogto ah" };
    expect(createSomaliRecommendations(deggan).every((item) => item.digniin === undefined)).toBe(true);
  });

  it("wuxuu qeexaa maalmaha taariikhda sawirrada", () => {
    expect(SCAN_DAY_SLOTS).toEqual(["Maalinta 1", "Maalinta 7", "Maalinta 14", "Maalinta 21", "Maalinta 28"]);
  });

});
