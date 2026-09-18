import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  User,
  FolderCheck,
  Sparkles,
  Crown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  History,
} from 'lucide-react';
import { Mahasiswa, PaymentLog } from '../types';
import { fetchPaymentLogsFromSupabase, subscribeToSupabaseRealtime } from '../lib/supabase';

interface PricingPageProps {
  currentUser: Mahasiswa | null;
  refreshKey?: number;
  onBack: () => void;
  onRefreshProfileStatus: () => Promise<void>;
  onMockSetTier?: (tier: 'free' | 'basic' | 'pro') => void;
}

// Prefilled Google Forms parameters
const GOOGLE_FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdCA-A7gYT062p8CV9dq_hKwykfNVRoSGLzTsJlmpUX1pdRaw/viewform';
const ENTRY_NIM = 'entry.1072324759';
const ENTRY_NAMA = 'entry.229140403';
const ENTRY_OPTION = 'entry.929387504';
const ENTRY_NOMINAL = 'entry.958381063';

interface FaqItem {
  question: string;
  answer: string;
}

export function PricingPage({
  currentUser,
  refreshKey = 0,
  onBack,
  onRefreshProfileStatus,
  onMockSetTier,
}: PricingPageProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);

  const currentTier = currentUser?.tier || 'free';

  const loadPaymentLogs = async () => {
    if (!currentUser?.nim) return;
    const logs = await fetchPaymentLogsFromSupabase(currentUser.nim);
    setPaymentLogs(logs);
  };

  useEffect(() => {
    loadPaymentLogs();
  }, [currentUser?.nim, refreshKey]);

  // Payment logs are refreshed automatically when refreshKey from parent changes, 
  // which is triggered by the global Supabase realtime listener in App.tsx.
  // We no longer need a separate listener here to avoid double-fetching and UI flickering.

  // Build the link prefilled with user details to simplify the payment validation process
  const getPrefilledFormUrl = (tierOption: 'basic' | 'pro' | 'upgrade_pro') => {
    if (!currentUser) return GOOGLE_FORM_BASE_URL;
    const params = new URLSearchParams();
    params.set(ENTRY_NAMA, currentUser.namaLengkap || '');
    params.set(ENTRY_NIM, currentUser.nim || '');
 
    if (tierOption === 'pro') {
      // Includes zero-width space (\u200B) matching Google Form prefilled option
      params.set(ENTRY_OPTION, '\u200BPro Full (Rp7.000) — Paket komplit untuk pengguna baru');
      params.set(ENTRY_NOMINAL, 'Rp7.000');
    } else if (tierOption === 'upgrade_pro') {
      params.set(ENTRY_OPTION, 'Upgrade Pro (Rp5.000) — Khusus pengguna yang sudah bayar 2k & ingin unlock Generate Laporan');
      params.set(ENTRY_NOMINAL, 'Rp5.000');
    } else {
      params.set(ENTRY_OPTION, 'Basic (Rp2.000) — Akses upload & sinkronisasi Drive');
      params.set(ENTRY_NOMINAL, 'Rp2.000');
    }
 
    return `${GOOGLE_FORM_BASE_URL}?usp=pp_url&${params.toString()}`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      await onRefreshProfileStatus();
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Plain Indonesian FAQs
  const faqList: FaqItem[] = [
    {
      question: 'Bagaimana cara menaikkan tingkat akun?',
      answer:
        'Pilih tingkat akun yang Anda inginkan (Paket Basic atau Paket Pro) pada halaman ini. Anda akan diarahkan ke formulir konfirmasi yang telah terisi dengan nama dan NIM Anda secara otomatis. Unggah bukti pembayaran melalui formulir tersebut. Pengelola akan memeriksa dan segera membuka akses untuk akun Anda.',
    },
    {
      question: 'Apa perbedaan utama di setiap tingkat akun?',
      answer:
        'Paket Free dapat digunakan untuk melihat data mahasiswa dan progres foto. Paket Basic memberikan ruang folder penyimpanan Google Drive yang disediakan oleh pengelola secara gratis untuk menyimpan foto bersama teman. Paket Pro membuka semua fitur di atas ditambah dengan pembuatan berkas laporan tugas format Word (.docx) secara otomatis.',
    },
    {
      question: 'Saya sudah membeli Paket Basic, apakah harus bayar penuh jika ingin ke Paket Pro?',
      answer:
        'Tidak perlu. Jika akun Anda sudah aktif di Paket Basic, Anda hanya perlu membayar selisihnya saja, yaitu sebesar Rp5.000, untuk mendapatkan seluruh akses Paket Pro.',
    },
    {
      question: 'Berapa lama waktu yang dibutuhkan setelah mengirim bukti pembayaran?',
      answer:
        'Verifikasi dilakukan secara manual oleh tim pengelola kelompok. Biasanya memakan waktu antara 5 hingga 15 menit. Setelah mengirim bukti, silakan klik tombol "Sinkronkan Status" di bawah untuk memperbarui status akun Anda.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Percentage and label helper for the progress bar
  const getProgressSpecs = () => {
    switch (currentTier) {
      case 'pro':
        return { percent: 'w-full', text: 'Semua fitur telah terbuka! Anda berada di tingkat akses tertinggi (Paket Pro).' };
      case 'basic':
        return { percent: 'w-2/3', text: 'Tingkat akses Anda: Paket Basic. Tinggal 1 langkah lagi untuk membuka fitur unduh laporan Word.' };
      default:
        return { percent: 'w-1/3', text: 'Tingkat akses Anda: Paket Free. Tingkatkan akun untuk membuka penyimpanan Google Drive otomatis.' };
    }
  };

  const progressSpecs = getProgressSpecs();

  // Features comparison dataset
  const comparisonFeatures = [
    {
      name: 'Mencari data mahasiswa & kelompok',
      free: true,
      basic: true,
      pro: true,
    },
    {
      name: 'Melihat diagram & progres foto tugas',
      free: true,
      basic: true,
      pro: true,
    },
    {
      name: 'Mendapatkan folder penyimpanan Google Drive dari pengelola',
      free: false,
      basic: true,
      pro: true,
    },
    {
      name: 'Mengunggah & menyimpan foto bersama teman',
      free: false,
      basic: true,
      pro: true,
    },
    {
      name: 'Membuat berkas dokumen Word (.docx) otomatis',
      free: false,
      basic: false,
      pro: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4">
      {/* Back button & status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>

        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
            <span>Akun Aktif:</span>
            <span className="font-mono text-slate-800 bg-white border border-slate-300/60 px-2 py-0.5 rounded text-[11px]">
              {currentUser.nim}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${
              currentTier === 'free'
                ? 'bg-slate-500 border-slate-600 text-white font-bold shadow-xs'
                : currentTier === 'basic'
                  ? 'bg-emerald-600 border-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-amber-500 border-amber-600 text-slate-900 font-extrabold shadow-xs'
            }`}>
              {currentTier === 'free' ? 'Free' : currentTier === 'basic' ? 'Basic' : 'Pro'}
            </span>
          </div>
        )}
      </div>

      {/* Main Title Intro */}
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Tingkat Akses &amp; Manfaat Layanan
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Pilih paket yang paling sesuai dengan kebutuhan Anda untuk mempermudah koordinasi pengumpulan foto tugas kuliah dan penyusunan laporan bersama rekan kelompok.
        </p>
      </div>

      {/* Visual Progress Bar Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Tingkat Akses Akun</span>
          <span className={`font-extrabold ${
            currentTier === 'pro'
              ? 'text-amber-500'
              : currentTier === 'basic'
                ? 'text-emerald-600'
                : 'text-slate-500'
          }`}>
            {currentTier === 'free' ? 'Free (1/3)' : currentTier === 'basic' ? 'Basic (2/3)' : 'Pro (3/3)'}
          </span>
        </div>
        
        {/* Progress Bar Track */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/40">
          <div className={`h-full rounded-full transition-all duration-500 ${
            currentTier === 'pro'
              ? 'bg-amber-500'
              : currentTier === 'basic'
                ? 'bg-emerald-600'
                : 'bg-slate-500'
          } ${progressSpecs.percent}`} />
        </div>

        {/* Labels under progress bar */}
        <div className="grid grid-cols-3 text-center text-[10px] font-bold text-slate-400 pt-1">
          <div className={`text-left ${currentTier === 'free' ? 'text-slate-800 font-black' : ''}`}>Free</div>
          <div className={`${currentTier === 'basic' ? 'text-emerald-600 font-black' : ''}`}>Basic</div>
          <div className={`text-right ${currentTier === 'pro' ? 'text-amber-500 font-black' : ''}`}>Pro</div>
        </div>

        <p className="text-xs text-slate-500 pt-1 border-t border-slate-50 mt-2">
          {progressSpecs.text}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Paket Free */}
        <div className={`bg-white border rounded-2xl p-6 flex flex-col justify-between relative shadow-2xs transition-all ${
          currentTier === 'free' ? 'ring-2 ring-slate-500/25 bg-slate-50/10' : 'border-slate-200'
        }`}>
          {currentTier === 'free' && (
            <div className="absolute top-4 right-4 bg-slate-500 text-white rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Aktif
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700 shrink-0 border border-slate-200/55">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paket Free</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-0.5">Rp0</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Melihat daftar mahasiswa dan memantau status secara umum.</p>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Manfaat yang Anda dapat:</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Cari profil mahasiswa dengan mudah</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Pantau statistik progres kelompok kuliah</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              disabled
              className="w-full py-2 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold text-center cursor-not-allowed"
            >
              {currentTier === 'free' ? 'Aktif Saat Ini' : 'Terbuka Secara Default'}
            </button>
          </div>
        </div>

        {/* Paket Basic */}
        <div className={`bg-white border rounded-2xl p-6 flex flex-col justify-between relative shadow-2xs transition-all ${
          currentTier === 'basic' ? 'ring-2 ring-emerald-600/30 border-emerald-600 bg-emerald-50/5' : 'border-slate-200'
        }`}>
          {currentTier === 'basic' && (
            <div className="absolute top-4 right-4 bg-emerald-600 text-white rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Aktif
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 shrink-0 border border-emerald-100">
                <FolderCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Paket Basic</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-0.5">Rp2.000</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Penyimpanan praktis dua arah di folder Google Drive gratis untuk menyimpan foto bersama teman.</p>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Semua fitur Free, ditambah:</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2 font-semibold text-slate-800">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Mendapatkan folder Google Drive gratis dari pengelola</span>
                </li>
                <li className="flex items-start gap-2 font-semibold text-slate-800">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Saling unggah &amp; simpan foto bersama teman</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            {currentTier === 'free' ? (
              <a
                href={getPrefilledFormUrl('basic')}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition-all shadow-2xs cursor-pointer"
              >
                Pilih Paket Basic (Rp2.000)
              </a>
            ) : currentTier === 'basic' ? (
              <button
                type="button"
                disabled
                className="w-full py-2 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold text-center cursor-not-allowed"
              >
                Aktif Saat Ini
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold text-center cursor-not-allowed"
              >
                Akses Terbuka
              </button>
            )}
          </div>
        </div>

        {/* Paket Pro */}
        <div className={`bg-white border rounded-2xl p-6 flex flex-col justify-between relative shadow-2xs transition-all ${
          currentTier === 'pro' ? 'ring-2 ring-amber-500/30 border-amber-500 bg-amber-50/5' : 'border-slate-200'
        }`}>
          {currentTier === 'pro' && (
            <div className="absolute top-4 right-4 bg-amber-400 text-slate-950 border border-amber-500/40 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Aktif
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 shrink-0 border border-amber-100">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Paket Pro</p>
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-0.5">Rp7.000</h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Mencakup semua fitur, ditambah pembuatan laporan Word instan.</p>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Semua fitur Basic, ditambah:</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2 font-bold text-slate-800">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Unduh berkas Laporan Word (.docx) otomatis</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Berkas laporan tersusun rapi &amp; siap dikumpulkan</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            {currentTier === 'free' ? (
              <a
                href={getPrefilledFormUrl('pro')}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold text-center transition-all shadow-2xs cursor-pointer"
              >
                Pilih Paket Pro (Rp7.000)
              </a>
            ) : currentTier === 'basic' ? (
              <a
                href={getPrefilledFormUrl('upgrade_pro')}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold text-center transition-all shadow-2xs cursor-pointer"
              >
                Naik ke Paket Pro (Rp5.000)
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2 px-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold text-center cursor-not-allowed"
              >
                Aktif Saat Ini
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delta Pricing Notice (Common Phrasing) */}
      {currentTier === 'basic' && (
        <div className="bg-slate-100 border border-slate-200/90 rounded-2xl p-4 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-left">
            <span className="font-bold text-slate-900 block">Potongan Biaya Pengguna Paket Basic</span>
            <p className="text-slate-500">Karena sebelumnya Anda telah mengaktifkan Paket Basic, Anda hanya perlu membayar biaya selisih sebesar Rp5.000 untuk mendapatkan Paket Pro.</p>
          </div>
          <a
            href={getPrefilledFormUrl('upgrade_pro')}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold whitespace-nowrap text-center w-full sm:w-auto cursor-pointer"
          >
            Bayar Selisih Rp5.000
          </a>
        </div>
      )}

      {/* Real-time Payment Status Logs Section */}
      {currentUser && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Riwayat &amp; Status Pembayaran</h3>
                <p className="text-xs text-slate-500">Status pembayaran diperbarui secara otomatis</p>
              </div>
            </div>
          </div>

          {paymentLogs.length > 0 ? (
            <div className="space-y-3">
              {paymentLogs.map((log) => {
                const isPending = (log.status || '').toLowerCase() === 'pending';
                const isApproved = (log.status || '').toLowerCase() === 'approved';
                const isRejected = (log.status || '').toLowerCase() === 'rejected';

                return (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl transition-all hover:border-slate-300">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase">
                          {log.target_tier === 'pro' ? 'Paket Pro' : log.target_tier === 'upgrade_pro' ? 'Upgrade Pro' : 'Paket Basic'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="font-bold text-slate-700">Rp{(Number(log.amount) || 0).toLocaleString('id-ID')}</span>
                        <span>&bull;</span>
                        <span>Tanggal: {log.created_at ? new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Menunggu Konfirmasi</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif / Disetujui</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Ditolak</span>
                        </span>
                      )}
                      {!isPending && !isApproved && !isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase">
                          <span>{log.status}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-600">Belum ada riwayat transaksi</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan pilih paket di atas dan unggah bukti transfer Anda untuk mengaktifkan fitur.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feature Comparison Table (Higly Minimalist, highlighting current tier) */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-900">Tabel Perbandingan Fitur</h2>
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Fitur Utama</th>
                  <th className={`py-3.5 px-4 text-center ${currentTier === 'free' ? 'bg-slate-500/5 text-slate-900 font-black' : ''}`}>
                    Free
                    {currentTier === 'free' && <span className="block text-[8px] font-black text-slate-500 mt-0.5">Aktif</span>}
                  </th>
                  <th className={`py-3.5 px-4 text-center ${currentTier === 'basic' ? 'bg-emerald-500/5 text-emerald-800 font-black' : ''}`}>
                    Basic
                    {currentTier === 'basic' && <span className="block text-[8px] font-black text-emerald-600 mt-0.5">Aktif</span>}
                  </th>
                  <th className={`py-3.5 px-4 text-center ${currentTier === 'pro' ? 'bg-amber-500/5 text-amber-800 font-black' : ''}`}>
                    Pro
                    {currentTier === 'pro' && <span className="block text-[8px] font-black text-amber-600 mt-0.5">Aktif</span>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                {comparisonFeatures.map((feat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="py-4 px-4 sm:px-6 font-medium text-slate-800">{feat.name}</td>
                    <td className={`py-4 px-4 text-center ${currentTier === 'free' ? 'bg-slate-950/[0.015]' : ''}`}>
                      {feat.free ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className={`py-4 px-4 text-center ${currentTier === 'basic' ? 'bg-emerald-500/[0.015]' : ''}`}>
                      {feat.basic ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className={`py-4 px-4 text-center ${currentTier === 'pro' ? 'bg-amber-500/[0.015]' : ''}`}>
                      {feat.pro ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">Tanya Jawab Umum</h2>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white divide-y divide-slate-200 overflow-hidden shadow-2xs">
          {faqList.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 text-slate-800 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-5 bg-slate-50 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Status area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-100 rounded-2xl border border-slate-200 text-xs shadow-2xs">
        <div className="space-y-0.5 text-left">
          <p className="font-bold text-slate-900">Sudah mengirim bukti pembayaran?</p>
          <p className="text-slate-500">Ketuk tombol di samping untuk memperbarui status akun Anda secara langsung.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 transition-colors shrink-0 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-slate-600' : ''}`} />
          <span>{refreshSuccess ? 'Berhasil Diperbarui!' : 'Perbarui Status'}</span>
        </button>
      </div>
    </div>
  );
}
