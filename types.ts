// Cấu trúc một mục trong mẫu SKKN tùy chỉnh
export interface SKKNSection {
  id: string;           // ID duy nhất (1, 1.1, 1.1.1...)
  level: number;        // Cấp độ (1: Phần lớn, 2: mục con, 3: mục nhỏ)
  title: string;        // Tiêu đề gốc từ mẫu
  suggestedContent?: string; // Gợi ý nội dung (tùy chọn)
}

// Cấu trúc mẫu SKKN đầy đủ
export interface SKKNTemplate {
  name: string;         // Tên mẫu (từ tên file hoặc tiêu đề)
  sections: SKKNSection[]; // Danh sách các mục
  rawContent: string;   // Nội dung gốc đã trích xuất
}

export interface UserInfo {
  // Bắt buộc
  topic: string;
  subject: string;
  level: string; // Cấp học
  grade: string; // Khối lớp
  school: string;
  location: string; // Địa điểm
  facilities: string; // Điều kiện cơ sở vật chất

  // Bổ sung
  textbook: string;
  researchSubjects: string; // Đối tượng nghiên cứu
  timeframe: string; // Thời gian thực hiện
  applyAI: string; // Có ứng dụng AI không
  focus: string; // Trọng tâm/Đặc thù

  // Tài liệu tham khảo
  referenceDocuments: string; // Nội dung các tài liệu PDF được tải lên

  // Mẫu SKKN (tùy chọn)
  skknTemplate: string; // Nội dung mẫu SKKN nếu người dùng tải lên
  customTemplate?: string; // JSON string của SKKNTemplate - cấu trúc đã trích xuất từ mẫu

  // Yêu cầu khác
  specialRequirements: string; // Các yêu cầu đặc biệt: giới hạn trang, viết ngắn gọn, thêm bài toán...

  // Tùy chọn số lượng giải pháp
  includeSolution4_5: boolean; // Có viết giải pháp 4 và 5 hay không (mặc định false = chỉ 3 giải pháp)
}

export enum GenerationStep {
  INPUT_FORM = 0,
  OUTLINE = 1,
  PART_I_II = 2,
  PART_III = 3,
  PART_IV_SOL1 = 4,
  PART_IV_SOL2_3 = 5,
  PART_IV_SOL4_5 = 6, // Giải pháp 4 và 5 (tùy chọn)
  PART_V_VI = 7,
  APPENDIX = 8,
  COMPLETED = 9
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GenerationState {
  step: GenerationStep;
  messages: ChatMessage[];
  fullDocument: string;
  isStreaming: boolean;
  error: string | null;
}

// Exam Types
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY'
}

export interface Choice {
  id: string;
  text: string;
}

export interface Statement {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  choices?: Choice[];
  correctChoiceId?: string;
  statements?: Statement[];
  correctAnswer?: string;
  explanation?: string;
}

export interface ExamPart {
  id: string | number;
  title: string;
  description?: string;
  questions: Question[];
}

export interface Exam {
  title: string;
  topic: string;
  hasEssay: boolean;
  parts: ExamPart[];
}

export type UserAnswers = Record<string, string | Record<string, boolean>>;
