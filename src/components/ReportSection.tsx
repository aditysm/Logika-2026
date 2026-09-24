import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FileText,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  Lock,
  X,
  Send,
  User,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Mahasiswa, ReportRequest, PhotoRecord } from '../types';
import { requestGenerateReport, getReportStatus, fetchReportHistoryFromSupabase } from '../lib/api';
import { normalizeNim, getTakenNimSet } from '../lib/photoStorage';

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
}: ReportSectionProps) {
  const [reportData, setReportData] = useState<ReportRequest | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportRequest[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTier = currentUser.tier || 'free';
  const isPro = activeTier === 'pro';

  // Special access: Only F1D02610029 button is ALWAYS ACTIVE
  const isSpecialAccess = normalizeNim(currentUser.nim) === normalizeNim('F1D02610029');

  // Compute photo percentage accurately across all friends with fast memoization and Set lookup
  const { totalCount, takenCount, percentage, is100Percent } = useMemo(() => {
    const myNim = normalizeNim(currentUser.nim);
    const friends = allStudents.filter(
      (s) => (s.nim || '').trim() && normalizeNim(s.nim) !== myNim
    );
    const countFriends = friends.length;
    const takenSet = getTakenNimSet(photoRecords, currentUser.nim);
    let count = 0;
    for (const f of friends) {
      if (takenSet.has(normalizeNim(f.nim))) {
        count++;
      }
    }
    const pct = countFriends > 0 ? Math.round((count / countFriends) * 100) : 0;
    return {
      totalCount: countFriends,
      takenCount: count,
      percentage: pct,
      is100Percent: countFriends > 0 && count >= countFriends,
    };
  }, [currentUser.nim, allStudents, photoRecords]);

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Fetch report status and history from Supabase / Backend
  const checkStatus = useCallback(
    async (silent = false) => {
      if (!currentUser.nim) return;
      if (!silent) setIsLoadingStatus(true);

      try {
        const [statusRes, historyRes] = await Promise.all([
          getReportStatus(currentUser.nim),
          fetchReportHistoryFromSupabase(currentUser.nim),
        ]);

        if (statusRes.success && statusRes.data) {
          setReportData(statusRes.data);

          // Stop polling if completed or failed
          if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
            stopPolling();
          }
        }

        if (historyRes && historyRes.length > 0) {
          setReportHistory(historyRes);
        } else if (statusRes.data && statusRes.data.status !== 'none') {
          setReportHistory([statusRes.data]);
        }
      } catch (err) {
        console.warn('Failed to check report status / history:', err);
      } finally {
        if (!silent) setIsLoadingStatus(false);
      }
    },
    [currentUser.nim, stopPolling]
  );

  // Start polling every 7 seconds
  const startPolling = useCallback(() => {
    stopPolling();
    checkStatus(true);
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

  // Open confirmation modal handler
  const handleOpenConfirmation = () => {
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

    setActionError(null);
    setIsConfirmModalOpen(true);
  };

  // Submit request to Google Apps Script / Supabase worker queue
  const handleConfirmSubmit = async () => {
    if (!currentUser.nim) return;

    setIsSubmitting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      // Kirim permintaan antrean laporan ke sistem backend (AppSheet / Apps Script / Supabase Worker)
      const res = await requestGenerateReport(
        currentUser.nim,
        currentUser.namaLengkap,
        currentUser.driveFolderId
      );

      setIsConfirmModalOpen(false);

      if (!res.success) {
        setActionError(res.error || 'Gagal mengajukan permintaan laporan.');
      } else {
        setActionMessage(
          res.message || 'Permintaan laporan Word berhasil diajukan dan sedang diproses sistem!'
        );
        if (res.data) {
          setReportData(res.data);
          setReportHistory((prev) => [
            res.data!,
            ...prev.filter((item) => item.id !== res.data?.id),
          ]);
        }
        startPolling();
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Terjadi kendala saat memproses permohonan laporan.';
      setActionError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = reportData?.status || 'none';
  const isPendingOrProcessing = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';

  return (
    <div className="space-y-4">
      {/* Main Report Action Card */}
      <div
        id="section-document-report"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-4 scroll-mt-24"
      >
        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="w-4 h-4" />
              </span>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                Dokumen Laporan Tugas Foto (Word / .docx)
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Buat dokumen laporan tugas otomatis dalam format Microsoft Word (.docx) resmi. Laporan disusun rapi per kelompok mahasiswa lengkap dengan foto dokumentasi dan biodata.
            </p>
          </div>

          {/* Manual Refresh Status button */}
          <button
            type="button"
            onClick={() => checkStatus()}
            disabled={isLoadingStatus}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
            title="Perbarui status pembuatan dokumen terbaru"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-blue-600' : ''}`} />
            <span>Perbarui Status Laporan</span>
          </button>
        </div>

        {/* Special Access Banner for F1D02610029 */}
        {isSpecialAccess && (
          <div className="relative z-10 text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>Akses Khusus NIM {currentUser.nim} Aktif</span>
                <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold rounded-md">
                  Selalu Aktif
                </span>
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Anda dapat langsung mengajukan pembuatan dokumen laporan Word kapan saja tanpa batasan kuota foto atau paket akun.
              </p>
            </div>
          </div>
        )}

        {/* Status Badge & Indicator */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 font-medium">Status Pembuatan Dokumen:</span>
          {isLoadingStatus ? (
            <span
              id="reportStatusBadge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200"
            >
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              <span>Memeriksa status...</span>
            </span>
          ) : (
            <>
              {status === 'pending' && (
                <span
                  id="reportStatusBadge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Sedang Dalam Antrean Sistem...</span>
                </span>
              )}

              {status === 'processing' && (
                <span
                  id="reportStatusBadge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Sedang Menyusun &amp; Memformat Dokumen...</span>
                </span>
              )}

              {status === 'completed' && (
                <span
                  id="reportStatusBadge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dokumen Laporan Siap</span>
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
            </>
          )}
        </div>

        {/* Progress Info when not 100% (for standard Pro users) */}
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
            <span>Keterangan: {reportData.error_message}</span>
          </div>
        )}

        {/* Action Buttons Area */}
        <div className="relative z-10 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Default Mati / Disabled state while loading status to eliminate delay and flickering */}
          {isLoadingStatus ? (
            <div className="flex-1 flex items-center">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80"
              >
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span>Memeriksa Status Laporan...</span>
              </button>
            </div>
          ) : !isPro && !isSpecialAccess ? (
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="text-xs text-amber-900">
                  Fitur pembuatan laporan otomatis tersedia pada <strong>Paket Pro</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPremiumModal}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                <span>Upgrade ke Paket Pro (Rp5.000)</span>
              </button>
            </div>
          ) : (
            /* Pro User or Special Access User */
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* If completed: Primary download link */}
              {isCompleted && reportData?.pdf_url && (
                <a
                  href={reportData.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Buka / Unduh Dokumen Laporan</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}

              {/* Status Pending or Processing: Button Disabled */}
              {isPendingOrProcessing && (
                <button
                  id="btnGenerateReport"
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-90"
                >
                  {status === 'pending' ? (
                    <>
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>Dalam Antrean Pembuatan Laporan</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Sedang Menyusun &amp; Memformat Dokumen...</span>
                    </>
                  )}
                </button>
              )}

              {/* Status Completed: Button disabled to prevent duplicate generation */}
              {isCompleted && (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80"
                  title="Dokumen laporan telah selesai dibuat"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Laporan Selesai Dibuat</span>
                </button>
              )}

              {/* Status None or Failed: Active Create Report Button */}
              {(status === 'none' || status === 'failed') && (
                <>
                  {isSpecialAccess || is100Percent ? (
                    <button
                      id="btnGenerateReport"
                      type="button"
                      onClick={handleOpenConfirmation}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-75"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Sedang Mengajukan...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-white" />
                          <span>{status === 'failed' ? 'Ajukan Ulang Pembuatan Laporan' : 'Buat Laporan Word (.docx)'}</span>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Report History & Tracking Card (Same pattern as Riwayat & Status Pembayaran) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Riwayat &amp; Status Pembuatan Laporan</h3>
              <p className="text-xs text-slate-500">Status pembuatan dokumen diperbarui secara otomatis</p>
            </div>
          </div>
        </div>

        {reportHistory.length > 0 ? (
          <div className="space-y-3">
            {reportHistory.map((item, idx) => {
              const itemStatus = (item.status || '').toLowerCase();
              const isPendingItem = itemStatus === 'pending';
              const isProcessingItem = itemStatus === 'processing';
              const isApprovedItem = itemStatus === 'completed';
              const isFailedItem = itemStatus === 'failed';

              return (
                <div
                  key={item.id ? `report-${item.id}` : `report-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl transition-all hover:border-slate-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Dokumen Laporan Tugas (Word / .docx)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium">
                      <span>NIM: {item.nim}</span>
                      <span>&bull;</span>
                      <span>
                        Tanggal:{' '}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Baru saja'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isPendingItem && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Menunggu Antrean</span>
                      </span>
                    )}
                    {isProcessingItem && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Sedang Diproses</span>
                      </span>
                    )}
                    {isApprovedItem && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai / Disetujui</span>
                      </span>
                    )}
                    {isFailedItem && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Gagal Diproses</span>
                      </span>
                    )}
                    {!isPendingItem && !isProcessingItem && !isApprovedItem && !isFailedItem && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase">
                        <span>{item.status}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl space-y-1">
            <p className="text-xs font-bold text-slate-600">Belum ada riwayat pembuatan laporan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ajukan pembuatan dokumen laporan Word di atas setelah menyelesaikan tugas perkenalan foto.
            </p>
          </div>
        )}
      </div>

      {/* Minimalist Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Konfirmasi Pembuatan Laporan</h3>
                  <p className="text-xs text-slate-500">Laporan Tugas Foto Perkenalan Angkatan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Info Summary */}
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Mahasiswa:</span>
                  </span>
                  <span className="font-bold text-slate-900">{currentUser.namaLengkap}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">NIM:</span>
                  <span className="font-mono font-bold text-slate-800">{currentUser.nim}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Capaian Foto:</span>
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {takenCount}/{totalCount} Mahasiswa ({percentage}%)
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Format Dokumen:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Microsoft Word (.docx)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Sistem antrean akan menyusun seluruh dokumentasi foto bersama dan biodata teman seangkatan ke dalam satu dokumen Word resmi.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim Permintaan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ya, Ajukan Laporan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
