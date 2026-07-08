import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("renderiza input range com aria-label e atributos", () => {
    render(
      <Slider
        value={1}
        min={0.1}
        max={3}
        step={0.1}
        onChange={() => {}}
        label="Sensibilidade"
      />,
    );
    const input = screen.getByRole("slider", { name: "Sensibilidade" });
    expect(input).toHaveAttribute("min", "0.1");
    expect(input).toHaveAttribute("max", "3");
    expect(input).toHaveAttribute("step", "0.1");
  });

  it("expõe o preenchimento via --pct", () => {
    render(<Slider value={50} onChange={() => {}} label="Volume" />);
    const input = screen.getByRole("slider", { name: "Volume" });
    expect(input.style.getPropertyValue("--pct")).toBe("50%");
  });

  it("limita --pct a 100% quando value excede max", () => {
    render(<Slider value={200} onChange={() => {}} label="Volume" />);
    const input = screen.getByRole("slider", { name: "Volume" });
    expect(input.style.getPropertyValue("--pct")).toBe("100%");
  });

  it("chama onChange com o valor numérico", () => {
    const onChange = vi.fn();
    render(<Slider value={10} onChange={onChange} label="Volume" />);
    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), {
      target: { value: "42" },
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it("exibe o valor formatado quando showValue", () => {
    render(
      <Slider
        value={0.5}
        min={0}
        max={1}
        step={0.01}
        onChange={() => {}}
        label="Volume"
        showValue
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />,
    );
    expect(screen.getByText("50%")).toHaveClass("ui-slider__value");
  });

  it("renderiza marks quando fornecidas", () => {
    render(
      <Slider
        value={1}
        min={0}
        max={2}
        onChange={() => {}}
        label="Intensidade"
        marks={[
          { value: 0, label: "0" },
          { value: 1, label: "1" },
          { value: 2, label: "2" },
        ]}
      />,
    );
    const marks = document.querySelector(".ui-slider__marks");
    expect(marks).not.toBeNull();
    expect(marks?.children).toHaveLength(3);
  });

  it("desabilita o input quando disabled", () => {
    render(<Slider value={1} onChange={() => {}} label="Volume" disabled />);
    expect(screen.getByRole("slider", { name: "Volume" })).toBeDisabled();
  });
});
