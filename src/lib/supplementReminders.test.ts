import { describe, expect, it } from "vitest";
import { dueReminders, reminderLabel, reminderMinutes } from "./supplementReminders";

const it_ = (id: string, t: string | null, kind: "supplement" | "medication" = "supplement") => ({ id, name: id, dose: null, kind, reminder_time: t });
const at = (h: number, m: number) => new Date(2026, 9, 21, h, m);

describe("supplementReminders", () => {
  it("lê horários com ou sem segundos; inválido vira null", () => {
    expect(reminderMinutes("08:30:00")).toBe(510);
    expect(reminderMinutes("8:05")).toBe(485);
    for (const bad of [null, "", "24:00", "12:60", "abc"]) expect(reminderMinutes(bad)).toBeNull();
  });
  it("só entra quem já passou do horário e ainda não foi tomado", () => {
    const list = [it_("a", "08:00:00"), it_("b", "12:00:00"), it_("c", "20:00:00"), it_("d", null), it_("e", "07:00:00")];
    const due = dueReminders(list, new Set(["e"]), at(12, 0));
    expect(due.map((x) => x.id)).toEqual(["a", "b"]); // c ainda não; d sem lembrete; e já tomado
  });
  it("no minuto exato do lembrete já aparece, um minuto antes não", () => {
    const list = [it_("a", "09:30:00")];
    expect(dueReminders(list, new Set(), at(9, 29))).toHaveLength(0);
    expect(dueReminders(list, new Set(), at(9, 30))).toHaveLength(1);
  });
  it("ordena pelo horário e mistura suplemento e medicamento", () => {
    const list = [it_("tarde", "15:00:00"), it_("manha", "07:00:00", "medication")];
    expect(dueReminders(list, new Set(), at(23, 0)).map((x) => x.id)).toEqual(["manha", "tarde"]);
  });
  it("rótulo HH:MM", () => {
    expect(reminderLabel("08:30:00")).toBe("08:30");
    expect(reminderLabel("x")).toBe("");
  });
});
