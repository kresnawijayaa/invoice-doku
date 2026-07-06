# Invoice DOKU

Invoice Management + Payment Gateway DOKU untuk kebutuhan freelance/client.

## Tahap Saat Ini

Fondasi project sudah disiapkan:

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Prisma schema untuk user, client, invoice, invoice item, payment, email log, dan app setting
- Migration SQL awal
- Seed admin user
- Struktur route admin dan public invoice
- Placeholder service email dan DOKU

## Struktur Utama

```txt
prisma/
  schema.prisma
  seed.ts
  migrations/20260608000000_init/migration.sql
src/
  app/
    (auth)/login
    (admin)/dashboard
    (admin)/clients
    (admin)/invoices
    (admin)/settings
    invoice/[token]
    api/webhooks/doku
  lib/
  services/
```

## Setup Lokal

1. Install dependency:

```bash
npm install
```

2. Salin env:

```bash
cp .env.example .env
```

3. Jalankan PostgreSQL lokal:

```bash
docker compose up -d
```

4. Generate Prisma Client:

```bash
npm run prisma:generate
```

Jika schema Prisma baru ditarik dari git saat dev server sedang berjalan, stop `npm run dev`, jalankan `npm run prisma:generate`, lalu start ulang dev server.

5. Jalankan migration:

```bash
npm run prisma:migrate
```

6. Buat admin awal:

```bash
npm run db:seed
```

7. Jalankan Next.js:

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Environment Penting

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_doku?schema=public
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
AUTH_SECRET=replace-with-random-32-byte-secret

DOKU_CLIENT_ID=
DOKU_SECRET_KEY=
DOKU_ENV=sandbox
DOKU_CALLBACK_URL=http://localhost:3000/api/webhooks/doku
DOKU_SUCCESS_REDIRECT_URL=http://localhost:3000/invoice/{token}/success
DOKU_FAILED_REDIRECT_URL=http://localhost:3000/invoice/{token}/failed
```

`DOKU_SECRET_KEY` hanya boleh dipakai di server/backend.

## Email Invoice

Fitur `Send Invoice` tersedia di halaman detail invoice admin. Tombol ini akan:

- mengirim email ke email client,
- menyimpan record ke `email_logs`,
- mengubah status invoice menjadi `SENT` jika berhasil,
- mengisi `sent_at`.

Gunakan Resend:

```env
EMAIL_PROVIDER=resend
EMAIL_FROM="Invoice DOKU <invoice@domain.com>"
EMAIL_SEND_PAYMENT_RECEIPT=false
RESEND_API_KEY=...
```

Atau SMTP:

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM="Invoice DOKU <invoice@domain.com>"
EMAIL_SEND_PAYMENT_RECEIPT=false
SMTP_HOST=smtp.domain.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_SECURE=false
```

Rekomendasi agar client tidak menerima email ganda:

- Biarkan sistem ini mengirim email invoice/tagihan awal.
- Untuk email status pembayaran, pilih salah satu:
  - gunakan email dari DOKU, biarkan `EMAIL_SEND_PAYMENT_RECEIPT=false`;
  - atau nonaktifkan email pelanggan di DOKU Checkout Notification, lalu set `EMAIL_SEND_PAYMENT_RECEIPT=true`.

## DOKU Checkout

Halaman public invoice memiliki tombol `Bayar Sekarang`. Saat client membuka `/invoice/[token]/pay`, backend akan:

- memakai payment pending yang sudah ada jika tersedia,
- membuat request DOKU Checkout jika belum ada,
- menyimpan record ke `payments`,
- redirect client ke `payment.url` dari DOKU.

Konfigurasi minimal:

```env
DOKU_CLIENT_ID=...
DOKU_SECRET_KEY=...
DOKU_ENV=sandbox
DOKU_CALLBACK_URL=https://your-public-url/api/webhooks/doku
DOKU_SUCCESS_REDIRECT_URL=http://localhost:3000/invoice/{token}/success
DOKU_FAILED_REDIRECT_URL=http://localhost:3000/invoice/{token}/failed
```

Untuk test callback/webhook dari DOKU, `DOKU_CALLBACK_URL` tidak bisa memakai `localhost`. Gunakan ngrok, Cloudflare Tunnel, Vercel preview URL, atau VPS.

## DOKU Webhook

Endpoint callback tersedia di:

```txt
POST /api/webhooks/doku
```

Webhook akan:

- memvalidasi signature DOKU dari raw body dan headers,
- membaca `order.invoice_number`,
- membaca `transaction.status`,
- update `payments`,
- update invoice menjadi `PAID` saat status DOKU `SUCCESS`,
- menyimpan raw callback untuk audit/debug.

