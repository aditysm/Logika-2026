import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Folder,
  Heart,
  Home,
  IdCard,
  Mail,
  MapPin,
  QrCode,
  Phone,
  Share2,
  Tag,
  TrendingUp,
  User,
  Users,
  Lock,
  Crown,
  FolderCheck,
  UserCheck,
  Sparkles,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { 
  formatWhatsAppUrl, 
  formatPhoneDisplay, 
  fetchPhotoTrackingFromSupabase,
  upsertPhotoTrackingInSupabase 
} from '../lib/supabase';
import { formatIndonesianDate, hasTakenPhoto } from '../lib/photoStorage';
import { WhatsAppIcon } from './WhatsAppIcon';
import { ReportSection } from './ReportSection';
import { DEFAULT_DRIVE_FOLDER_URL } from '../lib/api';

interface StudentDetailViewProps {
  student: Mahasiswa;
  allStudents: Mahasiswa[];
  totalStudents?: Mahasiswa[];
  onBack: () => void;
  onSelectStudent: (student: Mahasiswa) => void;
  currentUser?: Mahasiswa | null;
  photoRecord?: PhotoRecord;
  photoRecords?: PhotoRecord[];
  refreshKey?: number;
  onOpenUploadModal?: (student: Mahasiswa) => void;
  onViewPhoto?: (photoRecord: PhotoRecord, student?: Mahasiswa) => void;
  onEditProfile?: () => void;
  onOpenPremiumModal?: () => void;
  onGenerateReport?: () => void;
}

