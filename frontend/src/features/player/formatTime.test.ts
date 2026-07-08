import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  it("formata zero como 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formata segundos abaixo de um minuto", () => {
    expect(formatTime(7)).toBe("0:07");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formata minutos e segundos", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(75)).toBe("1:15");
    expect(formatTime(605)).toBe("10:05");
  });

  it("trunca frações de segundo", () => {
    expect(formatTime(89.9)).toBe("1:29");
  });

  it("trata valores inválidos como 0:00", () => {
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});
