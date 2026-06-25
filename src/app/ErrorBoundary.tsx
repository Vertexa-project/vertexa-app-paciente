import * as React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary global: captura qualquer throw em tempo de RENDER em qualquer tela
 * (ex.: leitura de dado inesperado) e mostra uma tela amigável com ação de recarregar,
 * em vez de deixar o app em tela branca. Em DEV, loga o erro completo.
 *
 * Limite conhecido: NÃO captura erros lançados na avaliação de módulos no boot
 * (ex.: env ausente). Esse caso é tratado por gate no main.tsx (isSupabaseConfigured).
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Dados de saúde: em produção NÃO logar conteúdo sensível. Em DEV, logar para depurar.
    if (import.meta.env.DEV) {
      console.error("[VERTEXA] Erro não tratado na UI:", error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-display font-bold text-foreground">Algo deu errado</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Encontramos um problema ao exibir esta tela. Você pode recarregar e tentar de novo.
            Se persistir, avise sua equipe.
          </p>
        </div>
        {import.meta.env.DEV ? (
          <pre className="max-w-xl overflow-auto rounded-md border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
        <button
          onClick={this.handleReload}
          className="h-12 px-6 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
