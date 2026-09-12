import type { ReactNode } from "react";
import { motion } from "framer-motion";

import logoWordmark from "@/assets/logo/logo_2.png";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background px-8 pt-16 pb-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-sm">
        <img src={logoWordmark} alt="VERTEXA" className="mb-8 h-8 w-auto select-none" draggable={false} />
        <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
        <div className="mt-6 space-y-5">{children}</div>
      </motion.div>
    </div>
  );
}
