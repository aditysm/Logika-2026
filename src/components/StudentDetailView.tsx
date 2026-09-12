import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  Heart,
  Home,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Share2,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Mahasiswa } from '../types';
import { formatWhatsAppUrl } from '../lib/supabase';
import { WhatsAppIcon } from './WhatsAppIcon';

interface StudentDetailViewProps {
  student: Mahasiswa;
  allStudents: Mahasiswa[];
  onBack: () => void;
  onSelectStudent: (student: Mahasiswa) => void;
}

export function StudentDetailView({
  student,
  allStudents,
  onBack,
  onSelectStudent,
}: StudentDetailViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Instantly scroll to top when detail view loads or student changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [student.id]);

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
    // Generate clean canonical share URL: https://domain/#mhs=ID
    const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
    const studentIdentifier = student.id || student.nim;
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
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleReturn = () => {
    onBack();
  };

  const initials = student.namaLengkap
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full space-y-6"
    >
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <button
          id="btn-back-to-list"
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors group self-start"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-300 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span>Kembali ke Daftar Pencarian</span>
        </button>

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-medium text-slate-600">
          <button
            id="btn-prev-student"
            type="button"
            disabled={!prevStudent}
            onClick={() => prevStudent && handleNavigate(prevStudent)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={prevStudent ? `Sebelumnya: ${prevStudent.namaLengkap}` : 'Tidak ada mahasiswa sebelumnya'}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          <span className="px-2 text-slate-400">
            {currentIndex >= 0 ? `${currentIndex + 1} dari ${allStudents.length}` : ''}
          </span>

          <button
            id="btn-next-student"
            type="button"
            disabled={!nextStudent}
            onClick={() => nextStudent && handleNavigate(nextStudent)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={nextStudent ? `Selanjutnya: ${nextStudent.namaLengkap}` : 'Tidak ada mahasiswa berikutnya'}
          >
            <span className="hidden sm:inline">Selanjutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Profile Header */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Initials Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-sm shrink-0">
              {initials || <User className="w-8 h-8" />}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  <span>{student.kelompok}</span>
                </span>
                {student.namaPanggilan && student.namaPanggilan !== '-' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span>Sapaan: {student.namaPanggilan}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {student.namaLengkap}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
                <div className="flex items-center gap-1.5 font-mono font-medium text-slate-700">
                  <IdCard className="w-4 h-4 text-indigo-500" />
                  <span>NIM: {student.nim}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{student.asalRumah}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons in Hero */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {/* Web Share API Button */}
            <button
              id="btn-detail-share-profile"
              type="button"
              onClick={handleShareProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="Bagikan Tautan Profil"
            >
              {shareSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tautan Disalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan Profil</span>
                </>
              )}
            </button>

            {waUrl && (
              <a
                id="btn-detail-wa"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Hubungi via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            )}

            {student.email && student.email !== '-' && (
              <a
                id="btn-detail-email"
                href={`mailto:${student.email}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span>Kirim Email</span>
              </a>
            )}

            <button
              id="btn-detail-copy-all"
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Semua Rincian Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Salin Semua Rincian</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Grid of 10 Data Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Informasi Akademik & Identitas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Identitas & Akademik
            </h2>
          </div>

          {/* 1. Nama Lengkap */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                NAMA LENGKAP
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.namaLengkap, 'nama')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
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
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                NAMA PANGGILAN
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.namaPanggilan || '-'}</p>
          </div>

          {/* 3. NIM */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-indigo-500" />
                NIM
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.nim, 'nim')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Salin NIM"
              >
                {copiedField === 'nim' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
              {student.nim}
            </p>
          </div>

          {/* 4. Kelompok */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                KELOMPOK
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">{student.kelompok}</p>
          </div>
        </div>

        {/* Section 2: Kontak & Komunikasi */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Phone className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Kontak & Komunikasi
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
                className="text-slate-400 hover:text-emerald-600 transition-colors"
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
              <span className="text-sm font-mono font-bold text-slate-900">{student.noWa}</span>
              {waUrl && (
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
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                ALAMAT EMAIL
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.email, 'email')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
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
                HOBI & MINAT
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 leading-relaxed">{student.hobi}</p>
          </div>
        </div>
      </div>

      {/* Section 3: Domisili & Alamat (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Home className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Informasi Asal & Domisili
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 9. ASAL RUMAH */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                KOTA / DAERAH ASAL
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.asalRumah, 'asal')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
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

          {/* 10. ALAMAT RUMAH/DOMISILI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                ALAMAT DOMISILI / TEMPAT TINGGAL
              </span>
              <button
                type="button"
                onClick={() => handleCopy(student.alamatRumahDomisili, 'alamat')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
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
      </div>

      {/* Bottom Navigation Button */}
      <div className="pt-2 flex justify-start">
        <button
          type="button"
          onClick={handleReturn}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pencarian</span>
        </button>
      </div>
    </motion.div>
  );
}
