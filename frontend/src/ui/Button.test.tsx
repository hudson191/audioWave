import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza com variante default e type=button", () => {
    render(<Button>Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn).toHaveClass("ui-btn", "ui-btn--default");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("aplica classes de variante e tamanho", () => {
    render(
      <Button variant="solid" size="lg">
        Exportar
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Exportar" });
    expect(btn).toHaveClass("ui-btn--solid", "ui-btn--lg");
    expect(btn).not.toHaveClass("ui-btn--md");
  });

  it("aplica tamanho sm", () => {
    render(
      <Button variant="ghost" size="sm">
        Menor
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Menor" })).toHaveClass(
      "ui-btn--ghost",
      "ui-btn--sm",
    );
  });

  it("renderiza ícone como decorativo (aria-hidden)", () => {
    render(<Button icon={<svg data-testid="icone" />}>Com ícone</Button>);
    const icon = screen.getByTestId("icone").parentElement;
    expect(icon).toHaveClass("ui-btn__icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("dispara onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não dispara onClick quando disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Bloqueado
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Bloqueado" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respeita type customizado", () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
