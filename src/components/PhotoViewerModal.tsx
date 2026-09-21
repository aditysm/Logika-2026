import { ExternalLink, Folder, X, Calendar, Users, Eye, CheckCircle2 } from 'lucide-react';
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
 * Helper to resolve direct file view link on Google Drive
 */
function resolveDrivePhotoUrl(
  record: PhotoRecord,
  activeStudent: Partial<Mahasiswa> | null,
  currentUser?: Mahasiswa | null
): string {
  const currentNim = currentUser?.nim ? normalizeNim(currentUser.nim) : '';
  const isUploader = currentNim && normalizeNim(record.uploaderNim) === currentNim;

  // 1. Try direct Drive File ID
  const preferredFileId = isUploader
    ? record.driveFileIdA || record.driveFileIdB
    : record.driveFileIdB || record.driveFileIdA;

  if (preferredFileId && !preferredFileId.startsWith('http') && preferredFileId.length > 5) {
    return `https://drive.google.com/file/d/${preferredFileId}/view?usp=sharing`;
  }

  // 2. Try raw URLs if they contain drive link
  const candidateUrls = [
    isUploader ? record.photoUrlA : record.photoUrlB,
    record.photoUrl,
    isUploader ? record.photoUrlB : record.photoUrlA,
  ].filter(Boolean) as string[];

  for (const rawUrl of candidateUrls) {
    if (rawUrl.includes('drive.google.com')) {
      const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
      }
      return rawUrl;
    }
  }

  // 3. Fallback to Student's Drive folder or Uploader's Drive folder
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
  if (!photoRecord) return null;

  // Tentukan mahasiswa saat ini yang sedang dilihat / difoto bersama
  let activeStudent: Partial<Mahasiswa> | null = targetStudent || null;

  if (!activeStudent) {
    const currentNim = currentUser?.nim ? normalizeNim(currentUser.nim) : '';
    const isCurrentUploader = currentNim && normalizeNim(photoRecord.uploaderNim) === currentNim;
    const isCurrentTarget = currentNim && normalizeNim(photoRecord.targetNim) === currentNim;

    // Rekan mahasiswa: jika login sebagai uploader -> target, jika login sebagai target -> uploader
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

  // Khusus di web: format nama berkas dengan Nama dan NIM mahasiswa saat ini
  const cleanNamaForFile = displayNama.trim().replace(/\s+/g, '_');
  const cleanNimForFile = displayNim.trim().replace(/[\/\s]/g, '-');
  const webFileName = `${cleanNamaForFile}_${cleanNimForFile}.jpg`;

  // URL langsung ke file foto di Google Drive
  const directPhotoDriveUrl = resolveDrivePhotoUrl(photoRecord, activeStudent, currentUser);
  const folderDriveUrl =
    activeStudent?.driveFolderUrl ||
    photoRecord.driveFolderUrl ||
    currentUser?.driveFolderUrl;

  // Cek apakah ada data image lokal murni (misal baru diambil via kamera di session ini)
  const isLocalDataImage =
    photoRecord.photoUrl &&
    photoRecord.photoUrl.startsWith('data:image/') &&
    !photoRecord.photoUrl.includes('drive.google.com');

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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full inline-block">
                  Lampiran Foto Bersama
                </span>
                {displayNim && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {displayNim}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {displayNama}
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
            {/* Action Box: Karena foto di Drive tidak bisa dirender preview <img> biasa, sediakan tautan langsung */}
            {isLocalDataImage ? (
              <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center min-h-[180px] max-h-[350px]">
                <img
                  src={photoRecord.photoUrl}
                  alt={`Foto bersama ${displayNama}`}
                  className="w-full h-auto max-h-[350px] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl p-6 sm:p-7 bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-800 shadow-inner flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
                  <Folder className="w-8 h-8 text-amber-400" />
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-base font-bold text-slate-100">
                    Foto Tersimpan di Google Drive
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Berkas foto dokumentasi tersimpan aman di Google Drive. Klik tombol di bawah untuk membuka dan melihat foto secara langsung.
                  </p>
                </div>

                <a
                  href={directPhotoDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-950" />
                  <span>Buka Foto di Drive untuk Melihat</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>Nama Berkas di Web:</span>
                  <span className="text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 break-all select-all">
                    {webFileName}
                  </span>
                </div>
              </div>
            )}

            {/* Metadata Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-500 font-medium">Nama Mahasiswa:</span>
                <span className="font-bold text-slate-800 text-right">{displayNama}</span>
              </div>

              {displayNim && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">NIM:</span>
                  <span className="font-mono font-bold text-slate-800 text-right">{displayNim}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">Nama Berkas:</span>
                <code className="font-mono font-semibold text-blue-800 text-[11px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 break-all select-all">
                  {webFileName}
                </code>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Waktu Tercatat:
                </span>
                <span className="font-medium text-slate-700">{formatIndonesianDate(photoRecord.timestamp)}</span>
              </div>

              {displayKelompok && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Kelompok:
                  </span>
                  <span className="font-medium text-slate-700">{displayKelompok}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-100 mt-1">
                <span className="flex items-center gap-1.5 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Status Verifikasi Tugas
                </span>
                <span className="font-black text-[11px]">Sudah Terekam</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
            {folderDriveUrl ? (
              <a
                href={folderDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-semibold rounded-xl text-xs transition-colors w-full sm:w-auto"
                title="Buka Folder Google Drive Mahasiswa"
              >
                <Folder className="w-4 h-4 text-amber-600" />
                <span>Buka Folder Drive</span>
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
