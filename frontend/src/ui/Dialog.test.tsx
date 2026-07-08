import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("não renderiza nada quando fechado", () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Confirmar">
        Corpo
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza role=dialog com aria-modal e título associado", () => {
    render(
      <Dialog open onClose={() => {}} title="Excluir projeto">
        Tem certeza?
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Excluir projeto" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
  });

  it("foca o dialog ao abrir", () => {
    render(
      <Dialog open onClose={() => {}} title="Foco">
        Corpo
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("fecha ao pressionar Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Esc">
        Corpo
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar no overlay, mas não ao clicar dentro", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open onClose={onClose} title="Overlay">
        Corpo
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Corpo"));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = container.querySelector(".ui-dialog-overlay");
    expect(overlay).not.toBeNull();
    if (overlay) fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha pelo botão ×", async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Fechar">
        Corpo
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renderiza o footer quando fornecido", () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Com footer"
        footer={<button type="button">Cancelar</button>}
      >
        Corpo
      </Dialog>,
    );
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
  });

  it("não rouba o foco de um filho com autoFocus", () => {
    render(
      <Dialog open onClose={() => {}} title="Salvar">
        <input aria-label="Nome" autoFocus />
      </Dialog>,
    );
    expect(screen.getByLabelText("Nome")).toHaveFocus();
  });

  it("focus trap: Tab cicla apenas entre os elementos do dialog", async () => {
    const outside = document.createElement("button");
    outside.textContent = "fora";
    document.body.appendChild(outside);
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Trap"
        footer={<button type="button">Confirmar</button>}
      >
        <input aria-label="Campo" autoFocus />
      </Dialog>,
    );
    const user = userEvent.setup();
    const campo = screen.getByLabelText("Campo");
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    const fechar = screen.getByRole("button", { name: "Fechar" });

    expect(campo).toHaveFocus();
    await user.tab();
    expect(confirmar).toHaveFocus();
    await user.tab(); // último → volta ao primeiro (×), nunca sai do dialog
    expect(fechar).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirmar).toHaveFocus();
    expect(outside).not.toHaveFocus();
    outside.remove();
  });

  it("focus trap: Shift+Tab no primeiro elemento vai para o último", async () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Trap"
        footer={<button type="button">Fim</button>}
      >
        Corpo
      </Dialog>,
    );
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Fechar" }).focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Fim" })).toHaveFocus();
  });

  it("restaura o foco ao fechar", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="Foco">
        Corpo
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();
    rerender(
      <Dialog open={false} onClose={() => {}} title="Foco">
        Corpo
      </Dialog>,
    );
    expect(outside).toHaveFocus();
    outside.remove();
  });
});
