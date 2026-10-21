import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  channel: { id: "c1" } as { id: string } | null,
  roster: [{ profileId: "edu", disciplines: ["educador_fisico"], type: null }, { profileId: "nut", disciplines: ["nutricionista"], type: null }] as unknown[],
  send: vi.fn(async (_: unknown) => ({ id: "m1", mentionFailed: false, mentionFailureReason: null })),
  sendFails: false,
}));

vi.mock("@/lib/api", () => ({
  getMyChannel: vi.fn(async () => api.channel),
  listChannelProfessionals: vi.fn(async () => api.roster),
  sendPatientMessage: (x: unknown) => { if (api.sendFails) return Promise.reject(new Error("x")); return api.send(x); },
}));

const { default: EducatorNote } = await import("./EducatorNote");

beforeEach(() => { api.channel = { id: "c1" }; api.send.mockClear(); api.sendFails = false; });

async function writeAndSend(text: string) {
  fireEvent.click(screen.getByText("Deixar recado para o educador"));
  fireEvent.change(await screen.findByLabelText("Recado para o educador"), { target: { value: text } });
  fireEvent.click(screen.getByText("Enviar recado"));
}

describe("Recado ao educador (PDF do Ernâni, tela 23)", () => {
  it("envia ao canal marcando o educador e identifica o treino", async () => {
    render(<EducatorNote workoutLabel="Treino E" />);
    await writeAndSend("senti o ombro");
    expect(await screen.findByText("Recado enviado à sua equipe.")).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith({ channelId: "c1", body: "Recado sobre o Treino E: senti o ombro", mentionedProfileId: "edu" });
  });
  it("sem educador no canal: vai para a equipe toda, sem marcar ninguém", async () => {
    api.roster = [{ profileId: "nut", disciplines: ["nutricionista"], type: null }];
    render(<EducatorNote workoutLabel="Treino A" />);
    await writeAndSend("cansado");
    await waitFor(() => expect(api.send).toHaveBeenCalledWith(expect.objectContaining({ mentionedProfileId: null })));
  });
  it("não envia texto vazio", () => {
    render(<EducatorNote workoutLabel="Treino A" />);
    fireEvent.click(screen.getByText("Deixar recado para o educador"));
    expect(screen.getByText("Enviar recado")).toBeDisabled();
  });
  it("sem canal ativo: avisa e não finge que enviou", async () => {
    api.channel = null;
    render(<EducatorNote workoutLabel="Treino A" />);
    await writeAndSend("oi");
    expect(await screen.findByText(/chat com a equipe ainda não está ativo/)).toBeInTheDocument();
    expect(screen.queryByText("Recado enviado à sua equipe.")).not.toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });
  it("falha no envio: mostra erro e deixa tentar de novo", async () => {
    api.sendFails = true;
    render(<EducatorNote workoutLabel="Treino A" />);
    await writeAndSend("oi");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível enviar");
    expect(screen.getByText("Enviar recado")).not.toBeDisabled();
  });
});
