import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UploadZone } from "./UploadZone";

function getHiddenInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("input de arquivo não encontrado");
  return input;
}

const mp3 = () => new File(["a"], "musica.mp3", { type: "audio/mpeg" });
const png = () => new File(["b"], "capa.png", { type: "image/png" });

describe("UploadZone", () => {
  it("renderiza como botão acessível com título e dica", () => {
    render(
      <UploadZone
        onFiles={() => {}}
        label="Enviar áudio"
        title="Arraste seu áudio"
        hint="MP3, WAV ou OGG"
      />,
    );
    const zone = screen.getByRole("button", { name: "Enviar áudio" });
    expect(zone).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Arraste seu áudio")).toBeInTheDocument();
    expect(screen.getByText("MP3, WAV ou OGG")).toBeInTheDocument();
  });

  it("clique abre o seletor de arquivos", () => {
    const { container } = render(<UploadZone onFiles={() => {}} />);
    const input = getHiddenInput(container);
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button"));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("Enter e Espaço abrem o seletor de arquivos", () => {
    const { container } = render(<UploadZone onFiles={() => {}} />);
    const input = getHiddenInput(container);
    const click = vi.spyOn(input, "click");
    const zone = screen.getByRole("button");
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    expect(click).toHaveBeenCalledTimes(2);
  });

  it("seleção pelo input chama onFiles", () => {
    const onFiles = vi.fn();
    const { container } = render(<UploadZone onFiles={onFiles} />);
    const file = mp3();
    fireEvent.change(getHiddenInput(container), {
      target: { files: [file] },
    });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("drop entrega arquivos e limpa o estado de arraste", () => {
    const onFiles = vi.fn();
    render(<UploadZone onFiles={onFiles} />);
    const zone = screen.getByRole("button");
    const file = mp3();

    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    expect(zone).toHaveClass("ui-upload--drag");

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(zone).not.toHaveClass("ui-upload--drag");
  });

  it("dragLeave remove o destaque de arraste", () => {
    render(<UploadZone onFiles={() => {}} />);
    const zone = screen.getByRole("button");
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass("ui-upload--drag");
  });

  it("filtra por accept e avisa via onError", () => {
    const onFiles = vi.fn();
    const onError = vi.fn();
    render(<UploadZone onFiles={onFiles} onError={onError} accept="audio/*" />);
    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: { files: [png()] },
    });
    expect(onFiles).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "Alguns arquivos têm um formato não aceito e foram ignorados.",
    );
  });

  it("sem multiple entrega apenas o primeiro arquivo aceito", () => {
    const onFiles = vi.fn();
    render(<UploadZone onFiles={onFiles} accept="audio/*" />);
    const first = mp3();
    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: { files: [first, mp3()] },
    });
    expect(onFiles).toHaveBeenCalledWith([first]);
  });

  it("desabilitado não abre seletor nem aceita drop", () => {
    const onFiles = vi.fn();
    const { container } = render(<UploadZone onFiles={onFiles} disabled />);
    const input = getHiddenInput(container);
    const click = vi.spyOn(input, "click");
    const zone = screen.getByRole("button");
    expect(zone).toHaveAttribute("aria-disabled", "true");
    expect(zone).toHaveAttribute("tabindex", "-1");
    fireEvent.click(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [mp3()] } });
    expect(click).not.toHaveBeenCalled();
    expect(onFiles).not.toHaveBeenCalled();
  });
});
