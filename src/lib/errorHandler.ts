/**
 * Helper to convert various API, network, and Supabase errors 
 * into clear, user-friendly Indonesian messages with actionable guidance.
 */

export function getIntuitiveErrorMessage(error: unknown, fallbackMessage = 'Terjadi kendala saat memproses permintaan.'): string {
  if (!error) return `${fallbackMessage} Silakan coba lagi nanti.`;

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
    return 'Ukuran berkas foto terlalu besar. Silakan pilih foto dengan resolusi lebih kecil atau kompres terlebih dahulu.';
  }

  // Specific Edge Function / Rollback / Drive validations
  if (
    lower.includes('rollback') ||
    lower.includes('belum terkonfigurasi') ||
    lower.includes('subfolder') ||
    lower.includes('tidak ditemukan di database') ||
    lower.includes('sudah diunggah sebelumnya')
  ) {
    return rawMessage;
  }

  // 5. Server error (500, 502, 503, 504)
  if (
    status >= 500 ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.includes('gateway timeout')
  ) {
    return 'Layanan server sedang sibuk atau dalam pemeliharaan. Silakan tunggu sebentar dan coba lagi nanti.';
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
    return 'Akses tidak diizinkan atau sesi telah berakhir. Silakan muat ulang atau login kembali, lalu coba lagi.';
  }

  // Clean technical jargon if it looks like Postgres / Supabase / Edge Function / SQL error
  if (
    lower.includes('pgrst') ||
    lower.includes('postgres') ||
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('supabase') ||
    lower.includes('edge function')
  ) {
    return 'Terjadi kendala saat menghubungkan ke server penyimpanan. Silakan periksa koneksi Anda dan coba lagi nanti.';
  }

  // If rawMessage is already an informative user-facing message, return it directly
  if (rawMessage.length > 0 && rawMessage.length < 300 && !rawMessage.startsWith('{') && !rawMessage.startsWith('<!DOCTYPE')) {
    const trimmed = rawMessage.trim();
    if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
      return trimmed;
    }
    return `${trimmed}. Silakan coba lagi nanti.`;
  }

  return `${fallbackMessage} Silakan coba lagi nanti.`;
}
