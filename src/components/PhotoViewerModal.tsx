import { useState, useEffect } from 'react';
import { ExternalLink, Folder, X, Calendar, Users, Eye, ImageIcon, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { formatIndonesianDate, normalizeNim } from '../lib/photoStorage';

interface PhotoViewerModalProps {
  photoRecord: PhotoRecord | null;
  targetStudent?: Mahasiswa | null;
  currentUser?: Mahasiswa | null;
  allStudents?: Mahasiswa[];
  onClose: () => void;
}

/**
 * Extract Google Drive file ID from record or URLs
 */
function extractDriveFileId(
  record: PhotoRecord,
  currentUser?: Mahasiswa | null
): string | null {
  const currentNim = currentUser?.nim ? normalizeNim(currentUser.nim) : '';
  const isUploader = currentNim && normalizeNim(record.uploaderNim) === currentNim;

  const candidateId = isUploader
    ? record.driveFileIdA || record.driveFileIdB
    : record.driveFileIdB || record.driveFileIdA;

  if (candidateId && !candidateId.startsWith('http') && candidateId.length > 5) {
    return candidateId;
  }

  const candidateUrls = [
    isUploader ? record.photoUrlA : record.photoUrlB,
    record.photoUrl,
    isUploader ? record.photoUrlB : record.photoUrlA,
  ].filter(Boolean) as string[];

  for (const rawUrl of candidateUrls) {
    if (rawUrl.includes('drive.google.com')) {
      const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * Helper to resolve direct file view link on Google Drive
 */
function resolveDrivePhotoUrl(
  record: PhotoRecord,
  activeStudent: Partial<Mahasiswa> | null,
  currentUser?: Mahasiswa | null
): string {
  const fileId = extractDriveFileId(record, currentUser);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  // Fallback to student or uploader drive folder
  if (activeStudent?.driveFolderUrl) return activeStudent.driveFolderUrl;
  if (record.driveFolderUrl) return record.driveFolderUrl;
  if (currentUser?.driveFolderUrl) return currentUser.driveFolderUrl;
  return 'https://drive.google.com';
}

export function PhotoViewerModal({
  photoRecord,
  targetStudent,
  currentUser,
  allStudents = [],
  onClose,
}: PhotoViewerModalProps) {
  const [imgLoadError, setImgLoadError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photoRecord) return null;

  // Resolve target student details
  let activeStudent: Partial<Mahasiswa> | null = targetStudent || null;

  if (!activeStudent) {
    const currentNim = currentUser?.nim ? normalizeNim(currentUser.nim) : '';
    const isCurrentTarget = currentNim && normalizeNim(photoRecord.targetNim) === currentNim;

    const partnerNim = isCurrentTarget ? photoRecord.uploaderNim : photoRecord.targetNim;
    const partnerNama = isCurrentTarget ? photoRecord.uploaderNama : photoRecord.targetNama;

    if (allStudents && allStudents.length > 0 && partnerNim) {
      const found = allStudents.find((s) => normalizeNim(s.nim) === normalizeNim(partnerNim));
      if (found) activeStudent = found;
    }

    if (!activeStudent) {
      activeStudent = {
        id: partnerNim || 'unknown',
        nim: partnerNim || '',
        namaLengkap: partnerNama || 'Mahasiswa',
        kelompok: photoRecord.targetKelompok || '-',
        driveFolderUrl: photoRecord.driveFolderUrl,
      };
    }
  }

  const displayNama = activeStudent?.namaLengkap || photoRecord.targetNama || 'Mahasiswa';
  const displayNim = activeStudent?.nim || photoRecord.targetNim || '';
  const displayKelompok = activeStudent?.kelompok || photoRecord.targetKelompok || '-';

  // Format filename for reference
  const cleanNamaForFile = displayNama.trim().replace(/\s+/g, '_');
  const cleanNimForFile = displayNim.trim().replace(/[\/\s]/g, '-');
  const webFileName = `${cleanNamaForFile}_${cleanNimForFile}.jpg`;

  const directPhotoDriveUrl = resolveDrivePhotoUrl(photoRecord, activeStudent, currentUser);
  const driveFileId = extractDriveFileId(photoRecord, currentUser);

  const folderDriveUrl =
    activeStudent?.driveFolderUrl ||
    photoRecord.driveFolderUrl ||
    currentUser?.driveFolderUrl;

  const isLocalDataImage =
    photoRecord.photoUrl &&
    photoRecord.photoUrl.startsWith('data:image/') &&
    !photoRecord.photoUrl.includes('drive.google.com');

  // Candidate image src: local base64 or Drive thumbnail
  const candidateImgSrc = isLocalDataImage
    ? photoRecord.photoUrl
    : driveFileId
    ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w800`
    : null;

  const canShowImage = Boolean(candidateImgSrc && !imgLoadError);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Minimalis */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                  Foto Bersama
                </span>
                {displayKelompok && (
                  <span className="text-[11px] text-slate-400">· {displayKelompok}</span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {displayNama}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 transition-colors cursor-pointer shrink-0"
              title="Tutup (Esc)"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Area Foto Minimalis */}
          <div className="p-5 space-y-4">
            {canShowImage ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 min-h-[200px] max-h-[320px] flex items-center justify-center">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                    <span className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={candidateImgSrc!}
                  alt={`Foto bersama ${displayNama}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoadError(true)}
                  className={`w-full h-auto max-h-[320px] object-contain transition-opacity duration-200 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Foto Tersimpan di Google Drive
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Klik tombol di bawah untuk melihat atau mengunduh berkas foto asli di Google Drive.
                  </p>
                </div>
              </div>
            )}

            {/* Tombol Aksi Utama: Buka Foto di Drive */}
            <a
              href={directPhotoDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Buka Foto di Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* Rincian Ringkas Minimalis */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-3.5 h-3.5" />
                  NIM:
                </span>
                <span className="font-mono font-semibold text-slate-800">{displayNim || '-'}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Tercatat:
                </span>
                <span className="font-medium text-slate-700">
                  {formatIndonesianDate(photoRecord.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="text-slate-400">Berkas:</span>
                <code className="text-[11px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 max-w-[200px] truncate select-all">
                  {webFileName}
                </code>
              </div>

              <div className="flex items-center justify-between text-emerald-700 pt-1 border-t border-slate-200/60 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Status Foto:
                </span>
                <span>Sudah Terekam</span>
              </div>
            </div>
          </div>

          {/* Footer Navigasi Minimalis */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            {folderDriveUrl ? (
              <a
                href={folderDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                title="Buka Folder Google Drive Mahasiswa"
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Buka Folder</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
