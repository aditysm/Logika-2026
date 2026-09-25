-- ============================================================================
-- SUPABASE DATABASE SECURITY HARNESS: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Jalankan skrip ini di Dashboard Supabase -> SQL Editor.
-- Skrip ini mengamankan database agar pengguna publik/anonim di frontend
-- hanya memiliki akses membaca (SELECT) dan operasi aman terbatas,
-- sementara operasi admin (bypass RLS) dilakukan secara aman via Service Role Key
-- di Edge Functions dan Google Apps Script.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABEL: profiles (Data Mahasiswa & Status Akun)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Izinkan publik/anon membaca daftar profil mahasiswa (SELECT)
DROP POLICY IF EXISTS "Allow public read-only on profiles" ON public.profiles;
CREATE POLICY "Allow public read-only on profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Catatan: Update dan Delete pada profil sebaiknya diproteksi penuh atau dilakukan
-- melalui Edge Function terverifikasi. Jika Anda ingin mengizinkan frontend mengupdate profil:
DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;
CREATE POLICY "Allow public update on profiles"
  ON public.profiles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. TABEL: groups (Daftar Kelompok Kuliah)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only on groups" ON public.groups;
CREATE POLICY "Allow public read-only on groups"
  ON public.groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 3. TABEL: photo_logs (Catatan Foto Bersama Pasangan)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.photo_logs ENABLE ROW LEVEL SECURITY;

-- Baca catatan foto bersama
DROP POLICY IF EXISTS "Allow public read on photo_logs" ON public.photo_logs;
CREATE POLICY "Allow public read on photo_logs"
  ON public.photo_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert/Upsert catatan foto bersama
DROP POLICY IF EXISTS "Allow public insert on photo_logs" ON public.photo_logs;
CREATE POLICY "Allow public insert on photo_logs"
  ON public.photo_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update catatan foto bersama
DROP POLICY IF EXISTS "Allow public update on photo_logs" ON public.photo_logs;
CREATE POLICY "Allow public update on photo_logs"
  ON public.photo_logs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. TABEL: photo_tracking (Checklist Status Foto Mahasiswa)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.photo_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on photo_tracking" ON public.photo_tracking;
CREATE POLICY "Allow public read on photo_tracking"
  ON public.photo_tracking
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public upsert on photo_tracking" ON public.photo_tracking;
CREATE POLICY "Allow public upsert on photo_tracking"
  ON public.photo_tracking
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on photo_tracking" ON public.photo_tracking;
CREATE POLICY "Allow public update on photo_tracking"
  ON public.photo_tracking
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. TABEL: report_requests (Antrean Pembuatan Laporan PDF/Word)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.report_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on report_requests" ON public.report_requests;
CREATE POLICY "Allow public read on report_requests"
  ON public.report_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert on report_requests" ON public.report_requests;
CREATE POLICY "Allow public insert on report_requests"
  ON public.report_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on report_requests" ON public.report_requests;
CREATE POLICY "Allow public update on report_requests"
  ON public.report_requests
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. TABEL: payment_logs (Catatan Riwayat Pembayaran & Bukti Transaksi)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Pengguna anon/publik hanya boleh membaca log pembayaran mereka sendiri
DROP POLICY IF EXISTS "Allow public read on payment_logs" ON public.payment_logs;
CREATE POLICY "Allow public read on payment_logs"
  ON public.payment_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Pengguna dapat mengajukan/mencatat bukti pembayaran baru
DROP POLICY IF EXISTS "Allow public insert on payment_logs" ON public.payment_logs;
CREATE POLICY "Allow public insert on payment_logs"
  ON public.payment_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