Status DOKU yang dipetakan:

- `SUCCESS` -> payment `PAID`, invoice `PAID`
- `EXPIRED` -> payment `EXPIRED`, invoice `OVERDUE`
- `FAILED` / `TIMEOUT` -> payment `FAILED`, invoice kembali `UNPAID`
- status lain -> payment `PENDING`

## Deploy VPS Docker + Caddy

Deployment production disiapkan untuk Docker Compose dengan Caddy sebagai reverse proxy HTTPS otomatis untuk domain:

```txt
invoice.kresnawijaya.web.id
```

File terkait:

- `Dockerfile`
- `docker-compose.build.yml` (build/push image dari local ke GHCR)
- `docker-compose.prod.yml`
- `../caddy/Caddyfile` (reverse proxy Caddy existing)
- `.env.production.example`
- `docker-entrypoint.sh`

### Persiapan DNS

Arahkan DNS `A record`:

```txt
invoice.kresnawijaya.web.id -> IP_VPS
```

Pastikan port VPS terbuka:

- `80/tcp`
- `443/tcp`
- `443/udp`

### Build & Push Image dari Local

Login ke GHCR dari local:

```bash
docker login ghcr.io
```

Pastikan `.env.production` atau env shell berisi image target:

```env
APP_IMAGE=ghcr.io/kresnawijayaa/invoice-doku:latest
```

Build dan push image dari local:

```bash
docker compose --env-file .env.production -f docker-compose.build.yml build
docker compose --env-file .env.production -f docker-compose.build.yml push
```

Atau dari Windows PowerShell:

```powershell
.\scripts\build-push-ghcr.ps1
```

Dengan format parameter yang sama seperti project lain:

```powershell
.\scripts\build-push-ghcr.ps1 -Registry ghcr.io -Namespace kresnawijayaa -Tag latest
```

Untuk tag versi tertentu:

```bash
APP_IMAGE=ghcr.io/kresnawijayaa/invoice-doku:2026-07-06 docker compose -f docker-compose.build.yml build
APP_IMAGE=ghcr.io/kresnawijayaa/invoice-doku:2026-07-06 docker compose -f docker-compose.build.yml push
```

Atau:

```powershell
.\scripts\build-push-ghcr.ps1 -Registry ghcr.io -Namespace kresnawijayaa -Tag 2026-07-06
```

### First Deploy

Di VPS:

```bash
git clone https://github.com/USER/REPO.git invoice-doku
cd invoice-doku
cp .env.production.example .env.production
nano .env.production
docker login ghcr.io
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Atau jalankan script di VPS:

```bash
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

App container otomatis menjalankan:

```bash
npx prisma migrate deploy
npx prisma generate
npm run start
```

Untuk membuat admin awal setelah container hidup:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:seed
```

### Production Env

Minimal isi `.env.production`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-with-strong-db-password
POSTGRES_DB=invoice_doku

APP_IMAGE=ghcr.io/kresnawijayaa/invoice-doku:latest
NEXT_PUBLIC_APP_URL=https://invoice.domain.com
AUTH_SECRET=replace-with-random-secret-minimum-32-characters

DOKU_ENV=production
DOKU_CALLBACK_URL=https://invoice.domain.com/api/webhooks/doku
DOKU_SUCCESS_REDIRECT_URL=https://invoice.domain.com/invoice/{token}/success
DOKU_FAILED_REDIRECT_URL=https://invoice.domain.com/invoice/{token}/failed
```

Untuk domain project ini:

```env
NEXT_PUBLIC_APP_URL=https://invoice.kresnawijaya.web.id
DOKU_CALLBACK_URL=https://invoice.kresnawijaya.web.id/api/webhooks/doku
DOKU_SUCCESS_REDIRECT_URL=https://invoice.kresnawijaya.web.id/invoice/{token}/success
DOKU_FAILED_REDIRECT_URL=https://invoice.kresnawijaya.web.id/invoice/{token}/failed
```

### Update Deploy

Setelah push perubahan ke GitHub:

Di local, build dan push image baru:

```bash
docker compose --env-file .env.production -f docker-compose.build.yml build
docker compose --env-file .env.production -f docker-compose.build.yml push
```

Di VPS, pull dan restart tanpa build:

```bash
cd invoice-doku
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml pull app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Atau:

```bash
cd invoice-doku
git pull
./scripts/deploy-vps.sh
```

### Logs

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
docker compose -f ../caddy/docker-compose.yml logs -f caddy
```

### Backup Database

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U postgres invoice_doku > backup.sql
```

## Rencana Tahap Berikutnya

1. Deploy ke VPS/domain publik.
2. Test webhook DOKU end-to-end.
3. Implement PDF invoice.
