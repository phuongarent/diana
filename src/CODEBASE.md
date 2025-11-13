# CODEBASE — `src/`

Tài liệu tóm tắt nhanh cấu trúc mã nguồn trong thư mục `src/` của dự án.

- **Mục đích**: Giúp hiểu nhanh nơi chứa route, component UI, helper và middleware để tiện duyệt và bảo trì.

## Project focus (current)

- **Authentication removed / disabled**: project đang loại bỏ phần xác thực (next-auth) để đơn giản hoá luồng phát triển.
- **Chức năng chính**: Tập trung vào 2 tính năng trên Dashboard:
  1. `createKeyAPI` — tạo API key mới
  2. `listKeyAPI` — liệt kê API keys (dashboard)

Các phần liên quan đến auth (middleware, next-auth routes, session wrapper) nên được bỏ qua hoặc tắt khi duyệt/khởi tạo tính năng này. File `src/middleware.ts` hiện đang export middleware của `next-auth` — nếu bạn muốn hoàn toàn loại bỏ auth, hãy xóa hoặc vô hiệu hoá file đó.

## Cấu trúc thư mục chính

- `app/` — Next.js App Router: pages, layout và API routes.
  - `api/` — API routes (Next.js route handlers)
    - `api-keys/` — quản lý API keys (`route.ts`, `[id]/route.ts`)
    - `auth/` — next-auth route (`[...nextauth]/route.ts`)
    - `github-summarizer/` — xử lý tóm tắt GitHub (`chain.js`, `route.js`)
    - `validate-key/` — validate key endpoint (`route.js`)
  - `components/` — page-level components (ví dụ: `ApiDemo.tsx`, `Sidebar.js`, `SessionProvider.js`, `SignInButton.js`, `ApiKeysTable.js`, v.v.)
  - `lib/` — helpers liên quan app (ví dụ `apiKeyUtils.ts`, `auth.ts`, `githubUtils.ts`, `supabaseClient.js`)
  - `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` — layout và cấu hình giao diện
  - các trang: `dashboards/`, `playground/`, `privacy-policy/`, `terms-of-service/`, `protected/` (một số file là `.js`, một số là `.tsx`)

- `components/` — shared UI components
  - `ui/` — các component UI dùng lại: `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`
    - Những file này có khả năng dùng Shadcn UI / Radix + Tailwind theo cấu trúc dự án.

- `lib/` — các tiện ích chung của dự án
  - `utils.ts` — helper functions dùng khắp nơi

- `middleware.ts` — middleware Next.js (next-auth)
  - File này hiện export middleware mặc định từ `next-auth` và set `matcher` cho các route được bảo vệ (ví dụ `/dashboards`).

## Các file quan trọng và ghi chú

- `src/middleware.ts` — bảo vệ route `/dashboards` bằng next-auth. Ví dụ nội dung:

``` 
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboards"],
};
```

- `src/app/lib/apiKeyUtils.ts` — (utility) xử lý logic liên quan API keys — useful để trace cách keys được tạo/kiểm tra.
- `src/app/api/api-keys/route.ts` & `src/app/api/api-keys/[id]/route.ts` — endpoints CRUD cho API keys.
- `src/app/components/SessionProvider.js` — wrapper session/next-auth cho client pages.
- `src/components/ui/*` — các component UI nhỏ, dùng lại trong nhiều trang.

## Kiểu file & công nghệ

- Next.js App Router (file `app/` với `layout.tsx` / `page.tsx`).
- Kết hợp TypeScript (`.ts`, `.tsx`) và JavaScript (`.js`) trong một số chỗ.
- Sử dụng `next-auth` (middleware + auth routes), Supabase client (file `supabaseClient.js`) và một endpoint tách riêng cho GitHub summarizer.
- Styling dự kiến dùng Tailwind (có `globals.css` và shadcn-style components).

## Cách bắt đầu khi duyệt code

1. Mở `src/app/layout.tsx` và `src/app/page.tsx` để hiểu layout và luồng chính.
2. Kiểm tra `src/app/lib/*` để xem helper/auth logic (ví dụ `auth.ts`, `apiKeyUtils.ts`).
3. Dò các API route trong `src/app/api/` để hiểu các contract server-side.
4. Dò `src/components/ui/` để reuse component patterns.

## Gợi ý chỉnh sửa / mở rộng

- Chuẩn hóa file sang TypeScript nếu cần nhất quán (`.js` → `.ts`/`.tsx`).
- Thêm README nhỏ trong `src/app/api/` nếu API routes có contract phức tạp.

## Fixing duplicate primary key (user_id) in `api_keys`

If you see errors like:
 - "duplicate key value violates unique constraint \"api_keys_pkey\"" (Postgres code `23505`)

It means the current `api_keys` table uses `user_id` as the primary key, so inserting another key for the same user fails. Two options:

A) Migrate the schema to allow multiple keys per user (recommended):

```sql
-- add an `id` primary key and keep user_id as a regular column
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);
-- (optional) add FK to users table
-- ALTER TABLE public.api_keys ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id);
```

B) Or ensure the application inserts unique `user_id` values (one key per user) — not recommended for multi-key use cases.

After schema migration, you can add the `limit` column if desired:

```sql
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS limit integer NULL;
```

## Fixing Supabase / NOAUTH_USER_ID errors

If you see runtime errors like:
 - "supabaseUrl is required" (client cannot be created)
 - "invalid input syntax for type uuid: \"noauth\"" (Postgres expects a UUID)

Do the following locally:

1. Provide Supabase environment variables (recommended: create `.env.local`):

```powershell
@"
SUPABASE_URL=https://your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
NOAUTH_USER_ID=00000000-0000-0000-0000-000000000000
"@ | Out-File -Encoding utf8 .env.local
npm run dev
```

2. Important notes:
 - `SUPABASE_URL` and `SUPABASE_ANON_KEY` come from your Supabase project settings.
 - `NOAUTH_USER_ID` must be a valid UUID that exists in your Supabase `users` table if the API code filters by `user_id`. If you don't have a user to use for development, create a test user in Supabase and put its UUID here.
 - Alternatively, if you prefer not to use a fallback user id, change the API code to avoid filtering by `user_id` when `getSessionUser()` is null (but be careful with data leakage).

3. Quick temporary session-only fix (PowerShell) — sets env vars for current terminal session:

```powershell
$env:SUPABASE_URL="https://your-supabase-url"
$env:SUPABASE_ANON_KEY="your-anon-key"
$env:NOAUTH_USER_ID="00000000-0000-0000-0000-000000000000"
npm run dev
```

4. Security: never commit real keys. Use `.env.local` (gitignored) or your host's secret manager.

---
Tài liệu này do bot tự sinh từ cấu trúc hiện có trong `src/`. Nếu muốn, tôi có thể mở rộng chi tiết từng file (mô tả exports, signature hàm) nếu bạn cho phép tôi đọc nội dung file cụ thể.


