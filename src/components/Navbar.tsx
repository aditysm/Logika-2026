import { Database, RefreshCw, Settings2, Users } from 'lucide-react';
import { ConnectionStatus } from '../types';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalStudents: number;
  onGoHome?: () => void;
  isDetailPage?: boolean;
}

export function Navbar({
  connectionStatus,
  onOpenSettings,
  onRefresh,
  isLoading,
  totalStudents,
  onGoHome,
  isDetailPage,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center text-left focus:outline-none group"
        >
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
              Logika 2026
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {isDetailPage ? 'Detail Profil Mahasiswa' : 'Pencarian & Informasi Mahasiswa'}
            </p>
          </div>
        </button>

        {/* Status and Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Total Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{totalStudents} Mahasiswa</span>
          </div>

          {/* Data Source Settings Button */}
          <button
            id="btn-connection-status"
            onClick={onOpenSettings}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-slate-200"
            title="Pengaturan Sumber Data"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">
              {connectionStatus.isConnected ? 'Data Terhubung' : 'Sumber Data'}
            </span>
            <Settings2 className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Refresh button */}
          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isLoading}
            type="button"
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
