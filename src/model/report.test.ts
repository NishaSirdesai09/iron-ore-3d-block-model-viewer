import { describe, expect, it } from "vitest";
import { getLease } from "./lease";
import { HEMATITE_FE, occurrenceProfiles } from "./report";

describe("occurrenceProfiles", () => {
  const profiles = occurrenceProfiles(getLease());

  it("covers every occurrence, richest first", () => {
    expect(profiles.map((p) => p.occ).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    for (let a = 1; a < profiles.length; a++)
      expect(profiles[a].grade).toBeLessThanOrEqual(profiles[a - 1].grade);
    expect(profiles[0].name).toBe("Blue dust");
    expect(profiles[profiles.length - 1].name).toBe("Waste");
  });

  it("keeps mean grades inside each rock's designed range", () => {
    for (const p of profiles) {
      expect(p.grade).toBeGreaterThanOrEqual(p.range[0]);
      expect(p.grade).toBeLessThanOrEqual(p.range[1]);
      expect(p.estMin).toBeLessThanOrEqual(p.grade);
      expect(p.estMax).toBeGreaterThanOrEqual(p.grade);
    }
  });

  it("uses the iron content of pure hematite", () => {
    expect(HEMATITE_FE).toBeCloseTo(0.6994, 4);
  });
});
