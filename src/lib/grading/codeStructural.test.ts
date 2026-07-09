import { describe, it, expect } from "vitest";
import { matchCodeStructural } from "./codeStructural";
import type { Rubric } from "@/lib/types";

describe("matchCodeStructural", () => {
  it("matches a component name present anywhere in the code, case/spacing insensitive", () => {
    const rubric: Rubric = { requiredComponents: ["Parking Lot"], requiredConnections: [] };
    const result = matchCodeStructural("class ParkingLot:\n    pass", rubric);
    expect(result.matchedComponents).toEqual(["Parking Lot"]);
    expect(result.coverage).toBe(100);
  });

  it("reports missing components not present in the code", () => {
    const rubric: Rubric = { requiredComponents: ["Vehicle", "ParkingSpot"], requiredConnections: [] };
    const result = matchCodeStructural("class Vehicle:\n    pass", rubric);
    expect(result.matchedComponents).toEqual(["Vehicle"]);
    expect(result.missingComponents).toEqual(["ParkingSpot"]);
    expect(result.coverage).toBe(50);
  });

  it("matches a connection only when both endpoint names appear in the code", () => {
    const rubric: Rubric = { requiredComponents: [], requiredConnections: [{ from: "ParkingLot", to: "Level" }] };
    const both = matchCodeStructural("class ParkingLot:\n    def __init__(self):\n        self.levels: list[Level] = []", rubric);
    expect(both.matchedConnections).toEqual(["ParkingLot -> Level"]);

    const onlyOne = matchCodeStructural("class ParkingLot:\n    pass", rubric);
    expect(onlyOne.missingConnections).toEqual(["ParkingLot -> Level"]);
  });

  it("returns 100 coverage when the rubric has no requirements", () => {
    const rubric: Rubric = { requiredComponents: [], requiredConnections: [] };
    expect(matchCodeStructural("anything", rubric).coverage).toBe(100);
  });
});
