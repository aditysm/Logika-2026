import { ExternalLink, Folder, X, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { formatIndonesianDate } from '../lib/photoStorage';

interface PhotoViewerModalProps {
  photoRecord: PhotoRecord | null;
  currentUser?: Mahasiswa | null;
  onClose: () => void;
}

export function PhotoViewerModal({
  photoRecord,
  currentUser,
  onClose,
}: PhotoViewerModalProps) {
  if (!photoRecord) return null;

  // Prioritize User A (currentUser)'s Drive folder if logged in
  const activeDriveUrl =
    currentUser?.driveFolderUrl ||
    photoRecord.driveFolderUrl ||
    photoRecord.photoUrl;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 relative my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 z-10">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Lampiran Foto Bersama
              </span>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {photoRecord.targetNama || 'Foto Bersama'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content - Scrollable */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center min-h-[180px] max-h-[350px]">
              {photoRecord.photoUrl ? (
                <img
                  src={photoRecord.photoUrl}
                  alt={`Foto bersama ${photoRecord.targetNama}`}
                  className="w-full h-auto max-h-[350px] object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Folder className="w-12 h-12 mx-auto text-blue-400 opacity-80" />
                  <p className="text-xs text-slate-300 font-medium">
                    File foto tercatat pada sistem & Google Drive
                  </p>
                  <p className="text-[11px] font-mono text-blue-300">
                    {photoRecord.photoFileName}
                  </p>
                </div>
              )}
            </div>

            {/* Metadata Summary */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-slate-500 font-medium">Nama Berkas:</span>
                <code className="font-mono font-semibold text-blue-800 text-[11px] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 break-all select-all">
                  {photoRecord.photoFileName}
                </code>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Waktu Tercatat:
                </span>
                <span className="font-medium text-slate-700">{formatIndonesianDate(photoRecord.timestamp)}</span>
              </div>

              {photoRecord.targetKelompok && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Kelompok:
                  </span>
                  <span className="font-medium text-slate-700">{photoRecord.targetKelompok}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
            {activeDriveUrl ? (
              <a
                href={activeDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-semibold rounded-xl text-xs transition-colors w-full sm:w-auto"
              >
                <Folder className="w-4 h-4 text-amber-600" />
                <span>Buka Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              </a>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-800 font-semibold rounded-xl text-xs transition-all w-full sm:w-auto cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
