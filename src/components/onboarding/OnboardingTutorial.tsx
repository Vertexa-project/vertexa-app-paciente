import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMarkOnboardingTutorialSeen, useMyOnboardingTutorial } from "@/hooks/useOnboardingTutorial";
import { TutorialContext, type TutorialControls } from "./tutorialContext";

/**
 * Tutorial em vídeo do primeiro acesso (cartão 1087). Abre sozinho uma vez, quando há vídeo
 * publicado e o paciente ainda não o viu; ao fechar, marca como visto. Depois, o Perfil
 * reabre pelo `open()` do contexto.
 */
export function OnboardingTutorialProvider({ children }: { children: ReactNode }) {
  const tutorial = useMyOnboardingTutorial();
  const markSeen = useMarkOnboardingTutorialSeen();
  const [isOpen, setIsOpen] = useState(false);
  const autoOpened = useRef(false);
  const data = tutorial.data ?? null;

  useEffect(() => {
    if (data?.pending && !autoOpened.current) {
      autoOpened.current = true;
      setIsOpen(true);
    }
  }, [data?.pending]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (data?.pending && !markSeen.isPending) markSeen.mutate();
  }, [data?.pending, markSeen]);

  const controls = useMemo<TutorialControls>(
    () => ({ available: Boolean(data), open: () => setIsOpen(true) }),
    [data],
  );

  return (
    <TutorialContext.Provider value={controls}>
      {children}
      {data ? (
        <Dialog open={isOpen} onOpenChange={(next) => (next ? setIsOpen(true) : close())}>
          <DialogContent
            className="w-[calc(100%-1.5rem)] max-w-md gap-3 rounded-2xl p-4"
            data-testid="onboarding-tutorial"
          >
            <DialogHeader className="pr-6 text-left">
              <DialogTitle className="text-lg">{data.title || "Bem-vindo à Vertexa"}</DialogTitle>
              <DialogDescription>
                Um vídeo curto para você usar o app sozinho. Para rever depois, vá em Perfil e toque
                em “Tutorial do app”.
              </DialogDescription>
            </DialogHeader>
            <video
              key={data.videoUrl}
              src={data.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[60vh] w-full rounded-xl bg-black"
              aria-label="Vídeo do tutorial"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={close}
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground"
              >
                Começar a usar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </TutorialContext.Provider>
  );
}
