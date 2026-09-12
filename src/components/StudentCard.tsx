import { ChevronRight, Heart, Mail, MapPin, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Mahasiswa } from '../types';
import { formatWhatsAppUrl } from '../lib/supabase';
import { WhatsAppIcon } from './WhatsAppIcon';

interface StudentCardProps {
  key?: string;
  student: Mahasiswa;
  onSelect: (student: Mahasiswa) => void;
}

export function StudentCard({ student, onSelect }: StudentCardProps) {
  const waUrl = formatWhatsAppUrl(student.noWa, student.namaPanggilan || student.namaLengkap);

  // Generate a consistent soft avatar color based on student name
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
  ];
  const charCode = (student.namaLengkap || 'M').charCodeAt(0);
  const avatarStyle = colors[charCode % colors.length];

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
      className="group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {/* Top section: Kelompok badge & Initials */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border ${avatarStyle} transition-transform group-hover:scale-105`}
            >
              {initials || <User className="w-5 h-5" />}
            </div>
            <div>
              <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full mb-0.5">
                {student.kelompok}
              </span>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {student.namaLengkap}
              </h3>
            </div>
          </div>
        </div>

        {/* Info Highlights */}
        <div className="space-y-1.5 text-xs text-slate-600 mt-2">
          {/* Nama Panggilan & NIM */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
              Sapaan: <span className="font-semibold text-slate-900 ml-1">{student.namaPanggilan}</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">NIM: {student.nim}</span>
          </div>

          {/* Asal Rumah */}
          <div className="flex items-center gap-1.5 text-slate-600 pt-1">
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
              title={`Chat WhatsApp ${student.noWa}`}
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
          ) : null}

          {student.email && student.email !== '-' ? (
            <a
              id={`link-email-card-${student.id}`}
              href={`mailto:${student.email}`}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={`Kirim email ke ${student.email}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          ) : null}
        </div>

        <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          <span>Detail Lengkap</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </div>
      </div>
    </motion.div>
  );
}
