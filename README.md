<div align="center">

# Rendezvous Hub

**Web back office untuk layanan nasabah, kepatuhan, dan komunitas Rendezvous Online Trading**

Tiket & chat CS · Super Admin · Kepatuhan · Komunitas · Akun Nasabah

[![ci](https://github.com/dayat123123/rendezvous_hub/actions/workflows/ci.yml/badge.svg)](https://github.com/dayat123123/rendezvous_hub/actions/workflows/ci.yml)
![Image](https://img.shields.io/badge/image-olt--social%2Fcs--console%3A0.1.1-0f766e)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-24.22-5FA04E?logo=nodedotjs&logoColor=white)
![Lisensi](https://img.shields.io/badge/lisensi-proprietary-lightgrey)

</div>

---

Rendezvous Hub adalah aplikasi web internal untuk staf OLT: CS, Super Admin, Kepatuhan, dan tim Komunitas. React 19 + TypeScript dibangun Vite menjadi SPA statis dan disajikan nginx non-root (image `olt-social/cs-console`). Backend-nya server sosial di monorepo [`chat_service_supabase`](https://github.com/dayat123123/chat_service_supabase): Supabase (`cs_api`, GoTrue, Realtime, Storage), Edge Function `cs-admin`, dan layanan Go seperti `nasabah-gateway`.

> **Batas tanggung jawab.** Hub tidak mengambil data bisnis dari OLT. Profil, order, transaksi dana, dan perangkat nasabah tetap milik aplikasi nasabah. Panel info nasabah hanya menampilkan identitas dari data tiket, riwayat tiket (`customer_history`), dan catatan internal (`notes`). Data Online ID di menu Akun Nasabah datang dari csAdmin lewat `nasabah-gateway`.

## Daftar isi

- [Fitur per menu](#fitur-per-menu)
- [Prasyarat](#prasyarat)
- [Menjalankan untuk pengembangan](#menjalankan-untuk-pengembangan)
- [Skrip npm](#skrip-npm)
- [Konfigurasi runtime](#konfigurasi-runtime)
- [Deploy](#deploy)
- [Struktur folder](#struktur-folder)
- [Tampilan](#tampilan)
- [Keamanan](#keamanan)
- [Tes dan CI](#tes-dan-ci)
- [Dokumentasi terkait](#dokumentasi-terkait)

## Fitur per menu

Menu di bar atas mengikuti peran dan izin akun. Satu akun bisa punya beberapa peran; menunya digabung. Panduan pemakaian untuk staf ada di [docs/panduan-hub.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/panduan-hub.md) monorepo.

| Menu                               | Peran                                           | Isi                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Layanan Nasabah**                | CS, Super Admin (pantau)                        | Status kerja dan batas tiket aktif, ambil tiket, chat realtime dengan lampiran (gambar 5 MB, PDF 10 MB), catatan internal, label, quick reply, tunggu nasabah, lepas, transfer, selesaikan, rating, Kinerja saya                                                                                                                                                                                                                                             |
| **Dashboard** dan **Laporan**      | Super Admin                                     | Pantauan tiket dan CS secara langsung, laporan per periode, per CS, dan per nasabah, ekspor                                                                                                                                                                                                                                                                                                                                                                  |
| **Akun Nasabah**                   | CS dengan izin                                  | Online ID dari csAdmin: cari, lihat, rekening tertaut, ajukan buat/ubah/hapus, reset password/PIN, Approval, Pembukaan rekening                                                                                                                                                                                                                                                                                                                              |
| **Komunitas**                      | Sesuai 5 izin Komunitas                         | Akun resmi, postingan dan pengumuman resmi (empat mata, jadwal, sematan), kampanye notifikasi, moderasi (laporan, konten/gambar ditahan, manipulasi, banding), room saham, Analitik                                                                                                                                                                                                                                                                          |
| **Fitur & Kampanye** (`/features`) | Super Admin, peran Fitur & Kampanye (`product`) | Fitur sosial, kill switch, versi minimum aplikasi, serta kampanye banner dan popup untuk nasabah, dalam dua tab yang bisa ditautkan (`?tab=features`, `banners`): Fitur & versi (kill switch fitur sosial, sakelar fitur, versi minimum), Banner & popup (strip atas atau popup tengah layar; tautan https:// atau deep link dengan skema yang diatur Super Admin di Pengaturan). Alamat lama `/app` dialihkan ke sini (`/app?tab=connection` ke Pengaturan) |
| **Pengaturan**                     | Super Admin                                     | Dikelompokkan: **Layanan CS** (akun staf, topik, quick reply, label tiket, jam layanan dan libur, pesan otomatis, penugasan dan alert), **Komunitas** (aturan persetujuan), **Integrasi** (integrasi API Nasabah, integrasi aplikasi, API notifikasi, push notification; integrasi aplikasi berisi data koneksi hanya-baca untuk tim aplikasi OLT dan skema deep link aplikasi untuk banner/popup), **Sistem** (backup, alert)                               |
| **Kesehatan sistem** (`/system`)   | Super Admin                                     | Status layanan, alert terbuka, restart otomatis. Disembunyikan dari navigasi; dibuka lewat alamat                                                                                                                                                                                                                                                                                                                                                            |
| **Kepatuhan**                      | Kepatuhan                                       | Ringkasan, Kasus (pengaduan dan penipuan, tinjauan, perpanjangan tenggat, transkrip bersidik SHA-256), Jejak Audit, Kebijakan, Kata terlarang (import Excel), Kebijakan konten, Dokumen hukum, Bukti                                                                                                                                                                                                                                                         |

Pengaturan penting (kredensial integrasi, kunci Firebase, saluran alert, backup, sakelar fitur dan versi minimum, aturan persetujuan, penugasan, skema deep link) tampil terkunci: tekan **Ubah** untuk mengedit, **Batal** (atau Esc) mengembalikan nilai tersimpan, dan **Simpan** selalu meminta konfirmasi yang menjelaskan dampaknya. Kill switch fitur sosial, Backup penuh sekarang, dan Uji restore sekarang juga meminta konfirmasi.

Super Admin bekerja dalam **mode pantau**: membaca semua tiket, menambah catatan, mengubah prioritas, dan membagikan atau memindahkan tiket ke CS, tetapi tidak membalas nasabah dan tidak pernah menerima tiket.

## Prasyarat

- **Node.js 24** (≥ 24.12; CI dan image memakai `24.22.2`). `.npmrc` mengaktifkan `engine-strict`, jadi `npm ci` menolak Node yang lebih lama.
- Untuk menjalankan terhadap backend: checkout monorepo [`chat_service_supabase`](https://github.com/dayat123123/chat_service_supabase) **bersebelahan** dengan repo ini, serta Docker dengan Compose v2.24+.

```text
<folder kerja>/
  chat_service_supabase/   backend: stack Docker, migrasi, layanan Go
  rendezvous_community/    library Flutter untuk aplikasi nasabah
  rendezvous_hub/          repo ini
```

```bash
git clone https://github.com/dayat123123/chat_service_supabase.git
git clone https://github.com/dayat123123/rendezvous_community.git
git clone https://github.com/dayat123123/rendezvous_hub.git
```

Lokasi monorepo bisa diubah dengan env `MONOREPO_DIR` (relatif ke repo ini atau absolut; bawaan `../chat_service_supabase`). Lokasi ini dipakai untuk membaca `docker/secrets/anon_key` (server dev Vite, E2E), `docker/secrets/service_role_key` (`gen:types`), dan `scripts/cs-demo/runtime/staff.json` (akun staf E2E). Dari sisi monorepo, lokasi Hub diatur dengan `HUB=<path>` (make) atau `HUB_DIR` di `docker/.env`.

## Menjalankan untuk pengembangan

Siapkan stack dev di monorepo (Windows: `.\make.ps1 <target>`):

```bash
cd ../chat_service_supabase
make gen-secrets
make up DUMMY_OLT=1          # Windows: .\make.ps1 up -DummyOlt
make cs-staff                # akun Nadia, Bima, Laras (CS), Sinta dan Adi (Super Admin), Kirana (Kepatuhan)
make cs-console-react        # image dibangun dari repo ini -> http://localhost:8085
```

Email dan password akun dev ada di `chat_service_supabase/scripts/cs-demo/runtime/staff.json` (tidak di-commit).

Hot reload dengan server dev Vite:

```bash
npm ci
npm run dev                  # http://localhost:5175, API http://localhost:8000
```

`/env.js` di server dev dibuat dari `$MONOREPO_DIR/docker/secrets/anon_key`, atau dari env `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `APP_ENV` bila diisi.

## Skrip npm

| Skrip                              | Isi                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `dev` / `build` / `preview`        | Vite (dev 5175, preview 4175)                                                                      |
| `typecheck`                        | `tsc` aplikasi + konfigurasi/E2E                                                                   |
| `lint` / `format` / `format:check` | ESLint (type-checked, 0 warning) dan Prettier                                                      |
| `lint:tokens`                      | Tolak warna hex, kelas warna Tailwind mentah, radius > 12px, bayangan non-token                    |
| `test`                             | Vitest + Testing Library + MSW                                                                     |
| `e2e`                              | Playwright terhadap stack dev (`E2E_BASE_URL`, bawaan `http://localhost:8085`)                     |
| `size:check`                       | Bundle awal ≤ 300 KB gzip                                                                          |
| `license:check`                    | Tolak GPL/AGPL/LGPL/SSPL; dependensi runtime wajib permisif                                        |
| `gen:types`                        | Tipe `cs_api` dari pg-meta stack dev ke `src/types/database.ts`                                    |
| `ci`                               | `lint`, `lint:tokens`, `format:check`, `typecheck`, `test`, `build`, `size:check`, `license:check` |

Sebelum push, jalankan `npm ci && npm run ci`. Dari monorepo, `make test-cs-console` (Windows: `.\make.ps1 test-cs-console`) menjalankan hal yang sama di container `node:24.22.2-alpine`, jadi tidak perlu Node di host.

E2E (stack dev harus sudah jalan):

```bash
E2E_BASE_URL=http://localhost:8085 npx playwright test
# atau dari monorepo: make e2e-cs-console
```

Backend membatasi 5 tiket per jam per nasabah. Setiap skenario memakai nasabah OLT dummy yang berbeda, jadi suite penuh bisa dijalankan 5 kali per jam. Di lokal Playwright memakai Chrome yang terpasang (`channel: 'chrome'`); di CI memakai Chromium bawaan Playwright.

## Konfigurasi runtime

Image yang sama dipakai di semua lingkungan dan tidak ada konfigurasi yang ditanam saat build. Saat container start, `docker/15-cs-console.envsh` menulis `/env.js` dan CSP dari env container:

| Env                                               | Isi                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`                                    | Origin API untuk browser staf, tanpa path (dev `http://localhost:8000`, produksi `https://<CS_CONSOLE_DOMAIN>`)    |
| `PUBLIC_API_URL`                                  | Origin API publik aplikasi nasabah (`SUPABASE_PUBLIC_URL`), dipakai untuk URL gambar banner dan panduan integrasi  |
| `SUPABASE_ANON_KEY` atau `SUPABASE_ANON_KEY_FILE` | Hanya anon key (compose memakai secret `/run/secrets/anon_key`). Kunci service role tidak pernah sampai ke browser |
| `APP_ENV`                                         | `production` (bawaan), `staging`, `development`. Halaman `/dev/ui` dan `/__perf` hanya aktif di `development`      |

Nilainya diisi oleh compose monorepo (`docker/compose.yml` dan overlay `compose.dev.yml`, `compose.cs.yml`, `stack.cluster.yml`), bukan oleh repo ini.

## Deploy

Hub tidak di-deploy sendiri. Monorepo membangun image `olt-social/cs-console:0.1.1` dari checkout repo ini (`build.context: ${HUB_DIR:-../../rendezvous_hub}`, relatif terhadap `docker/`):

```bash
make cs-console-react                        # dev; Windows: .\make.ps1 cs-console-react
make up PROFILE=single CS=1                  # produksi satu server; Windows: .\make.ps1 up -Profile single -Cs
```

- Produksi butuh `CS_CONSOLE_DOMAIN` dan `VPN_SOURCE_RANGES` di `docker/.env` monorepo.
- Server produksi menyimpan clone repo ini di `$HOME/rendezvous_hub`, dipasang oleh `scripts/server-install.sh` monorepo dengan deploy key tersendiri. Bila lokasinya berbeda, isi `HUB_DIR` di `docker/.env`.
- Update: `git pull` di repo ini, lalu `make up PROFILE=single CS=1` di monorepo (image dibangun ulang).
- Profil cluster memakai `${REGISTRY}/olt-social/cs-console:0.1.1` dari registry.
- Bila tag image dinaikkan, ubah juga tag di `docker/compose.yml` dan `docker/stack.cluster.yml` monorepo.

Detail: [docs/PRODUCTION.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/PRODUCTION.md) dan [docs/server-install.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/server-install.md).

## Struktur folder

```text
src/
  app/          shell, router (TanStack Router), workspace (dimuat setelah login), top bar
  features/     satu folder per fitur (api.ts, hooks.ts, types.ts, components/):
                auth, account, presence, tickets, conversation, customer, labels, command, supervisor,
                reports, settings, notifications, push, nasabah, community, analytics, compliance,
                content-policy, legal, integration-keys, app-integration, client-config, features-campaigns,
                system, perf, dev-ui
  lib/          supabase, realtime (manajer channel), tabs (BroadcastChannel), time (WIB), preferences, errors
  components/   ui/ (shadcn/Radix), badges, states (empty/error/skeleton/error boundary)
  i18n/         id (bawaan) dan en; teks fitur besar dimuat lazy bersama rutenya
  styles/       token desain (globals.css)
e2e/            Playwright; support/ membaca akun staf dan anon key dari monorepo
docker/         nginx.conf, template server + header keamanan, skrip env runtime
scripts/        token-lint, bundle-size, license-check, precompress, gen-types
public/         favicon, robots.txt, theme.js, suara notifikasi
```

## Tampilan

- Semua warna, tipografi, radius, bayangan, gerak, dan kepadatan adalah token di `src/styles/globals.css` (terang dan gelap). Palet bawaan Tailwind dimatikan, jadi kelas seperti `bg-blue-500` tidak menghasilkan CSS dan `npm run lint:tokens` menolaknya.
- Tema bawaan terang. Pilihan Terang/Gelap/Ikuti sistem ada di menu avatar dan diterapkan sebelum render pertama oleh `public/theme.js`.
- Halaman acuan `/dev/ui` (hanya `APP_ENV=development`, tanpa login) menampilkan token dan komponen utama dalam kedua tema.

## Keamanan

- **Hanya jaringan kantor atau VPN.** Login cukup email + password, jadi di produksi Hub dan API agen berada di satu domain (`CS_CONSOLE_DOMAIN`) yang hanya menerima IP di `VPN_SOURCE_RANGES` (Traefik ipAllowList di monorepo). Jangan membuka Hub ke internet.
- Header nginx: CSP ketat (`script-src 'self'`, `connect-src` hanya origin API), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP, `X-Robots-Tag: noindex`. Hanya GET/HEAD.
- Container non-root (uid 101), filesystem read-only + tmpfs, `cap_drop: ALL`, batas CPU/memori/pids, healthcheck `/healthz`.
- Password sementara wajib diganti saat login pertama dan setelah reset. Sesi GoTrue per tab (`sessionStorage` dengan kunci per tab), jadi beberapa akun bisa dibuka di tab berbeda pada satu browser. Logout otomatis setelah tidak aktif; cache, draf, dan data yang ditampilkan dibersihkan saat keluar.
- Isi pesan selalu plain text; lampiran lewat signed URL 120 detik, dan gambar diberi watermark nama CS.
- Log produksi tanpa token dan tanpa isi pesan. Zod berjalan `jitless`, jadi tidak ada `eval`.

## Tes dan CI

- **Unit** (Vitest + Testing Library + MSW): logika tiket, quick reply, aturan data rahasia, cache pesan, parser realtime, CSV, rentang laporan, jam layanan, serta komponen utama untuk CS, Super Admin, Kepatuhan, dan Komunitas.
- **E2E** (`e2e/`, Playwright terhadap stack dev): login, rebutan klaim dua CS, chat + lampiran + tanda dibaca, lepas/transfer/selesai, non-pemilik hanya-baca, putus-sambung tanpa duplikat, multi-tab, mode pantau Super Admin, alur Kepatuhan, kontras WCAG AA (axe) di kedua tema, tata letak 1366×768 sampai 2560×1440, tangkapan layar (`e2e-artifacts/screens`), dan uji kinerja 1000 tiket + 5000 pesan.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

| Job       | Isi                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| `verify`  | Node 24.22.2, `npm ci`, `npm run ci`                                                                               |
| `image`   | Build image nginx, Trivy image (OS + library) dan Trivy fs (dependensi, rahasia, konfigurasi)                      |
| `secrets` | gitleaks atas seluruh riwayat git (`.gitleaks.toml`)                                                               |
| `e2e`     | Manual (`workflow_dispatch`, input `e2e`): checkout monorepo dengan secret `MONOREPO_TOKEN`, stack dev, Playwright |

## Dokumentasi terkait

Dokumen desain dan keputusan tetap di monorepo `chat_service_supabase`:

- [docs/panduan-hub.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/panduan-hub.md): panduan staf
- [docs/cs-chat/README.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/cs-chat/README.md): chat customer care (tiket, claim, rating)
- [docs/cs-chat/kepatuhan.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/cs-chat/kepatuhan.md): menu Kepatuhan
- [docs/nasabah/README.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/nasabah/README.md): menu Akun Nasabah
- [docs/content-safety.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/content-safety.md): kebijakan konten
- [docs/PROMPT-CS-CONSOLE-REACT.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/PROMPT-CS-CONSOLE-REACT.md) dan [docs/cs-ui-audit.md](https://github.com/dayat123123/chat_service_supabase/blob/main/docs/cs-ui-audit.md): rencana dan audit tampilan

Riwayat git repo ini berasal dari `apps/cs-console-react` di monorepo, dipisah dengan `git subtree split` pada 5 Nov 2026.

## Catatan

- React Compiler tidak dipakai, jadi aturan lint `react-hooks/incompatible-library` dimatikan.
- Lisensi: semua dependensi runtime permisif. `lightningcss` (MPL-2.0) hanya alat build Tailwind dan tidak ikut ke bundle. Font Inter memakai OFL-1.1.
