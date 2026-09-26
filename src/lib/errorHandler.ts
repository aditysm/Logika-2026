/**
 * Helper to convert various API, network, and Supabase errors 
 * into clear, user-friendly Indonesian messages with actionable guidance.
 */

export function getIntuitiveErrorMessage(error: unknown, fallbackMessage = 'Terjadi kendala saat memproses permintaan.'): string {
  if (!error) return `${fallbackMessage} Silahkan coba lagi nanti.`;

  let rawMessage = '';
  let status = 0;

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') rawMessage = errObj.message;
    else if (typeof errObj.error === 'string') rawMessage = errObj.error;
    else if (typeof errObj.error_description === 'string') rawMessage = errObj.error_description;
    else if (typeof errObj.statusText === 'string') rawMessage = errObj.statusText;
    else rawMessage = JSON.stringify(error);

    if (typeof errObj.status === 'number') status = errObj.status;
    else if (typeof errObj.statusCode === 'number') status = errObj.statusCode;
    else if (typeof errObj.code === 'number') status = errObj.code;
  }

  const lower = rawMessage.toLowerCase();

  // 1. Rate Limiting (Too Many Requests / 429)
  if (
    status === 429 ||
    lower.includes('429') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit') ||
    lower.includes('ratelimit') ||
    lower.includes('quota') ||
    lower.includes('too_many_requests') ||
    lower.includes('resource exhausted')
  ) {
    return 'Terlalu banyak permintaan ke server (Rate Limit). Mohon tunggu beberapa saat dan coba lagi nanti.';
  }

  // 2. Network / Offline connection issues
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('net::err') ||
    lower.includes('offline') ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('load failed')
  ) {
    return 'Koneksi internet bermasalah atau terputus. Pastikan perangkat terhubung ke internet dan coba lagi nanti.';
  }

  // 3. Timeout / Abort errors
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborterror') ||
    lower.includes('the user aborted a request')
  ) {
    return 'Waktu permintaan habis (Server Timeout). Mohon periksa sinyal internet dan coba lagi nanti.';
  }

  // 4. File payload too large (413)
  if (
    status === 413 ||
    lower.includes('413') ||
    lower.includes('payload too large') ||
    lower.includes('file too large') ||
    lower.includes('entity too large')
  ) {
    return 'Ukuran berkas foto terlalu besar. Silahkan pilih foto dengan resolusi lebih kecil atau kompres terlebih dahulu.';
  }

  // Specific Edge Function / Rollback / Drive validations
  if (lower.includes('sudah diunggah sebelumnya') || lower.includes('is_duplicate')) {
    return 'Foto untuk pasangan mahasiswa ini sudah pernah diunggah sebelumnya.';
  }

  if (lower.includes('belum terkonfigurasi') || (lower.includes('folder google drive') && lower.includes('kosong'))) {
    return 'Tautan Folder Google Drive Anda atau teman belum diisi di profil. Silahkan lengkapi tautan folder Drive di menu Edit Profil terlebih dahulu.';
  }

  // Google Drive 404 or Folder Not Found
  if (
    lower.includes('file not found') ||
    lower.includes('not found') ||
    (lower.includes('404') && (lower.includes('drive') || lower.includes('folder') || lower.includes('file') || lower.includes('subfolder')))
  ) {
    return 'Folder Google Drive tidak ditemukan atau tautan ID folder belum sesuai. Pastikan folder Google Drive di profil Anda dan teman sudah valid dan dapat dibuka.';
  }

  // Google Drive permission / access denied / rollback
  if (
    lower.includes('akses ditolak') ||
    lower.includes('gagal membuat subfolder') ||
    lower.includes('drive id') ||
    lower.includes('google drive') ||
    lower.includes('rollback') ||
    lower.includes('subfolder') ||
    lower.includes('insufficientfilepermissions') ||
    lower.includes('the user does not have sufficient permissions')
  ) {
    return 'Folder Google Drive tidak dapat diakses atau izin edit belum diberikan. Pastikan folder Google Drive Anda dan teman telah disetel ke "Siapa saja yang memiliki tautan dapat mengedit" (Editor).';
  }

  if (lower.includes('tidak ditemukan di database')) {
    return 'Data profil mahasiswa tidak ditemukan di sistem. Silahkan muat ulang halaman atau periksa NIM Anda.';
  }

  if (lower.includes('data tidak lengkap') || lower.includes('wajib diisi')) {
    return 'Informasi yang dikirimkan belum lengkap. Pastikan file foto dan data mahasiswa sudah terpilih.';
  }

  // 5. Server error (500, 502, 503, 504)
  if (
    status >= 500 ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.includes('gateway timeout') ||
    lower.includes('internal server error')
  ) {
    return 'Layanan server sedang sibuk atau dalam pemeliharaan. Foto Anda telah disimpan di perangkat, silahkan coba lagi beberapa saat lagi.';
  }

  // 6. Permission / Unauthorized (401, 403)
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('permission denied') ||
    lower.includes('forbidden') ||
    lower.includes('jwt expired')
  ) {
    return 'Akses tidak diizinkan atau sesi telah berakhir. Silahkan muat ulang halaman lalu coba lagi.';
  }

  // Clean technical jargon if it looks like Postgres / Supabase / Edge Function / SQL / Stack trace error
  if (
    lower.includes('pgrst') ||
    lower.includes('postgres') ||
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('supabase') ||
    lower.includes('edge function') ||
    lower.includes('stack') ||
    lower.includes('syntaxerror') ||
    lower.includes('typeerror') ||
    lower.includes('uncaught') ||
    lower.includes('json') ||
    lower.includes('<html>') ||
    lower.includes('<!doctype')
  ) {
    return 'Terjadi kendala teknis saat memproses ke server. Silahkan coba beberapa saat lagi.';
  }

  // Never return raw technical strings with JSON braces, code snippets, or backend parameters
  const isTechnicalRaw =
    rawMessage.includes('{') ||
    rawMessage.includes('}') ||
    rawMessage.includes('":') ||
    rawMessage.includes('rollback') ||
    rawMessage.includes('Drive ID') ||
    rawMessage.includes('subfolder') ||
    rawMessage.includes('404') ||
    rawMessage.includes('500') ||
    rawMessage.includes('error:');

  // If rawMessage is already an informative user-facing message, return it directly
  if (!isTechnicalRaw && rawMessage.length > 0 && rawMessage.length < 250 && !rawMessage.startsWith('<!DOCTYPE')) {
    const trimmed = rawMessage.trim();
    if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
      return trimmed;
    }
    return `${trimmed}. Silahkan coba lagi nanti.`;
  }

  return `${fallbackMessage} Silahkan coba lagi nanti.`;
}

