# Atlas Việt Nam: nguồn dữ liệu và giấy phép

Mọi nội dung atlas là **minh họa, chưa được chuyên gia duyệt** (`illustrative: true` trên từng địa danh).
Không có analytics và không dùng vị trí của người dùng. Không lấy nội dung, ảnh hay sprite nào từ GeoGnos.

## Tệp và nguồn

| Tệp | Nguồn | Giấy phép | Ghi công bắt buộc |
|---|---|---|---|
| `provinces.topo.json`: ranh giới 34 đơn vị cấp tỉnh (từ 1/7/2025) | OpenStreetMap, quan hệ `admin_level=4` (lấy qua polygons.openstreetmap.fr) | **ODbL 1.0** (tệp là sản phẩm phái sinh) | "© OpenStreetMap contributors", đã hiện trên bản đồ và trong bottom sheet trên phone |
| `provinces.topo.json`: đường bờ biển | Natural Earth 10m `land` + `minor_islands` v5.1.2, cộng đường bao `place=island` của OSM (Overpass) | Public domain (NE) + ODbL (OSM) | như trên |
| `provinces.topo.json`: Hoàng Sa, Trường Sa | Vùng của Natural Earth 10m `admin_0_disputed_areas` (PD); toạ độ 8 + 12 đảo từ Wikidata | PD + CC0 1.0 | không |
| Kiểm tra sáp nhập (không xuất ra tệp) | geoBoundaries VNM ADM1, 63 tỉnh cũ (commit `9469f09`, khoá sha256) | Public domain | không |
| `../../../public/atlas/terrain.png` (1024×1129, RGB, ~1 MB) | AWS Terrain Tiles (Terrarium, zoom 7): SRTM, GMTED2010, ETOPO1 | Public domain | ghi "SRTM" kèm OSM (đang có) |
| `landmarks.json`: 71 địa danh | Toạ độ: Wikidata P625 (CC0); 4 địa danh lấy toạ độ OSM (`coordsFrom`); mô tả `summary`: tự viết bằng tiếng Việt | CC0 / ODbL; mô tả là nội dung của dự án | nguồn ghi trong `sources` của từng địa danh |

Mỗi địa danh liệt kê nguồn trong `sources` (`title`, `url`, `license`):

- Wikidata (CC0 1.0): toạ độ và mã QID.
- Bài Wikipedia tiếng Việt (CC BY-SA 4.0), ghi là "đối chiếu, không chép": chỉ dùng để kiểm lại sự kiện, không chép câu chữ.
- Trang danh mục UNESCO `whc.unesco.org/en/list/<id>` (CC BY-SA 3.0 IGO) cho 9 di sản thế giới. Yên Tử – Vĩnh Nghiêm – Côn Sơn, Kiếp Bạc được ghi danh ngày 12/7/2025.
- Danh sách di tích quốc gia đặc biệt trên Wikipedia tiếng Việt, khi mô tả nhắc đến hạng này.
- OpenStreetMap (ODbL 1.0) khi toạ độ lấy từ OSM: `chi-lang`, `rach-gam`, `xoai-mut`, `cu-lao-cham`. Toạ độ Wikidata của Cù Lao Chàm lệch ra biển khoảng 15 km.

`coordsNote` ghi rõ khi toạ độ chỉ là gần đúng, ví dụ `ngoc-hoi` và `ha-hoi` lấy trung tâm xã cũ, không phải vị trí chính xác của đồn.

## Cách làm lại

Cần Node ≥ 22.18 (dự án dùng `~/.nvm/versions/node/v24.22.0`). Tệp tải về nằm trong `scripts/atlas/.raw/` (đã gitignore, khoảng 26 MB).

```bash
npm run atlas:build   # build-boundaries → build-terrain → build-landmarks
npm run atlas:test    # 34 đơn vị, hai quần đảo, địa danh nằm trong tỉnh, id, NFC, dung lượng
```

- `build-boundaries.mjs`: tải 34 quan hệ OSM, cắt theo mặt nạ đất liền (NE + đảo OSM), kiểm 64 đơn vị trước 2025 rơi đúng vào đơn vị mà Nghị quyết 202/2025/QH15 sáp nhập (xét theo đa số), thêm Hoàng Sa vào Đà Nẵng và Trường Sa vào Khánh Hòa, giản lược (`ATLAS_KEEP`, mặc định 0,3) và lượng tử hoá 1e4. `ATLAS_BOUNDARIES=dissolve` dựng từ 63 tỉnh của geoBoundaries thay cho OSM (thô hơn, toàn bộ PD). Bước Overpass lấy đảo mất vài phút.
- `build-terrain.mjs`: ghép 42 tile Terrarium, lấy mẫu 2×2. R = độ cao, G = độ sâu (cả hai mã hoá căn bậc hai), B = bóng địa hình.
- `build-landmarks.mjs`: sửa `landmarks.json` tại chỗ: toạ độ, `provinceId` (điểm sát bờ lấy tỉnh gần nhất trong 10 km), `sources`, `illustrative`.

Thêm một địa danh: thêm một dòng vào `landmarks.json` (`id` kebab-case, không trùng id tỉnh; `name`, `kind`, `summary` tự viết, `qid`) rồi chạy `node scripts/atlas/build-landmarks.mjs`. **Không đổi id đã có**: bài giảng tham chiếu chúng qua `atlasPlaceIds`.
