import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React render tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans">
          <div className="glass-panel max-w-lg w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                System Interface Recovery
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                The smart store control panel encountered a temporary render exception and safely contained it.
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-xl bg-slate-100 p-3 text-left font-mono text-[11px] text-slate-700 max-h-32 overflow-y-auto border border-slate-200">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-800 shadow-xs transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Dashboard
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Home className="h-4 w-4" />
                Return to Overview
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
