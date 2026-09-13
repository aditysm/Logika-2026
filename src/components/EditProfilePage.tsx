import { useState, FormEvent, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Folder,
  Globe,
  Heart,
  IdCard,
  Mail,
  MapPin,
  Save,
  Tag,
  User,
  Users,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { updateProfilUser } from '../lib/api';

interface EditProfilePageProps {
  currentUser: Mahasiswa;
  groups: string[];
  onSaveProfile: (updatedData: Partial<Mahasiswa>) => void;
  onBack: () => void;
}

export function EditProfilePage({
  currentUser,
  groups,
  onSaveProfile,
  onBack,
}: EditProfilePageProps) {
  const [namaLengkap, setNamaLengkap] = useState(currentUser.namaLengkap || '');
  const [namaPanggilan, setNamaPanggilan] = useState(currentUser.namaPanggilan || '');
  const [nim, setNim] = useState(currentUser.nim || '');
  const [kelompok, setKelompok] = useState(currentUser.kelompok || (groups[0] || 'Kelompok 01 - Turing'));
  const [noWa, setNoWa] = useState(currentUser.noWa || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [asalRumah, setAsalRumah] = useState(currentUser.asalRumah || '');
  const [alamatRumahDomisili, setAlamatRumahDomisili] = useState(currentUser.alamatRumahDomisili || '');
  const [hobi, setHobi] = useState(currentUser.hobi || '');

  // Prepare kelompok dropdown options
  const kelompokOptions: CustomSelectOption[] = useMemo(() => {
    const opts = groups.map((g) => ({
      value: g,
      label: g,
    }));
    if (kelompok && !groups.includes(kelompok)) {
      opts.push({ value: kelompok, label: kelompok });
    }
    return opts;
  }, [groups, kelompok]);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation: ALL fields are required and must be non-empty
  const isValid =
    namaLengkap.trim().length > 0 &&
    namaPanggilan.trim().length > 0 &&
    nim.trim().length > 0 &&
    kelompok.trim().length > 0 &&
    noWa.trim().length > 0 &&
    email.trim().length > 0 &&
    asalRumah.trim().length > 0 &&
    alamatRumahDomisili.trim().length > 0 &&
    hobi.trim().length > 0;

  // The update button is active ONLY if there are changes from the current profile
  const hasChanges =
    namaLengkap.trim() !== (currentUser.namaLengkap || '').trim() ||
    namaPanggilan.trim() !== (currentUser.namaPanggilan || '').trim() ||
    nim.trim() !== (currentUser.nim || '').trim() ||
    kelompok.trim() !== (currentUser.kelompok || '').trim() ||
    noWa.trim() !== (currentUser.noWa || '').trim() ||
    email.trim() !== (currentUser.email || '').trim() ||
    asalRumah.trim() !== (currentUser.asalRumah || '').trim() ||
    alamatRumahDomisili.trim() !== (currentUser.alamatRumahDomisili || '').trim() ||
    hobi.trim() !== (currentUser.hobi || '').trim();

  // Compute actual list of changes to display in the confirmation modal
  const changedFields = useMemo(() => {
    const list = [];
    if (namaLengkap.trim() !== (currentUser.namaLengkap || '').trim()) {
      list.push({ label: 'Nama Lengkap', old: currentUser.namaLengkap || '-', new: namaLengkap.trim() });
    }
    if (namaPanggilan.trim() !== (currentUser.namaPanggilan || '').trim()) {
      list.push({ label: 'Nama Panggilan', old: currentUser.namaPanggilan || '-', new: namaPanggilan.trim() });
    }
    if (nim.trim() !== (currentUser.nim || '').trim()) {
      list.push({ label: 'NIM', old: currentUser.nim || '-', new: nim.trim() });
    }
    if (kelompok.trim() !== (currentUser.kelompok || '').trim()) {
      list.push({ label: 'Kelompok', old: currentUser.kelompok || '-', new: kelompok.trim() });
    }
    if (noWa.trim() !== (currentUser.noWa || '').trim()) {
      list.push({ label: 'No. WhatsApp', old: currentUser.noWa || '-', new: noWa.trim() });
    }
    if (email.trim() !== (currentUser.email || '').trim()) {
      list.push({ label: 'Email', old: currentUser.email || '-', new: email.trim() });
    }
    if (asalRumah.trim() !== (currentUser.asalRumah || '').trim()) {
      list.push({ label: 'Asal Daerah', old: currentUser.asalRumah || '-', new: asalRumah.trim() });
    }
    if (alamatRumahDomisili.trim() !== (currentUser.alamatRumahDomisili || '').trim()) {
      list.push({ label: 'Alamat / Domisili', old: currentUser.alamatRumahDomisili || '-', new: alamatRumahDomisili.trim() });
    }
    if (hobi.trim() !== (currentUser.hobi || '').trim()) {
      list.push({ label: 'Hobi & Minat', old: currentUser.hobi || '-', new: hobi.trim() });
    }
    return list;
  }, [namaLengkap, namaPanggilan, nim, kelompok, noWa, email, asalRumah, alamatRumahDomisili, hobi, currentUser]);

  const handleOpenConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || !hasChanges) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);

    const updatedData: Partial<Mahasiswa> = {
      namaLengkap: namaLengkap.trim(),
      namaPanggilan: namaPanggilan.trim(),
      nim: nim.trim(),
      kelompok: kelompok.trim(),
      noWa: noWa.trim(),
      email: email.trim(),
      asalRumah: asalRumah.trim(),
      alamatRumahDomisili: alamatRumahDomisili.trim(),
      hobi: hobi.trim(),
      driveFolderUrl: (currentUser.tier || 'free') !== 'free' ? 'https://drive.google.com/drive/folders/1oqXx0wzzKkkZajuBuC9xhv-pF6wDPPEX' : undefined,
    };

    // 1. Send update to Supabase Edge Function: ?action=update-profile
    try {
      await updateProfilUser(currentUser.nim, {
        nama_lengkap: updatedData.namaLengkap,
        nama_panggilan: updatedData.namaPanggilan,
        kelompok: updatedData.kelompok,
        no_wa: updatedData.noWa,
        email: updatedData.email,
        asal_rumah: updatedData.asalRumah,
        alamat_domisili: updatedData.alamatRumahDomisili,
        hobi: updatedData.hobi,
        drive_folder_url: updatedData.driveFolderUrl,
      });
    } catch (err) {
      console.warn('Edge function update profile notice:', err);
    }

    // 2. Persist locally & refresh state
    onSaveProfile(updatedData);
    setIsSubmitting(false);
    setIsConfirmModalOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-3xl mx-auto space-y-6 pb-12"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center transition-colors shadow-xs">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-600 group-hover:text-blue-600" />
          </div>
          <span>Kembali ke Profil Saya</span>
        </button>
      </div>

      {/* Main Form Card */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Edit Data Profil Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Perbarui biodata dan informasi kontak Anda di direktori Logika 2026.
            </p>
          </div>
        </div>

        <form onSubmit={handleOpenConfirm} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div>
              <label htmlFor="input-edit-nama" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-edit-nama"
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Nama Lengkap sesuai data kampus"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Nama Panggilan */}
            <div>
              <label htmlFor="input-edit-panggilan" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Panggilan / Sapaan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-edit-panggilan"
                  type="text"
                  required
                  value={namaPanggilan}
                  onChange={(e) => setNamaPanggilan(e.target.value)}
                  placeholder="Contoh: Adit, Clara, Zahra"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* NIM */}
            <div>
              <label htmlFor="input-edit-nim" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor Induk Mahasiswa (NIM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-edit-nim"
                  type="text"
                  required
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 26/514238/PA/21045"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Kelompok */}
            <div>
              <label htmlFor="select-edit-kelompok" className="block text-xs font-bold text-slate-700 mb-1.5">
                Kelompok Logika <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                id="select-edit-kelompok"
                value={kelompok}
                onChange={setKelompok}
                options={kelompokOptions}
                size="md"
              />
            </div>

            {/* Nomor WhatsApp */}
            <div>
              <label htmlFor="input-edit-wa" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-edit-wa"
                  type="tel"
                  required
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="input-edit-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Anda
              </label>
              <div className="relative">
                <input
                  id="input-edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: nama26@mail.ugm.ac.id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Asal Daerah */}
            <div>
              <label htmlFor="input-edit-asal" className="block text-xs font-bold text-slate-700 mb-1.5">
                Asal Daerah / Kota Asal <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-edit-asal"
                  type="text"
                  required
                  value={asalRumah}
                  onChange={(e) => setAsalRumah(e.target.value)}
                  placeholder="Contoh: Surabaya, Jawa Timur"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Hobi */}
            <div>
              <label htmlFor="input-edit-hobi" className="block text-xs font-bold text-slate-700 mb-1.5">
                Hobi &amp; Minat
              </label>
              <div className="relative">
                <input
                  id="input-edit-hobi"
                  type="text"
                  value={hobi}
                  onChange={(e) => setHobi(e.target.value)}
                  placeholder="Contoh: Badminton, Web Dev, Fotografi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Alamat Domisili */}
          <div>
            <label htmlFor="input-edit-domisili" className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Rumah / Domisili <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-edit-domisili"
              rows={2}
              required
              value={alamatRumahDomisili}
              onChange={(e) => setAlamatRumahDomisili(e.target.value)}
              placeholder="Contoh: Jl. Kaliurang KM 5, Pandega Marta No. 12, Sleman"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Premium Google Drive Folder Link (Non-input premium box as requested) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Tautan Google Drive Folder Tugas
              </span>
              {(currentUser.tier || 'free') === 'free' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5">
                  <Lock className="w-3 h-3" />
                  <span>TERKUNCI (FREE TIER)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>TERBUKA ({currentUser.tier?.toUpperCase()})</span>
                </span>
              )}
            </div>

            {(currentUser.tier || 'free') === 'free' ? (
              <div className="flex items-center justify-between gap-4 p-3 bg-white border border-slate-200/60 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">Folder Tugas Terkunci</span>
                </div>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded">
                  Butuh Basic / Pro
                </span>
              </div>
            ) : (
              <a
                href="https://drive.google.com/drive/folders/1oqXx0wzzKkkZajuBuC9xhv-pF6wDPPEX"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 p-3 bg-white border border-emerald-200 hover:border-emerald-300 rounded-xl hover:bg-emerald-50/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Folder className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Buka Folder Google Drive Tugas</span>
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors">
                  <span>Buka Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </a>
            )}

            <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
              {(currentUser.tier || 'free') === 'free' ? (
                <span>
                  <strong className="text-rose-600">Mengapa Terkunci?</strong> Anda berada pada paket Free. Untuk mengakses folder penyimpanan Google Drive khusus tugas ini, silakan tingkatkan akun Anda ke <strong>Paket Basic</strong> atau <strong>Paket Pro</strong> di menu utama.
                </span>
              ) : (
                <span>
                  <strong className="text-emerald-700">Folder Aktif:</strong> Folder tempat rekan Anda dapat mengunggah foto bersama dengan Anda. Gunakan tautan di atas untuk langsung membuka direktori tugas Google Drive.
                </span>
              )}
            </div>
          </div>

          {!isValid && (
            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
              <span>&bull;</span>
              <span>Semua kolom wajib diisi dan tidak boleh kosong agar profil dapat diperbarui.</span>
            </p>
          )}

          {isValid && !hasChanges && (
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl">
              <span>&bull;</span>
              <span>Ubah salah satu data di atas untuk mengaktifkan tombol perbarui.</span>
            </p>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors text-center cursor-pointer"
            >
              Batal
            </button>

            <button
              id="btn-submit-edit-profile"
              type="submit"
              disabled={!isValid || !hasChanges || isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Perbarui Profil Saya</span>
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

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Konfirmasi Perbarui Profil
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menyimpan pembaruan data profil untuk <span className="font-bold text-slate-900">{namaLengkap}</span>? Berikut adalah rincian perubahan data Anda:
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left text-xs space-y-2.5 max-h-56 overflow-y-auto">
                  {changedFields.map((field, idx) => (
                    <div key={idx} className="space-y-1 pb-2 border-b border-slate-200/60 last:border-0 last:pb-0">
                      <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider">{field.label}</span>
                      <div className="grid grid-cols-2 gap-2 text-slate-800 pt-0.5">
                        <div className="bg-rose-50 border border-rose-100/70 rounded-lg p-1.5 min-w-0">
                          <span className="text-[8px] text-rose-500 block font-black uppercase">Sebelumnya</span>
                          <span className="truncate block font-medium text-[11px]">{field.old}</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100/70 rounded-lg p-1.5 min-w-0">
                          <span className="text-[8px] text-emerald-500 block font-black uppercase">Terbaru</span>
                          <span className="truncate block font-bold text-[11px]">{field.new}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    <span>Ya, Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
