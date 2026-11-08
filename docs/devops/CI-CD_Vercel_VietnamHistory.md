# CI/CD: tự deploy lên Vercel và Cloudflare của Đạt

Cập nhật 2026-11-04. Người deploy chính: Đạt (Vercel `youngsterdumb`, Cloudflare `suviet.workers.dev`). Không còn dùng tài khoản Vercel của Trung.

## Tóm tắt

| Phần | Nơi chạy | URL |
| --- | --- | --- |
| Frontend | Vercel project `vietnam-history` | https://vietnam-history-eight.vercel.app |
| API production | Cloudflare Worker `sv-class-api` + D1 `sv-class-prod` | https://sv-class-api.suviet.workers.dev |
| API staging | Cloudflare Worker `sv-class-api-staging` + D1 `sv-class-staging` | https://sv-class-api-staging.suviet.workers.dev |

- **Đã xong:** cả hai đang chạy (deploy bằng tay từ máy Đạt).
- **Đã ghi vào repo** (không phải bí mật):
  - `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID` trong `.github/workflows/ci-cd.yml`.
  - `account_id` và `database_id` trong `backend/wrangler.toml`.
- **Để CI tự deploy mỗi lần push:** repo cần 2 secret, `VERCEL_TOKEN` và `CLOUDFLARE_API_TOKEN`.
- **Còn thiếu:** chỉ admin của repo mới thêm được secret, mà Đạt hiện mới có quyền push. Khi thiếu token, job deploy tự bỏ qua kèm thông báo, CI vẫn xanh.

## Deploy bằng tay (dùng được ngay)

Ở thư mục gốc repo, máy đã đăng nhập `vercel` và `wrangler`:

```bash
npm run deploy
```

Lệnh này lần lượt:

1. Chạy check và unit test.
2. Áp migration D1 production và deploy Worker.
3. Chạy smoke test trên API thật (mở một phiên thử, 70 máy gửi cùng lúc, kiểm tra giới hạn, 304, CSV, rồi xoá phiên).
4. Deploy frontend lên Vercel production.

Chỉ một phần: `npm run deploy:backend`, `npm run smoke`, `npm run deploy:frontend`.

Đăng nhập lại khi cần: `npx vercel login`, `cd backend && npx wrangler@3 login`.

## Bật CI tự deploy (làm một lần)

### Bước 1: Có quyền admin repo

Repo `trungtran17822/VietNam_history` thuộc tài khoản của Trung. Chọn một trong hai cách:

- Trung vào **Settings → Collaborators** và đổi vai trò của `YoungsterDumb` thành **Admin**.
- Hoặc Trung chuyển quyền sở hữu repo: **Settings → General → Transfer ownership**, sang `YoungsterDumb`.

### Bước 2: Tạo Vercel token

1. Vào [vercel.com/account/tokens](https://vercel.com/account/tokens) và bấm **Create Token**.
2. Đặt tên `github-actions-vietnam-history`, Scope: **youngsterdumb's projects**.
3. Copy token ngay, vì Vercel chỉ hiện một lần.

### Bước 3: Tạo Cloudflare API token

1. Vào [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) và bấm **Create Token**.
2. Chọn template **Edit Cloudflare Workers**.
3. Thêm quyền **Account · D1 · Edit**.
4. Account Resources: chọn tài khoản `Davidnguyen31082003@gmail.com's Account`.
5. Tạo token rồi copy.

### Bước 4: Thêm 2 secret vào GitHub

Chạy ở thư mục gốc repo. Mỗi lệnh sẽ hỏi giá trị; dán token vào, không gõ token lên dòng lệnh:

```bash
gh secret set VERCEL_TOKEN
gh secret set CLOUDFLARE_API_TOKEN
gh secret list
```

Token chỉ dán vào GitHub Secrets, không gửi qua chat và không commit.

### Bước 5: Kiểm tra

Push hoặc merge vào `Staging`, rồi xem tab **Actions**:

- Job `test` xanh.
- `deploy-frontend` in URL bản Preview.
- `deploy-backend` chạy migration, deploy `sv-class-api-staging` và smoke test đạt.

Merge vào `main` sẽ cập nhật production: https://vietnam-history-eight.vercel.app và `sv-class-api`.

## Lưu ý

- Mọi bản deploy, kể cả Preview của `Staging`, đều gọi API production vì `frontend/src/lib/class-session.ts` chỉ có một `DEPLOYED_API_BASE` (có thể ghi đè lúc build bằng biến `VITE_API_BASE`).
- Bản Preview bị Vercel Authentication chặn với người ngoài; trang production thì công khai.
- **Đổi domain trang web:** thêm domain mới vào `ALLOWED_ORIGINS` (env production) trong `backend/wrangler.toml` rồi deploy lại backend.
- **Rollback:**
  - Frontend: Vercel → Deployments → bản trước → **Instant Rollback**.
  - Backend: `cd backend && npx wrangler@3 rollback --env production`.

## Xử lý sự cố

| Thông báo | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Skipping … VERCEL_TOKEN / CLOUDFLARE_API_TOKEN is not set` | Chưa thêm secret | Bước 4 |
| `vercel pull` 401/403 | Token sai, hết hạn hoặc khác scope | Tạo lại token ở Bước 2 |
| wrangler lỗi 10000 / authentication | Token thiếu quyền Workers hoặc D1 | Tạo lại token ở Bước 3 |
| Smoke test `FAIL` | API deploy lỗi hoặc CORS sai origin | Đọc dòng `FAIL`; chạy `npm run smoke` ở máy |
