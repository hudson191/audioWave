import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";

const ITEMS: TabItem[] = [
  { id: "cena", label: "Cena" },
  { id: "paleta", label: "Paleta" },
  { id: "export", label: "Exportar" },
];

function ControlledTabs({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState("cena");
  return (
    <Tabs
      items={ITEMS}
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
      label="Painéis"
    />
  );
}

describe("Tabs", () => {
  it("renderiza tablist com tabs e aria-selected", () => {
    render(
      <Tabs items={ITEMS} value="paleta" onChange={() => {}} label="Painéis" />,
    );
    expect(screen.getByRole("tablist", { name: "Painéis" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Paleta" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Cena" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("com id explícito, a aba ativa expõe aria-controls do painel", () => {
    render(
      <>
        <Tabs
          id="painel"
          items={ITEMS}
          value="paleta"
          onChange={() => {}}
          label="Painéis"
        />
        <div
          role="tabpanel"
          id="painel-panel-paleta"
          aria-labelledby="painel-tab-paleta"
        >
          Conteúdo
        </div>
      </>,
    );
    const ativa = screen.getByRole("tab", { name: "Paleta" });
    expect(ativa).toHaveAttribute("id", "painel-tab-paleta");
    expect(ativa).toHaveAttribute("aria-controls", "painel-panel-paleta");
    expect(screen.getByRole("tab", { name: "Cena" })).not.toHaveAttribute(
      "aria-controls",
    );
    expect(
      screen.getByRole("tabpanel", { name: "Paleta" }),
    ).toBeInTheDocument();
  });

  it("apenas a aba ativa participa da ordem de tabulação", () => {
    render(
      <Tabs items={ITEMS} value="cena" onChange={() => {}} label="Painéis" />,
    );
    expect(screen.getByRole("tab", { name: "Cena" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Paleta" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("clique seleciona a aba", async () => {
    const onChange = vi.fn();
    render(<ControlledTabs onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Paleta" }));
    expect(onChange).toHaveBeenCalledWith("paleta");
    expect(screen.getByRole("tab", { name: "Paleta" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowRight move seleção e foco para a próxima aba (com wrap)", () => {
    const onChange = vi.fn();
    render(<ControlledTabs onChange={onChange} />);
    const cena = screen.getByRole("tab", { name: "Cena" });
    cena.focus();
    fireEvent.keyDown(cena, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("paleta");
    expect(screen.getByRole("tab", { name: "Paleta" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Paleta" }), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(screen.getByRole("tab", { name: "Exportar" }), {
      key: "ArrowRight",
    });
    expect(onChange).toHaveBeenLastCalledWith("cena");
    expect(screen.getByRole("tab", { name: "Cena" })).toHaveFocus();
  });

  it("ArrowLeft faz wrap para a última aba", () => {
    const onChange = vi.fn();
    render(<ControlledTabs onChange={onChange} />);
    const cena = screen.getByRole("tab", { name: "Cena" });
    cena.focus();
    fireEvent.keyDown(cena, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("export");
    expect(screen.getByRole("tab", { name: "Exportar" })).toHaveFocus();
  });

  it("Home e End vão para a primeira e a última aba", () => {
    const onChange = vi.fn();
    render(<ControlledTabs onChange={onChange} />);
    const cena = screen.getByRole("tab", { name: "Cena" });
    cena.focus();
    fireEvent.keyDown(cena, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("export");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Exportar" }), {
      key: "Home",
    });
    expect(onChange).toHaveBeenLastCalledWith("cena");
  });

  it("pula abas desabilitadas na navegação por teclado", () => {
    const items: TabItem[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B", disabled: true },
      { id: "c", label: "C" },
    ];
    const onChange = vi.fn();
    render(<Tabs items={items} value="a" onChange={onChange} label="X" />);
    const a = screen.getByRole("tab", { name: "A" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
});
