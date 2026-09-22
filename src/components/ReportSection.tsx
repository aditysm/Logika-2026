import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Mahasiswa, ReportRequest, PhotoRecord } from '../types';
import { requestGenerateReport, getReportStatus } from '../lib/api';
import { normalizeNim, hasTakenPhoto } from '../lib/photoStorage';
import { generateStudentReport } from '../lib/reportGenerator';

interface ReportSectionProps {
  currentUser: Mahasiswa;
  allStudents?: Mahasiswa[];
  photoRecords?: PhotoRecord[];
  onOpenPremiumModal?: () => void;
  onGenerateReport?: () => void;
}

export function ReportSection({
  currentUser,
  allStudents = [],
  photoRecords = [],
  onOpenPremiumModal,
  onGenerateReport,
}: ReportSectionProps) {
  const [reportData, setReportData] = useState<ReportRequest | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTier = currentUser.tier || 'free';
  const isPro = activeTier === 'pro';

  // Special access: F1D02610029 button is ALWAYS ACTIVE and executes to Supabase
  const isSpecialAccess = normalizeNim(currentUser.nim) === 'F1D02610029';

  // Compute photo percentage accurately across all friends
  const myNim = (currentUser.nim || '').trim();
  const friends = allStudents.filter(
    (s) => (s.nim || '').trim() && normalizeNim(s.nim) !== normalizeNim(myNim)
  );
  const totalCount = friends.length;
  const takenCount = friends.filter((friend) =>
    currentUser ? hasTakenPhoto(photoRecords, myNim, friend.nim) : false
  ).length;
  const percentage = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const is100Percent = totalCount > 0 && takenCount >= totalCount;

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Check report status function from Supabase
  const checkStatus = useCallback(
    async (silent = false) => {
      if (!currentUser.nim) return;
      if (!silent) setIsLoadingStatus(true);

      const res = await getReportStatus(currentUser.nim);
      if (res.success && res.data) {
        setReportData(res.data);

        // Stop polling if completed or failed
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          stopPolling();
        }
      }
      if (!silent) setIsLoadingStatus(false);
    },
    [currentUser.nim, stopPolling]
  );

  // Start polling every 7 seconds
  const startPolling = useCallback(() => {
    stopPolling();
    // Immediate silent check
    checkStatus(true);
    // Poll every 7 seconds
    pollIntervalRef.current = setInterval(() => {
      checkStatus(true);
    }, 7000);
  }, [checkStatus, stopPolling]);

  // Initial status check on mount or when user changes
  useEffect(() => {
    checkStatus();

    return () => {
      stopPolling();
    };
  }, [checkStatus, stopPolling]);

  // Trigger polling if current status is active
  useEffect(() => {
    if (reportData?.status === 'pending' || reportData?.status === 'processing') {
      if (!pollIntervalRef.current) {
        startPolling();
      }
    }
  }, [reportData?.status, startPolling]);

  // Handle request report submission & Word (.docx) generation
  const handleRequestReport = async () => {
    if (!currentUser.nim) return;

    if (!isSpecialAccess) {
      if (!isPro) {
        onOpenPremiumModal?.();
        return;
      }

      if (!is100Percent) {
        setActionError(
          `Progres foto bersama Anda masih ${percentage}% (${takenCount}/${totalCount}). Anda harus menyelesaikan foto bersama 100% seluruh mahasiswa sebelum dapat membuat dokumen laporan.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      // 1. Eksekusi ke Supabase (tabel report_requests / edge function)
      const res = await requestGenerateReport(
        currentUser.nim,
        currentUser.namaLengkap,
        currentUser.driveFolderId
      );

      // 2. Generate and download file Word (.docx) secara langsung
      try {
        if (onGenerateReport) {
          onGenerateReport();
        } else {
          const targetFriends = allStudents.filter(
            (s) => currentUser && normalizeNim(s.nim) !== normalizeNim(currentUser.nim)
          );
          await generateStudentReport(currentUser, targetFriends, photoRecords);
        }
      } catch (wordErr) {
        console.warn('Word generation local file error:', wordErr);
      }

      if (!res.success) {
        setActionMessage('Dokumen Word (.docx) berhasil dibuat dan diunduh! Permintaan telah diteruskan ke basis data Supabase.');
      } else {
        setActionMessage(res.message || 'Dokumen Word (.docx) berhasil dibuat & dieksekusi ke basis data Supabase!');
        if (res.data) {
          setReportData(res.data);
        }
        startPolling();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi gangguan koneksi saat eksekusi ke Supabase.';
      setActionError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = reportData?.status || 'none';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-4">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-50/70 rounded-full blur-2xl pointer-events-none -z-0" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-4 h-4" />
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              File Laporan Tugas Foto (Word / .docx)
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            Buat dokumen laporan tugas otomatis dalam format Microsoft Word (.docx) &amp; sinkronisasi ke sistem antrean Supabase. Laporan tersusun rapi per kelompok mahasiswa lengkap dengan foto dan biodata.
          </p>
        </div>

        {/* Manual Refresh Status button */}
        <button
          type="button"
          onClick={() => checkStatus()}
          disabled={isLoadingStatus}
          className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
          title="Segarkan status antrean Supabase terbaru"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin text-blue-600' : ''}`} />
          <span>Cek Status Supabase</span>
        </button>
      </div>

      {/* Special Access Banner for F1D02610029 */}
      {isSpecialAccess && (
        <div className="relative z-10 text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Akses Khusus NIM {currentUser.nim} Aktif</span>
              <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold rounded-md">
                Selalu Aktif
              </span>
            </p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Tombol <strong>Buat Word (.docx)</strong> selalu aktif dan langsung mengeksekusi antrean laporan ke Supabase (tabel <code>report_requests</code>) tanpa batasan kuota foto atau paket tier.
            </p>
          </div>
        </div>
      )}

      {/* Status Badge & Indicator */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-slate-500 font-medium">Status Antrean Supabase:</span>
        {status === 'pending' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Tereksekusi di Supabase (Menunggu Worker)...</span>
          </span>
        )}

        {status === 'processing' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
          >
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Sedang Diproses Worker...</span>
          </span>
        )}

        {status === 'completed' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selesai Diproses di Supabase</span>
          </span>
        )}

        {status === 'failed' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Gagal Diproses</span>
          </span>
        )}

        {status === 'none' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
          >
            Belum Dieksekusi
          </span>
        )}
      </div>

      {/* Progress Info when not 100% (for non-special users) */}
      {isPro && !is100Percent && status !== 'completed' && !isSpecialAccess && (
        <div className="relative z-10 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">
              Progres Foto Bersama: {percentage}% ({takenCount}/{totalCount} Mahasiswa)
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Tombol pembuatan laporan Word akan otomatis aktif setelah progres foto bersama Anda mencapai 100%.
            </p>
          </div>
        </div>
      )}

      {/* Notifications / Error Banner */}
      {actionMessage && (
        <div className="relative z-10 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="relative z-10 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {status === 'failed' && reportData?.error_message && (
        <div className="relative z-10 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>Pesan kesalahan worker: {reportData.error_message}</span>
        </div>
      )}

      {/* Action Buttons Container */}
      <div className="relative z-10 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Special Access: F1D02610029 ALWAYS ACTIVE */}
        {isSpecialAccess ? (
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              id="btnGenerateReportWord"
              type="button"
              onClick={handleRequestReport}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-75"
              title="Buat berkas Word (.docx) dan eksekusi antrean ke Supabase"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Mengeksekusi ke Supabase &amp; Mengunduh Word...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-white" />
                  <span>Buat Word (.docx) &amp; Eksekusi ke Supabase</span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                </>
              )}
            </button>

            {status === 'completed' && reportData?.pdf_url && (
              <a
                href={reportData.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Buka Berkas di Supabase / Drive</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            )}
          </div>
        ) : (
          /* Normal cases for standard users */
          <>
            {/* State 1: Pro, Completed -> Download Link */}
            {status === 'completed' && reportData?.pdf_url && (
              <div id="downloadContainer" className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={reportData.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh / Buka Laporan</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  id="btnGenerateReport"
                  type="button"
                  onClick={handleRequestReport}
                  disabled={isSubmitting || !is100Percent}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={is100Percent ? 'Perbarui isi laporan dengan foto-foto terbaru' : 'Harus 100% foto untuk membuat ulang laporan'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>Buat Ulang Laporan Word</span>
                </button>
              </div>
            )}

            {/* State 2: Pro, Pending or Processing */}
            {(status === 'pending' || status === 'processing') && (
              <div className="flex-1 flex items-center gap-3">
                <button
                  id="btnGenerateReport"
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-90"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>
                    {status === 'pending'
                      ? 'Proses Dalam Antrean Supabase...'
                      : 'Sedang Menyusun Dokumen...'}
                  </span>
                </button>
                <span className="text-[11px] text-slate-500 italic">
                  Status akan diperbarui otomatis setiap beberapa detik.
                </span>
              </div>
            )}

            {/* State 3: Pro, None or Failed */}
            {isPro && (status === 'none' || status === 'failed') && (
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {is100Percent ? (
                  <button
                    id="btnGenerateReport"
                    type="button"
                    onClick={handleRequestReport}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengajukan Antrean Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{status === 'failed' ? 'Coba Lagi Buat Laporan' : 'Buat Laporan Word (.docx)'}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    id="btnGenerateReport"
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80"
                    title="Selesaikan 100% foto bersama terlebih dahulu"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Buat Laporan Word ({percentage}%)</span>
                  </button>
                )}
              </div>
            )}

            {/* State 4: Free or Basic -> Upgrade required to generate report */}
            {!isPro && (
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <p className="text-xs text-amber-900">
                    Fitur generate laporan otomatis tersedia pada <strong>Paket Pro</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenPremiumModal}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Unlock Paket Pro (Rp5.000)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

