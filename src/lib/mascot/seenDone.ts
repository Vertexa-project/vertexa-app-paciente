// Quantas metas já estavam fechadas na última vez que o paciente viu o tigrezinho HOJE (sessionStorage, por dia).
// Serve para comemorar também quando ele volta da tela onde registrou a água/refeição e a Home monta de novo.
const keyFor = (day: string) => `vertexa:mascot:done:${day}`;

export function readSeenDone(day: string, store: Pick<Storage, "getItem"> = sessionStorage): number | null {
  try {
    const raw = store.getItem(keyFor(day));
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeSeenDone(day: string, done: number, store: Pick<Storage, "setItem"> = sessionStorage): void {
  try {
    store.setItem(keyFor(day), String(done));
  } catch {
    /* sem storage: só não comemora na volta */
  }
}
