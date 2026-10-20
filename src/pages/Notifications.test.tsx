import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { NotificationRow } from "@/lib/api/notifications";

const hook = vi.hoisted(() => ({
  notifications: [] as NotificationRow[],
  isLoading: false,
  isError: false,
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: hook.notifications,
    unreadCount: 0,
    isLoading: hook.isLoading,
    isError: hook.isError,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

const { default: Notifications } = await import("./Notifications");

function renderNotifications() {
  return render(
    <MemoryRouter>
      <Notifications />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hook.notifications = [];
  hook.isLoading = false;
  hook.isError = false;
});

// WP-APP-7 item 2.3. "Você está em dia! 🎉" afirmava algo sobre a rotina dela a partir de uma
// lista vazia. A verdade é outra: NADA emite notificação no produto ainda (0 linhas em
// `notifications` em toda a base, nenhum trigger que emita alguma).
describe("Notificações / estado vazio (WP-APP-7 item 2.3)", () => {
  it('não afirma mais que ela "está em dia"', () => {
    renderNotifications();

    expect(screen.getByText("Nenhuma notificação por aqui")).toBeInTheDocument();
    expect(screen.queryByText(/está em dia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/🎉/)).not.toBeInTheDocument();
  });

  it("diz a causa e NEGA a leitura errada", () => {
    renderNotifications();

    expect(screen.getByText(/aparecem os avisos que a sua clínica enviar/i)).toBeInTheDocument();
    expect(screen.getByText(/não quer dizer que esteja tudo em dia/i)).toBeInTheDocument();
  });

  // Carregando e falha continuam distintos do vazio — nenhum dos dois pode virar "não há nada".
  it("carregando não afirma vazio", () => {
    hook.isLoading = true;
    renderNotifications();

    expect(screen.queryByText("Nenhuma notificação por aqui")).not.toBeInTheDocument();
  });

  it("falha não afirma vazio", () => {
    hook.isError = true;
    renderNotifications();

    expect(screen.getByText(/não foi possível carregar suas notificações/i)).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma notificação por aqui")).not.toBeInTheDocument();
  });
});
