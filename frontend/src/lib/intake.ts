// New lessons: a blank one, or a draft built from a teacher's sourced notes (US5). The app only
// recognises a source link; it never verifies the claim, so drafts stay "pending" until the
// teacher confirms they checked the source.
import { newId, DEFAULT_SCENE, type AppLesson } from './storage';
import { today } from './text';

export const OFFICIAL_REFERENCE_SOURCES = [
  { title: 'Chương trình môn Lịch sử · Bộ GD&ĐT', url: 'https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-chuong-trinh-mon-lich-su.pdf', host: 'moet.gov.vn' },
  { title: 'Bảo vật quốc gia: Trống Ngọc Lũ · Bảo tàng Lịch sử Quốc gia', url: 'https://baotanglichsu.vn/vi/Articles/1001/73637/bao-vat-quoc-gia-trong-ngoc-lu.html', host: 'baotanglichsu.vn' },
  { title: 'Khái quát lịch sử Việt Nam · Bộ Ngoại giao', url: 'https://mofa.gov.vn/lich-su1', host: 'mofa.gov.vn' },
  { title: 'Lịch sử Việt Nam · Cổng Thông tin điện tử Chính phủ', url: 'https://vietnam.gov.vn/default.aspx?catname=history-68964', host: 'vietnam.gov.vn' }
];

type Reference = (typeof OFFICIAL_REFERENCE_SOURCES)[number];
export type Assessment =
  | { status: 'empty' | 'invalid' }
  | { status: 'https-required' | 'unlisted'; host: string }
  | { status: 'catalog-match' | 'official-domain'; host: string; source: Reference };

const normalizeUrl = (value: string) => {
  const parsed = new URL(value);
  parsed.hash = '';
  return parsed.href.replace(/\/$/, '');
};

export function assessReferenceUrl(value: string): Assessment {
  if (!value.trim()) return { status: 'empty' };
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { status: 'invalid' };
  }
  if (parsed.protocol !== 'https:') return { status: 'https-required', host: parsed.hostname };
  const host = parsed.hostname.toLowerCase();
  const exact = OFFICIAL_REFERENCE_SOURCES.find((s) => normalizeUrl(s.url) === normalizeUrl(parsed.href));
  if (exact) return { status: 'catalog-match', host, source: exact };
  const official = OFFICIAL_REFERENCE_SOURCES.find((s) => host === s.host || host.endsWith(`.${s.host}`));
  return official ? { status: 'official-domain', host, source: official } : { status: 'unlisted', host };
}

export function assessmentMessage(result: Assessment): { text: string; tone: 'neutral' | 'warning' | 'recognized' | 'review' } {
  switch (result.status) {
    case 'empty': return { text: 'Thêm đường dẫn nguồn để kiểm tra mức độ nhận diện.', tone: 'neutral' };
    case 'invalid': return { text: 'Đường dẫn chưa hợp lệ. Hãy nhập một URL HTTPS đầy đủ.', tone: 'warning' };
    case 'https-required': return { text: 'Chỉ nhận đường dẫn HTTPS. Nguồn vẫn cần được đối chiếu trực tiếp.', tone: 'warning' };
    case 'catalog-match': return { text: `Khớp danh mục tham khảo chính thống: ${result.source.title}. Điều này xác nhận liên kết, không xác minh nội dung trích dẫn.`, tone: 'recognized' };
    case 'official-domain': return { text: `Miền ${result.host} thuộc một cơ quan trong danh mục. Trang cụ thể và nội dung cần được đối chiếu trực tiếp.`, tone: 'review' };
    case 'unlisted': return { text: `Miền ${result.host} chưa có trong danh mục tham khảo. Nguồn sẽ được giữ ở trạng thái chờ kiểm duyệt.`, tone: 'warning' };
  }
}

function base(teacher: string): AppLesson {
  return {
    schemaVersion: 2,
    id: newId(),
    title: 'Bài giảng Lịch sử mới',
    subtitle: 'Kế hoạch bài dạy tương tác',
    era: '',
    teacher,
    class: 'Lớp 11A1',
    date: today(),
    subject: 'Lịch sử',
    grade: 'Khối 11',
    objectives: 'Phân tích diễn biến và rút ra bài học lịch sử.',
    focusQuestion: 'Câu hỏi trọng tâm của bài học là gì?',
    status: 'Nháp',
    factions: { a: { name: 'Phe A', color: '#a8412f' }, b: { name: 'Phe B', color: '#3e5c76' } },
    sections: [{ id: 'sec-1', title: 'Giai đoạn 1: Mở màn', narration: 'Lời dẫn thuyết minh bối cảnh mở đầu.', caption: 'Chú thích hình ảnh trên sa bàn.', timelineRange: 0.1, timeLabel: 'Khởi đầu' }],
    keyNotes: ['Nội dung ghi chú cốt lõi thứ nhất.'],
    privateNotes: '',
    questions: [],
    simulation: {
      propsConfig: { palisade: true, tents: true, elephants: true, banners: true, fire: true, village: true, bamboo: true },
      unitCounts: { aInfantry: 45, bInfantry: 45 },
      scene: structuredClone(DEFAULT_SCENE)
    }
  };
}

export const blankLesson = (teacher: string) => base(teacher);

export type IntakeForm = { title: string; content: string; sourceTitle: string; publisher: string; url: string; year: string; claim: string; aiInstruction: string };

export function intakeLesson(form: IntakeForm, assessment: Assessment, teacher: string): AppLesson {
  const lesson = base(teacher);
  const recognized = 'source' in assessment ? assessment.source : null;
  const recognition =
    assessment.status === 'catalog-match'
      ? `URL khớp với mục tham khảo: ${recognized!.title}.`
      : assessment.status === 'official-domain'
        ? `Miền ${assessment.host} được nhận diện; trang này chưa có trong danh mục tham khảo.`
        : 'Nguồn chưa được nhận diện trong danh mục tham khảo chính thống.';
  return {
    ...lesson,
    title: form.title,
    subtitle: 'Bản nháp từ tư liệu · cần đối chiếu nguồn',
    objectives: 'Bản nháp được tạo từ nội dung giáo viên cung cấp; cần biên tập và kiểm chứng trước khi phát hành.',
    focusQuestion: '',
    keyNotes: [],
    sections: [{
      id: `sec-${Date.now().toString(36)}`,
      title: 'Nội dung ban đầu',
      narration: form.content,
      caption: `Nguồn tham khảo: ${form.sourceTitle}`,
      timelineRange: 0.1,
      timeLabel: 'Tư liệu đầu vào',
      source: {
        book: form.sourceTitle,
        chapter: form.year ? `Năm ${form.year}` : '',
        quote: form.claim,
        url: form.url,
        publisher: form.publisher,
        note: `${recognition} Tình trạng kiểm chứng nội dung: chờ giáo viên đối chiếu trực tiếp.`
      }
    }],
    privateNotes: form.aiInstruction ? `YÊU CẦU BIÊN TẬP CHO AI (được lưu để xử lý khi kết nối dịch vụ AI):\n${form.aiInstruction}` : '',
    aiEditPrompt: form.aiInstruction,
    sourceReview: {
      sourceRecognition: assessment.status,
      recognizedReference: recognized?.title ?? '',
      claimStatus: 'pending',
      claim: form.claim,
      sourceUrl: form.url,
      createdAt: new Date().toISOString()
    }
  };
}
