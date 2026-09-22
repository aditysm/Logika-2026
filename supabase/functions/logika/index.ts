import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// 1. KONTROL CORS & HELPER KONFIGURASI
// ============================================================================
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const getSupabaseClient = () => {
  const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('URL_SUPABASE') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY_SUPABASE') || '';
  
  if (!url || !key) {
    throw new Error("Supabase URL atau Service Role Key belum dikonfigurasi di Secrets.");
  }

  return createClient(url, key, {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-connection-timeout': '5000' },
    },
  });
};

// ============================================================================
// 2. HELPER GOOGLE OAUTH REFRESH TOKEN
// ============================================================================
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

const getGoogleAuthToken = async (): Promise<string> => {
  const now = Date.now();
  // Gunakan cache jika token masih aktif (buffer 3 menit)
  if (cachedAccessToken && now < tokenExpiresAt - 180000) {
    return cachedAccessToken;
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN') || '';

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("OAuth Credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) belum lengkap di Secrets.");
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded' 
    },
    body: new URLSearchParams({
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      refresh_token: refreshToken.trim(),
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google OAuth API Error (${response.status}): ${JSON.stringify(data)}`);
  }

  if (!data.access_token) {
    throw new Error("Access Token tidak ditemukan dalam response Google OAuth.");
  }

  cachedAccessToken = data.access_token as string;
  tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
  return cachedAccessToken;
};

// Default Daftar 10 Kelompok
const DEFAULT_GROUP_MAP: Record<number, string> = {
  1: 'KELOMPOK 1 FIREWALL',
  2: 'KELOMPOK 2 SWITCH',
  3: 'KELOMPOK 3 SERVER',
  4: 'KELOMPOK 4 CLIENT',
  5: 'KELOMPOK 5 NODE',
  6: 'KELOMPOK 6 HOST',
  7: 'KELOMPOK 7 GATEWAY',
  8: 'KELOMPOK 8 PROXY',
  9: 'KELOMPOK 9 ROUTER',
  10: 'KELOMPOK 10 PORT',
};

// ============================================================================
// 3. CLASS PROFILE SERVICE (EDIT / UPDATE PROFIL MAHASISWA)
// ============================================================================
class ProfileService {
  static async updateProfile(payload: Record<string, any>) {
    const { nim, ...updateFields } = payload;

    if (!nim) {
      throw new Error("NIM wajib disertakan untuk memperbarui profil.");
    }

    const supabase = getSupabaseClient();

    // 1. Cek apakah profil dengan NIM tersebut ada
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('nim')
      .eq('nim', String(nim).trim())
      .maybeSingle();

    if (checkError) {
      throw new Error(`Database Fetch Error: ${checkError.message}`);
    }

    if (!existingProfile) {
      throw new Error(`Profil mahasiswa dengan NIM ${nim} tidak ditemukan.`);
    }

    // 2. Bersihkan payload dari field yang tidak valid
    const cleanPayload: Record<string, any> = {};
    const allowedFields = [
      'nama_lengkap',
      'nama_panggilan',
      'email',
      'asal_rumah',
      'alamat_domisili',
      'hobi',
      'no_wa',
      'group_id',
      'drive_folder_id',
      'drive_folder_url'
    ];

    for (const key of allowedFields) {
      if (updateFields[key] !== undefined) {
        cleanPayload[key] = typeof updateFields[key] === 'string' 
          ? updateFields[key].trim() 
          : updateFields[key];
      }
    }

    if (Object.keys(cleanPayload).length === 0) {
      throw new Error("Tidak ada data valid yang dikirim untuk diperbarui.");
    }

    // 3. Update data ke tabel profiles
    const { data, error } = await supabase
      .from('profiles')
      .update(cleanPayload)
      .eq('nim', String(nim).trim())
      .select();

    if (error) {
      throw new Error(`Gagal memperbarui profil: ${error.message}`);
    }

    return {
      success: true,
      message: "Profil berhasil diperbarui!",
      data: data[0]
    };
  }
}

// ============================================================================
// 4. CLASS PHOTO SERVICE (DYNAMIC GROUP FOLDERS + STRICT TRANSACTION ROLLBACK)
// ============================================================================
class PhotoService {

  // Helper Hapus File Tunggal di Google Drive (Dibutuhkan untuk Rollback & Cleanup)
  private static async deleteDriveFile(fileId: string) {
    if (!fileId) return;
    try {
      const token = await getGoogleAuthToken();
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`🧹 Rollback: Berhasil menghapus file Drive ID (${fileId})`);
    } catch (err) {
      console.warn(`⚠️ Rollback Warning: Gagal menghapus file Drive ID (${fileId}):`, err);
    }
  }

  // Helper untuk mencari atau menggunakan subfolder Kelompok yang sudah ada di Google Drive
  private static async getOrCreateKelompokFolder(
    token: string, 
    parentFolderId: string, 
    kelompokName: string
  ): Promise<string> {
    if (!parentFolderId) {
      throw new Error("Folder ID Induk tidak boleh kosong.");
    }
    const cleanFolderName = (kelompokName || 'KELOMPOK UMUM').trim();

    // 1. Ambil daftar semua subfolder yang sudah ada di dalam parent folder
    // Menggunakan supportsAllDrives=true dan includeItemsFromAllDrives=true agar selalu menemukan folder yang ada
    const listQuery = encodeURIComponent(
      `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${listQuery}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const existingFolders: Array<{ id: string; name: string }> = searchData.files || [];

        if (existingFolders.length > 0) {
          const lowerTarget = cleanFolderName.toLowerCase();
          const targetGroupNum = cleanFolderName.match(/\d+/)?.[0];

          // Priority 1: Exact match nama folder (case-insensitive)
          const exactMatch = existingFolders.find(f => f.name.trim().toLowerCase() === lowerTarget);
          if (exactMatch) {
            console.log(`[Drive] Menemukan folder existing (exact match): '${exactMatch.name}' -> ID: ${exactMatch.id}`);
            return exactMatch.id;
          }

          // Priority 2: Cocok nomor kelompok (misal 'Kelompok 1', 'KELOMPOK 01', 'Kelompok 1 - Firewall', dll)
          if (targetGroupNum) {
            const groupNumInt = parseInt(targetGroupNum, 10);
            const numMatch = existingFolders.find(f => {
              const fName = f.name.toLowerCase();
              const fNum = fName.match(/\d+/)?.[0];
              return fNum !== undefined && parseInt(fNum, 10) === groupNumInt;
            });
            if (numMatch) {
              console.log(`[Drive] Menemukan folder existing berdasarkan nomor kelompok (${groupNumInt}): '${numMatch.name}' -> ID: ${numMatch.id}`);
              return numMatch.id;
            }
          }

          // Priority 3: Cocok berdasarkan kata kunci divisi / nama kelompok (misal 'FIREWALL', 'SWITCH', dll)
          const words = cleanFolderName
            .split(/[\s_-]+/)
            .filter(w => w.length > 3 && !['kelompok', 'group'].includes(w.toLowerCase()));
          if (words.length > 0) {
            const keywordMatch = existingFolders.find(f => {
              const fName = f.name.toLowerCase();
              return words.some(w => fName.includes(w.toLowerCase()));
            });
            if (keywordMatch) {
              console.log(`[Drive] Menemukan folder existing berdasarkan kata kunci (${words.join(',')}): '${keywordMatch.name}' -> ID: ${keywordMatch.id}`);
              return keywordMatch.id;
            }
          }
        }
      }
    } catch (searchErr) {
      console.warn("Pencarian subfolder existing di Drive menemukan kendala, melanjutkan ke verifikasi pembuatan:", searchErr);
    }

    // 2. Jika benar-benar belum ada folder yang cocok, baru buat subfolder baru di dalam parent folder
    const createRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: cleanFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        })
      }
    );

    if (createRes.ok) {
      const createData = await createRes.json();
      if (createData.id) {
        console.log(`[Drive] Berhasil membuat subfolder baru '${cleanFolderName}' -> ID: ${createData.id}`);
        return createData.id;
      }
    } else {
      const errText = await createRes.text();
      throw new Error(`Akses Ditolak/Gagal membuat subfolder '${cleanFolderName}' di Drive ID (${parentFolderId}): ${errText}`);
    }

    throw new Error(`Gagal mendapatkan ID Folder Kelompok '${cleanFolderName}' pada Parent (${parentFolderId})`);
  }

  // Direct Upload ke Google Drive API via Access Token
  private static async uploadToDriveDirect(
    token: string, 
    folderId: string, 
    fileName: string, 
    file: File
  ): Promise<{ id: string; webViewLink?: string }> {
    if (!folderId) {
      throw new Error("Target Folder ID tidak valid/kosong.");
    }

    const metadata = { name: fileName, parents: [folderId] };

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'image/jpeg',
          'X-Upload-Content-Length': file.size.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Gagal inisialisasi Drive upload ke Folder (${folderId}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error("Location URL tidak ditemukan dari Google Drive API.");

    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.json();
      throw new Error(`Gagal transfer biner ke Drive Folder (${folderId}): ${JSON.stringify(errBody)}`);
    }

    const driveData = await uploadRes.json();

    if (!driveData || !driveData.id) {
      throw new Error("Respon Google Drive API tidak mengembalikan File ID yang valid.");
    }

    // Set permission publik (Reader untuk siapa saja)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (_e) {
      // Abaikan jika permission otomatis diturunkan dari folder induk
    }

    return {
      id: driveData.id,
      webViewLink: driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view?usp=sharing`
    };
  }

  // Fallback Upload via Supabase Storage ('temp') -> GAS Web App
  private static async uploadToDriveGASFallback(
    folderId: string, 
    fileName: string, 
    file: File
  ): Promise<{ id: string; webViewLink?: string }> {
    console.warn(`⚠️ Direct Upload Gagal. Beralih ke GAS Web App Fallback: ${fileName}`);
    const supabase = getSupabaseClient();
    const gasWebAppUrl = Deno.env.get('GAS_WEB_APP_URL') || "";

    if (!gasWebAppUrl) {
      throw new Error("GAS_WEB_APP_URL belum dikonfigurasi di Secrets.");
    }

    // 1. Upload Sementara ke Bucket Storage 'temp'
    const tempFilePath = `uploads/${Date.now()}_${fileName}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: storageErr } = await supabase.storage
      .from('temp')
      .upload(tempFilePath, fileBuffer, { contentType: file.type || 'image/jpeg' });

    if (storageErr) throw new Error(`Temp Storage Upload Error: ${storageErr.message}`);

    // 2. Ambil Public URL File
    const { data: urlData } = supabase.storage
      .from('temp')
      .getPublicUrl(tempFilePath);

    // 3. Panggil Google Apps Script Web App
    const gasRes = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: urlData.publicUrl,
        file_name: fileName,
        folder_id: folderId
      })
    });

    const gasResult = await gasRes.json();

    // 4. Hapus File Penampung Sementara di Storage
    await supabase.storage.from('temp').remove([tempFilePath]);

    if (!gasResult.success || !gasResult.file_id) {
      throw new Error(`Fallback GAS Web App Error: ${gasResult.error || 'ID File tidak ditemukan'}`);
    }

    return {
      id: gasResult.file_id,
      webViewLink: gasResult.url || `https://drive.google.com/file/d/${gasResult.file_id}/view?usp=sharing`
    };
  }

  // Wrapper Safe Upload (Direct OAuth -> GAS Fallback)
  private static async uploadToDriveSafe(
    folderId: string, 
    fileName: string, 
    file: File
  ): Promise<{ id: string; webViewLink?: string }> {
    try {
      const token = await getGoogleAuthToken();
      return await this.uploadToDriveDirect(token, folderId, fileName, file);
    } catch (primaryErr: any) {
      console.error(`❌ Direct OAuth Upload Gagal: ${primaryErr.message}`);
      return await this.uploadToDriveGASFallback(folderId, fileName, file);
    }
  }

  // Utama: Upload Foto Bersama + Transaksional Strict Rollback
  static async uploadPhoto(formData: FormData) {
    const file = formData.get('file') as File;
    const userANim = (formData.get('user_a_nim') as string || '').trim();
    const userBNim = (formData.get('user_b_nim') as string || '').trim();

    if (!file || !userANim || !userBNim) {
      throw new Error("Data tidak lengkap: file, user_a_nim, dan user_b_nim wajib diisi.");
    }

    const supabase = getSupabaseClient();

    // 1. STRICT CHECK: SELALU Ambil Profile & Folder ID User A dan User B Langsung dari Supabase Database
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('nim, nama_lengkap, group_id, drive_folder_id')
      .in('nim', [userANim, userBNim]);

    if (profileErr) {
      throw new Error(`Gangguan database saat mengambil profil mahasiswa: ${profileErr.message}`);
    }

    if (!profiles || profiles.length === 0) {
      throw new Error(`Profil mahasiswa untuk NIM (${userANim}) dan (${userBNim}) tidak ditemukan di database.`);
    }

    const profA = profiles.find((p: any) => p.nim === userANim);
    const profB = profiles.find((p: any) => p.nim === userBNim);

    if (!profA || !profA.drive_folder_id) {
      throw new Error(`Folder Google Drive untuk Mahasiswa A (${userANim}) belum terkonfigurasi/kosong.`);
    }

    if (!profB || !profB.drive_folder_id) {
      throw new Error(`Folder Google Drive untuk Mahasiswa B (${userBNim}) belum terkonfigurasi/kosong.`);
    }

    const folderIdA = profA.drive_folder_id.trim();
    const folderIdB = profB.drive_folder_id.trim();

    const userANama = profA.nama_lengkap || 'Mahasiswa';
    const userBNama = profB.nama_lengkap || 'Mahasiswa';
    const userAKelompok = DEFAULT_GROUP_MAP[profA.group_id] || `KELOMPOK ${profA.group_id}`;
    const userBKelompok = DEFAULT_GROUP_MAP[profB.group_id] || `KELOMPOK ${profB.group_id}`;

    // Deduplikasi Pair Key
    const sortedNims = [userANim, userBNim].sort();
    const pairKey = `${sortedNims[0]}_${sortedNims[1]}`;

    // Cek apakah relasi foto pasangan ini sudah ada di database
    const { data: existingLog } = await supabase
      .from('photo_logs')
      .select('id, pair_key, user_a_nim, user_b_nim, drive_file_id_a, photo_url_a, drive_file_id_b, photo_url_b, created_at')
      .eq('pair_key', pairKey)
      .maybeSingle();

    if (existingLog) {
      // Pastikan status tracking di photo_tracking juga tetap tersinkronisasi terchecklist
      const now = new Date().toISOString();
      await supabase.from('photo_tracking').upsert([
        { user_id: userANim, target_nim: userBNim, is_checked: true, updated_at: now },
        { user_id: userBNim, target_nim: userANim, is_checked: true, updated_at: now },
      ], { onConflict: 'user_id,target_nim' });

      // Jika kolom user_a_nim atau user_b_nim di record lama masih kosong, lengkapi datanya
      if (!existingLog.user_a_nim || !existingLog.user_b_nim) {
        await supabase
          .from('photo_logs')
          .update({
            user_a_nim: userANim,
            user_b_nim: userBNim,
          })
          .eq('id', existingLog.id);
      }

      return {
        success: true,
        is_duplicate: true,
        message: "Foto untuk pasangan mahasiswa ini sudah diunggah sebelumnya!",
        data: {
          ...existingLog,
          user_a_nim: existingLog.user_a_nim || userANim,
          user_b_nim: existingLog.user_b_nim || userBNim,
        }
      };
    }

    // Ambil Token Google OAuth
    const token = await getGoogleAuthToken();

    // Variable penampung ID File Drive untuk pelacakan Rollback jika terjadi eror di pertengahan jalan
    let uploadedDriveFileAId: string | null = null;
    let uploadedDriveFileBId: string | null = null;

    try {
      // 2. Tentukan / Buat Subfolder Kelompok:
      // - Drive User A diisi subfolder Kelompok Mahasiswa B
      // - Drive User B diisi subfolder Kelompok Mahasiswa A
      const targetFolderForA = await this.getOrCreateKelompokFolder(token, folderIdA, userBKelompok);
      const targetFolderForB = await this.getOrCreateKelompokFolder(token, folderIdB, userAKelompok);

      // Format Nama Berkas Foto: {NomorKelompok}_{NamaLengkap}_{NIM}.jpg
      const ext = file.name.substring(file.name.lastIndexOf('.')) || '.jpg';
      const cleanNameA = userANama.replace(/[/\\?%*:|"<>]/g, '').trim();
      const cleanNameB = userBNama.replace(/[/\\?%*:|"<>]/g, '').trim();
      const numGroupB = userBKelompok.match(/\d+/)?.[0] || '1';
      const numGroupA = userAKelompok.match(/\d+/)?.[0] || '1';

      const fileNameForA = (formData.get('file_name_a') as string) || `${numGroupB}_${cleanNameB}_${userBNim}${ext}`;
      const fileNameForB = (formData.get('file_name_b') as string) || `${numGroupA}_${cleanNameA}_${userANim}${ext}`;

      // 3. UPLOAD TAHAP 1: Upload ke Drive User A
      console.log(`📤 Mengunggah foto ke Drive User A (${userANim})...`);
      const driveFileA = await this.uploadToDriveSafe(targetFolderForA, fileNameForA, file);
      uploadedDriveFileAId = driveFileA.id;

      // 4. UPLOAD TAHAP 2: Upload ke Drive User B
      console.log(`📤 Mengunggah foto ke Drive User B (${userBNim})...`);
      let driveFileB;
      try {
        driveFileB = await this.uploadToDriveSafe(targetFolderForB, fileNameForB, file);
        uploadedDriveFileBId = driveFileB.id;
      } catch (userBErr: any) {
        throw new Error(`Gagal mengunggah foto ke Drive User B (${userBNim}): ${userBErr.message}`);
      }

      const photoUrlA = driveFileA.webViewLink || `https://drive.google.com/file/d/${driveFileA.id}/view?usp=sharing`;
      const photoUrlB = driveFileB.webViewLink || `https://drive.google.com/file/d/${driveFileB.id}/view?usp=sharing`;

      // 5. WRITING TAHAP 3: Simpan Record ke Tabel photo_logs
      const payload = {
        pair_key: pairKey,
        user_a_nim: userANim,
        user_b_nim: userBNim,
        drive_file_id_a: driveFileA.id,
        photo_url_a: photoUrlA,
        drive_file_id_b: driveFileB.id,
        photo_url_b: photoUrlB,
        created_at: new Date().toISOString()
      };

      const { data: savedLog, error: logError } = await supabase
        .from('photo_logs')
        .upsert(payload, { onConflict: 'pair_key' })
        .select()
        .single();

      if (logError) {
        throw new Error(`Gagal menyimpan log foto ke database: ${logError.message}`);
      }

      // 6. WRITING TAHAP 4: Update Checklist ke Tabel photo_tracking
      const now = new Date().toISOString();
      const { error: trackErr } = await supabase.from('photo_tracking').upsert([
        { user_id: userANim, target_nim: userBNim, is_checked: true, updated_at: now },
        { user_id: userBNim, target_nim: userANim, is_checked: true, updated_at: now },
      ], { onConflict: 'user_id,target_nim' });

      if (trackErr) {
        throw new Error(`Gagal memperbarui status tracking foto: ${trackErr.message}`);
      }

      return {
        success: true,
        message: "Foto berhasil diunggah ke folder Drive User A dan User B!",
        data: savedLog || payload
      };

    } catch (err: any) {
      console.error(`💥 TERJADI KEGAGALAN UPLOAD. MEMULAI ATOL / ROLLBACK:`, err.message);

      // --- ROLLBACK STEP 1: Hapus File yang terlanjur terunggah di Google Drive ---
      const rollbackPromises = [];
      if (uploadedDriveFileAId) {
        rollbackPromises.push(this.deleteDriveFile(uploadedDriveFileAId));
      }
      if (uploadedDriveFileBId) {
        rollbackPromises.push(this.deleteDriveFile(uploadedDriveFileBId));
      }
      await Promise.all(rollbackPromises);

      // --- ROLLBACK STEP 2: Hapus data dari photo_logs & photo_tracking jika terlanjur ditulis ---
      try {
        await supabase.from('photo_logs').delete().eq('pair_key', pairKey);
        await supabase.from('photo_tracking').delete().match({ user_id: userANim, target_nim: userBNim });
        await supabase.from('photo_tracking').delete().match({ user_id: userBNim, target_nim: userANim });
      } catch (_cleanErr) {
        // Abaikan jika data memang belum sempat ditulis
      }

      // Lempar kembali error untuk ditangkap oleh Handler HTTP Response
      throw new Error(`Proses upload dibatalkan & di-rollback penuh: ${err.message}`);
    }
  }

  // Hapus Foto Manual via Endpoint API
  static async deletePhoto(logId: number, driveFileIdA?: string, driveFileIdB?: string) {
    const deletePromises = [];

    if (driveFileIdA) deletePromises.push(this.deleteDriveFile(driveFileIdA));
    if (driveFileIdB) deletePromises.push(this.deleteDriveFile(driveFileIdB));

    await Promise.all(deletePromises);

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('photo_logs').delete().eq('id', logId);
    if (error) throw error;

    return { success: true };
  }
}

// ============================================================================
// 5. CLASS PAYMENT SERVICE
// ============================================================================
class PaymentService {
  // Parser nominal dan tier yang akurat
  static parseTierDetails(amountInput: any, tierInput?: string) {
    const rawNominal = String(amountInput || '').trim();
    const numAmount = parseInt(rawNominal.replace(/\D/g, ''), 10) || 0;
    const tierRaw = (tierInput || '').toLowerCase().trim();

    // Kasus 1: Pro Full (Rp7.000)
    if (tierRaw.includes('pro full') || (tierRaw.includes('pro') && !tierRaw.includes('upgrade')) || numAmount === 7000 || rawNominal.includes('7.000')) {
      return {
        amount: 7000,
        amountFormatted: 'Rp7.000',
        tierCode: 'pro',
        tierName: 'Pro Full (Rp7.000)',
        deskripsi: 'Akses Upload Drive + Sinkronisasi + Generate Laporan PDF'
      };
    }

    // Kasus 2: Upgrade Pro (Rp5.000)
    if (tierRaw.includes('upgrade') || numAmount === 5000 || rawNominal.includes('5.000')) {
      return {
        amount: 5000,
        amountFormatted: 'Rp5.000',
        tierCode: 'pro',
        tierName: 'Upgrade Pro (Rp5.000)',
        deskripsi: 'Unlock Fitur Generate Laporan PDF'
      };
    }

    // Kasus 3: Basic (Rp2.000)
    return {
      amount: 2000,
      amountFormatted: 'Rp2.000',
      tierCode: 'basic',
      tierName: 'Basic (Rp2.000)',
      deskripsi: 'Akses Unggah Foto & Sinkronisasi Google Drive'
    };
  }

  // Buat URL pesan WhatsApp konfirmasi
  static generateWhatsAppUrl(noWa: string, nama: string, nim: string, tierInfo: ReturnType<typeof PaymentService.parseTierDetails>) {
    let cleanPhone = (noWa || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

    const studentNama = nama || "Kak";
    const studentNim = nim ? ` (${nim})` : "";

    const pesan = `Halo kak ${studentNama}${studentNim},\n\nPembayaran Anda sebesar *${tierInfo.amountFormatted}* untuk *${tierInfo.tierName}* telah BERHASIL diverifikasi! 🎉\n\nStatus Akun: *${tierInfo.tierCode.toUpperCase()} AKTIF*\nFitur: ${tierInfo.deskripsi}\n\nSilakan buka website dan tekan tombol *Sinkronkan Status* di menu Upgrade / Profile untuk langsung menikmati fiturnya.\n\nTerima kasih!`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`;
  }

  // Proses Konfirmasi Pembayaran
  static async handlePaymentApproval(payload: {
    nim: string;
    amount?: number | string;
    tier?: string;
    package_name?: string;
    tier_name?: string;
    no_wa?: string;
    nama?: string;
  }) {
    const { nim, amount, tier, package_name, tier_name } = payload;
    if (!nim) throw new Error("NIM wajib disertakan.");

    const supabase = getSupabaseClient();
    const tierInfo = this.parseTierDetails(amount, package_name || tier_name || tier);

    // 1. Ambil data profil mahasiswa jika nama / wa belum lengkap
    const { data: profile } = await supabase
      .from('profiles')
      .select('nim, nama_lengkap, no_wa, tier')
      .eq('nim', nim.trim())
      .maybeSingle();

    const studentNama = payload.nama || profile?.nama_lengkap || 'Mahasiswa';
    const studentWa = payload.no_wa || profile?.no_wa || '';

    // 2. Update status tier di tabel profiles
    const { error: updateProfileErr } = await supabase
      .from('profiles')
      .update({ tier: tierInfo.tierCode })
      .eq('nim', nim.trim());

    if (updateProfileErr) throw new Error(`Gagal update tier profil: ${updateProfileErr.message}`);

    // 3. Catat / Update di tabel payment_logs
    await supabase.from('payment_logs').insert([{
      nim: nim.trim(),
      amount: tierInfo.amount,
      target_tier: tierInfo.tierCode,
      status: 'approved',
      approved_at: new Date().toISOString()
    }]);

    // 4. Generate Link WhatsApp
    const waLink = this.generateWhatsAppUrl(studentWa, studentNama, nim.trim(), tierInfo);

    return {
      success: true,
      message: `Pembayaran ${tierInfo.amountFormatted} (${tierInfo.tierName}) untuk ${studentNama} berhasil diverifikasi!`,
      tier: tierInfo.tierCode,
      amount: tierInfo.amount,
      amount_formatted: tierInfo.amountFormatted,
      whatsapp_link: waLink,
      wa_url: waLink
    };
  }
}

// ============================================================================
// 6. CLASS REPORT SERVICE (PENYUSUN & ANTREAN LAPORAN PDF)
// ============================================================================
class ReportService {
  /**
   * Mengajukan pembuatan laporan baru ke dalam antrean report_requests
   */
  static async requestReport(nim: string) {
    const cleanNim = (nim || '').trim();
    if (!cleanNim) {
      return { success: false, error: "NIM wajib disertakan untuk pembuatan laporan.", status: 400 };
    }

    const supabase = getSupabaseClient();

    // 1. Cek profil mahasiswa
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('nim, nama_lengkap, drive_folder_id, tier')
      .eq('nim', cleanNim)
      .maybeSingle();

    if (profileErr || !profile) {
      return { success: false, error: "Data mahasiswa tidak ditemukan di profil.", status: 404 };
    }

    // 2. Cek apakah ada antrean yang masih berjalan
    const { data: activeRequest } = await supabase
      .from('report_requests')
      .select('id, nim, status, created_at, pdf_url')
      .eq('nim', cleanNim)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (activeRequest) {
      return {
        success: true,
        message: `Permintaan laporan Anda sedang berjalan dengan status: ${activeRequest.status.toUpperCase()}`,
        is_already_in_queue: true,
        data: activeRequest,
      };
    }

    // 3. Masukkan ke antrean baru
    const insertPayload = {
      nim: cleanNim,
      nama_lengkap: profile.nama_lengkap || 'Mahasiswa',
      drive_folder_id: profile.drive_folder_id || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newRecord, error: insertErr } = await supabase
      .from('report_requests')
      .insert([insertPayload])
      .select()
      .single();

    if (insertErr) {
      console.error("Gagal menambahkan antrean report_requests:", insertErr);
      return { success: false, error: "Gagal menyimpan antrean laporan: " + insertErr.message, status: 500 };
    }

    return {
      success: true,
      message: "Permintaan laporan PDF berhasil dimasukkan ke antrean!",
      data: newRecord,
    };
  }

  /**
   * Mengambil status antrean laporan terbaru untuk NIM terkait
   */
  static async getReportStatus(nim: string) {
    const cleanNim = (nim || '').trim();
    if (!cleanNim) {
      return { success: false, error: "NIM wajib disertakan.", status: 400 };
    }

    const supabase = getSupabaseClient();

    const { data: latest, error } = await supabase
      .from('report_requests')
      .select('id, nim, nama_lengkap, drive_folder_id, status, pdf_url, error_message, created_at, updated_at')
      .eq('nim', cleanNim)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: "Gagal membaca antrean laporan: " + error.message, status: 500 };
    }

    if (!latest) {
      return {
        success: true,
        data: {
          nim: cleanNim,
          status: 'none',
          message: 'Belum ada permintaan pembuatan laporan.',
        },
      };
    }

    return {
      success: true,
      data: latest,
    };
  }
}

// ============================================================================
// 7. HTTP SERVER ENTRYPOINT & MULTI-ROUTE HANDLER
// ============================================================================
Deno.serve(async (req) => {
  // Handle CORS Preflight OPTIONS Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // ------------------------------------------------------------------------
    // ROUTE 1: UPDATE PROFIL (PUT /update-profile ATAU POST /update-profile)
    // ------------------------------------------------------------------------
    if ((req.method === 'PUT' || req.method === 'POST') && pathname.endsWith('/update-profile')) {
      const body = await req.json();
      const result = await ProfileService.updateProfile(body);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE 2: UPLOAD FOTO PASANGAN (POST /upload-photo atau Root POST multipart)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && (pathname.endsWith('/upload-photo') || pathname === '/' || pathname === '')) {
      const contentType = req.headers.get('content-type') || '';
      
      // Jika request berupa FormData / multipart (Upload Foto)
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const result = await PhotoService.uploadPhoto(formData);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Jika request berupa JSON
      if (contentType.includes('application/json')) {
        const body = await req.json();
        
        // Kasus: Webhook Verifikasi Pembayaran dari Telegram / Google Forms
        if (body.action === 'approve_payment' || body.payment_status === 'approved' || (body.nim && (body.amount || body.tier || body.package_name || body.tier_name))) {
          const paymentResult = await PaymentService.handlePaymentApproval(body);
          return new Response(JSON.stringify(paymentResult), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Alternatif Update Profil
        if (body.nim && (body.nama_lengkap || body.nama_panggilan || body.asal_rumah || body.hobi || body.no_wa)) {
          const result = await ProfileService.updateProfile(body);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // ROUTE 3: APPROVE PAYMENT (POST /approve-payment)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && pathname.endsWith('/approve-payment')) {
      const body = await req.json();
      const result = await PaymentService.handlePaymentApproval(body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE 4: DELETE FOTO LOG (DELETE /delete-photo)
    // ------------------------------------------------------------------------
    if (req.method === 'DELETE' && (pathname.endsWith('/delete-photo') || pathname === '/' || pathname === '')) {
      const { log_id, drive_file_id_a, drive_file_id_b } = await req.json();
      
      if (!log_id) {
        throw new Error("log_id wajib diisi untuk menghapus log.");
      }

      const result = await PhotoService.deletePhoto(log_id, drive_file_id_a, drive_file_id_b);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE 5: REQUEST REPORT (POST /request-report)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && (pathname.endsWith('/request-report') || pathname.endsWith('/request-report/'))) {
      const body = await req.json().catch(() => ({}));
      const { nim } = body;
      const result = await ReportService.requestReport(nim);
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE 6: REPORT STATUS (GET /report-status)
    // ------------------------------------------------------------------------
    if (req.method === 'GET' && (pathname.endsWith('/report-status') || pathname.endsWith('/report-status/'))) {
      const nim = url.searchParams.get('nim') || '';
      const result = await ReportService.getReportStatus(nim);
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE 7: HEALTH CHECK (GET /health)
    // ------------------------------------------------------------------------
    if (pathname.endsWith('/health') || pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'logika-edge-function' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Method '${req.method}' atau Endpoint '${pathname}' tidak diizinkan.` }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
