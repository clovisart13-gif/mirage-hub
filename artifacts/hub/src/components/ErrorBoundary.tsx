import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Algo deu errado</h1>
            <p className="text-gray-500 text-sm mb-6">
              Ocorreu um erro inesperado. Clique em recarregar para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
            >
              Recarregar página
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">Detalhes técnicos</summary>
                <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-32 bg-red-50 p-2 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
