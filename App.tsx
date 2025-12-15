import React, { useState, useEffect, useCallback } from 'react';
import { UserInfo, GenerationStep, GenerationState } from './types';
import { STEPS_INFO, SOLUTION_MODE_PROMPT } from './constants';
import { initializeGeminiChat, sendMessageStream } from './services/geminiService';
import { SKKNForm } from './components/SKKNForm';
import { DocumentPreview } from './components/DocumentPreview';
import { Button } from './components/Button';
import { Download, ChevronRight, Wand2, FileText, CheckCircle, RefreshCw, Settings } from 'lucide-react';
import { LockScreen } from './components/LockScreen';
import { ApiKeyModal } from './components/ApiKeyModal';
// @ts-ignore
import HTMLtoDOCX from 'html-to-docx';
import { saveAs } from 'file-saver';

const App: React.FC = () => {
  // Lock Screen State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Check LocalStorage on Mount
  useEffect(() => {
    const authState = localStorage.getItem('skkn_app_unlocked');
    if (authState === 'true') {
      setIsUnlocked(true);
    }

    // Check for API Key
    const storedKey = localStorage.getItem('USER_GEMINI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
    } else if (!process.env.API_KEY) {
      // If no env key and no user key, prompt optional but recommended
      // We delay this slightly to not conflict with lock screen if needed, 
      // or just let the user open it manually via settings if they want.
      // But per instructions: "If missing, must show popup".
      // We'll show it if they try to generate.
    }

    setCheckingAuth(false);
  }, []);

  const handleUnlock = () => {
    localStorage.setItem('skkn_app_unlocked', 'true');
    setIsUnlocked(true);
  };

  const getEffectiveApiKey = () => {
    if (apiKey) return apiKey;
    if (process.env.API_KEY) return process.env.API_KEY;
    return null;
  };

  const [userInfo, setUserInfo] = useState<UserInfo>({
    topic: '',
    subject: '',
    level: '',
    grade: '',
    school: '',
    location: '',
    facilities: '',
    textbook: '',
    researchSubjects: '',
    timeframe: '',
    applyAI: '',
    focus: ''
  });

  const [state, setState] = useState<GenerationState>({
    step: GenerationStep.INPUT_FORM,
    messages: [],
    fullDocument: '',
    isStreaming: false,
    error: null
  });

  const [outlineFeedback, setOutlineFeedback] = useState("");

  // Handle Input Changes
  const handleUserChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
  };

  // Handle Manual Document Edit
  const handleDocumentUpdate = (newContent: string) => {
    setState(prev => ({ ...prev, fullDocument: newContent }));
  };

  // Handle Manual Outline Submission (Skip Generation)
  const handleManualOutlineSubmit = (content: string) => {
    const key = getEffectiveApiKey();
    if (!key) {
      setShowApiKeyModal(true);
      return;
    }

    // Initialize chat session silently so it's ready for next steps
    initializeGeminiChat(key);

    setState(prev => ({
      ...prev,
      fullDocument: content,
      step: GenerationStep.OUTLINE, // Go to Outline step so user can Review/Confirm
      isStreaming: false,
      error: null
    }));
  };

  // Start the Generation Process
  const startGeneration = async () => {
    const key = getEffectiveApiKey();
    if (!key) {
      setShowApiKeyModal(true);
      return;
    }

    try {
      setState(prev => ({ ...prev, step: GenerationStep.OUTLINE, isStreaming: true, error: null }));

      initializeGeminiChat(key);

      const initMessage = `
Bạn là chuyên gia giáo dục cấp quốc gia, có 20+ năm kinh nghiệm viết, thẩm định và chấm điểm Sáng kiến Kinh nghiệm (SKKN) đạt giải cấp Bộ, cấp tỉnh tại Việt Nam.

NHIỆM VỤ CỦA BẠN:
Lập DÀN Ý CHI TIẾT cho một đề tài SKKN dựa trên thông tin tôi cung cấp. Dàn ý phải đầy đủ, cụ thể, có độ sâu và đảm bảo 4 tiêu chí: Tính MỚI, Tính KHOA HỌC, Tính KHẢ THI, Tính HIỆU QUẢ.

BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 2 (Lập Dàn Ý - Đang thực hiện).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÔNG TIN ĐỀ TÀI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Tên đề tài: ${userInfo.topic}
• Môn học: ${userInfo.subject}
• Cấp học: ${userInfo.level}
• Khối lớp: ${userInfo.grade}
• Tên trường: ${userInfo.school}
• Địa điểm: ${userInfo.location}
• Điều kiện CSVC: ${userInfo.facilities}
• Sách giáo khoa: ${userInfo.textbook || "Không đề cập"}
• Đối tượng nghiên cứu: ${userInfo.researchSubjects || "Học sinh tại đơn vị"}
• Thời gian thực hiện: ${userInfo.timeframe || "Năm học hiện tại"}
• Đặc thù/Công nghệ/AI: ${userInfo.applyAI ? userInfo.applyAI : ''} ${userInfo.focus ? `- ${userInfo.focus}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ YÊU CẦU ĐỊNH DẠNG OUTPUT (BẮT BUỘC):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SAU MỖI CÂU: Phải xuống dòng (Enter 2 lần).
2. SAU MỖI ĐOẠN: Cách 1 dòng trống.
3. KHÔNG viết dính liền (wall of text).
4. Sử dụng gạch đầu dòng và tiêu đề rõ ràng.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CẤU TRÚC DÀN Ý BẠN CẦN TẠO (6 PHẦN CHÍNH):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I. ĐẶT VẤN ĐỀ / LÝ DO CHỌN ĐỀ TÀI (3-4 trang)

   1.1. Bối cảnh giáo dục hiện nay
        → Xu hướng đổi mới giáo dục
        → Chương trình GDPT 2018 và định hướng phát triển năng lực
        → Vai trò của môn ${userInfo.subject} với cấp ${userInfo.level}
        → Yêu cầu mới với giáo viên
        
   1.2. Lý do khách quan
        → Thực trạng dạy học môn ${userInfo.subject}
        → Khó khăn của học sinh ${userInfo.grade}
        → Hạn chế phương pháp truyền thống
        → Nhu cầu cải tiến
        
   1.3. Lý do chủ quan
        → Kinh nghiệm giảng dạy tại ${userInfo.school}
        → Quan sát thực tế
        → Mong muốn cải thiện
        → Khả năng áp dụng (Dựa trên điều kiện: ${userInfo.facilities})
        
   1.4. Tính cấp thiết
        → Vì sao cần giải quyết NGAY
        → Hậu quả nếu không thay đổi
        → Lợi ích với HS, GV, nhà trường

II. CƠ SỞ LÝ LUẬN (5-7 trang)

   2.1. Cơ sở pháp lý (DIỄN GIẢI, không trích nguyên văn)
        → Luật Giáo dục 2019
        → Nghị quyết 29-NQ/TW
        → Chương trình GDPT 2018
        → Thông tư đánh giá liên quan
        → Văn bản khác
        
   2.2. Cơ sở lý luận giáo dục (Chọn 3-4 lý thuyết phù hợp)
        → Lý thuyết kiến tạo (Piaget, Vygotsky)
        → Lý thuyết học tập trải nghiệm (Kolb)
        → Lý thuyết đa trí tuệ (Gardner)
        → Lý thuyết học tập có ý nghĩa (Ausubel)
        → Dạy học lấy người học làm trung tâm
        → Học tập qua hợp tác
        [Chọn lý thuyết PHÙ HỢP với đề tài]
        
   2.3. Cơ sở khoa học chuyên môn (Tự động điều chỉnh theo MÔN HỌC)
        → Đặc điểm môn ${userInfo.subject} ${userInfo.grade}
        → Năng lực cần phát triển
        → Phương pháp dạy học tích cực
        → Kỹ năng cần rèn luyện

III. THỰC TRẠNG (4-6 trang)

   3.1. Đặc điểm tình hình tại ${userInfo.school}
        → Điều kiện cơ sở vật chất (Dựa trên thực tế: ${userInfo.facilities})
        → Đặc điểm học sinh
        → Đội ngũ giáo viên
        
   3.2. Thực trạng dạy và học
        → Bảng khảo sát giáo viên (n=X)
        → Bảng khảo sát học sinh (n=Y)
        → Bảng kết quả học tập trước áp dụng
        → Biểu đồ minh họa
        
   3.3. Phân tích nguyên nhân
        → Nguyên nhân khách quan (3-4 nguyên nhân)
        → Nguyên nhân chủ quan (2-3 nguyên nhân)
        → Nguyên nhân cốt lõi

IV. GIẢI PHÁP THỰC HIỆN (10-15 trang - PHẦN QUAN TRỌNG NHẤT)

   Đề xuất 4-5 giải pháp lớn, mỗi giải pháp bao gồm:
   
   GIẢI PHÁP 1: [Tên giải pháp cụ thể]
   
        1.1. Mục tiêu của giải pháp
        1.2. Mô tả chi tiết cách triển khai
        1.3. Quy trình thực hiện (5-7 bước)
             Bước 1: [Chi tiết]
             Bước 2: [Chi tiết]
             Bước 3: [Chi tiết]
             ...
        1.4. Ví dụ minh họa cụ thể (theo bài học SGK ${userInfo.textbook || "hiện hành"})
        1.5. Công cụ/tài liệu hỗ trợ (Tận dụng ${userInfo.facilities})
        1.6. Sản phẩm học sinh mẫu
        1.7. Lưu ý khi triển khai
        1.8. Điều kiện thành công
        
   GIẢI PHÁP 2: [Tên giải pháp cụ thể]
   [Cấu trúc tương tự giải pháp 1]
   
   GIẢI PHÁP 3: [Tên giải pháp cụ thể]
   [Cấu trúc tương tự giải pháp 1]
   
   GIẢI PHÁP 4: [Nếu cần]
   GIẢI PHÁP 5: [Nếu cần]

V. KẾT QUẢ ĐẠT ĐƯỢC (4-6 trang)

   5.1. Về học sinh
        → Bảng số liệu trước - sau áp dụng
        → Thay đổi về thái độ học tập
        → Tiến bộ năng lực cụ thể
        → Minh chứng sản phẩm học sinh
        
   5.2. Về giáo viên
        → Hiệu quả về thời gian
        → Nâng cao năng lực dạy học
        → Thay đổi tư duy
        
   5.3. Về nhà trường
        → Chất lượng giáo dục
        → Tác động lan tỏa
        → Khả năng nhân rộng

VI. KẾT LUẬN VÀ KHUYẾN NGHỊ (2-3 trang)

   6.1. Kết luận
        → Tóm lược giá trị đề tài
        → Điểm mới của sáng kiến
        → Đóng góp cho thực tiễn
        
   6.2. Hạn chế và bài học kinh nghiệm
        → Những khó khăn còn tồn tại
        → Bài học rút ra
        
   6.3. Khuyến nghị
        → Với nhà trường
        → Với tổ chuyên môn
        → Với giáo viên
        → Với Sở/Phòng GD&ĐT
        → Hướng phát triển tiếp theo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YÊU CẦU CHẤT LƯỢNG DÀN Ý:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Dàn ý phải CỤ THỂ, không chung chung
✓ Mỗi mục phải có ý nhỏ chi tiết (bullet points)
✓ Có gợi ý số liệu cần thu thập
✓ Có gợi ý ví dụ minh họa cụ thể theo SGK
✓ Phù hợp với đặc thù môn ${userInfo.subject} và cấp ${userInfo.level}
✓ Đảm bảo tính logic, mạch lạc
✓ Thể hiện rõ tính MỚI và SÁNG TẠO
✓ Tính khả thi cao với điều kiện thực tế và CSVC của trường
✓ Có thể triển khai ngay

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ĐỊNH DẠNG ĐẦU RA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trình bày theo cấu trúc phân cấp rõ ràng (Markdown):
I. TÊN PHẦN LỚN
   1.1. Tên mục nhỏ
        • Ý chi tiết 1
        • Ý chi tiết 2

Sử dụng icon để dễ nhìn: ✓ → • ○ ▪ ■

QUAN TRỌNG:
1. HIỂN THỊ "📱 MENU NAVIGATION" ĐẦU TIÊN (Bước 2: Đang thực hiện).
2. Cuối dàn ý, hiển thị hộp thoại xác nhận:
┌─────────────────────────────────┐
│ ✅ Đồng ý dàn ý này?            │
│ ✏️ Bạn có thể CHỈNH SỬA trực   │
│    tiếp bằng nút "Chỉnh sửa"    │
└─────────────────────────────────┘
`;

      let generatedText = "";
      await sendMessageStream(initMessage, (chunk) => {
        generatedText += chunk;
        setState(prev => ({
          ...prev,
          fullDocument: generatedText // Initial document is just the outline
        }));
      });

      setState(prev => ({ ...prev, isStreaming: false }));

    } catch (error: any) {
      setState(prev => ({ ...prev, isStreaming: false, error: error.message || "Failed to generate." }));
    }
  };

  // Regenerate Outline based on feedback
  const regenerateOutline = async () => {
    if (!outlineFeedback.trim()) return;

    try {
      setState(prev => ({ ...prev, isStreaming: true, error: null, fullDocument: '' }));

      const feedbackMessage = `
      BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 2 (Lập Dàn Ý - Đang thực hiện).

      Dựa trên dàn ý đã lập, người dùng có yêu cầu chỉnh sửa sau:
      "${outlineFeedback}"
      
      Hãy viết lại TOÀN BỘ Dàn ý chi tiết mới đã được cập nhật theo yêu cầu trên. 
      Vẫn đảm bảo cấu trúc chuẩn SKKN.
      
      Lưu ý các quy tắc định dạng:
      - Xuống dòng sau mỗi câu.
      - Tách đoạn rõ ràng.
      
      Kết thúc phần dàn ý, hãy xuống dòng và hiển thị hộp thoại:
      ┌─────────────────────────────────┐
      │ ✅ Đồng ý dàn ý này?            │
      │ ✏️ Bạn có thể CHỈNH SỬA trực   │
      │    tiếp bằng nút "Chỉnh sửa"    │
      └─────────────────────────────────┘
      `;

      let generatedText = "";
      await sendMessageStream(feedbackMessage, (chunk) => {
        generatedText += chunk;
        setState(prev => ({
          ...prev,
          fullDocument: generatedText
        }));
      });

      setState(prev => ({ ...prev, isStreaming: false }));
      setOutlineFeedback(""); // Clear feedback after sending

    } catch (error: any) {
      setState(prev => ({ ...prev, isStreaming: false, error: error.message }));
    }
  };

  // Generate Next Section
  const generateNextSection = async () => {
    let currentStepPrompt = "";
    let nextStepEnum = GenerationStep.PART_I_II;

    // Logic for OUTLINE step specifically handles manual edits synchronization
    if (state.step === GenerationStep.OUTLINE) {
      // We inject the CURRENT fullDocument (which might have been edited by user) into the prompt
      // This ensures the AI uses the user's finalized outline.
      currentStepPrompt = `
        BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 3 (Viết Phần I & II - Đang thực hiện).
        
        Đây là bản DÀN Ý CHÍNH THỨC mà tôi đã chốt (tôi có thể đã chỉnh sửa trực tiếp). 
        Hãy DÙNG CHÍNH XÁC NỘI DUNG NÀY để làm cơ sở triển khai các phần tiếp theo, không tự ý thay đổi cấu trúc của nó:

        --- BẮT ĐẦU DÀN Ý CHÍNH THỨC ---
        ${state.fullDocument}
        --- KẾT THÚC DÀN Ý CHÍNH THỨC ---

        NHIỆM VỤ TIẾP THEO:
        Hãy tiếp tục BƯỚC 3: Viết chi tiết PHẦN I (Đặt vấn đề) và PHẦN II (Cơ sở lý luận). 
        
        ⚠️ LƯU Ý FORMAT: 
        - Viết từng câu xuống dòng riêng.
        - Tách đoạn rõ ràng.
        - Không viết dính chữ.
        - Menu Navigation: Đánh dấu Bước 2 đã xong (✅), Bước 3 đang làm (🔵).
        
        Viết sâu sắc, học thuật, đúng cấu trúc đã đề ra. Lưu ý bám sát thông tin về trường và địa phương đã cung cấp.`;

      nextStepEnum = GenerationStep.PART_I_II;
    } else {
      // Standard flow for other steps
      const nextStepMap: Record<number, { prompt: string, nextStep: GenerationStep }> = {
        [GenerationStep.PART_I_II]: {
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 4 (Viết Phần III - Đang thực hiện).

              Tiếp tục BƯỚC 3 (tiếp): Viết chi tiết PHẦN III (Thực trạng vấn đề). 
              Nhớ tạo bảng số liệu khảo sát giả định logic phù hợp với đối tượng nghiên cứu là: ${userInfo.researchSubjects || "Học sinh"}.
              Phân tích nguyên nhân và thực trạng tại ${userInfo.school}, ${userInfo.location} và điều kiện CSVC thực tế: ${userInfo.facilities}.
              
              ⚠️ LƯU Ý FORMAT: 
              - Viết từng câu xuống dòng riêng.
              - Tách đoạn rõ ràng.
              - Bảng số liệu phải tuân thủ format Markdown chuẩn: | Tiêu đề | Số liệu |.`,
          nextStep: GenerationStep.PART_III
        },
        [GenerationStep.PART_III]: {
          // ULTRA MODE INJECTION FOR PART IV START
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 5 (Viết Phần IV - Đang thực hiện).

              ${SOLUTION_MODE_PROMPT}
      
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              🚀 THỰC THI NHIỆM VỤ (PHẦN IV - GIẢI PHÁP 1)
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              
              Thông tin đề tài: "${userInfo.topic}"
              Môn: ${userInfo.subject} - Lớp: ${userInfo.grade}
              Trường: ${userInfo.school}
              SGK: ${userInfo.textbook}
              Công nghệ/AI: ${userInfo.applyAI}
              CSVC hiện có: ${userInfo.facilities}
              
              YÊU CẦU:
              Hãy viết chi tiết GIẢI PHÁP 1 (Giải pháp trọng tâm nhất) tuân thủ nghiêm ngặt 10 NGUYÊN TẮC VÀNG.
              Giải pháp phải khả thi với điều kiện CSVC: ${userInfo.facilities}.
              
              QUAN TRỌNG: Tuân thủ "YÊU CẦU ĐỊNH DẠNG OUTPUT" vừa cung cấp:
              1. Xuống dòng sau mỗi câu.
              2. Xuống 2 dòng sau mỗi đoạn.
              3. Sử dụng Format "KẾT THÚC GIẢI PHÁP" ở cuối.
              
              Lưu ý đặc biệt: Phải có VÍ DỤ MINH HỌA (Giáo án/Hoạt động) cụ thể theo SGK ${userInfo.textbook}.
              Menu Navigation: Đánh dấu Bước 5 đang làm (🔵).`,
          nextStep: GenerationStep.PART_IV_SOL1
        },
        [GenerationStep.PART_IV_SOL1]: {
          // ULTRA MODE CONTINUATION
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 5 (Viết Phần IV - Đang thực hiện).

              Tiếp tục giữ vững vai trò CHUYÊN GIA GIÁO DỤC (ULTRA MODE).
              
              Nhiệm vụ: Viết tiếp GIẢI PHÁP 2 và GIẢI PHÁP 3 cho đề tài: "${userInfo.topic}".
              
              Yêu cầu:
              1. Nội dung độc đáo, không trùng lặp.
              2. Tận dụng tối đa CSVC: ${userInfo.facilities}.
              3. BẮT BUỘC TUÂN THỦ FORMAT "YÊU CẦU ĐỊNH DẠNG OUTPUT":
                 - Xuống dòng sau mỗi câu.
                 - Xuống 2 dòng sau mỗi đoạn.
                 - Có khung "KẾT THÚC GIẢI PHÁP" ở cuối mỗi giải pháp.
              `,
          nextStep: GenerationStep.PART_IV_SOL2
        },
        [GenerationStep.PART_IV_SOL2]: {
          // ULTRA MODE CONTINUATION
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 5 (Viết Phần IV - Đang thực hiện).

              Tiếp tục giữ vững vai trò CHUYÊN GIA GIÁO DỤC (ULTRA MODE).
              
              Nhiệm vụ: Viết tiếp GIẢI PHÁP 4 và GIẢI PHÁP 5 cho đề tài: "${userInfo.topic}".
              Nếu đã đủ ý ở các giải pháp trước, có thể viết các biện pháp bổ trợ hoặc mở rộng nâng cao.
              
              Yêu cầu:
              1. Nội dung độc đáo, không trùng lặp.
              2. BẮT BUỘC TUÂN THỦ FORMAT "YÊU CẦU ĐỊNH DẠNG OUTPUT":
                 - Xuống dòng sau mỗi câu.
                 - Xuống 2 dòng sau mỗi đoạn.
                 - Có khung "KẾT THÚC GIẢI PHÁP" ở cuối mỗi giải pháp.
              `,
          nextStep: GenerationStep.PART_IV_SOL3
        },
        [GenerationStep.PART_IV_SOL3]: {
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 6 (Kết luận & Khuyến nghị - Đang thực hiện).

              Tiếp tục viết PHẦN V (Hiệu quả), PHẦN VI (Kết luận & Khuyến nghị) và PHỤ LỤC (Tài liệu tham khảo, mẫu phiếu). 
              Đảm bảo số liệu phần Hiệu quả phải logic và chứng minh được sự tiến bộ so với phần Thực trạng.
              
              ⚠️ LƯU Ý FORMAT: 
              - Viết từng câu xuống dòng riêng.
              - Tách đoạn rõ ràng.
              - Không viết dính chữ.
              - Menu Navigation: Đánh dấu Bước 5 đã xong (✅), Bước 6 đang làm (🔵).`,
          nextStep: GenerationStep.PART_V_VI
        },
        [GenerationStep.PART_V_VI]: {
          prompt: "", // Should not happen
          nextStep: GenerationStep.COMPLETED
        }
      };
      const stepConfig = nextStepMap[state.step];
      if (!stepConfig) return;
      currentStepPrompt = stepConfig.prompt;
      nextStepEnum = stepConfig.nextStep;
    }

    if (!currentStepPrompt) return;

    // Append a separator before starting the new section to ensure clean Markdown parsing
    setState(prev => ({
      ...prev,
      isStreaming: true,
      error: null,
      step: nextStepEnum,
      fullDocument: prev.fullDocument + "\n\n"
    }));

    try {
      let sectionText = "";
      await sendMessageStream(currentStepPrompt, (chunk) => {
        sectionText += chunk;
        setState(prev => ({
          ...prev,
          fullDocument: prev.fullDocument + chunk
        }));
      });

      // If we just finished the last part, move to completed
      if (nextStepEnum === GenerationStep.PART_V_VI) {
        setState(prev => ({ ...prev, step: GenerationStep.COMPLETED, isStreaming: false }));
      } else {
        setState(prev => ({ ...prev, isStreaming: false }));
      }

    } catch (error: any) {
      setState(prev => ({ ...prev, isStreaming: false, error: error.message }));
    }
  };

  // Export to Word
  const exportToWord = async () => {
    // @ts-ignore
    if (typeof marked === 'undefined') {
      alert("Library not loaded correctly. Please refresh.");
      return;
    }

    try {
      // @ts-ignore
      const htmlContent = marked.parse(state.fullDocument);

      const headerHTML = `
        <div style="text-align: center; font-family: 'Times New Roman', serif;">
          <p style="font-size: 10pt; margin: 0;">SÁNG KIẾN KINH NGHIỆM</p>
        </div>
      `;

      const footerHTML = `
        <div style="text-align: center; font-family: 'Times New Roman', serif; font-size: 10pt;">
          <span>Trang <span class="pageNumber"></span></span>
        </div>
      `;

      // HTMLtoDOCX expects a full HTML page or content string
      const fileBuffer = await HTMLtoDOCX(htmlContent, headerHTML, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: 'Times New Roman',
      }, footerHTML);

      const blob = new Blob([fileBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      saveAs(blob, `SKKN_${userInfo.topic.substring(0, 50).replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, '_')}.docx`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Xuất file thất bại. Vui lòng thử lại hoặc kiểm tra console.");
    }
  };

  // Render Logic
  const renderSidebar = () => {
    return (
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 p-6 flex-shrink-0 flex flex-col h-full overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sky-600 flex items-center gap-2">
              <Wand2 className="h-6 w-6" />
              SKKN PRO
            </h1>
            <p className="text-xs text-gray-900 font-semibold mt-1 tracking-wide opacity-70">Trợ lý viết SKKN được nâng cấp bởi Trần Hoài Thanh</p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Cấu hình API Key"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-6">
          {Object.entries(STEPS_INFO).map(([key, info]) => {
            const stepNum = parseInt(key);
            if (stepNum > 8) return null; // Don't show completed logic step

            let statusColor = "text-gray-400 border-gray-200";
            let icon = <div className="w-2 h-2 rounded-full bg-gray-300" />;

            if (state.step === stepNum && state.isStreaming) {
              statusColor = "text-sky-600 border-sky-600 bg-sky-50";
              icon = <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />;
            } else if (state.step > stepNum) {
              statusColor = "text-sky-800 border-sky-200";
              icon = <CheckCircle className="w-4 h-4 text-sky-600" />;
            } else if (state.step === stepNum) {
              statusColor = "text-sky-600 border-sky-600 font-bold";
              icon = <div className="w-2 h-2 rounded-full bg-sky-600" />;
            }

            return (
              <div key={key} className={`flex items-start pl-4 border-l-2 ${statusColor.includes('border-sky') ? 'border-sky-500' : 'border-gray-200'} py-1 transition-all`}>
                <div className="flex-1">
                  <h4 className={`text-sm ${statusColor.includes('text-sky') ? 'text-sky-900' : 'text-gray-500'} font-medium`}>{info.label}</h4>
                  <p className="text-xs text-gray-400">{info.description}</p>
                </div>
                <div className="ml-2 mt-1">
                  {icon}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100">
          {state.step > GenerationStep.INPUT_FORM && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded text-xs text-gray-500 border border-gray-100">
                <span className="font-bold block text-gray-900">Đề tài:</span>
                {userInfo.topic}
              </div>

              {/* Controls */}
              {state.isStreaming ? (
                <Button disabled className="w-full" isLoading>Đang viết...</Button>
              ) : (
                state.step < GenerationStep.COMPLETED && (
                  <>
                    {/* Feedback / Review Section only for OUTLINE Step */}
                    {state.step === GenerationStep.OUTLINE && (
                      <div className="mb-2 space-y-2 border-t border-gray-100 pt-2">
                        <p className="text-sm font-semibold text-sky-700">Điều chỉnh:</p>

                        <div className="text-xs text-gray-500 italic mb-2">
                          💡 Mẹo: Bạn có thể sửa trực tiếp Dàn ý ở màn hình bên phải trước khi bấm "Chốt & Viết tiếp".
                        </div>

                        <textarea
                          value={outlineFeedback}
                          onChange={(e) => setOutlineFeedback(e.target.value)}
                          placeholder="Hoặc nhập yêu cầu để AI viết lại..."
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                          rows={3}
                        />
                        <Button
                          variant="secondary"
                          onClick={regenerateOutline}
                          disabled={!outlineFeedback.trim()}
                          className="w-full text-sm"
                          icon={<RefreshCw size={14} />}
                        >
                          Yêu cầu AI viết lại
                        </Button>
                      </div>
                    )}

                    <Button onClick={generateNextSection} className="w-full" icon={<ChevronRight size={16} />}>
                      {state.step === GenerationStep.OUTLINE ? 'Chốt Dàn ý & Viết tiếp' : 'Viết phần tiếp theo'}
                    </Button>
                  </>
                )
              )}

              {(state.step >= GenerationStep.OUTLINE) && (
                <Button variant="secondary" onClick={exportToWord} className="w-full" icon={<Download size={16} />}>
                  Xuất file Word
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (checkingAuth) {
    return <div className="h-screen w-screen bg-white flex items-center justify-center"></div>;
  }

  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans text-gray-900">

      {/* Sidebar (Desktop) */}
      <div className="hidden lg:block h-screen sticky top-0 z-20">
        {renderSidebar()}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 flex flex-col h-screen overflow-hidden relative">

        {/* Mobile Header */}
        <div className="lg:hidden mb-4 bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-sky-600 text-xl">SKKN PRO</h1>
            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded-full">
              {STEPS_INFO[state.step < 9 ? state.step : 8].label}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Trợ lý viết SKKN được nâng cấp bởi Trần Hoài Thanh</p>
        </div>

        {state.error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200 break-words whitespace-pre-wrap">
            Lỗi: {state.error}
          </div>
        )}

        {state.step === GenerationStep.INPUT_FORM ? (
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <SKKNForm
              userInfo={userInfo}
              onChange={handleUserChange}
              onSubmit={startGeneration}
              onManualSubmit={handleManualOutlineSubmit}
              isSubmitting={state.isStreaming}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <DocumentPreview
              content={state.fullDocument}
              onUpdate={handleDocumentUpdate}
              // Only allow direct editing in the OUTLINE step and when not streaming
              isEditable={state.step === GenerationStep.OUTLINE && !state.isStreaming}
            />

            {/* Mobile Controls Floating */}
            <div className="lg:hidden absolute bottom-4 left-4 right-4 flex gap-2 shadow-lg">
              {!state.isStreaming && state.step < GenerationStep.COMPLETED && (
                <Button onClick={generateNextSection} className="flex-1 shadow-xl">
                  {state.step === GenerationStep.OUTLINE ? 'Chốt & Tiếp tục' : 'Viết tiếp'}
                </Button>
              )}
              <Button onClick={exportToWord} variant="secondary" className="bg-white shadow-xl text-sky-700">
                <Download size={20} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(key) => {
          localStorage.setItem('USER_GEMINI_API_KEY', key);
          setApiKey(key);
          setShowApiKeyModal(false);
        }}
        existingKey={apiKey}
        isMandatory={!apiKey && !process.env.API_KEY}
      />
    </div>
  );
};

export default App;