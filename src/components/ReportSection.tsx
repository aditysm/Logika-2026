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

interface ReportSectionProps {
  currentUser: Mahasiswa;
  allStudents?: Mahasiswa[];
  photoRecords?: PhotoRecord[];
  onOpenPremiumModal?: () => void;
}

export function ReportSection({
  currentUser,
  allStudents = [],
  photoRecords = [],
  onOpenPremiumModal,
}: ReportSectionProps) {
  const [reportData, setReportData] = useState<ReportRequest | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTier = currentUser.tier || 'free';
  const isPro = activeTier === 'pro';

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

  // Check report status function
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

  // Handle request report submission
  const handleRequestReport = async () => {
    if (!currentUser.nim) return;

    if (!isPro) {
      onOpenPremiumModal?.();
      return;
    }

    if (!is100Percent) {
      setActionError(
        `Progres foto bersama Anda masih ${percentage}% (${takenCount}/${totalCount}). Anda harus menyelesaikan foto bersama 100% seluruh mahasiswa sebelum dapat membuat laporan PDF.`
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await requestGenerateReport(currentUser.nim);

      if (!res.success) {
        setActionError(res.error || 'Gagal mengajukan antrean laporan.');
      } else {
        setActionMessage(res.message || 'Permintaan laporan berhasil masuk antrean.');
        if (res.data) {
          setReportData(res.data);
        }
        // Start polling immediately
        startPolling();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi gangguan jaringan.';
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
              File Laporan Tugas Foto
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            Buat dokumen laporan tugas secara otomatis dalam bentuk PDF. Laporan akan tersusun
            rapi sesuai kelompok dan tersimpan di Google Drive Anda.
          </p>
        </div>

        {/* Manual Refresh Status button */}
        <button
          type="button"
          onClick={() => checkStatus()}
          disabled={isLoadingStatus}
          className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
          title="Segarkan status laporan terbaru"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin text-blue-600' : ''}`} />
          <span>Cek Status</span>
        </button>
      </div>

      {/* Status Badge & Indicator */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-slate-500 font-medium">Status Antrean:</span>
        {status === 'pending' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Menunggu Antrean Worker...</span>
          </span>
        )}

        {status === 'processing' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
          >
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Sedang Menyusun Dokumen PDF...</span>
          </span>
        )}

        {status === 'completed' && (
          <span
            id="reportStatusBadge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selesai Dibuat</span>
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
            Belum Dibuat
          </span>
        )}
      </div>

      {/* Progress Info when not 100% */}
      {isPro && !is100Percent && status !== 'completed' && (
        <div className="relative z-10 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">
              Progres Foto Bersama: {percentage}% ({takenCount}/{totalCount} Mahasiswa)
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Tombol pembuatan laporan PDF akan otomatis aktif setelah progres foto bersama Anda mencapai 100%.
            </p>
          </div>
        </div>
      )}

      {/* Notifications / Error Banner */}
      {actionMessage && (
        <div className="relative z-10 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
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
          <span>Pesan kesalahan: {reportData.error_message}</span>
        </div>
      )}

      {/* Action Buttons Container */}
      <div className="relative z-10 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* State 1: Pro, Completed -> Download PDF Link */}
        {status === 'completed' && reportData?.pdf_url && (
          <div id="downloadContainer" className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <a
              href={reportData.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh / Buka Laporan PDF</span>
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
              <span>Buat Ulang Laporan PDF</span>
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
                  ? 'Proses Dalam Antrean Worker...'
                  : 'Sedang Menyusun Dokumen PDF...'}
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
                    <span>Mengajukan Antrean...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{status === 'failed' ? 'Coba Lagi Buat Laporan PDF' : 'Buat Laporan PDF Otomatis'}</span>
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
                <span>Buat Laporan PDF Otomatis ({percentage}%)</span>
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
      </div>
    </div>
  );
}

