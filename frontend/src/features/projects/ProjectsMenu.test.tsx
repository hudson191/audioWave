import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../ui";
import { useAppStore } from "../../state";
import type { Project } from "../../shared/types";
import { ProjectsMenu } from "./ProjectsMenu";

const PROJECT: Project = {
  id: "p1",
  name: "Clipe de teste",
  audioFileName: "musica.mp3",
  presetId: "eyris-bars",
  settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
  timeline: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderMenu() {
  return render(
    <ToastProvider>
      <ProjectsMenu />
    </ToastProvider>,
  );
}

describe("ProjectsMenu", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it("desabilita o seletor quando não há projetos salvos", () => {
    renderMenu();
    const select = screen.getByLabelText("Abrir projeto salvo");
    expect(select).toBeDisabled();
    expect(screen.getByText("Nenhum projeto salvo")).toBeInTheDocument();
  });

  it("lista os projetos salvos no seletor", () => {
    useAppStore.setState({ projects: [PROJECT] });
    renderMenu();
    expect(screen.getByLabelText("Abrir projeto salvo")).toBeEnabled();
    expect(
      screen.getByRole("option", { name: "Clipe de teste" }),
    ).toBeInTheDocument();
  });

  it("mostra o botão Excluir apenas com projeto aberto", () => {
    const { rerender } = renderMenu();
    expect(
      screen.queryByRole("button", { name: /Excluir projeto/ }),
    ).not.toBeInTheDocument();

    useAppStore.setState({ project: PROJECT, projects: [PROJECT] });
    rerender(
      <ToastProvider>
        <ProjectsMenu />
      </ToastProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Excluir projeto Clipe de teste" }),
    ).toBeInTheDocument();
  });

  it("abre o diálogo de salvar e valida nome vazio sem chamar a API", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));

    const dialog = screen.getByRole("dialog", { name: "Salvar projeto" });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      await screen.findByText("Informe um nome para o projeto."),
    ).toBeInTheDocument();
    // erro consumido do store (exibido localmente no campo)
    expect(useAppStore.getState().error).toBeNull();
  });

  it("preenche o nome com o projeto aberto ao salvar novamente", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ project: PROJECT, projects: [PROJECT] });
    renderMenu();
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    expect(screen.getByLabelText("Nome do projeto")).toHaveValue(
      "Clipe de teste",
    );
  });
});
