import {
  CheckCircle2,
  ExternalLink,
  Folder,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';
import { normalizeNim, hasTakenPhoto } from '../lib/photoStorage';

interface UserProgressBannerProps {
  currentUser: Mahasiswa;
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  filterPhotoStatus: 'ALL' | 'BELUM' | 'SUDAH';
  onFilterPhotoStatusChange: (status: 'ALL' | 'BELUM' | 'SUDAH') => void;
}

export function UserProgressBanner({
  currentUser,
  students,
  photoRecords,
  filterPhotoStatus,
  onFilterPhotoStatusChange,
}: UserProgressBannerProps) {
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                <UserCheck className="w-3 h-3" />
                Sesi Aktif
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {currentUser.kelompok}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
              Halo, {currentUser.namaLengkap}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>{currentUser.nim}</span>
              {currentUser.driveFolderUrl && (
                <>
                  <span>&bull;</span>
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
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage > 0 ? 'bg-blue-600' : 'bg-transparent'
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
                ? takenCount > 0
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-rose-600 text-white shadow-xs'
                : takenCount > 0
                  ? 'text-slate-600 hover:text-emerald-600'
                  : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            Sudah ({takenCount})
          </button>
        </div>
      </div>
    </div>
  );
}
