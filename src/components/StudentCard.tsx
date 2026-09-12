import { Camera, CheckCircle2, ChevronRight, Heart, Mail, MapPin, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Mahasiswa } from '../types';
import { formatWhatsAppUrl, formatPhoneDisplay } from '../lib/supabase';
import { WhatsAppIcon } from './WhatsAppIcon';

interface StudentCardProps {
  key?: string;
  student: Mahasiswa;
  onSelect: (student: Mahasiswa) => void;
  currentUser?: Mahasiswa | null;
  isPhotoTaken?: boolean;
  onOpenUploadModal?: (student: Mahasiswa) => void;
}

export function StudentCard({
  student,
  onSelect,
  currentUser,
  isPhotoTaken,
  onOpenUploadModal,
}: StudentCardProps) {
  const waUrl = formatWhatsAppUrl(student.noWa, student.namaPanggilan || student.namaLengkap);

  const isSelf = currentUser && student.nim.replace(/[\/\s]/g, '').toLowerCase() === currentUser.nim.replace(/[\/\s]/g, '').toLowerCase();

  // Generate a distinct soft avatar color based on student kelompok
  const groupColors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-orange-100 text-orange-700 border-orange-200',
  ];
  const kelompokKey = student.kelompok || 'Umum';
  let hash = 0;
  for (let i = 0; i < kelompokKey.length; i++) {
    hash = kelompokKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const avatarStyle = groupColors[Math.abs(hash) % groupColors.length];

  const initials = student.namaLengkap
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      id={`student-card-${student.id}`}
      onClick={() => onSelect(student)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(student);
        }
      }}
      tabIndex={0}
      role="button"
      className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Top section: Kelompok badge on left & Status/Upload button on right */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md truncate max-w-[200px]">
            {student.kelompok}
          </span>

          {/* Status badge or Upload button beside kelompok */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {currentUser && isSelf ? (
              <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Profil Anda
              </span>
            ) : currentUser && isPhotoTaken ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sudah Foto</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpenUploadModal?.(student)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-2.5 py-1 rounded-full shadow-2xs transition-all cursor-pointer"
                title={`Upload foto bersama ${student.namaLengkap}`}
              >
                <Camera className="w-3 h-3" />
                <span>Upload Foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Info: Avatar aligned with top of Name */}
        <div className="flex items-start gap-3 mb-2.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border ${avatarStyle} transition-transform group-hover:scale-105 shrink-0 mt-0.5`}
          >
            {initials || <User className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 break-words leading-snug">
              {student.namaLengkap}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-600">
              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                Sapaan: <strong className="text-slate-900 ml-1">{student.namaPanggilan}</strong>
              </span>
              <span className="font-mono text-[11px] text-slate-400">NIM: {student.nim}</span>
            </div>
          </div>
        </div>

        {/* Info Highlights */}
        <div className="space-y-1.5 text-xs text-slate-600 mt-2.5 pt-2 border-t border-slate-100/80">
          {/* Asal Rumah */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={student.asalRumah}>
              {student.asalRumah}
            </span>
          </div>

          {/* Hobi */}
          {student.hobi && student.hobi !== '-' && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Heart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate" title={student.hobi}>
                {student.hobi}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {waUrl ? (
            <a
              id={`link-wa-card-${student.id}`}
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              title={`Chat WhatsApp ${formatPhoneDisplay(student.noWa)}`}
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
          ) : null}

          {student.email && student.email !== '-' ? (
            <a
              id={`link-email-card-${student.id}`}
              href={`mailto:${student.email}`}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={`Kirim email ke ${student.email}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          ) : null}
        </div>

        <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
          <span>Detail Lengkap</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </div>
      </div>
    </motion.div>
  );
}
