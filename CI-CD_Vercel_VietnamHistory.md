# Config CI/CD cho project

Nov 1, 2026 · @Đây dích

## Tóm tắt

Trung cần thêm **3 secrets** vào repo GitHub `trungtran17822/VietNam_history` để pipeline tự deploy lên Vercel của Trung. Mất khoảng 10 phút, chỉ làm **một lần**.

- **Đã xong:** workflow `.github/workflows/ci-cd.yml` và `vercel.json` đã nằm trên nhánh `Staging`. Job kiểm tra (check) đang chạy tốt.
- **Còn thiếu:** job deploy đang dừng với lỗi `Missing repo secret VERCEL_TOKEN`, vì repo chưa có secrets.
- **Vì sao phải là Trung:** chỉ admin của repo mới thêm được secrets, và tài khoản Vercel là của Trung.

Cần chuẩn bị: quyền admin repo GitHub, tài khoản Vercel, Node.js (để chạy `npx`

## Pipeline hoạt động thế nào

&#91;embedded content: luồng CI/CD · 1 bước kiểm tra, 3 nhánh\]

Mỗi lần push, GitHub Actions chạy `scripts/check.sh`. Chỉ khi check đạt, code trên `Staging` mới được deploy bản Preview và code trên `main` mới lên Production. Sau khi cài đặt xong, Đạt chỉ cần push code; Trung không phải làm gì thêm.

## Bước 1: Liên kết project Vercel và lấy 2 ID

Mục tiêu của bước này là lấy `orgId` và `projectId` của project Vercel.

1. Mở terminal ở thư mục gốc repo và cập nhật code:

```bash
cd VietNam_history
git checkout Staging && git pull
```

2. Đăng nhập Vercel CLI. Trình duyệt sẽ mở ra để xác nhận:

```bash
npx vercel@latest login
```

3. Liên kết repo với một project Vercel:

```bash
npx vercel@latest link
```

Trả lời các câu hỏi của CLI:

- **Set up and link?** → `Y`
- **Which scope?** → chọn team hoặc tài khoản Vercel của Trung
- **Link to existing project?** → `N` để tạo mới (hoặc `Y` nếu đã có sẵn project)
- **Project name** → ví dụ `vietnam-history`
- **Connect Git repository?** (nếu được hỏi) → `N`. Pipeline deploy qua GitHub Actions; nối Git sẽ gây deploy hai lần.
- Các câu về build settings → giữ mặc định, vì `vercel.json` trong repo đã cấu hình sẵn.

4. Xem 2 ID:

```bash
cat .vercel/project.json
```

Kết quả có dạng `{"projectId":"prj_...","orgId":"team_..."}`. Giữ cửa sổ này mở để copy ở Bước 3. Thư mục `.vercel/` đã có trong `.gitignore` nên không bị commit.

Không muốn dùng CLI? Tạo project trên vercel.com rồi lấy Project ID ở **Project → Settings → General**, Team ID ở **Team Settings → General**. Với tài khoản cá nhân, ID nằm ở **Account Settings → General**.

## Bước 2: Tạo Vercel token

Token cho phép GitHub Actions deploy thay mặt Trung.

1. Vào [vercel.com/account/tokens](https://vercel.com/account/tokens).
2. Bấm **Create Token** và điền:
   - **Token Name:** `github-actions-vietnam-history`
   - **Scope:** chọn **đúng team** đã chọn ở Bước 1. Sai team thì deploy báo lỗi 403.
   - **Expiration:** tùy chọn. Hết hạn thì phải tạo token mới và cập nhật lại secret.
3. Bấm **Create** và **copy token ngay**. Vercel chỉ hiện token một lần.

Token là thông tin mật: chỉ dán vào GitHub Secrets, không gửi qua chat hoặc commit vào code.

## Bước 3: Thêm 3 secrets vào GitHub

Tên secret phải gõ **chính xác**, kể cả chữ hoa, vì workflow đọc đúng tên này.

| Tên secret | Giá trị | Lấy từ |
| --- | --- | --- |
| `VERCEL_TOKEN` | Token vừa tạo | Bước 2 |
| `VERCEL_ORG_ID` | Chuỗi `team_...` | Trường `orgId` ở Bước 1 |
| `VERCEL_PROJECT_ID` | Chuỗi `prj_...` | Trường `projectId` ở Bước 1 |

**Cách 1: trên giao diện GitHub**

1. Mở [github.com/trungtran17822/VietNam\_history](https://github.com/trungtran17822/VietNam_history) → **Settings**.
2. Menu trái: **Secrets and variables → Actions**.
3. Tab **Secrets** → bấm **New repository secret**.
4. Điền **Name** và **Secret** theo bảng trên, bấm **Add secret**.
5. Lặp lại cho đủ 3 secrets.

**Cách 2: bằng GitHub CLI** (chạy ở thư mục gốc repo, sau Bước 1)

```bash
gh secret set VERCEL_TOKEN          # dán token khi được hỏi
gh secret set VERCEL_ORG_ID     --body "$(node -p "require('./.vercel/project.json').orgId")"
gh secret set VERCEL_PROJECT_ID --body "$(node -p "require('./.vercel/project.json').projectId")"
gh secret list                      # kiểm tra đủ 3 tên
```

Sau khi thêm, GitHub chỉ hiện tên secret, không hiện giá trị. Nhập sai thì bấm **Update** để ghi đè.

## Bước 4: Chạy lại workflow và kiểm tra

Chạy lại lần deploy đã lỗi trên `Staging`, không cần commit mới.

**Trên GitHub:** tab **Actions** → mở lần chạy mới nhất của `Staging` (dấu X đỏ) → **Re-run jobs → Re-run failed jobs**.

**Hoặc bằng CLI:**

```bash
id=$(gh run list --branch Staging --limit 1 --json databaseId --jq '.[0].databaseId')
gh run rerun "$id" --failed
gh run watch "$id"
```

Deploy thành công khi:

- [ ] Job `check` và job `deploy` đều có dấu tích xanh.
- [ ] Log của bước `vercel deploy` in ra một URL dạng `https://<project>-<mã>-<team>.vercel.app`.
- [ ] Trong dashboard Vercel, project có một deployment mới loại **Preview**.

Deploy Production lần đầu xảy ra khi có code được merge hoặc push vào `main`. Sau đó trang chính thức có dạng `https://<project>.vercel.app`, xem ở **Project → Domains**.

## Xử lý sự cố

Xem bước bị lỗi trong tab Actions, hoặc chạy `gh run view --log-failed`, rồi đối chiếu bảng dưới.

| Thông báo lỗi | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Missing repo secret VERCEL_...` | Chưa thêm secret đó, hoặc gõ sai tên | Kiểm tra tên ở Bước 3 |
| `vercel pull` báo 401 / 403 | Token sai, hết hạn, hoặc tạo ở team khác | Tạo lại token đúng team, cập nhật `VERCEL_TOKEN` |
| `Project not found` | `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID` không khớp nhau | Copy lại cả hai từ cùng một file `.vercel/project.json` |
| Job `check` đỏ | Code có lỗi cú pháp JS, JSON hỏng, hoặc thiếu file | Chạy `bash scripts/check.sh` ở máy; dòng `FAIL` chỉ đúng file |
| Deploy hai lần cho mỗi push | Project Vercel đang nối Git | Project → Settings → Git → **Disconnect** |

Trang deploy xong nhưng lỗi: vào Vercel → Deployments, chọn bản trước đó → **Instant Rollback**.

## Tùy chọn: cho Đạt xem bản Preview

Mặc định, bản Preview (từ `Staging`) bị Vercel Authentication chặn, chỉ thành viên team Vercel mới mở được. Trang Production thì công khai. Chọn một trong hai cách:

- **Mời Đạt vào team:** Team Settings → Members → Invite.
- **Tắt bảo vệ Preview:** Project → Settings → Deployment Protection → tắt **Vercel Authentication**. Khi đó ai có link cũng xem được.

## Checklist cuối

- [ ] Bước 1: đã có `.vercel/project.json` với `orgId` và `projectId`
- [ ] Project Vercel không nối Git
- [ ] Bước 2: đã tạo token đúng team
- [ ] Bước 3: `gh secret list` hiện đủ `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Bước 4: job `deploy` trên `Staging` xanh, có URL Preview
- [ ] Báo lại cho Đạt (kèm URL Preview nếu có)
