import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled rendering error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-bg-secondary border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-lg space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                An error occurred while loading this view. You can return to the dashboard or reload the page to continue.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-bg-tertiary rounded-xl text-left border border-border-primary overflow-x-auto text-[11px] font-mono text-rose-400 max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-blue text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-blue/90 transition-all shadow-sm"
              >
                <Home className="w-4 h-4" />
                Return to Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover text-text-primary font-bold text-xs border border-border-primary flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