/**
 * Format document report generation errors into intuitive, user-friendly guidance.
 */
export function getIntuitiveReportErrorMessage(error: unknown): string {
  if (!error) return 'Gagal menyusun dokumen laporan. Silahkan ajukan ulang beberapa saat lagi.';

  let rawMessage = '';
  if (typeof error === 'string') rawMessage = error;
  else if (error instanceof Error) rawMessage = error.message;
  else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    rawMessage = String(errObj.error_message || errObj.message || errObj.error || '');
  }

  const lower = rawMessage.toLowerCase();

  if (lower.includes('quota') || lower.includes('limit') || lower.includes('exceeded')) {
    return 'Batas kuota layanan penyusunan dokumen sedang penuh sementara. Silahkan coba ajukan ulang dalam beberapa menit.';
  }
  if (lower.includes('permission') || lower.includes('access') || lower.includes('denied') || lower.includes('izin')) {
    return 'Izin folder Google Drive tidak mencukupi untuk menyimpan laporan. Pastikan folder Drive disetel ke "Siapa saja yang memiliki link dapat mengedit" (Editor).';
  }
  if (lower.includes('not found') || lower.includes('folder') || lower.includes('tidak ditemukan')) {
    return 'Folder Google Drive untuk menyimpan laporan tidak ditemukan. Silahkan periksa link folder Drive di menu Edit Profil Anda.';
  }
  if (lower.includes('timeout') || lower.includes('exceeded maximum execution time')) {
    return 'Waktu penyusunan dokumen laporan melebihi batas waktu server (Timeout). Silahkan klik tombol Ajukan Ulang untuk memproses kembali.';
  }
  if (lower.includes('corrupt') || lower.includes('download') || lower.includes('image') || lower.includes('foto')) {
    return 'Terdapat berkas foto tugas yang tidak dapat diunduh oleh server saat penyusunan laporan. Silahkan periksa kembali foto atau ajukan ulang.';
  }

  const isTechnical =
    rawMessage.includes('{') ||
    rawMessage.includes('}') ||
    rawMessage.includes('":') ||
    rawMessage.includes('Exception:') ||
    rawMessage.includes('at ') ||
    rawMessage.includes('TypeError') ||
    rawMessage.includes('SyntaxError');

  if (!isTechnical && rawMessage.trim().length > 0 && rawMessage.trim().length < 200) {
    const trimmed = rawMessage.trim();
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  return 'Terjadi kendala saat menyusun dokumen Word. Silahkan klik tombol "Ajukan Ulang Pembuatan Laporan" beberapa saat lagi.';
}