export function StudentDetailView({
  student,
  allStudents,
  totalStudents,
  onBack,
  onSelectStudent,
  currentUser,
  photoRecord,
  photoRecords = [],
  refreshKey = 0,
  onOpenUploadModal,
  onViewPhoto,
  onEditProfile,
  onOpenPremiumModal,
  onGenerateReport,
}: StudentDetailViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const [showQr, setShowQr] = useState(false);
  const [isCheckedInTracking, setIsCheckedInTracking] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Get current user NIM - matching new schema where user_id references profiles.nim
  const userKey = currentUser?.nim;

  // Determine if viewing own user profile
  const isOwnProfile = Boolean(
    currentUser &&
      student.nim &&
      currentUser.nim.toLowerCase().replace(/[\/\s_-]/g, '') ===
        student.nim.toLowerCase().replace(/[\/\s_-]/g, '')
  );

  // Instantly scroll to top when detail view loads or student changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [student.id]);

  // Load tracking status on mount, user/student change, or realtime refreshKey trigger
  useEffect(() => {
    const loadTrackingStatus = async () => {
      if (userKey && student.nim) {
        setIsTrackingLoading(true);
        const data = await fetchPhotoTrackingFromSupabase(userKey);
        const cleanNim = student.nim.toLowerCase().replace(/[\/\s_-]/g, '');
        const hasPhoto = hasTakenPhoto(photoRecords, userKey, student.nim);
        setIsCheckedInTracking(Boolean(data[student.nim] || data[cleanNim] || data[student.nim.trim()] || hasPhoto));
        setIsTrackingLoading(false);
      }
    };
    loadTrackingStatus();
  }, [student.nim, userKey, refreshKey, photoRecords]);

  // Find index for Prev / Next navigation
  const currentIndex = allStudents.findIndex((s) => s.id === student.id);
  const prevStudent = currentIndex > 0 ? allStudents[currentIndex - 1] : null;
  const nextStudent =
    currentIndex >= 0 && currentIndex < allStudents.length - 1
      ? allStudents[currentIndex + 1]
      : null;

  const waUrl = formatWhatsAppUrl(student.noWa, student.namaPanggilan || student.namaLengkap, currentUser);

  const handleCopy = (text: string, label: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    const summary = `DATA MAHASISWA LOGIKA 2026
Nama Lengkap: ${student.namaLengkap}
Nama Panggilan: ${student.namaPanggilan}
NIM: ${student.nim}
Kelompok: ${student.kelompok}
Asal: ${student.asalRumah}
Alamat Domisili: ${student.alamatRumahDomisili}
Hobi: ${student.hobi}
Nomor WhatsApp: ${student.noWa}
Alamat Email: ${student.email}`;

    navigator.clipboard.writeText(summary);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const getProfileUrl = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
    const cleanNim = student.nim && student.nim !== '-' ? student.nim.replace(/[\/\s]/g, '-') : null;
    const studentIdentifier = cleanNim || student.id;
    return `${baseUrl}/#mhs=${encodeURIComponent(studentIdentifier)}`;
  };

  const handleShareProfile = async () => {
    const shareUrl = getProfileUrl();
    
    const shareData = {
      title: `Profil ${student.namaLengkap} - Logika 2026`,
      text: `Lihat profil mahasiswa ${student.namaLengkap} (${student.nim}) dari ${student.kelompok} di Logika 2026`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          copyShareFallback(shareUrl);
        }
      }
    } else {
      copyShareFallback(shareUrl);
    }
  };

  const copyShareFallback = (url: string) => {
    navigator.clipboard.writeText(url);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  const handleToggleTracking = async () => {
    if (!userKey || isOwnProfile) return;
    
    setIsTrackingLoading(true);
    const newState = !isCheckedInTracking;
    const success = await upsertPhotoTrackingInSupabase(userKey, student.nim, newState);
    
    if (success) {
      setIsCheckedInTracking(newState);
    }
    setIsTrackingLoading(false);
  };

  const handleNavigate = (targetStudent: Mahasiswa) => {
    onSelectStudent(targetStudent);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const backButtonText = 'Kembali ke Menu Utama';

  // Calculate personal progress when viewing own profile across total students (independent of group/search filter)
  const masterStudentList =
    totalStudents && totalStudents.length > 0 ? totalStudents : allStudents;
  const myFriends = masterStudentList.filter(
    (s) => s.nim && student.nim && s.nim.replace(/[\/\s]/g, '') !== student.nim.replace(/[\/\s]/g, '')
  );
  const myTotalFriends = myFriends.length;
  const myTakenCount = myFriends.filter((friend) =>
    hasTakenPhoto(photoRecords, student.nim, friend.nim)
  ).length;
  const myPercentage = myTotalFriends > 0 ? Math.round((myTakenCount / myTotalFriends) * 100) : 0;
  const activeTier = currentUser?.tier || student.tier || 'free';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="w-full space-y-6"
    >
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          id="btn-back-to-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center transition-all shadow-2xs group-active:scale-95">
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span>Kembali</span>
        </button>

        {isOwnProfile && (
          <button
            onClick={onEditProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-xs font-bold transition-all active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profil</span>
          </button>
        )}
      </div>

      {/* Hero Profile Header */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-xs relative overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            {/* Status Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                {student.kelompok}
              </span>
              
              {student.namaPanggilan && student.namaPanggilan !== '-' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Sapaan: {student.namaPanggilan}
                </span>
              )}

              {student.isLeader && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
                  Ketua Kelompok
                </span>
              )}

              {isOwnProfile && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Profil Saya
                </span>
              )}
            </div>

            {/* Name and QR Toggle */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight flex-1">
                {student.namaLengkap}
              </h1>
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                  showQr 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-110' 
                    : 'bg-white text-slate-400 hover:text-blue-600 border-slate-200 hover:border-blue-200 shadow-2xs active:scale-95'
                }`}
                title="Tampilkan QR Code Profil"
              >
                <QrCode className="w-5 h-5 sm:w-6 h-6" />
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-500 pt-1">
              <div className="flex items-center gap-3 group bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <IdCard className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">NIM Mahasiswa</p>
                  <p className="font-mono font-bold text-slate-700 truncate">{student.nim}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 group bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-5 h-5 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asal Daerah</p>
                  <p className="font-bold text-slate-700 leading-snug">{student.asalRumah}</p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <AnimatePresence>
              {showQr && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden bg-slate-50 border border-slate-200 rounded-2xl p-6"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <QRCodeCanvas 
                        value={getProfileUrl()} 
                        size={180}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: `${window.location.origin}/favicon.ico`,
                          x: undefined,
                          y: undefined,
                          height: 30,
                          width: 30,
                          excavate: true,
                        }}
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-slate-900">Scan QR Code</p>
                      <p className="text-xs text-slate-500 max-w-[200px]">
                        Scan untuk melihat profil {student.namaPanggilan || student.namaLengkap} di perangkat lain
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hero Actions & Progress */}
        {isOwnProfile ? (
          /* Profile Actions & Progress for Own Account */
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
            {/* Progress Foto Bersama Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Pencapaian Tugas Foto Bersama Teman
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs tabular-nums self-start sm:self-auto">
                  {myTakenCount} dari {myTotalFriends} Teman ({myPercentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    myPercentage > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-transparent'
                  }`}
                  style={{ width: `${Math.min(100, myPercentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className={`flex items-center gap-1.5 font-semibold ${myTakenCount > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${myTakenCount > 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
                  {myTakenCount} Sudah Foto
                </span>
                <span className="text-slate-500 font-medium">
                  {Math.max(0, myTotalFriends - myTakenCount)} Belum Foto
                </span>
              </div>
            </div>

            {/* Action Buttons for Own Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bagikan Profil */}
              <button
                id="btn-detail-share-profile"
                type="button"
                onClick={handleShareProfile}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-sm transition-all w-full cursor-pointer"
                title="Bagikan Tautan Profil Saya"
              >
                {shareSuccess ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Tautan Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    <span>Bagikan Profil</span>
                  </>
                )}
              </button>

              {/* Salin Semua Rincian */}
              <button
                id="btn-detail-copy-all"
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 rounded-2xl text-sm font-bold transition-all w-full shadow-2xs cursor-pointer"
                title="Salin Semua Rincian Mahasiswa"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-600">Data Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-slate-500" />
                    <span>Salin Seluruh Data</span>
                  </>
                )}
              </button>
            </div>

            {/* Premium Actions & Word Report (moved here to keep user focus) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/60 mt-4 space-y-4">
              {/* Tautan Google Drive Folder Tugas Info Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800">Tautan Google Drive Folder Tugas</span>
                  </div>
                  {activeTier === 'free' ? (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong className="text-rose-600">Status: Terkunci (Free Tier)</strong>. Anda berada pada paket Free. Untuk mengakses folder penyimpanan Google Drive khusus tugas kuliah ini, silakan tingkatkan akun Anda ke <strong>Paket Basic</strong> atau <strong>Paket Pro</strong>.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong className="text-emerald-700">Status: Terbuka ({activeTier.toUpperCase()})</strong>. Ini adalah folder tempat rekan Anda dapat mengunggah foto bersama dengan Anda.
                    </p>
                  )}
                </div>
                {activeTier !== 'free' && (
                  <a
                    href={student.driveFolderUrl || DEFAULT_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 hover:text-slate-950 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Drive Folder</span>
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Layanan &amp; Sesi Aktif</span>
                  </div>
                  
                  {activeTier === 'free' && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Anda menggunakan paket <strong>Free</strong>. Pilih Paket Basic untuk mengaktifkan folder penyimpanan Google Drive!
                    </p>
                  )}
                  {activeTier === 'basic' && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Anda menggunakan paket <strong>Basic</strong>. Penyimpanan aktif. Pilih Paket Pro untuk membuka fitur pembuatan Laporan Tugas otomatis!
                    </p>
                  )}
                  {activeTier === 'pro' && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span>Anda menggunakan paket <strong>Pro</strong>. Akses pembuatan dokumen laporan PDF otomatis aktif.</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  {/* Upgrade / Billing Button */}
                  {activeTier !== 'pro' && (
                    <button
                      type="button"
                      onClick={onOpenPremiumModal}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>{activeTier === 'free' ? 'Pilih Paket Basic (Rp2.000)' : 'Upgrade ke Paket Pro (Rp5.000)'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Integrated Report Generation Section (Antrean PDF + Real-time Polling) */}
              <ReportSection
                currentUser={currentUser}
                allStudents={totalStudents && totalStudents.length > 0 ? totalStudents : allStudents}
                photoRecords={photoRecords}
                onOpenPremiumModal={onOpenPremiumModal}
              />
            </div>
          </div>

        ) : (
          <div className="mt-6 pt-6 border-t border-slate-100">
            {/* 4-Grid Action Buttons for Other Students */}
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp Action */}
              {waUrl ? (
                <a
                  id="btn-detail-wa"
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-400 rounded-2xl text-xs font-bold border border-slate-100 cursor-not-allowed">
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>N/A</span>
                </div>
              )}

              {/* Email Action */}
              {student.email && student.email !== '-' ? (
                <a
                  id="btn-detail-email"
                  href={`mailto:${student.email}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-800 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Email</span>
                </a>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-400 rounded-2xl text-xs font-bold border border-slate-100 cursor-not-allowed">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>N/A</span>
                </div>
              )}

              {/* Bagikan Profil */}
              <button
                id="btn-detail-share-profile"
                type="button"
                onClick={handleShareProfile}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {shareSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan</span>
                  </>
                )}
              </button>

              {/* Salin Semua */}
              <button
                id="btn-detail-copy-all"
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Salin Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
      {!isOwnProfile && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          {/* Decorative Background Icon */}
          <Camera className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 opacity-[0.03] rotate-12" />
          
          {currentUser && photoRecord ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-md">
                      Tugas Selesai
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{formatIndonesianDate(photoRecord.timestamp)}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    Sudah Berfoto Bersama
                  </h3>
                  {(() => {
                    const cleanName = student.namaLengkap.trim().replace(/\s+/g, '_');
                    const cleanNim = student.nim.trim().replace(/[\/\s]/g, '-');
                    const webFileName = `${cleanName}_${cleanNim}.jpg`;
                    return (
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        File: <code className="font-mono text-blue-600 font-bold bg-blue-50/50 px-1.5 py-0.5 rounded break-all">{webFileName}</code>
                      </p>
                    );
                  })()}
                </div>
              </div>

              <button
                id="btn-detail-view-photo"
                type="button"
                onClick={() => onViewPhoto?.(photoRecord, student)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition-all w-full sm:w-auto shadow-2xs active:scale-95 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Lihat Foto</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex justify-center sm:justify-start mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded-md">
                      Tugas Belum Selesai
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    Ambil Foto Bersama
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Lengkapi tugas perkenalan Logika 2026 dengan berfoto bersama rekan Anda.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {currentUser && !isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleToggleTracking}
                    disabled={isTrackingLoading}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer border-2 relative overflow-hidden group min-w-[160px] ${
                      isCheckedInTracking 
                        ? 'bg-emerald-600 border-emerald-500 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {isTrackingLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={isCheckedInTracking ? 'checked' : 'unchecked'}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          {isCheckedInTracking ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Selesai Foto</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4" />
                              <span>Tandai Selesai</span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Ripple visual effect simulation */}
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ scale: 0, opacity: 0 }}
                      whileTap={{ 
                        scale: 4, 
                        opacity: [0, 1, 0],
                        transition: { duration: 0.5 }
                      }}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenUploadModal?.(student)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-md transition-all w-full sm:w-auto cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Unggah Foto</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid of Data Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Informasi Akademik & Identitas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Identitas & Akademik
            </h2>
          </div>

          <div className="space-y-3">
            {/* 1. Nama Lengkap */}
            <div className="group transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Nama Lengkap
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(student.namaLengkap, 'nama')}
                  className="p-1 text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {copiedField === 'nama' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/30 transition-all">
                {student.namaLengkap}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 2. Nama Panggilan */}
              <div className="group transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Tag className="w-3 h-3" />
                  Panggilan
                </span>
                <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                  {student.namaPanggilan || '-'}
                </p>
              </div>

              {/* 3. NIM */}
              <div className="group transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <IdCard className="w-3 h-3" />
                  NIM
                </span>
                <p className="text-sm font-mono font-bold text-blue-700 bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100">
                  {student.nim}
                </p>
              </div>
            </div>

            {/* 4. Kelompok */}
            <div className="group transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Users className="w-3 h-3" />
                Kelompok
              </span>
              <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                {student.kelompok}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Kontak & Hobi */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {isOwnProfile ? 'Kontak & Hobi Saya' : 'Kontak & Komunikasi'}
            </h2>
          </div>

          <div className="space-y-3">
            {/* 5. NO WA */}
            <div className="group transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <WhatsAppIcon className="w-3 h-3" />
                  WhatsApp
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(student.noWa, 'wa')}
                  className="p-1 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {copiedField === 'wa' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 bg-emerald-50/30 border border-emerald-100/50 p-2.5 rounded-2xl group-hover:border-emerald-200 transition-all">
                <span className="text-sm font-mono font-bold text-slate-800 ml-1">
                  {formatPhoneDisplay(student.noWa)}
                </span>
                {!isOwnProfile && waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-all hover:bg-emerald-200 flex items-center gap-1 uppercase tracking-tight"
                  >
                    <span>Chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* 6. Email Address */}
            <div className="group transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  Email
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(student.email, 'email')}
                  className="p-1 text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 truncate">
                {student.email}
              </p>
            </div>

            {/* 7. HOBI */}
            <div className="group transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Heart className="w-3 h-3 text-rose-500" />
                Hobi & Minat
              </span>
              <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 leading-relaxed italic">
                {student.hobi}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Domisili (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
            <Home className="w-4 h-4 text-rose-600" />
          </div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
            Asal & Domisili
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 8. ASAL RUMAH */}
          <div className="group transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3 h-3" />
                Kota / Daerah Asal
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.asalRumah, 'asal')}
                className="p-1 text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {copiedField === 'asal' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
              {student.asalRumah}
            </p>
          </div>

          {/* 9. ALAMAT RUMAH/DOMISILI */}
          <div className="group transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Alamat Lengkap (Domisili)
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.alamatRumahDomisili, 'alamat')}
                className="p-1 text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {copiedField === 'alamat' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-sm font-bold text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 leading-relaxed">
              {student.alamatRumahDomisili}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="pt-4 pb-8 flex items-center justify-center">
        <button
          id="btn-bottom-back-to-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-sm font-black shadow-lg transition-all cursor-pointer tracking-tight"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Menu Utama</span>
        </button>
      </div>
    </motion.div>
  );
}

