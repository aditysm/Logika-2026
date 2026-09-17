import { useState, useRef, ChangeEvent, DragEvent, FormEvent, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Folder,
  Image as ImageIcon,
  Info,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { compressImageFile, generateNextFileName, getPhotoWithTarget } from '../lib/photoStorage';
import { uploadFotoBersama } from '../lib/api';

interface UploadPhotoPageProps {
  currentUser: Mahasiswa;
  targetStudent: Mahasiswa;
  photoRecords: PhotoRecord[];
  onSavePhoto: (record: Omit<PhotoRecord, 'id' | 'timestamp'>) => void;
  onBack: () => void;
}

export function UploadPhotoPage({
  currentUser,
  targetStudent,
  photoRecords,
  onSavePhoto,
  onBack,
}: UploadPhotoPageProps) {
  const existingRecord = getPhotoWithTarget(photoRecords, currentUser.nim, targetStudent.nim);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingRecord?.photoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [copiedFileName, setCopiedFileName] = useState(false);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);

  // Failure & Cache modal states
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const draftKey = `draft_photo_${currentUser.nim}_${targetStudent.nim}`;

  // Restore cached draft photo on mount if available
  useEffect(() => {
    if (!photoPreview) {
      try {
        const cached = localStorage.getItem(draftKey);
        if (cached) {
          setPhotoPreview(cached);
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, [draftKey]);

  const { seq, fileName } = generateNextFileName(photoRecords, currentUser, targetStudent);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan!');
      return;
    }
    setSelectedFile(file);
    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.8);
      setPhotoPreview(compressedDataUrl);
      // Auto cache photo preview
      try {
        localStorage.setItem(draftKey, compressedDataUrl);
      } catch {
        // Quota exceeded
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotoPreview(result);
        try {
          if (result) localStorage.setItem(draftKey, result);
        } catch {
          // Quota
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyFileName = () => {
    navigator.clipboard.writeText(fileName);
    setCopiedFileName(true);
    setTimeout(() => setCopiedFileName(false), 2000);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleOpenConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!photoPreview) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    setErrorModal(null);
    setUploadStatusMsg('Mengirim foto ke Google Drive & mencatat ke server...');
    let isUploadSuccess = true;
    let serverError = '';
    let uploadRes: Awaited<ReturnType<typeof uploadFotoBersama>> | undefined;

    try {
      // 1. If we have binary File or cached preview, attempt upload
      if (selectedFile) {
        uploadRes = await uploadFotoBersama({
          file: selectedFile,
          nimA: currentUser.nim,
          nimB: targetStudent.nim,
          namaA: currentUser.namaLengkap,
          namaB: targetStudent.namaLengkap,
          folderIdA: currentUser.driveFolderUrl || targetStudent.driveFolderUrl || '',
          folderIdB: targetStudent.driveFolderUrl || currentUser.driveFolderUrl || '',
          totalFotoA: photoRecords.filter(
            (r) =>
              r.uploaderNim?.toLowerCase() === currentUser.nim?.toLowerCase() ||
              r.targetNim?.toLowerCase() === currentUser.nim?.toLowerCase()
          ).length,
          totalFotoB: photoRecords.filter(
            (r) =>
              r.uploaderNim?.toLowerCase() === targetStudent.nim?.toLowerCase() ||
              r.targetNim?.toLowerCase() === targetStudent.nim?.toLowerCase()
          ).length,
        });

        if (uploadRes.success) {
          console.log('Upload Edge Function & pencatatan DB berhasil:', uploadRes.data);
          if (uploadRes.data?.is_duplicate) {
            console.log('Foto ini sudah pernah diunggah sebelumnya (duplikasi terdeteksi).');
          }
        } else {
          console.warn('Edge function upload error:', uploadRes.error);
          isUploadSuccess = false;
          serverError = uploadRes.error || 'Gagal mengunggah foto ke Google Drive (Masalah koneksi/server).';
        }
      }
    } catch (err: unknown) {
      console.warn('Network upload error:', err);
      isUploadSuccess = false;
      serverError = err instanceof Error ? err.message : 'Koneksi internet terputus atau server tidak merespon.';
    }

    if (!isUploadSuccess) {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);

      // Save to cache so user work is NEVER lost
      if (photoPreview) {
        try {
          localStorage.setItem(draftKey, photoPreview);
        } catch {
          // Ignore
        }
      }

      setErrorModal({
        title: 'Upload Ke Drive Terkendala',
        message: serverError || 'Terjadi masalah jaringan atau izin Google Drive. Foto Anda telah disimpan di cache browser sehingga tidak hilang.',
      });
      return;
    }

    // Clear draft cache on successful upload
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }

    // 2. Update local state & UI after Drive upload & DB record succeeds
    const uploadedPhotoLog = uploadRes?.data?.data;
    const returnedPhotoUrl =
      uploadedPhotoLog?.photo_url_a ||
      uploadedPhotoLog?.photo_url_b ||
      photoPreview ||
      undefined;

    onSavePhoto({
      uploaderNim: currentUser.nim,
      uploaderNama: currentUser.namaLengkap,
      targetNim: targetStudent.nim,
      targetNama: targetStudent.namaLengkap,
      targetKelompok: targetStudent.kelompok,
      photoUrl: returnedPhotoUrl,
      photoFileName: fileName,
      driveFolderUrl: targetStudent.driveFolderUrl,
      pairKey: uploadedPhotoLog?.pair_key,
      driveFileIdA: uploadedPhotoLog?.drive_file_id_a,
      driveFileIdB: uploadedPhotoLog?.drive_file_id_b,
      photoUrlA: uploadedPhotoLog?.photo_url_a,
      photoUrlB: uploadedPhotoLog?.photo_url_b,
    });

    setIsSubmitting(false);
    setIsConfirmModalOpen(false);
    onBack();
  };

  const handleSaveLocalDraftOnly = () => {
    // Save record to local state even if online drive upload failed
    onSavePhoto({
      uploaderNim: currentUser.nim,
      uploaderNama: currentUser.namaLengkap,
      targetNim: targetStudent.nim,
      targetNama: targetStudent.namaLengkap,
      targetKelompok: targetStudent.kelompok,
      photoUrl: photoPreview || undefined,
      photoFileName: fileName,
      driveFolderUrl: targetStudent.driveFolderUrl,
    });
    setErrorModal(null);
    onBack();
  };

  const isFormValid = Boolean(photoPreview);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto space-y-6 pb-12"
    >
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center transition-colors shadow-xs">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-600 group-hover:text-blue-600" />
          </div>
          <span>Kembali ke Detail Mahasiswa</span>
        </button>
      </div>

      {/* Main Form Card */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {existingRecord ? 'Perbarui Foto Bersama' : 'Unggah Foto Bersama'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tugas Foto Bersama Mahasiswa &bull; Logika 2026
            </p>
          </div>
        </div>

        <form onSubmit={handleOpenConfirm} className="mt-6 space-y-5">
          {/* Auto-filled Identity Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 font-semibold text-slate-500 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 text-blue-700 font-bold">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                Identitas Pengisi
              </span>
              <span className="text-[11px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                Foto Kelompok {targetStudent.kelompok?.match(/\d+/)?.[0] || '0'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Uploader (Current User) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mahasiswa (Anda)
                </span>
                <p className="font-bold text-slate-900 text-sm truncate">{currentUser.namaLengkap}</p>
                <p className="text-[10px] font-black text-blue-600 uppercase mb-0.5">{currentUser.kelompok}</p>
                <p className="font-mono text-xs text-slate-500 truncate">{currentUser.nim}</p>
              </div>

              {/* Target Student */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                  Teman Dituju
                </span>
                <p className="font-bold text-blue-950 text-sm truncate">{targetStudent.namaLengkap}</p>
                <p className="text-[10px] font-black text-blue-700 uppercase mb-0.5">{targetStudent.kelompok}</p>
                <p className="font-mono text-xs text-blue-800 truncate">{targetStudent.nim}</p>
              </div>
            </div>

            {/* Standardized File Name */}
            <div className="pt-1.5 text-slate-600 flex items-start gap-2.5 bg-white/90 p-3.5 rounded-xl border border-slate-200/80">
              <Folder className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 font-bold">Nama File</span>
                  <button
                    type="button"
                    onClick={handleCopyFileName}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    title="Salin nama file"
                  >
                    {copiedFileName ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-1.5 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100/90 text-blue-950 font-mono text-xs font-semibold break-all whitespace-normal leading-relaxed select-all">
                  {fileName}
                </div>
              </div>
            </div>
          </div>

          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Lampiran Foto Bersama <span className="text-rose-500">*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {photoPreview ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[220px] max-h-[380px] flex items-center justify-center shadow-2xs">
                  <img
                    src={photoPreview}
                    alt="Preview Foto Bersama"
                    className="w-full h-auto max-h-[380px] object-contain"
                  />
                </div>

                {/* Visible Action Buttons for Mobile & Desktop */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Foto siap disimpan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSourcePickerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>Ganti Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus File</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => setIsSourcePickerOpen(true)}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Klik untuk memilih sumber foto (Kamera / Galeri) atau seret ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Format file gambar JPG, PNG, atau WEBP (Maks. 10MB)
                </p>
              </div>
            )}
            {!photoPreview && (
              <p className="text-[11px] text-amber-700 font-medium mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Pilih atau lampirkan foto bersama terlebih dahulu agar tombol simpan aktif.</span>
              </p>
            )}
          </div>

          {/* Source Selection Modal (Camera vs File/Gallery) */}
          <AnimatePresence>
            {isSourcePickerOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-base font-extrabold text-slate-900">Pilih Sumber Foto</h3>
                    <button
                      type="button"
                      onClick={() => setIsSourcePickerOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSourcePickerOpen(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/80 text-blue-900 font-bold text-sm transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 font-bold">Ambil dari Kamera</p>
                        <p className="text-xs text-slate-500 font-normal">Foto langsung menggunakan kamera perangkat</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSourcePickerOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-bold text-sm transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 font-bold">Pilih dari Galeri / File</p>
                        <p className="text-xs text-slate-500 font-normal">Pilih file gambar dari penyimpanan perangkat</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Business Flow Info Notice */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Foto bersama akan otomatis tersimpan dan terhitung ke dalam progres tugas kedua mahasiswa di Google Drive.
            </span>
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors text-center cursor-pointer"
            >
              Batal
            </button>

            <button
              id="btn-submit-upload-photo"
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Catat Foto Bersama</span>
            </button>
          </div>
        </form>
      </section>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
            onClick={() => setIsConfirmModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Konfirmasi Simpan Foto
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menyimpan dan mencatat foto bersama{' '}
                  <span className="font-bold text-slate-900">{targetStudent.namaLengkap}</span>?
                </p>
                <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left text-xs space-y-1">
                  <div className="text-slate-500">
                    File: <code className="font-mono text-blue-700 font-semibold break-all select-all">{fileName}</code>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Ya, Simpan & Catat</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Intuitive Network/Drive Error & Cache Retention Modal */}
        {errorModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
            onClick={() => setErrorModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-100 relative my-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs border border-rose-200 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {errorModal.title}
                  </h3>
                  <p className="text-xs text-rose-600 font-medium mt-0.5">
                    {errorModal.message}
                  </p>
                </div>
              </div>

              {/* Cache Retention Reassurance Box */}
              <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-emerald-950">Foto Anda Tersimpan Aman di Cache Browser!</p>
                  <p className="mt-0.5 text-emerald-800">
                    Anda tidak perlu mengunggah ulang file foto dari perangkat. Anda dapat mencoba mengunggah kembali secara langsung atau menyimpannya secara lokal.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveLocalDraftOnly}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>Simpan Draf Lokal</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Coba Upload Lagi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
