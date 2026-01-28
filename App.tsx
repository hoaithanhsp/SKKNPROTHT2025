import React, { useState, useEffect, useCallback } from 'react';
import { UserInfo, GenerationStep, GenerationState } from './types';
import { STEPS_INFO, SOLUTION_MODE_PROMPT, FALLBACK_MODELS } from './constants';
import { initializeGeminiChat, sendMessageStream, getFriendlyErrorMessage } from './services/geminiService';
import { SKKNForm } from './components/SKKNForm';
import { DocumentPreview } from './components/DocumentPreview';
import { Button } from './components/Button';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Download, ChevronRight, Wand2, FileText, CheckCircle, RefreshCw, Settings, AlertTriangle } from 'lucide-react';

import { LockScreen } from './components/LockScreen';

const App: React.FC = () => {
  // Lock Screen State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0]);

  // Check LocalStorage on Mount
  useEffect(() => {
    const authState = localStorage.getItem('skkn_app_unlocked');
    if (authState === 'true') {
      setIsUnlocked(true);
    }

    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('selected_model');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiModal(true);
    }
    if (savedModel && FALLBACK_MODELS.includes(savedModel)) {
      setSelectedModel(savedModel);
    }

    setCheckingAuth(false);
  }, []);

  const handleSaveApiKey = (key: string, model: string) => {
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('selected_model', model);
    setApiKey(key);
    setSelectedModel(model);
    setShowApiModal(false);
  };

  const handleUnlock = () => {
    localStorage.setItem('skkn_app_unlocked', 'true');
    setIsUnlocked(true);
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
    focus: '',
    referenceDocuments: '',
    skknTemplate: '',
    specialRequirements: ''
  });

  const [state, setState] = useState<GenerationState>({
    step: GenerationStep.INPUT_FORM,
    messages: [],
    fullDocument: '',
    isStreaming: false,
    error: null
  });

  const [outlineFeedback, setOutlineFeedback] = useState("");

  // Phụ lục riêng biệt
  const [appendixDocument, setAppendixDocument] = useState('');
  const [isAppendixLoading, setIsAppendixLoading] = useState(false);

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
    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    // Initialize chat session silently so it's ready for next steps
    initializeGeminiChat(apiKey, selectedModel);

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
    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    try {
      setState(prev => ({ ...prev, step: GenerationStep.OUTLINE, isStreaming: true, error: null }));

      initializeGeminiChat(apiKey, selectedModel);

      const initMessage = `
Bạn là chuyên gia giáo dục cấp quốc gia, có 20+ năm kinh nghiệm viết, thẩm định và chấm điểm Sáng kiến Kinh nghiệm (SKKN) đạt giải cấp Bộ, cấp tỉnh tại Việt Nam.

NHIỆM VỤ CỦA BẠN:
Lập DÀN Ý CHI TIẾT cho một đề tài SKKN dựa trên thông tin tôi cung cấp. Dàn ý phải đầy đủ, cụ thể, có độ sâu và đảm bảo 4 tiêu chí: Tính MỚI, Tính KHOA HỌC, Tính KHẢ THI, Tính HIỆU QUẢ.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 10 NGUYÊN TẮC VÀNG CHỐNG ĐẠO VĂN & NÂNG TẦM CHẤT LƯỢNG (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CẢNH BÁO: Bạn PHẢI tuân thủ 10 nguyên tắc sau để SKKN có tính "CON NGƯỜI", giọng điệu tự nhiên như một giáo viên thực sự đang viết sáng kiến của chính họ - là tâm huyết và sáng tạo của họ.

1️⃣ KHÔNG SAO CHÉP TRỰC TIẾP (Zero Copy-Paste):
   ❌ SAI: Copy nguyên văn định nghĩa từ Wikipedia, sách giáo khoa.
   ✅ ĐÚNG: Đọc hiểu ý tưởng → Tóm tắt theo tư duy riêng → Viết bằng ngôn ngữ và văn phong riêng biệt.

2️⃣ TƯ DUY VIẾT HOÀN TOÀN MỚI (Unique Thinking):
   ❌ SAI: "Giáo dục là quốc sách hàng đầu", "Thầy cô là người lái đò" (sáo rỗng).
   ✅ ĐÚNG: Viết câu có chiều sâu, phản ánh tư duy cá nhân của người viết.

3️⃣ XỬ LÝ LÝ THUYẾT GIÁO DỤC:
   Công thức: [Diễn giải lý thuyết theo cách mới] + [Ý nghĩa với giáo dục VN hiện tại] + [Liên hệ trực tiếp đề tài tại trường cụ thể].

4️⃣ XỬ LÝ VĂN BẢN PHÁP LUẬT:
   KHÔNG trích dẫn nguyên văn các Điều, Khoản. Hãy TÓM TẮT NỘI HÀM theo cách riêng.

5️⃣ TẠO SỐ LIỆU ĐỘC BẢN & HỢP LÝ:
   - Dùng số lẻ tự nhiên (42.3%, 68.7%) thay vì số tròn (40%, 50%).
   - Tổng tỷ lệ phải = 100%. Kết quả "Sau" tốt hơn "Trước" nhưng không tuyệt đối hóa.

6️⃣ GIẢI PHÁP CỤ THỂ HÓA:
   ❌ Tránh: "Đổi mới phương pháp dạy học" (chung chung).
   ✅ Phải: Đặt tên giải pháp ấn tượng và cụ thể (VD: "Thiết kế chuỗi hoạt động theo mô hình 5E kết hợp Padlet").

7️⃣ KỸ THUẬT PARAPHRASE 5 CẤP ĐỘ:
   1. Thay đổi từ vựng (Học sinh → Người học, Giáo viên → Nhà giáo dục).
   2. Đổi cấu trúc câu chủ động ↔ bị động.
   3. Kết hợp 2-3 câu đơn thành câu phức.
   4. Thêm trạng từ/tính từ biểu cảm.
   5. Đảo ngữ nhấn mạnh.

8️⃣ CẤU TRÚC CÂU PHỨC HỢP:
   Ưu tiên câu ghép, câu phức có nhiều mệnh đề để thể hiện tư duy logic chặt chẽ.

9️⃣ NGÔN NGỮ CHUYÊN NGÀNH:
   Sử dụng từ khóa "đắt" giá: Hiện thực hóa, Tối ưu hóa, Cá nhân hóa, Tích hợp liên môn, Phẩm chất cốt lõi, Năng lực đặc thù, Tư duy đa chiều, Chuyển đổi số, Hệ sinh thái học tập...

🔟 TỰ KIỂM TRA:
   Trong quá trình viết, liên tục tự hỏi: "Đoạn này có quá giống văn mẫu không?". Nếu có → Viết lại ngay.

💡 GIỌNG ĐIỆU YÊU CẦU:
- Viết như một GIÁO VIÊN THỰC SỰ đang chia sẻ sáng kiến của chính mình.
- Thể hiện TÂM HUYẾT, TRĂN TRỞ với nghề và với học sinh.
- Dùng ngôn ngữ TỰ NHIÊN, CHÂN THÀNH, không máy móc hay khuôn mẫu.
- Xen kẽ những suy nghĩ cá nhân, những quan sát thực tế từ lớp học.

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

${userInfo.referenceDocuments ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TÀI LIỆU THAM KHẢO (DO GIÁO VIÊN CUNG CẤP):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dưới đây là nội dung các tài liệu tham khảo mà giáo viên đã tải lên. BẮT BUỘC phải bám sát vào nội dung này để viết SKKN phù hợp và chính xác:

${userInfo.referenceDocuments}

[HẾT TÀI LIỆU THAM KHẢO]
` : ''}

