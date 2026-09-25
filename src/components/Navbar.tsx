import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogIn, LogOut, RefreshCw, User, Users, Crown, Sparkles, Lock, FolderCheck, CheckCircle2, ArrowRight, Database, Trophy } from 'lucide-react';
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
  onOpenPremiumModal?: () => void;
  onOpenTracking?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenAdmin?: () => void;
  isLoginPage?: boolean;
  onContinueWithoutAccount?: () => void;
}

export function Navbar({
  connectionStatus,
  onOpenSettings,
  onRefresh,
  isLoading,
  totalStudents,
  onGoHome,
  isDetailPage,
  currentUser,
  onViewProfile,
  onLogout,
  onOpenLogin,
  onOpenPremiumModal,
  onOpenTracking,
  onOpenLeaderboard,
  onOpenAdmin,
  isLoginPage,
  onContinueWithoutAccount,
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
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
          </div>
        </button>

        {/* Status and Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isLoginPage ? (
            <button
              onClick={onContinueWithoutAccount}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Tanpa Akun <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
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
                      <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-400">Akun Saya</p>
                          {/* Dropdown Tier Badge */}
                          {(currentUser.tier || 'free') === 'free' && (
                            <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <User className="w-2.5 h-2.5 text-slate-500" />
                              <span>Free</span>
                            </span>
                          )}
                          {(currentUser.tier || 'free') === 'basic' && (
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <FolderCheck className="w-2.5 h-2.5 text-emerald-500" />
                              <span>Basic</span>
                            </span>
                          )}
                          {(currentUser.tier || 'free') === 'pro' && (
                            <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 text-amber-500" />
                              <span>Pro</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {currentUser.namaLengkap}
                        </p>
                        <p className="text-xs font-mono text-slate-500 truncate">
                          {currentUser.nim}
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md truncate max-w-full">
                            {currentUser.kelompok}
                          </span>
                        </div>
                      </div>

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

                        {/* Mode Admin - Only visible for F1D02610029 */}
                        {currentUser?.nim?.trim().toUpperCase().replace(/[\/\s_-]/g, '') === 'F1D02610029' && (
                          <button
                            id="menu-btn-mode-admin"
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onOpenAdmin?.();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span>Mode Admin</span>
                              <p className="text-[10px] font-normal text-slate-400 truncate">
                                Kelola tabel database Supabase
                              </p>
                            </div>
                          </button>
                        )}

                        <button
                          id="menu-btn-rangking"
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenLeaderboard?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-colors text-left cursor-pointer"
                          role="menuitem"
                        >
                          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>Rangking &amp; Top Score</span>
                            <p className="text-[10px] font-normal text-slate-400 truncate">
                              Podium &amp; kecepatan upload harian
                            </p>
                          </div>
                        </button>

                        <button
                          id="menu-btn-tracking-foto"
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenTracking?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors text-left cursor-pointer"
                          role="menuitem"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>Tracking Foto</span>
                            <p className="text-[10px] font-normal text-slate-400 truncate">
                              Checklist progres foto bersama
                            </p>
                          </div>
                        </button>

                        <button
                          id="menu-btn-config-database"
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenSettings?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <Database className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>Atur Supabase Key</span>
                            <p className="text-[10px] font-normal text-slate-400 truncate">
                              Ubah Anon Key &amp; koneksi Supabase
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenPremiumModal?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>Akses Premium</span>
                            <p className="text-[10px] font-normal text-slate-400 truncate">
                              {(currentUser.tier || 'free') === 'pro' ? 'Semua Fitur Aktif!' : 'Beli / Upgrade Tier Akses'}
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
                              Keluar dan ganti akun
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    id="btn-navbar-config-db"
                    type="button"
                    onClick={onOpenSettings}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Atur Supabase Key"
                  >
                    <Database className="w-4 h-4" />
                  </button>

                  <button
                    id="btn-navbar-login"
                    type="button"
                    disabled={isLoading}
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Masuk Akun Mahasiswa"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

