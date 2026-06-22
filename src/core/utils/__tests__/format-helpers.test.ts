import { fmtDuration, fmtBytes, fmtCount } from "../format-helpers";

describe("fmtDuration", () => {
  it("formats seconds only", () => {
    expect(fmtDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(fmtDuration(125)).toBe("2:05");
  });

  it("formats hours, minutes, seconds", () => {
    expect(fmtDuration(3661)).toBe("1:01:01");
  });

  it("formats zero", () => {
    expect(fmtDuration(0)).toBe("0:00");
  });

  it("formats exactly one hour", () => {
    expect(fmtDuration(3600)).toBe("1:00:00");
  });

  it("formats exactly one minute", () => {
    expect(fmtDuration(60)).toBe("1:00");
  });
});

describe("fmtBytes", () => {
  it("returns null for null/0", () => {
    expect(fmtBytes(null)).toBeNull();
    expect(fmtBytes(0)).toBeNull();
  });

  it("formats kilobytes", () => {
    expect(fmtBytes(512)).toBe("1KB");
    expect(fmtBytes(1024)).toBe("1KB");
    expect(fmtBytes(1536)).toBe("2KB");
  });

  it("formats megabytes", () => {
    expect(fmtBytes(1048576)).toBe("1MB");
    expect(fmtBytes(2097152)).toBe("2MB");
    expect(fmtBytes(5242880)).toBe("5MB");
  });
});

describe("fmtCount", () => {
  it("returns raw number under 1000", () => {
    expect(fmtCount(0)).toBe("0");
    expect(fmtCount(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(fmtCount(1000)).toBe("1.0K");
    expect(fmtCount(1500)).toBe("1.5K");
    expect(fmtCount(99999)).toBe("100.0K");
  });

  it("formats millions with M suffix", () => {
    expect(fmtCount(1000000)).toBe("1.0M");
    expect(fmtCount(2500000)).toBe("2.5M");
    expect(fmtCount(10000000)).toBe("10.0M");
  });
});
