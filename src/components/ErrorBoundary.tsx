import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Etiqueta para identificar dónde ocurrió el error. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Aísla errores de render de un subárbol para que no tumben toda la app.
 * Muestra el mensaje del error en su lugar (útil para diagnosticar en dev).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-(--color-destructive) bg-(--color-destructive)/10 p-3 text-xs text-(--color-destructive)">
          <p className="font-semibold">Error al renderizar{this.props.label ? ` (${this.props.label})` : ""}</p>
          <p className="mt-1 break-words font-mono">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
