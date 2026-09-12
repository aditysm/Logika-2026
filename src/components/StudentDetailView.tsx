import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
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
  Phone,
  Share2,
  Tag,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { formatWhatsAppUrl, formatPhoneDisplay } from '../lib/supabase';
import { formatIndonesianDate, hasTakenPhoto } from '../lib/photoStorage';
import { WhatsAppIcon } from './WhatsAppIcon';

interface StudentDetailViewProps {
  student: Mahasiswa;
  allStudents: Mahasiswa[];
  onBack: () => void;
  onSelectStudent: (student: Mahasiswa) => void;
  currentUser?: Mahasiswa | null;
  photoRecord?: PhotoRecord;
  photoRecords?: PhotoRecord[];
  onOpenUploadModal?: (student: Mahasiswa) => void;
  onViewPhoto?: (photoRecord: PhotoRecord) => void;
  onEditProfile?: () => void;
}

export function StudentDetailView({
  student,
  allStudents,
  onBack,
  onSelectStudent,
  currentUser,
  photoRecord,
  photoRecords = [],
  onOpenUploadModal,
  onViewPhoto,
  onEditProfile,
}: StudentDetailViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

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
  }, [student.id, student.nim]);

  // Find index for Prev / Next navigation
  const currentIndex = allStudents.findIndex((s) => s.id === student.id);
  const prevStudent = currentIndex > 0 ? allStudents[currentIndex - 1] : null;
  const nextStudent =
    currentIndex >= 0 && currentIndex < allStudents.length - 1
      ? allStudents[currentIndex + 1]
      : null;

  const waUrl = formatWhatsAppUrl(student.noWa, student.namaPanggilan || student.namaLengkap);

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

  const handleShareProfile = async () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
    const cleanNim = student.nim && student.nim !== '-' ? student.nim.replace(/[\/\s]/g, '-') : null;
    const studentIdentifier = cleanNim || student.id;
    const shareUrl = `${baseUrl}/#mhs=${encodeURIComponent(studentIdentifier)}`;

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

  const handleNavigate = (targetStudent: Mahasiswa) => {
    onSelectStudent(targetStudent);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const backButtonText = isOwnProfile ? 'Kembali ke Pencarian' : 'Kembali ke Hasil Pencarian';

  // Calculate personal progress when viewing own profile
  const myFriends = allStudents.filter(
    (s) => s.nim && student.nim && s.nim.replace(/[\/\s]/g, '') !== student.nim.replace(/[\/\s]/g, '')
  );
  const myTotalFriends = myFriends.length;
  const myTakenCount = myFriends.filter((friend) =>
    hasTakenPhoto(photoRecords, student.nim, friend.nim)
  ).length;
  const myPercentage = myTotalFriends > 0 ? Math.round((myTakenCount / myTotalFriends) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full space-y-6"
    >
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          id="btn-back-to-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center transition-colors shadow-xs">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-600 group-hover:text-blue-600" />
          </div>
          <span>{backButtonText}</span>
        </button>
      </div>

      {/* Hero Profile Header (without initial avatar box as requested) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>{student.kelompok}</span>
              </span>
              {student.namaPanggilan && student.namaPanggilan !== '-' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>Sapaan: {student.namaPanggilan}</span>
                </span>
              )}
              {isOwnProfile && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Profil Saya</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {student.namaLengkap}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
              <div className="flex items-center gap-1.5 font-mono font-medium text-slate-700">
                <IdCard className="w-4 h-4 text-blue-500" />
                <span>NIM: {student.nim}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{student.asalRumah}</span>
              </div>
            </div>
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
                  {myTakenCount} dari {myTotalFriends} Teman Selesai ({myPercentage}%)
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
                  {myTakenCount} Foto Tercatat
                </span>
                <span className="text-slate-500 font-medium">
                  {Math.max(0, myTotalFriends - myTakenCount)} Teman Belum Foto
                </span>
              </div>
            </div>

            {/* Action Buttons for Own Profile */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* 1. Edit Profil Saya */}
              <button
                id="btn-detail-edit-profile"
                type="button"
                onClick={onEditProfile}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all w-full min-h-[42px] cursor-pointer"
                title="Edit data profil Anda"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="truncate">Edit Profil Saya</span>
              </button>

              {/* 2. Google Drive Pribadi */}
              {student.driveFolderUrl ? (
                <a
                  id="btn-detail-own-drive"
                  href={student.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-all w-full min-h-[42px]"
                >
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Drive Saya</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 hidden sm:inline" />
                </a>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold w-full min-h-[42px] cursor-not-allowed">
                  <Folder className="w-4 h-4 shrink-0" />
                  <span className="truncate">Drive Belum Ada</span>
                </div>
              )}

              {/* 3. Bagikan Profil */}
              <button
                id="btn-detail-share-profile"
                type="button"
                onClick={handleShareProfile}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full min-h-[42px] cursor-pointer"
                title="Bagikan Tautan Profil Saya"
              >
                {shareSuccess ? (
                  <>
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="truncate">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Bagikan Profil</span>
                  </>
                )}
              </button>

              {/* 4. Salin Semua Rincian */}
              <button
                id="btn-detail-copy-all"
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 rounded-xl text-xs font-semibold transition-all w-full min-h-[42px] shadow-xs cursor-pointer"
                title="Salin Semua Rincian Mahasiswa"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="truncate text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Salin Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* 4 Action Buttons for Other Students */
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Hubungi WhatsApp */}
            {waUrl ? (
              <a
                id="btn-detail-wa"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full min-h-[42px]"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80 shrink-0 hidden sm:inline" />
              </a>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold w-full min-h-[42px] cursor-not-allowed">
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </div>
            )}

            {/* 2. Kirim Email */}
            {student.email && student.email !== '-' ? (
              <a
                id="btn-detail-email"
                href={`mailto:${student.email}`}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 rounded-xl text-xs font-semibold transition-all w-full min-h-[42px] border border-slate-200/60"
              >
                <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">Kirim Email</span>
              </a>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-semibold w-full min-h-[42px] border border-slate-100 cursor-not-allowed">
                <Mail className="w-4 h-4 shrink-0" />
                <span>Kirim Email</span>
              </div>
            )}

            {/* 3. Bagikan Profil */}
            <button
              id="btn-detail-share-profile"
              type="button"
              onClick={handleShareProfile}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full min-h-[42px]"
              title="Bagikan Tautan Profil"
            >
              {shareSuccess ? (
                <>
                  <Check className="w-4 h-4 shrink-0 text-white" />
                  <span className="truncate">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Bagikan Profil</span>
                </>
              )}
            </button>

            {/* 4. Salin Semua Rincian */}
            <button
              id="btn-detail-copy-all"
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 rounded-xl text-xs font-semibold transition-all w-full min-h-[42px] shadow-xs"
              title="Salin Semua Rincian Mahasiswa"
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="truncate text-emerald-600">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Salin Semua</span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Know Each Other: Photo Status & Action Banner (Shown when viewing another student) */}
      {!isOwnProfile && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
          {currentUser && photoRecord ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Tugas Selesai
                    </span>
                    <span className="text-xs text-slate-500">{formatIndonesianDate(photoRecord.timestamp)}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    Anda sudah berfoto bersama {student.namaLengkap}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    File tercatat: <code className="font-mono text-blue-700 font-semibold">{photoRecord.photoFileName}</code>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-stretch sm:self-auto shrink-0">
                {/* 1. Lihat Foto */}
                <button
                  id="btn-detail-view-photo"
                  type="button"
                  onClick={() => onViewPhoto?.(photoRecord)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex-1 sm:flex-initial cursor-pointer"
                  title="Lihat Pratinjau Foto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Foto</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {currentUser ? 'Belum Ada Foto Bersama' : 'Tugas Foto Bersama Teman'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    Ambil Foto Bersama dengan {student.namaPanggilan || student.namaLengkap}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unggah foto bersama teman untuk melengkapi tugas perkenalan Logika 2026.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenUploadModal?.(student)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 w-full sm:w-auto cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tambahkan Foto Bersama</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of Data Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Informasi Akademik & Identitas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Identitas &amp; Akademik
              </h2>
            </div>
            {/* Drive Link ONLY shown if isOwnProfile */}
            {isOwnProfile && student.driveFolderUrl && (
              <a
                href={student.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                title="Buka Folder Google Drive Pribadi Saya"
              >
                <Folder className="w-3.5 h-3.5 text-blue-600" />
                <span>Drive Saya</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
          </div>

          {/* 1. Nama Lengkap */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                NAMA LENGKAP
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.namaLengkap, 'nama')}
                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Salin Nama Lengkap"
              >
                {copiedField === 'nama' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.namaLengkap}</p>
          </div>

          {/* 2. Nama Panggilan */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                NAMA PANGGILAN
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.namaPanggilan || '-'}</p>
          </div>

          {/* 3. NIM */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-blue-600" />
                NIM
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.nim, 'nim')}
                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Salin NIM"
              >
                {copiedField === 'nim' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg inline-block">
              {student.nim}
            </p>
          </div>

          {/* 4. Kelompok */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                KELOMPOK LOGIKA
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.kelompok}</p>
          </div>
        </div>

        {/* Section 2: Kontak & Hobi */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Phone className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {isOwnProfile ? 'Kontak & Hobi Saya' : 'Kontak & Komunikasi'}
            </h2>
          </div>

          {/* 5. NO WA */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                NOMOR WHATSAPP
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.noWa, 'wa')}
                className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                title="Salin Nomor WhatsApp"
              >
                {copiedField === 'wa' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-sm font-mono font-bold text-slate-900">
                {formatPhoneDisplay(student.noWa)}
              </span>
              {!isOwnProfile && waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <WhatsAppIcon className="w-3 h-3" />
                  <span>Buka Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* 6. Email Address */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                EMAIL ANDA
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.email, 'email')}
                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Salin Email"
              >
                {copiedField === 'email' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-medium text-slate-900 break-all">{student.email}</p>
          </div>

          {/* 7. HOBI */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                HOBI &amp; MINAT
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 leading-relaxed">{student.hobi}</p>
          </div>
        </div>
      </div>

      {/* Section 3: Domisili & Folder Drive (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Home className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Informasi Asal, Domisili &amp; Folder Tugas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 8. ASAL RUMAH */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                KOTA / DAERAH ASAL
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.asalRumah, 'asal')}
                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Salin Asal Daerah"
              >
                {copiedField === 'asal' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.asalRumah}</p>
          </div>

          {/* 9. ALAMAT RUMAH/DOMISILI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                ALAMAT DOMISILI / TEMPAT TINGGAL
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.alamatRumahDomisili, 'alamat')}
                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Salin Alamat"
              >
                {copiedField === 'alamat' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {student.alamatRumahDomisili}
            </p>
          </div>
        </div>

        {/* 10. Tautan Google Drive Folder Tugas (Hanya tampil jika milik profil sendiri) */}
        {isOwnProfile && (
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                  TAUTAN GOOGLE DRIVE FOLDER TUGAS
                </span>
                <p className="text-xs text-slate-600 truncate max-w-lg">
                  {student.driveFolderUrl || 'Belum ada tautan folder Google Drive yang terhubung.'}
                </p>
              </div>

              {currentUser?.driveFolderUrl || student.driveFolderUrl ? (
                <a
                  id="btn-open-drive-folder"
                  href={currentUser?.driveFolderUrl || student.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                  title="Buka Folder Google Drive Tugas"
                >
                  <Folder className="w-4 h-4" />
                  <span>Buka Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold shrink-0 cursor-not-allowed">
                  <span>Drive Belum Tersedia</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="pt-6 pb-4 border-t border-slate-200 flex items-center justify-start">
        <button
          id="btn-bottom-back-to-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backButtonText}</span>
        </button>
      </div>
    </motion.div>
  );
}

