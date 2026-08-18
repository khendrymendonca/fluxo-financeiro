import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    // Quando essa prop muda de valor (ex: o pathname da rota), o boundary
    // esquece o erro anterior e tenta renderizar os filhos de novo — assim
    // navegar para outra tela sai do estado de erro sem precisar recarregar
    // a página inteira.
    resetKey?: string;
}

interface ErrorBoundaryState {
    error: Error | null;
}

// Sem isso, qualquer erro não tratado em qualquer tela derrubava a árvore
// inteira do React sem nenhum aviso — a "tela preta" que os usuários vinham
// relatando. Este boundary contém o erro, mostra uma mensagem amigável com
// opção de tentar de novo, e loga o erro real no console para investigação
// (em vez de a página simplesmente sumir sem deixar rastro nenhum).
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Erro não tratado capturado:', error, errorInfo.componentStack);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null });
        }
    }

    handleRetry = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-danger/10 text-danger flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                            Algo deu errado
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            Essa tela encontrou um problema inesperado. Você pode tentar de novo ou voltar ao início.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={this.handleRetry}
                            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Tentar novamente
                        </button>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-muted text-foreground font-black text-xs uppercase tracking-widest hover:bg-muted/70 transition-all active:scale-95"
                        >
                            <Home className="w-3.5 h-3.5" />
                            Início
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
