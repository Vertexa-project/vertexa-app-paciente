import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { NotificationRow } from "@/lib/api/notifications";

const hook = vi.hoisted(() => ({
  notifications: [] as NotificationRow[],
  unreadCount: 0,
  markAllRead: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: hook.notifications, unreadCount: hook.unreadCount, isLoading: false, isError: false,
    markRead: hook.markRead, markAllRead: hook.markAllRead,
  }),
}));

const { default: NotificationsPanel } = await import("./NotificationsPanel");

const N = (id: string, read: string | null): NotificationRow =>
  ({ id, type: "professional", title: `Aviso ${id}`, body: "corpo", created_at: new Date().toISOString(), read_at: read }) as NotificationRow;

function renderPanel(open = true) {
  return render(<MemoryRouter><NotificationsPanel open={open} onOpenChange={() => {}} /></MemoryRouter>);
}

beforeEach(() => { hook.notifications = []; hook.unreadCount = 0; hook.markAllRead.mockClear(); hook.markRead.mockClear(); });

describe("Painel de notificações do sino (PDF do Ernâni, tela 02)", () => {
  it("fechado: não monta nada (não lê notificações à toa)", () => {
    renderPanel(false);
    expect(screen.queryByText("Notificações")).not.toBeInTheDocument();
  });
  it("aberto: lista os avisos e 'Marcar lidas' marca em lote", () => {
    hook.notifications = [N("1", null), N("2", null)]; hook.unreadCount = 2;
    renderPanel();
    expect(screen.getByText("Aviso 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Marcar lidas"));
    expect(hook.markAllRead).toHaveBeenCalledOnce();
  });
  it("sem não lidas: não oferece 'Marcar lidas'", () => {
    hook.notifications = [N("1", "2026-01-01")];
    renderPanel();
    expect(screen.queryByText("Marcar lidas")).not.toBeInTheDocument();
  });
  it("vazio: mantém o texto honesto (não afirma que está tudo em dia)", () => {
    renderPanel();
    expect(screen.getByText("Nenhuma notificação por aqui")).toBeInTheDocument();
  });
});
