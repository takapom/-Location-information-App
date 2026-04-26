import { formatAverageSpeed } from "../activityMetrics";

describe("formatAverageSpeed", () => {
  it("formats average speed from distance and mm:ss duration", () => {
    expect(formatAverageSpeed(5.2, "42:30")).toBe("7.3 km/h");
  });

  it("returns placeholder when duration is invalid", () => {
    expect(formatAverageSpeed(5.2, "00:00")).toBe("-- km/h");
    expect(formatAverageSpeed(5.2, "invalid")).toBe("-- km/h");
  });
});
