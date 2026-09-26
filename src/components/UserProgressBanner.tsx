import { useMemo } from 'react';
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  ExternalLink,
  Folder,
  TrendingUp,
  UserCheck,
  Lock,
  Crown,
  FileDown,
  FileText,
  User,
  FolderCheck,
} from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';
import { normalizeNim, getTakenNimSet } from '../lib/photoStorage';

interface UserProgressBannerProps {
  currentUser: Mahasiswa;
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  filterPhotoStatus: 'ALL' | 'BELUM' | 'SUDAH';
  onFilterPhotoStatusChange: (status: 'ALL' | 'BELUM' | 'SUDAH') => void;
  onOpenPremiumModal?: () => void;
  onGenerateReport?: () => void;
  onGoToReport?: () => void;
}

export function UserProgressBanner({
  currentUser,
  students,
  photoRecords,
  filterPhotoStatus,
  onFilterPhotoStatusChange,
  onOpenPremiumModal,
  onGenerateReport,
  onGoToReport,
}: UserProgressBannerProps) {
  const currentTier = currentUser.tier || 'free';

  const { totalFriends, takenCount, percentage } = useMemo(() => {
    const userNim = normalizeNim(currentUser.nim);
    const friends = students.filter((s) => normalizeNim(s.nim) !== userNim);
    const countFriends = friends.length;
    const takenSet = getTakenNimSet(photoRecords, currentUser.nim);
    let count = 0;
    for (const f of friends) {
      if (takenSet.has(normalizeNim(f.nim))) {
        count++;
      }
    }
    const pct = countFriends > 0 ? Math.round((count / countFriends) * 100) : 0;
    return { totalFriends: countFriends, takenCount: count, percentage: pct };
  }, [currentUser.nim, students, photoRecords]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs mb-6 sm:mb-8 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: User Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
            {currentUser.namaLengkap.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Halo, {currentUser.namaLengkap}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 font-mono mt-0.5">
              <span className="font-sans font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md text-[10px] leading-none shrink-0">
                {currentUser.kelompok}
              </span>
              {currentUser.nim && currentUser.nim.replace(/[\/\s]/g, '').toUpperCase() === 'F1D02610090' && (
                <span className="inline-flex items-center gap-1 font-sans font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md text-[10px] leading-none shrink-0">
                  <Bug className="w-2.5 h-2.5 text-purple-600" />
                  <span>Bug Hunter</span>
                </span>
              )}
              <span className="text-slate-300">&bull;</span>
              <span>{currentUser.nim}</span>
              {currentUser.driveFolderUrl && (
                currentTier === 'free' ? (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={onOpenPremiumModal}
                      className="text-slate-400 hover:text-blue-600 inline-flex items-center gap-1 font-sans text-[11px] cursor-pointer"
                      title="Pilih Paket Dasar untuk membuka Google Drive"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Drive Terkunci</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <a
                      href={currentUser.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 font-sans text-[11px]"
                    >
                      <Folder className="w-3 h-3" />
                      <span>Drive Pribadi</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        {/* Center: Progress Bar & Ratio */}
        <div className="flex-1 lg:max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Progress Foto Bersama</span>
            </div>
            <span className="text-blue-700 font-bold tabular-nums">
              {takenCount} dari {totalFriends} Teman ({percentage}%)
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage < 35
                  ? 'bg-orange-500'
                  : percentage < 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => onFilterPhotoStatusChange('SUDAH')}
              className={`flex items-center gap-1 font-semibold hover:underline cursor-pointer ${
                takenCount > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${takenCount > 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
              <span>{takenCount} Sudah Foto</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterPhotoStatusChange('BELUM')}
              className="text-slate-500 font-medium hover:text-blue-600 hover:underline cursor-pointer"
            >
              <span>{Math.max(0, totalFriends - takenCount)} Belum Foto</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Filter Status Buttons & Special Action */}
        <div className="flex flex-wrap items-center gap-2">
          {normalizeNim(currentUser.nim) === normalizeNim('F1D02610029') && onGenerateReport && (
            <button
              id="btnBannerGenerateWord"
              type="button"
              onClick={onGenerateReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm transition-all cursor-pointer"
              title="Akses Khusus: Ajukan berkas dokumen laporan Word (.docx)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Buat Laporan Word (.docx)</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => onFilterPhotoStatusChange('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterPhotoStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({totalFriends})
            </button>
            <button
              type="button"
              onClick={() => onFilterPhotoStatusChange('BELUM')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterPhotoStatus === 'BELUM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              Belum ({Math.max(0, totalFriends - takenCount)})
            </button>
            <button
              type="button"
              onClick={() => onFilterPhotoStatusChange('SUDAH')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterPhotoStatus === 'SUDAH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              Sudah ({takenCount})
            </button>
          </div>
        </div>
      </div>

      {/* Completion Prompt Card - Green for 100%, Yellow for >= 130 */}
      {percentage >= 100 ? (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-linear-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-4.5 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-emerald-100/70">
                <FolderCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Selamat!
                </h4>
                <p className="text-xs text-emerald-800/95 leading-relaxed">
                  Semua foto tugas bersama telah selesai (100%). Silahkan buat folder &amp; ajukan dokumen laporan Word (.docx) sekarang.
                </p>
              </div>
            </div>

            <button
              id="btnGoToReport100"
              type="button"
              onClick={onGoToReport}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0"
            >
              <FileDown className="w-4 h-4" />
              <span>Buat Dokumen Laporan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : takenCount >= 130 ? (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-linear-to-r from-amber-50/95 via-yellow-50/80 to-amber-50/95 border border-amber-300 rounded-2xl p-4 sm:p-4.5 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-amber-100">
                <FolderCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                  Syarat Minimal Terpenuhi (&ge;130 Foto)
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Anda telah mengambil <strong>{takenCount} dari {totalFriends} foto</strong> (tersisa <strong className="text-amber-950">{Math.max(0, totalFriends - takenCount)} teman</strong> yang belum difoto). Anda sudah dapat membuat dokumen laporan sekarang.
                </p>
              </div>
            </div>

            <button
              id="btnGoToReport130"
              type="button"
              onClick={onGoToReport}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0"
            >
              <FileDown className="w-4 h-4" />
              <span>Buat Dokumen Laporan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
