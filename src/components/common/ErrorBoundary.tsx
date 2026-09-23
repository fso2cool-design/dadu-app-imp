import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  isRoot?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const {
      children,
      fallbackTitle = 'Terjadi Kendala pada Halaman Ini',
      fallbackMessage = 'Sistem mendeteksi kendala saat menampilkan komponen ini. Anda dapat mencoba memuat ulang atau kembali ke dashboard.',
      isRoot = false,
    } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <div
        className={`flex items-center justify-center p-4 select-none ${
          isRoot ? 'min-h-screen bg-slate-50 dark:bg-[#0c0e15]' : 'min-h-[400px] w-full'
        }`}
        role="alert"
      >
        <div className="max-w-md w-full bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {fallbackTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {fallbackMessage}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Ke Dashboard
            </button>
          </div>

          {error && (
            <div className="pt-2 text-left border-t border-slate-100 dark:border-[#232838]">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 font-medium py-1 transition-colors"
              >
                <span>Informasi Diagnostik Error</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                  <div className="font-bold text-rose-400">{error.name}: {error.message}</div>
                  {errorInfo?.componentStack && (
                    <pre className="mt-1 text-slate-400 whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
