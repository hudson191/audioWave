import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAppStore } from "../state";
import App from "../App";

describe("App (composição)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it("mostra o header e a tela de upload quando não há áudio", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "audioWave" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Envio de áudio" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Comece com a sua música")).toBeInTheDocument();
    // boot sem API não pode derrubar o app (erro vira toast e é limpo)
    await waitFor(() => {
      expect(useAppStore.getState().error).toBeNull();
    });
  });

  it("troca para o editor (canvas + painel + player) quando há áudio", () => {
    useAppStore.setState({
      duration: 120,
      audioFileName: "musica.mp3",
      status: "ready",
    });
    render(<App />);
    expect(
      screen.getByRole("img", { name: "Visualização reativa da música" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", {
        name: "Painel de controles visuais",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reproduzir" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Envio de áudio" }),
    ).not.toBeInTheDocument();
  });
});