${userInfo.skknTemplate ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MẪU YÊU CẦU SKKN (BẮT BUỘC TUÂN THỦ):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ QUAN TRỌNG: Giáo viên đã cung cấp MẪU YÊU CẦU SKKN bên dưới.
BẠN BẮT BUỘC PHẢI:
1. Bám sát CHÍNH XÁC cấu trúc, các mục, các phần trong mẫu này
2. Tuân theo trình tự và nội dung yêu cầu của từng mục
3. Không thay đổi, bỏ qua hoặc thêm mục nếu mẫu không yêu cầu
4. Viết đúng theo format và quy cách mẫu đề ra

NỘI DUNG MẪU SKKN:
${userInfo.skknTemplate}

[HẾT MẪU SKKN]
` : ''}

${userInfo.specialRequirements ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN (BẮT BUỘC THỰC HIỆN):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ QUAN TRỌNG: Giáo viên đã đưa ra các yêu cầu đặc biệt sau.
BẠN BẮT BUỘC PHẢI TUÂN THỦ NGHIÊM NGẶT:

${userInfo.specialRequirements}

Hãy phân tích kỹ các yêu cầu trên và áp dụng CHÍNH XÁC vào toàn bộ bài viết.

📌 HƯỚNG DẪN XỬ LÝ GIỚI HẠN SỐ TRANG:
- Nếu yêu cầu "giới hạn X trang" → Số trang này tính từ PHẦN I & II đến hết PHẦN V, VI & KẾT LUẬN
- KHÔNG tính dàn ý vào giới hạn số trang
- KHÔNG tính Phụ lục vào giới hạn số trang (Phụ lục được tạo riêng, không giới hạn)
- Phân bổ số trang hợp lý cho NỘI DUNG CHÍNH (không tính Phụ lục):
  + Phần I & II: TỐI ĐA 4 trang (khoảng 10%)
  + Phần III (Thực trạng): TỐI ĐA 3 trang (khoảng 7-8%)
  + Phần IV (Giải pháp): khoảng 55-65% tổng số trang (phần quan trọng nhất)
  + Phần V, VI & Kết luận: khoảng 15-20% tổng số trang

Ví dụ: Nếu giới hạn 40 trang (KHÔNG tính Phụ lục):
  + Phần I & II: 3-4 trang (TỐI ĐA 4 trang)
  + Phần III: 2-3 trang (TỐI ĐA 3 trang)
  + Phần IV: 24-28 trang
  + Phần V, VI & Kết luận: 6-8 trang
  + Phụ lục: TÍNH RIÊNG (không giới hạn)

Các yêu cầu khác:
- Nếu yêu cầu "viết ngắn gọn phần lý thuyết" → Tóm tắt cô đọng phần cơ sở lý luận
- Nếu yêu cầu "thêm nhiều bài toán thực tế" → Bổ sung ví dụ toán thực tế phong phú
- Nếu yêu cầu "tập trung vào giải pháp" → Ưu tiên phần IV với nhiều chi tiết hơn

[HẾT YÊU CẦU ĐẶC BIỆT]
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ YÊU CẦU ĐỊNH DẠNG OUTPUT (BẮT BUỘC):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SAU MỖI CÂU: Phải xuống dòng (Enter 2 lần).
2. SAU MỖI ĐOẠN: Cách 1 dòng trống.
3. KHÔNG viết dính liền (wall of text).
4. Sử dụng gạch đầu dòng và tiêu đề rõ ràng.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CẤU TRÚC SKKN CHUẨN (ÁP DỤNG KHI KHÔNG CÓ MẪU RIÊNG):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 MÔ TẢ SÁNG KIẾN

1. HOÀN CẢNH NẢY SINH SÁNG KIẾN (3-4 trang)

   1.1. Xuất phát từ mục tiêu của giáo dục Việt Nam trong thời kì hiện nay
        → Nghị quyết 29-NQ/TW về đổi mới căn bản, toàn diện giáo dục
        → Chương trình GDPT 2018 - định hướng phát triển năng lực, phẩm chất
        → Yêu cầu đổi mới dạy học môn ${userInfo.subject}
        → Xu hướng chuyển đổi số trong giáo dục
        
   1.2. Xuất phát từ thực tiễn dạy - học hiện nay
        → Thực trạng dạy học môn ${userInfo.subject} tại ${userInfo.school}
        → Khó khăn, thách thức của học sinh ${userInfo.grade}
        → Hạn chế của phương pháp dạy học truyền thống
        → Nhu cầu cấp thiết đổi mới để nâng cao chất lượng

2. CƠ SỞ LÝ LUẬN CỦA VẤN ĐỀ (4-5 trang)

   2.1. Các khái niệm cơ bản liên quan đến đề tài
        → Định nghĩa, thuật ngữ then chốt (DIỄN GIẢI theo cách riêng, không copy)
        
   2.2. Cơ sở pháp lý (TÓM TẮT TINH THẦN, không trích nguyên văn)
        → Luật Giáo dục 2019
        → Thông tư hướng dẫn liên quan
        → Công văn chỉ đạo của Bộ/Sở GD&ĐT
        
   2.3. Cơ sở lý luận giáo dục (Chọn 2-3 lý thuyết PHÙ HỢP)
        → Lý thuyết kiến tạo (Piaget, Vygotsky)
        → Lý thuyết học tập qua trải nghiệm (Kolb)
        → Dạy học phát triển năng lực
        [Diễn giải LÍ THUYẾT + Liên hệ đề tài tại ${userInfo.school}]

3. THỰC TRẠNG VẤN ĐỀ CẦN NGHIÊN CỨU (5-6 trang)

   3.1. Thực trạng chung
        → Điều kiện CSVC tại ${userInfo.school} (${userInfo.facilities})
        → Đặc điểm địa phương ${userInfo.location}
        → Xu hướng dạy học hiện nay
        
   3.2. Thực trạng đối với giáo viên
        → Bảng khảo sát giáo viên (n=X)
        → Thuận lợi - Khó khăn trong giảng dạy
        → Phương pháp đang sử dụng
        
   3.3. Thực trạng đối với học sinh
        → Bảng khảo sát học sinh ${userInfo.grade} (n=Y)  
        → Kết quả học tập trước khi áp dụng sáng kiến
        → Thái độ, hứng thú với môn học
        → Những khó khăn học sinh gặp phải
        
   → Phân tích nguyên nhân (khách quan + chủ quan)

4. CÁC GIẢI PHÁP, BIỆN PHÁP THỰC HIỆN (12-15 trang - PHẦN QUAN TRỌNG NHẤT)

   ⚠️ CHỈ ĐỀ XUẤT 3 GIẢI PHÁP TRỌNG TÂM, ĐẶC SẮC NHẤT - làm hoàn thiện, chỉn chu từng giải pháp.

   GIẢI PHÁP 1: [Tên giải pháp cụ thể, ấn tượng]
   
        1.1. Mục tiêu của giải pháp
             → Mục tiêu về kiến thức
             → Mục tiêu về năng lực
             → Mục tiêu về phẩm chất
             
        1.2. Nội dung và cách thực hiện
             → Mô tả chi tiết bản chất giải pháp
             → Cơ sở khoa học của giải pháp
             → Điểm mới, sáng tạo
             
        1.3. Quy trình thực hiện (5-7 bước cụ thể)
             Bước 1: [Tên bước] - [Chi tiết cách làm]
             Bước 2: [Tên bước] - [Chi tiết cách làm]
             Bước 3: [Tên bước] - [Chi tiết cách làm]
             Bước 4: [Tên bước] - [Chi tiết cách làm]
             Bước 5: [Tên bước] - [Chi tiết cách làm]
             
        1.4. Ví dụ minh họa cụ thể
             → Bài học trong SGK ${userInfo.textbook || "hiện hành"}
             → Hoạt động chi tiết với thời lượng
             → Sản phẩm học sinh mẫu
             
        1.5. Điều kiện thực hiện & Lưu ý
             → Yêu cầu về CSVC (tận dụng ${userInfo.facilities})
             → Điều kiện thành công
             → Những lưu ý quan trọng

   GIẢI PHÁP 2: [Tên giải pháp cụ thể, ấn tượng]
        [Cấu trúc tương tự giải pháp 1, triển khai đầy đủ 5 mục]

   GIẢI PHÁP 3: [Tên giải pháp cụ thể, ấn tượng]
        [Cấu trúc tương tự giải pháp 1, triển khai đầy đủ 5 mục]
   
   → MỐI LIÊN HỆ GIỮA CÁC GIẢI PHÁP (giải thích tính hệ thống, logic)

5. KẾT QUẢ ĐẠT ĐƯỢC (4-5 trang)

   5.1. Mục đích thực nghiệm
        → Kiểm chứng tính hiệu quả của sáng kiến
        → Đánh giá mức độ phù hợp với thực tiễn
        
   5.2. Nội dung thực nghiệm
        → Đối tượng: ${userInfo.researchSubjects || "Học sinh tại đơn vị"}
        → Thời gian: ${userInfo.timeframe || "Năm học hiện tại"}
        → Phạm vi áp dụng
        
   5.3. Tổ chức thực nghiệm
        → Bảng so sánh kết quả TRƯỚC - SAU (dùng số liệu lẻ: 42.3%, 67.8%)
        → Biểu đồ minh họa
        → Phân tích, nhận xét kết quả
        → Ý kiến phản hồi từ học sinh, đồng nghiệp

6. ĐIỀU KIỆN ĐỂ SÁNG KIẾN ĐƯỢC NHÂN RỘNG (1-2 trang)

   → Điều kiện về CSVC
   → Điều kiện về năng lực giáo viên
   → Điều kiện về đối tượng học sinh
   → Khả năng áp dụng tại các trường khác

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 KẾT LUẬN VÀ KHUYẾN NGHỊ (2-3 trang)

1. Kết luận
   → Tóm tắt những đóng góp chính của sáng kiến
   → Điểm mới, điểm sáng tạo
   → Giá trị thực tiễn

2. Khuyến nghị  
   → Với nhà trường
   → Với tổ chuyên môn
   → Với giáo viên
   → Với Phòng/Sở GD&ĐT
   → Hướng phát triển tiếp theo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 TÀI LIỆU THAM KHẢO
   → Liệt kê 8-12 tài liệu theo chuẩn trích dẫn

📎 PHỤ LỤC
   → Phiếu khảo sát
   → Giáo án minh họa
   → Hình ảnh hoạt động
   → Sản phẩm học sinh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YÊU CẦU DÀN Ý (NGẮN GỌN - CHỈ ĐẦU MỤC):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ QUAN TRỌNG: Dàn ý phải NGẮN GỌN, chỉ liệt kê CÁC ĐẦU MỤC CHÍNH.
Nội dung chi tiết sẽ được triển khai ở các bước viết sau.

✓ CHỈ 3 GIẢI PHÁP - liệt kê TÊN giải pháp, không triển khai chi tiết
✓ Mỗi phần chỉ ghi tiêu đề mục và các ý chính (1-2 dòng mỗi ý)
✓ KHÔNG viết đoạn văn dài trong dàn ý
✓ KHÔNG triển khai chi tiết nội dung - chỉ gợi ý hướng đi
✓ Gợi ý danh sách phụ lục cần tạo (dựa trên các giải pháp)
✓ Phù hợp với đặc thù môn ${userInfo.subject} và cấp ${userInfo.level}
✓ Có thể triển khai ngay ở các bước sau

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ĐỊNH DẠNG ĐẦU RA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trình bày theo cấu trúc phân cấp rõ ràng (Markdown):
1. TÊN PHẦN LỚN
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
          nextStep: GenerationStep.PART_IV_SOL2_3
        },
        [GenerationStep.PART_IV_SOL2_3]: {
          // ULTRA MODE - Viết Giải pháp 2 và 3
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 5 (Viết Giải pháp 2-3 - Đang thực hiện).

              Tiếp tục giữ vững vai trò CHUYÊN GIA GIÁO DỤC (ULTRA MODE).
              
              Nhiệm vụ: Viết GIẢI PHÁP 2 và GIẢI PHÁP 3 cho đề tài: "${userInfo.topic}".
              
              ⚠️ LƯU Ý QUAN TRỌNG: Chỉ có 3 GIẢI PHÁP trọng tâm. Đây là 2 giải pháp cuối cùng.
              Hãy làm HOÀN THIỆN, CHỈN CHU từng giải pháp.
              
              Yêu cầu:
              1. Nội dung độc đáo, không trùng lặp với Giải pháp 1.
              2. Tận dụng tối đa CSVC: ${userInfo.facilities}.
              3. Mỗi giải pháp phải có:
                 - Mục tiêu rõ ràng
                 - Nội dung và cách thực hiện chi tiết
                 - Quy trình 5-7 bước cụ thể
                 - Ví dụ minh họa từ SGK ${userInfo.textbook || "hiện hành"}
                 - Điều kiện thực hiện & lưu ý
              4. BẮT BUỘC TUÂN THỦ FORMAT:
                 - Xuống dòng sau mỗi câu.
                 - Xuống 2 dòng sau mỗi đoạn.
                 - Có khung "KẾT THÚC GIẢI PHÁP" ở cuối mỗi giải pháp.
              5. Kết thúc bằng MỐI LIÊN HỆ GIỮA CÁC GIẢI PHÁP (tính hệ thống, logic).
              `,
          nextStep: GenerationStep.PART_V_VI
        },
        [GenerationStep.PART_V_VI]: {
          prompt: `
              BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 7 (Kết luận & Khuyến nghị - Đang thực hiện).

              Tiếp tục viết:
              
              5. KẾT QUẢ ĐẠT ĐƯỢC (4-5 trang):
                 - 5.1. Mục đích thực nghiệm
                 - 5.2. Nội dung thực nghiệm  
                 - 5.3. Tổ chức thực nghiệm (Bảng so sánh TRƯỚC-SAU với số liệu lẻ)
              
              6. ĐIỀU KIỆN ĐỂ SÁNG KIẾN ĐƯỢC NHÂN RỘNG (1-2 trang)
              
              KẾT LUẬN VÀ KHUYẾN NGHỊ (2-3 trang):
                 - Kết luận
                 - Khuyến nghị
              
              TÀI LIỆU THAM KHẢO (8-12 tài liệu)
              
              Đảm bảo số liệu phần Kết quả phải LOGIC và chứng minh được sự tiến bộ so với phần Thực trạng.
              Sử dụng số liệu lẻ (42.3%, 67.8%) không dùng số tròn.
              
              ⚠️ LƯU Ý FORMAT: 
              - Viết từng câu xuống dòng riêng.
              - Tách đoạn rõ ràng.
              - Không viết dính chữ.
              - Menu Navigation: Đánh dấu các bước đã xong (✅), Bước 7 đang làm (🔵).
              
              📌 LƯU Ý: Chưa viết phần PHỤ LỤC chi tiết, chỉ gợi ý danh sách phụ lục.
              Phụ lục chi tiết sẽ được tạo riêng bằng nút "TẠO PHỤ LỤC".`,
          nextStep: GenerationStep.COMPLETED
        }
      };
      const stepConfig = nextStepMap[state.step];
      if (!stepConfig) return;
      currentStepPrompt = stepConfig.prompt;
      nextStepEnum = stepConfig.nextStep;
    }

    if (!currentStepPrompt) return;

    setState(prev => ({ ...prev, isStreaming: true, error: null, step: nextStepEnum }));

    try {
      let sectionText = "\n\n---\n\n"; // Separator
      await sendMessageStream(currentStepPrompt, (chunk) => {
        sectionText += chunk;
        setState(prev => ({
          ...prev,
          fullDocument: prev.fullDocument + chunk
        }));
      });

      // Just set streaming to false, step was already set
      setState(prev => ({ ...prev, isStreaming: false }));

    } catch (error: any) {
      setState(prev => ({ ...prev, isStreaming: false, error: error.message }));
    }
  };

  // Export to Word
  const exportToWord = async () => {
    try {
      const { exportMarkdownToDocx } = await import('./services/docxExporter');
      const filename = `SKKN_${userInfo.topic.substring(0, 30).replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_')}.docx`;
      await exportMarkdownToDocx(state.fullDocument, filename);
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Có lỗi khi xuất file. Vui lòng thử lại.');
    }
  };

  // Generate Appendix - Function riêng để tạo phụ lục
  const generateAppendix = async () => {
    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    setIsAppendixLoading(true);

    // Khởi tạo lại chat session với API key hiện tại (quan trọng khi user thay đổi API key)
    initializeGeminiChat(apiKey, selectedModel);

    try {
      const appendixPrompt = `
        BẮT ĐẦU phản hồi bằng MENU NAVIGATION trạng thái Bước 8 (Tạo Phụ lục chi tiết - Đang thực hiện).

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📎 NHIỆM VỤ: TẠO ĐẦY ĐỦ CÁC TÀI LIỆU PHỤ LỤC
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        Dựa trên NỘI DUNG SKKN đã viết, hãy tạo ĐẦY ĐỦ, CHI TIẾT từng tài liệu phụ lục sau:

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 1: PHIẾU KHẢO SÁT ĐÁNH GIÁ MỨC ĐỘ HỨNG THÚ VÀ HIỆU QUẢ HỌC TẬP CỦA HỌC SINH
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        **PHẦN A: PHIẾU KHẢO SÁT TRƯỚC KHI ÁP DỤNG SÁNG KIẾN**
        
        Tạo bảng khảo sát với format:
        | STT | Nội dung khảo sát | 1 | 2 | 3 | 4 | 5 |
        |-----|-------------------|---|---|---|---|---|
        | 1 | [Nội dung câu hỏi về mức độ hứng thú với môn ${userInfo.subject}] | | | | | |
        | 2 | [Nội dung câu hỏi về khó khăn khi học] | | | | | |
        ...
        
        Ghi chú: 1 = Rất không đồng ý, 2 = Không đồng ý, 3 = Bình thường, 4 = Đồng ý, 5 = Rất đồng ý
        
        Nội dung câu hỏi (10-12 câu):
        - Mức độ hứng thú với môn học
        - Cảm nhận về phương pháp dạy học hiện tại
        - Mức độ tham gia hoạt động học tập
        - Khả năng tự học, tự nghiên cứu
        - Mức độ khó khăn khi tiếp thu kiến thức
        - Hiệu quả ghi nhớ kiến thức
        - Kỹ năng vận dụng kiến thức vào thực tế
        
        **PHẦN B: PHIẾU KHẢO SÁT SAU KHI ÁP DỤNG SÁNG KIẾN**
        
        Tạo bảng khảo sát tương tự với 12-15 câu hỏi về:
        - Mức độ hứng thú sau khi áp dụng sáng kiến
        - Hiệu quả của phương pháp mới
        - Khả năng tiếp thu kiến thức
        - Sự cải thiện kết quả học tập
        - Mong muốn tiếp tục học theo phương pháp mới

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 2: PHIẾU KHẢO SÁT GIÁO VIÊN VỀ THỰC TRẠNG DẠY HỌC
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        - Viết phiếu khảo sát HOÀN CHỈNH với 10-15 câu hỏi
        - Dạng câu hỏi: Trắc nghiệm mức độ (Rất thường xuyên / Thường xuyên / Thỉnh thoảng / Hiếm khi / Không bao giờ)
        - Nội dung: Khảo sát thực trạng sử dụng phương pháp/công nghệ liên quan đến "${userInfo.topic}"
        - Format: Bảng Markdown chuẩn với đầy đủ các cột
        | STT | Nội dung | Rất thường xuyên | Thường xuyên | Thỉnh thoảng | Hiếm khi | Không bao giờ |
        |-----|----------|------------------|--------------|--------------|----------|---------------|
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 3: GIÁO ÁN MINH HỌA (Theo Công văn 5512/BGDĐT ngày 18/12/2020)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        **KHUNG KẾ HOẠCH BÀI DẠY**
        (Kèm theo Công văn số 5512/BGDĐT-GDTrH ngày 18 tháng 12 năm 2020 của Bộ GDĐT)
        
        Trường: ${userInfo.school}
        Tổ: [Tổ chuyên môn]
        Họ và tên giáo viên: ……………………
        
        **TÊN BÀI DẠY: [Chọn một bài cụ thể từ SGK ${userInfo.textbook || "hiện hành"} phù hợp với đề tài]**
        Môn học: ${userInfo.subject}; Lớp: ${userInfo.grade}
        Thời gian thực hiện: [Số tiết]
        
        **I. MỤC TIÊU**
        
        1. Về kiến thức: 
           - Nêu cụ thể nội dung kiến thức học sinh cần học
           
        2. Về năng lực:
           - Năng lực chung: [Tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề]
           - Năng lực đặc thù: [Năng lực đặc thù môn ${userInfo.subject}]
           
        3. Về phẩm chất:
           - Trách nhiệm, chăm chỉ, trung thực trong học tập
        
        **II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU**
        - Giáo viên: [Liệt kê thiết bị, tài liệu GV chuẩn bị]
        - Học sinh: [Liệt kê những gì HS cần chuẩn bị]
        - Điều kiện CSVC: ${userInfo.facilities}
        
        **III. TIẾN TRÌNH DẠY HỌC**
        
        **1. Hoạt động 1: Mở đầu/Khởi động (... phút)**
        a) Mục tiêu: Tạo hứng thú, xác định vấn đề/nhiệm vụ học tập
        b) Nội dung: [Mô tả cụ thể hoạt động]
        c) Sản phẩm: [Kết quả học sinh đạt được]
        d) Tổ chức thực hiện:
           - Giao nhiệm vụ: [GV giao nhiệm vụ cụ thể]
           - Thực hiện: [HS thực hiện, GV theo dõi hỗ trợ]
           - Báo cáo, thảo luận: [HS báo cáo, GV tổ chức thảo luận]
           - Kết luận, nhận định: [GV kết luận, chuyển tiếp]
        
        **2. Hoạt động 2: Hình thành kiến thức mới (... phút)**
        a) Mục tiêu: Giúp HS chiếm lĩnh kiến thức mới
        b) Nội dung: [Mô tả cụ thể các nhiệm vụ học tập]
        c) Sản phẩm: [Kiến thức, kỹ năng HS cần đạt được]
        d) Tổ chức thực hiện:
           - Giao nhiệm vụ: [Chi tiết]
           - Thực hiện: [Chi tiết - TÍCH HỢP CÔNG CỤ/PHƯƠNG PHÁP CỦA GIẢI PHÁP 1]
           - Báo cáo, thảo luận: [Chi tiết]
           - Kết luận, nhận định: [Chi tiết]
        
        **3. Hoạt động 3: Luyện tập (... phút)**
        a) Mục tiêu: Củng cố, vận dụng kiến thức đã học
        b) Nội dung: [Hệ thống câu hỏi, bài tập]
        c) Sản phẩm: [Đáp án, lời giải của HS]
        d) Tổ chức thực hiện: [Chi tiết các bước]
        
        **4. Hoạt động 4: Vận dụng (... phút)**
        a) Mục tiêu: Phát triển năng lực vận dụng vào thực tiễn
        b) Nội dung: [Nhiệm vụ/tình huống thực tiễn]
        c) Sản phẩm: [Báo cáo, sản phẩm của HS]
        d) Tổ chức thực hiện: [Giao về nhà hoặc thực hiện trên lớp]

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 4: PHIẾU HỌC TẬP / RUBRIC ĐÁNH GIÁ
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        - Phiếu học tập mẫu cho hoạt động nhóm
        - Rubric đánh giá sản phẩm học sinh (theo 4 mức: Tốt, Khá, Đạt, Chưa đạt)
        - Bảng tiêu chí đánh giá với các mức độ rõ ràng

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 5: BÀI TẬP MẪU / CÂU HỎI ÔN TẬP
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        - 5-7 bài tập mẫu/câu hỏi ôn tập
        - Có đáp án và hướng dẫn chấm điểm
        - Nếu môn Toán: Sử dụng LaTeX cho công thức

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        📋 PHỤ LỤC 6: BẢNG TỔNG HỢP KẾT QUẢ KHẢO SÁT (MINH CHỨNG CHO BẢNG DỮ LIỆU SKKN)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        - Bảng tổng hợp kết quả khảo sát TRƯỚC thực nghiệm (số lượng, tỷ lệ %)
        - Bảng tổng hợp kết quả khảo sát SAU thực nghiệm
        - Bảng so sánh kết quả TRƯỚC-SAU để minh chứng cho các bảng số liệu trong SKKN
        - Số liệu phải LOGIC và KHỚP với các bảng trong phần Kết quả của SKKN

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚠️ YÊU CẦU FORMAT (BẮT BUỘC):
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        - Markdown chuẩn, bảng dùng |---|
        - BẢNG PHẢI CÓ ĐẦY ĐỦ TẤT CẢ CÁC CỘT, không được bỏ sót cột nào
        - Mỗi hàng trong bảng phải có đủ số ô tương ứng với số cột ở header
        - Bảng phải bắt đầu từ đầu dòng (không thụt lề)
        - Xuống dòng sau mỗi câu
        - Tách đoạn rõ ràng
        - Đánh số phụ lục rõ ràng: PHỤ LỤC 1, PHỤ LỤC 2...
        
        📍 KẾT THÚC bằng dòng:
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ✅ HOÀN THÀNH TẠO TÀI LIỆU PHỤ LỤC
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      let generatedAppendix = "";
      await sendMessageStream(appendixPrompt, (chunk) => {
        generatedAppendix += chunk;
        setAppendixDocument(generatedAppendix);
      });

      setIsAppendixLoading(false);
    } catch (error: any) {
      console.error('Generate Appendix error:', error);
      alert('Có lỗi khi tạo phụ lục. Vui lòng thử lại.');
      setIsAppendixLoading(false);
    }
  };

  // Export Appendix to Word - Xuất phụ lục thành file Word riêng
  const exportAppendixToWord = async () => {
    try {
      const { exportMarkdownToDocx } = await import('./services/docxExporter');
      const filename = `SKKN_Phuluc_${userInfo.topic.substring(0, 30).replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_')}.docx`;
      await exportMarkdownToDocx(appendixDocument, filename);
    } catch (error: any) {
      console.error('Export Appendix error:', error);
      alert('Có lỗi khi xuất file phụ lục. Vui lòng thử lại.');
    }
  };

  // Render Logic
  const renderSidebar = () => {
    return (
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 p-6 flex-shrink-0 flex flex-col h-full overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-sky-600 flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            SKKN PRO
          </h1>
          <p className="text-xs text-gray-900 font-semibold mt-1 tracking-wide opacity-70">Trợ lý viết SKKN được nâng cấp bởi Trần Hoài Thanh</p>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-6">
          {Object.entries(STEPS_INFO).map(([key, info]) => {
            const stepNum = parseInt(key);
            if (stepNum > 8) return null; // Don't show completed logic step

            let statusColor = "text-gray-400 border-gray-200";
            let icon = <div className="w-2 h-2 rounded-full bg-gray-300" />;

            // ERROR STATE HANDLING
            if (state.error && state.step === stepNum) {
              statusColor = "text-red-600 border-red-600 bg-red-50";
              icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
            }
            else if (state.step === stepNum && state.isStreaming) {
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
              <div key={key} className={`flex items-start pl-4 border-l-2 ${statusColor.includes('border-sky') ? 'border-sky-500' : statusColor.includes('border-red') ? 'border-red-500' : 'border-gray-200'} py-1 transition-all`}>
                <div className="flex-1">
                  <h4 className={`text-sm ${statusColor.includes('text-sky') ? 'text-sky-900' : statusColor.includes('text-red') ? 'text-red-700' : 'text-gray-500'} font-medium`}>
                    {state.error && state.step === stepNum ? "Đã dừng do lỗi" : info.label}
                  </h4>
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

              {/* Nút xuất Word SKKN (luôn hiển thị khi đã có nội dung) */}
              {(state.step >= GenerationStep.OUTLINE) && (
                <Button variant="secondary" onClick={exportToWord} className="w-full" icon={<Download size={16} />}>
                  Xuất file Word SKKN
                </Button>
              )}

              {/* Sau khi hoàn thành SKKN: hiển thị các nút phụ lục */}
              {state.step >= GenerationStep.COMPLETED && (
                <>
                  {!appendixDocument ? (
                    <Button
                      onClick={generateAppendix}
                      isLoading={isAppendixLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      icon={<FileText size={16} />}
                    >
                      {isAppendixLoading ? 'Đang tạo phụ lục...' : 'TẠO PHỤ LỤC'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={exportAppendixToWord}
                      className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      icon={<Download size={16} />}
                    >
                      Xuất Word Phụ lục
                    </Button>
                  )}
                </>
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
      <ApiKeyModal
        isOpen={showApiModal}
        onSave={handleSaveApiKey}
        onClose={() => setShowApiModal(false)}
        isDismissible={!!apiKey}
      />

      {/* Header Button for Settings */}
      <button
        onClick={() => setShowApiModal(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 hover:bg-white hover:shadow-xl transition-all"
        title="Cấu hình API Key"
      >
        <Settings size={18} className="text-gray-600" />
        <span className="text-red-500 font-semibold text-sm hidden sm:inline">Lấy API key để sử dụng app</span>
      </button>

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

        {state.error && (() => {
          const errorInfo = getFriendlyErrorMessage({ message: state.error });
          return (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5 mb-4 shadow-sm">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800 text-lg">{errorInfo.title}</h3>
                  <p className="text-red-700 text-sm mt-1">{errorInfo.message}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white/70 rounded-lg p-4 mt-3 border border-red-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">💡 Gợi ý khắc phục:</p>
                <ul className="space-y-2">
                  {errorInfo.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setState(prev => ({ ...prev, error: null }))}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ✕ Đóng thông báo
                </button>
                <button
                  onClick={() => setShowApiModal(true)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
                >
                  🔑 Đổi API Key
                </button>
                <a
                  href="https://ai.google.dev/gemini-api/docs/api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  📖 Hướng dẫn lấy API Key
                </a>
              </div>
            </div>
          );
        })()}

        {state.step === GenerationStep.INPUT_FORM ? (
          <div className="flex-1 flex items-start justify-center overflow-y-auto">
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
    </div>
  );
};

export default App;
