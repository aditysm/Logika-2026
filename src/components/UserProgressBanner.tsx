import {
  CheckCircle2,
  ExternalLink,
  Folder,
  TrendingUp,
  UserCheck,
  Lock,
  Crown,
  Sparkles,
  FileDown,
  User,
  FolderCheck,
} from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';
import { normalizeNim, hasTakenPhoto } from '../lib/photoStorage';

interface UserProgressBannerProps {
  currentUser: Mahasiswa;
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  filterPhotoStatus: 'ALL' | 'BELUM' | 'SUDAH';
  onFilterPhotoStatusChange: (status: 'ALL' | 'BELUM' | 'SUDAH') => void;
  onOpenPremiumModal?: () => void;
  onGenerateReport?: () => void;
}

export function UserProgressBanner({
  currentUser,
  students,
  photoRecords,
  filterPhotoStatus,
  onFilterPhotoStatusChange,
  onOpenPremiumModal,
  onGenerateReport,
}: UserProgressBannerProps) {
  const currentTier = currentUser.tier || 'free';
  // Filter out current user from target friends count
  const friends = students.filter(
    (s) => currentUser && normalizeNim(s.nim) !== normalizeNim(currentUser.nim)
  );

  const totalFriends = friends.length;

  // Count photos taken between current user and friend (mutual)
  const takenCount = friends.filter((friend) =>
    currentUser ? hasTakenPhoto(photoRecords, currentUser.nim, friend.nim) : false
  ).length;

  const percentage = totalFriends > 0 ? Math.round((takenCount / totalFriends) * 100) : 0;

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

        {/* Right: Quick Filter Status Buttons */}
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
  );
}
