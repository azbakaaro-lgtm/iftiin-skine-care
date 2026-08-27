import { describe, expect, it } from "vitest";
import { preliminaryConcerns } from "../server/skin-journey";

describe("purchase-gated skin journey preview", () => {
  it("keeps the preview limited to visible concerns and the stated care goal", () => {
    expect(preliminaryConcerns(
      { goal: "Qallayl", sensitivity: "Haa, inta badan" },
      { calaamado: ["Qallayl muuqda", "Midab aan sinnayn"], caddeyn: "cad", sooKoobid: "Muuqaal kooban" },
    )).toEqual(["Qallayl muuqda", "Midab aan sinnayn", "Qallayl"]);
  });

  it("does not show a no-sensitivity answer as a concern", () => {
    expect(preliminaryConcerns({ goal: "Daryeel joogto ah", sensitivity: "Maya" })).toEqual([]);
  });
});
