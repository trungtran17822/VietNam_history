// The atlas's places without any map code: the 71 landmarks, the 34 province-level units and the two archipelagos, read straight from the
// atlas JSON (no scene.ts, so no three.js). One id space, as in the 3D scene: lessons link to #/atlas?place=<id> and ANY of these ids opens a card.
import landmarkJson from '../../content/atlas/landmarks.json';
import topoJson from '../../content/atlas/provinces.topo.json';
import { KINDS, type BattleEvent, type Kind, type Landmark, type Province, type Source } from './search';

export const LANDMARKS = landmarkJson as Landmark[];
interface TopoObject { geometries: { properties: Record<string, unknown> }[] }
const objects = (topoJson as unknown as { objects: Record<string, TopoObject> }).objects;
export const PROVINCES = (objects.provinces.geometries.map((g) => g.properties) as unknown as Province[]).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
export const REGIONS = ['Bắc Bộ', 'Trung Bộ', 'Nam Bộ'];
export interface Archipelago { id: string; name: string; provinceId: string; islands: { name: string }[] }
export const ARCHIPELAGOS = objects.archipelagos.geometries.map((g) => g.properties as unknown as Archipelago);

export const ARCHIPELAGO_DETAILS: Record<string, { summary: string; heritageYear: string; battles: BattleEvent[]; sources: Source[]; realPhotos: string[] }> = {
  'hoang-sa': {
    summary: 'Quần đảo tiền tiêu trên Biển Đông, trực thuộc thành phố Đà Nẵng. Từ thế kỷ XVII, các chúa Nguyễn đã lập Đội Hoàng Sa ra khai thác, dựng bia và xác lập chủ quyền liên tục của Việt Nam.',
    heritageYear: 'Chủ quyền biển đảo thiêng liêng',
    realPhotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Paracel_Islands_NASA.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Woody_Island_Paracel.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Pattle_Island_Paracels.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/South_China_Sea_reef.jpg?width=1280'
    ],
    battles: [
      { period: 'Thế kỷ XVII – XVIII', name: 'Hoạt động của Đội Hoàng Sa – Bắc Hải', detail: 'Chúa Nguyễn cử dân binh ra đo đạc hải trình, cắm mốc, dựng bia chủ quyền và cứu hộ tàu thuyền.' },
      { period: '1816', name: 'Vua Gia Long chính thức cắm cờ xác lập chủ quyền', detail: 'Triều Nguyễn cử thủy quân ra Hoàng Sa đo vẽ bản đồ, dựng miếu và khẳng định chủ quyền nhà nước.' },
      { period: '19/01/1974', name: 'Hải chiến Hoàng Sa', detail: 'Hải quân Việt Nam Cộng hòa chiến đấu bảo vệ các đảo phía Tây trước cuộc tấn công đánh chiếm trái phép.' }
    ],
    sources: [
      { title: 'Đại Nam thực lục & Châu bản triều Nguyễn (Cục Văn thư và Lưu trữ Nhà nước)', url: 'https://vi.wikipedia.org/wiki/Qu%E1%BA%A7n_%C4%91%E1%BA%A3o_Ho%C3%A0ng_Sa', license: 'CC BY-SA 4.0' }
    ]
  },
  'truong-sa': {
    summary: 'Quần đảo chiến lược ở phía Nam Biển Đông, trực thuộc tỉnh Khánh Hòa. Nhà nước Việt Nam đã quản lý, thực thi chủ quyền liên tục qua các thời kỳ lịch sử từ triều Nguyễn đến nay.',
    heritageYear: 'Chủ quyền biển đảo thiêng liêng',
    realPhotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Truong_Sa_Lon_Island.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Spratly_Island_lighthouse.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Sinh_Ton_Island.jpg?width=1280',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Song_Tu_Tay_Island.jpg?width=1280'
    ],
    battles: [
      { period: 'Thế kỷ XIX', name: 'Triều Nguyễn vẽ bản đồ Đại Nam nhất thống toàn đồ', detail: 'Ghi nhận Vạn Lý Trường Sa thuộc lãnh hải Việt Nam cùng hoạt động tuần tra của thủy quân.' },
      { period: '4/1975', name: 'Chiến dịch giải phóng quần đảo Trường Sa', detail: 'Hải quân nhân dân Việt Nam tiếp quản các đảo trọng yếu Song Tử Tây, Sơn Ca, Nam Yết, Sinh Tồn, Trường Sa.' },
      { period: '14/03/1988', name: 'Sự kiện Gạc Ma – Cô Lin – Len Đao', detail: '64 chiến sĩ Hải quân nhân dân Việt Nam anh dũng hy sinh để bảo vệ chủ quyền tại cụm đảo Sinh Tồn.' }
    ],
    sources: [
      { title: 'Wikipedia tiếng Việt: Quần đảo Trường Sa', url: 'https://vi.wikipedia.org/wiki/Qu%E1%BA%A7n_%C4%91%E1%BA%A3o_Tr%C6%B0%E1%BB%9Dng_Sa', license: 'CC BY-SA 4.0' }
    ]
  }
};

export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<Kind, string>;
/** Marker colour per kind: [CSS variable, fallback]. The legend marks use the same pair. */
export const KIND_COLORS: Record<Kind, [string, string]> = {
  'chien-truong': ['--vermilion', '#A8412F'],
  'kinh-do': ['--ochre', '#B79B5E'],
  unesco: ['--muted-indigo', '#3E5C76'],
  'di-tich': ['--sepia', '#7A5C3E'],
  'danh-thang': ['--deep-green', '#4F6355'],
};

export const provinceName = (id: string) => PROVINCES.find((p) => p.id === id)?.name ?? '';

export type PlaceType = 'landmark' | 'archipelago' | 'province';
export interface Place { id: string; type: PlaceType; name: string }
/** Any atlas id to its name and type; null for an unknown id. */
export function placeOf(id: string | null | undefined): Place | null {
  if (!id) return null;
  const l = LANDMARKS.find((x) => x.id === id);
  if (l) return { id, type: 'landmark', name: l.name };
  const a = ARCHIPELAGOS.find((x) => x.id === id);
  if (a) return { id, type: 'archipelago', name: a.name };
  const p = PROVINCES.find((x) => x.id === id);
  return p ? { id, type: 'province', name: p.name } : null;
}
