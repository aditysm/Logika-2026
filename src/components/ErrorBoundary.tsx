import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                Sesi Halaman Mengalami Kendala
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tautan sesi telah kadaluarsa atau terjadi kendala saat memuat komponen ini. Data akun dan foto Anda tetap aman.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-500" />
                <span>Kembali ke Beranda Utama</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
