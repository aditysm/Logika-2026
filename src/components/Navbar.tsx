import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogIn, LogOut, RefreshCw, User, Users } from 'lucide-react';
import { ConnectionStatus, Mahasiswa } from '../types';

interface NavbarProps {
  connectionStatus?: ConnectionStatus;
  onOpenSettings?: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalStudents: number;
  onGoHome?: () => void;
  isDetailPage?: boolean;
  currentUser?: Mahasiswa | null;
  onViewProfile?: () => void;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export function Navbar({
  onRefresh,
  isLoading,
  totalStudents,
  onGoHome,
  isDetailPage,
  currentUser,
  onViewProfile,
  onLogout,
  onOpenLogin,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
            L
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
              Logika 2026
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {isDetailPage ? 'Detail Profil Mahasiswa' : 'Buku Kenangan & Direktori'}
            </p>
          </div>
        </button>

        {/* Status and Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Total Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{totalStudents} Mahasiswa</span>
          </div>

          {/* Refresh button */}
          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isLoading}
            type="button"
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Active User Button & Dropdown Menu OR Login Button */}
          {currentUser ? (
            <div className="relative ml-1" ref={menuRef}>
              <button
                id="btn-active-user-menu"
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-800 rounded-xl border border-slate-200/90 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                title="Akun Saya"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {currentUser.namaLengkap.charAt(0)}
                </div>
                <span className="text-xs font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[130px]">
                  {currentUser.namaPanggilan || currentUser.namaLengkap.split(' ')[0]}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isMenuOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  id="active-user-dropdown-menu"
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                >
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400">Akun Saya</p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {currentUser.namaLengkap}
                    </p>
                    <p className="text-xs font-mono text-slate-500 truncate mt-0.5">
                      {currentUser.nim}
                    </p>
                    <div className="mt-1.5">
                      <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md truncate max-w-full">
                        {currentUser.kelompok}
                      </span>
                    </div>
                  </div>

                  {/* Menu Action 1: Lihat Profil */}
                  <div className="p-1">
                    <button
                      id="menu-btn-lihat-profil"
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onViewProfile?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors text-left cursor-pointer"
                      role="menuitem"
                    >
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span>Lihat Profil</span>
                        <p className="text-[10px] font-normal text-slate-400 truncate">
                          Detail profil &amp; progress Anda
                        </p>
                      </div>
                    </button>

                    {/* Menu Action 2: Logout */}
                    <button
                      id="menu-btn-logout"
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left mt-0.5 cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span>Logout</span>
                        <p className="text-[10px] font-normal text-rose-400 truncate">
                          Keluar dan ganti mahasiswa
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="btn-navbar-login"
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs ml-1 cursor-pointer"
              title="Masuk Akun Mahasiswa"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

