import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "../../state";
import { ToastProvider } from "../../ui";
import { VisualTab } from "./VisualTab";

/** VisualTab embute o ImagePicker, que exige o contexto de toast. */
const renderVisualTab = (): void => {
  render(
    <ToastProvider>
      <VisualTab />
    </ToastProvider>,
  );
};

const customColors = (): readonly string[] | undefined =>
  useAppStore.getState().settings.customColors;

const alphaToggle = (index: number): HTMLElement =>
  screen.getByRole("button", { name: `Cor ${index} transparente` });

describe("VisualTab — transparência da paleta customizada", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        paletteId: "custom",
        customColors: ["#286CF0", "#8C62FF"],
      },
    });
  });

  it("torna a cor transparente sem perder o matiz", async () => {
    const user = userEvent.setup();
    renderVisualTab();

    await user.click(alphaToggle(1));

    expect(customColors()?.[0]).toBe("#286CF000");
    expect(customColors()?.[1]).toBe("#8C62FF");
  });

  it("volta a cor para opaca, restaurando o matiz original", async () => {
    const user = userEvent.setup();
    renderVisualTab();

    await user.click(alphaToggle(1));
    await user.click(alphaToggle(1));

    expect(customColors()?.[0]).toBe("#286CF0");
  });

  it("reflete o estado transparente em aria-pressed", async () => {
    const user = userEvent.setup();
    renderVisualTab();

    expect(alphaToggle(1)).toHaveAttribute("aria-pressed", "false");
    await user.click(alphaToggle(1));
    expect(alphaToggle(1)).toHaveAttribute("aria-pressed", "true");
  });

  it("o picker mostra o matiz sem o canal alfa", async () => {
    const user = userEvent.setup();
    renderVisualTab();
    await user.click(alphaToggle(1));

    const picker = screen.getByLabelText<HTMLInputElement>(
      "Cor 1 da paleta customizada",
    );
    expect(picker.value).toBe("#286cf0");
  });
});
