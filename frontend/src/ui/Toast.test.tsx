import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success("Projeto salvo")}>
        sucesso
      </button>
      <button
        type="button"
        onClick={() => toast.error("Falha ao salvar", "Tente novamente")}
      >
        erro
      </button>
      <button type="button" onClick={() => toast.info("Exportando")}>
        info
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("useToast fora do provider lança erro amigável", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(
      "useToast deve ser usado dentro de <ToastProvider>.",
    );
    spy.mockRestore();
  });

  it("exibe toast de sucesso com role=status e tom correto", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "sucesso" }));
    const toast = screen.getByRole("status");
    expect(toast).toHaveClass("ui-toast", "ui-toast--success");
    expect(screen.getByText("Projeto salvo")).toBeInTheDocument();
  });

  it("exibe título e mensagem no toast de erro", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "erro" }));
    expect(screen.getByRole("status")).toHaveClass("ui-toast--error");
    expect(screen.getByText("Falha ao salvar")).toBeInTheDocument();
    expect(screen.getByText("Tente novamente")).toBeInTheDocument();
  });

  it("empilha múltiplos toasts", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "sucesso" }));
    fireEvent.click(screen.getByRole("button", { name: "info" }));
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("auto-dismiss após 4 segundos", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "info" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fecha manualmente pelo botão ×", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "sucesso" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Fechar notificação" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stack tem aria-live polite", () => {
    const { container } = renderWithProvider();
    const stack = container.querySelector(".ui-toasts");
    expect(stack).toHaveAttribute("aria-live", "polite");
  });
});
