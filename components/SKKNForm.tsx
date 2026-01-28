import React, { useState, useRef, useEffect } from 'react';
import { UserInfo } from '../types';
import { Button } from './Button';
import { InputWithHistory, TextareaWithHistory } from './InputWithHistory';
import { saveFormToHistory } from '../services/inputHistory';
import { BookOpen, School, GraduationCap, PenTool, MapPin, Calendar, Users, Cpu, Target, Monitor, FileUp, Sparkles, ClipboardPaste, Loader2, FileText } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Define worker source for PDF.js
// Using a CDN to avoid complex build configuration for web workers in standard Vite setups
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface Props {
  userInfo: UserInfo;
  onChange: (field: keyof UserInfo, value: string) => void;
  onSubmit: () => void;
  onManualSubmit: (content: string) => void;
  isSubmitting: boolean;
}

interface InputGroupProps {
  label: string;
  icon: any;
  required?: boolean;
  children: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, required, children }) => (
  <div className="w-full">
    <label className="block text-sm font-semibold text-gray-900 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative rounded-md shadow-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      {children}
    </div>
  </div>
);

export const SKKNForm: React.FC<Props> = ({ userInfo, onChange, onSubmit, onManualSubmit, isSubmitting }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [manualContent, setManualContent] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isProcessingRefFiles, setIsProcessingRefFiles] = useState(false);
  const [isProcessingTemplateFile, setIsProcessingTemplateFile] = useState(false);
  const [refFileNames, setRefFileNames] = useState<string[]>([]); // Danh sách tên file đã tải
  const [templateFileName, setTemplateFileName] = useState<string>(''); // Tên file mẫu SKKN
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(e.target.name as keyof UserInfo, e.target.value);
  };

  // Wrapper để lưu lịch sử trước khi submit
  const handleSubmitWithHistory = () => {
    // Lưu tất cả thông tin vào lịch sử
    saveFormToHistory(userInfo as unknown as Record<string, string>);
    // Gọi submit gốc
    onSubmit();
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPdf(arrayBuffer);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        if (result.messages.length > 0) {
          console.warn("Mammoth messages:", result.messages);
        }
      } else {
        // Fallback for text files
        extractedText = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      }

      setManualContent(prev => prev ? prev + '\n\n' + extractedText : extractedText);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Không thể đọc file. Vui lòng thử lại hoặc copy nội dung thủ công.");
    } finally {
      setIsProcessingFile(false);
      // Reset input value to allow re-uploading the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Reference Documents Upload (Multiple PDFs)
  const handleRefFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingRefFiles(true);
    try {
      let allExtractedText = userInfo.referenceDocuments || '';
      const newFileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        let extractedText = '';

        if (file.type === 'application/pdf') {
          extractedText = await extractTextFromPdf(arrayBuffer);
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx')
        ) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } else {
          // Fallback for text files
          extractedText = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsText(file);
          });
        }

        if (extractedText.trim()) {
          allExtractedText += `\n\n=== TÀI LIỆU: ${file.name} ===\n${extractedText}`;
          newFileNames.push(file.name);
        }
      }

      onChange('referenceDocuments', allExtractedText);
      setRefFileNames(prev => [...prev, ...newFileNames]);
    } catch (error) {
      console.error("Error reading reference files:", error);
      alert("Không thể đọc một số file tài liệu. Vui lòng thử lại.");
    } finally {
      setIsProcessingRefFiles(false);
      if (refFileInputRef.current) {
        refFileInputRef.current.value = '';
      }
    }
  };

  // Handle SKKN Template Upload
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingTemplateFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPdf(arrayBuffer);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        // Fallback for text files
        extractedText = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      }

      if (extractedText.trim()) {
        onChange('skknTemplate', extractedText);
        setTemplateFileName(file.name);
      }
    } catch (error) {
      console.error("Error reading template file:", error);
      alert("Không thể đọc file mẫu SKKN. Vui lòng thử lại.");
    } finally {
      setIsProcessingTemplateFile(false);
      if (templateFileInputRef.current) {
        templateFileInputRef.current.value = '';
      }
    }
  };

  // Clear all reference documents
  const clearRefDocuments = () => {
    onChange('referenceDocuments', '');
    setRefFileNames([]);
  };

  // Clear template
  const clearTemplate = () => {
    onChange('skknTemplate', '');
    setTemplateFileName('');
  };

  // Check valid based on mode
  const requiredFields: (keyof UserInfo)[] = ['topic', 'subject', 'level', 'grade', 'school', 'location', 'facilities'];
  const isInfoValid = requiredFields.every(key => userInfo[key].trim() !== '');
  const isManualValid = manualContent.trim().length > 50; // Minimum length check

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-sky-100 overflow-hidden my-8">
      <div className="bg-sky-600 p-6 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Thiết lập Thông tin Sáng kiến</h2>
        <p className="text-sky-100 opacity-90">Cung cấp thông tin chính xác để AI tạo ra bản thảo chất lượng nhất</p>
      </div>

      <div className="p-8 space-y-8">

        {/* SECTION 1: REQUIRED INFO */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide">
            1. Thông tin bắt buộc
          </h3>

          <div className="space-y-5">
            <InputGroup label="Tên đề tài SKKN" icon={PenTool} required>
              <InputWithHistory
                name="topic"
                value={userInfo.topic}
                onChange={handleChange}
                className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder='VD: "Ứng dụng AI để nâng cao hiệu quả dạy học môn Toán THPT"'
                required
              />
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Môn học" icon={BookOpen} required>
                <InputWithHistory
                  name="subject"
                  value={userInfo.subject}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Toán, Ngữ văn, Tiếng Anh..."
                  required
                />
              </InputGroup>

              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="Cấp học" icon={GraduationCap} required>
                  <select
                    name="level"
                    value={userInfo.level}
                    onChange={handleChange}
                    className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border appearance-none text-gray-900"
                  >
                    <option value="">Chọn cấp...</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                    <option value="GDTX">GDTX</option>
                  </select>
                </InputGroup>
                <InputGroup label="Khối lớp" icon={GraduationCap} required>
                  <input
                    type="text"
                    name="grade"
                    value={userInfo.grade}
                    onChange={handleChange}
                    className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                    placeholder="VD: Lớp 12, Khối 6-9"
                  />
                </InputGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Tên trường / Đơn vị" icon={School} required>
                <InputWithHistory
                  name="school"
                  value={userInfo.school}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Trường THPT Nguyễn Du"
                  required
                />
              </InputGroup>

              <InputGroup label="Địa điểm (Huyện, Tỉnh)" icon={MapPin} required>
                <InputWithHistory
                  name="location"
                  value={userInfo.location}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Quận 1, TP.HCM"
                  required
                />
              </InputGroup>
            </div>

            <InputGroup label="Điều kiện CSVC (Tivi, Máy chiếu, WiFi...)" icon={Monitor} required>
              <input
                type="text"
                name="facilities"
                value={userInfo.facilities}
                onChange={handleChange}
                className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: Phòng máy chiếu, Tivi thông minh, Internet ổn định..."
              />
            </InputGroup>
          </div>
        </div>

        {/* SECTION 2: OPTIONAL INFO */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide flex items-center">
            2. Thông tin bổ sung
            <span className="ml-2 text-xs bg-sky-100 text-sky-800 py-1 px-2 rounded-full font-normal capitalize normal-case tracking-normal">
              (Khuyên dùng để tăng chi tiết)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="Sách giáo khoa" icon={BookOpen}>
              <input
                type="text"
                name="textbook"
                value={userInfo.textbook}
                onChange={handleChange}
                className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: Kết nối tri thức, Cánh diều..."
              />
            </InputGroup>

            <InputGroup label="Đối tượng nghiên cứu" icon={Users}>
              <input
                type="text"
                name="researchSubjects"
                value={userInfo.researchSubjects}
                onChange={handleChange}
                className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: 45 HS lớp 12A (thực nghiệm)..."
              />
            </InputGroup>

            <InputGroup label="Thời gian thực hiện" icon={Calendar}>
              <input
                type="text"
                name="timeframe"
                value={userInfo.timeframe}
                onChange={handleChange}
                className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: Năm học 2024-2025"
              />
            </InputGroup>

            <InputGroup label="Ứng dụng AI/Công nghệ" icon={Cpu}>
              <input
                type="text"
                name="applyAI"
                value={userInfo.applyAI}
                onChange={handleChange}
                className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: Sử dụng ChatGPT, Canva, Padlet..."
              />
            </InputGroup>

            <div className="md:col-span-2">
              <InputGroup label="Đặc thù / Trọng tâm đề tài" icon={Target}>
                <input
                  type="text"
                  name="focus"
                  value={userInfo.focus}
                  onChange={handleChange}
                  className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Phát triển năng lực tự học, Chuyển đổi số..."
                />
              </InputGroup>
            </div>
          </div>
        </div>

        {/* SECTION 3: REFERENCE DOCUMENTS & TEMPLATE */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide flex items-center">
            3. Tài liệu tham khảo
            <span className="ml-2 text-xs bg-sky-100 text-sky-800 py-1 px-2 rounded-full font-normal capitalize normal-case tracking-normal">
              (Tùy chọn - Giúp AI bám sát nội dung)
            </span>
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT COLUMN: Reference Documents */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
              {isProcessingRefFiles && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                    <p className="text-sm font-medium text-sky-700">Đang đọc tài liệu...</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Tải lên tài liệu PDF/Word để AI tham khảo:
                </label>
                <div className="flex gap-2 flex-shrink-0">
                  {refFileNames.length > 0 && (
                    <button
                      onClick={clearRefDocuments}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors border border-red-100"
                    >
                      Xóa
                    </button>
                  )}
                  <input
                    type="file"
                    ref={refFileInputRef}
                    onChange={handleRefFileUpload}
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    multiple
                  />
                  <button
                    onClick={() => refFileInputRef.current?.click()}
                    className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded hover:bg-sky-100 transition-colors flex items-center gap-1 border border-sky-100"
                  >
                    <FileUp size={12} /> Tải lên
                  </button>
                </div>
              </div>

              {refFileNames.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Đã tải ({refFileNames.length} file):</p>
                  <div className="flex flex-wrap gap-1">
                    {refFileNames.map((name, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-800 text-xs rounded-full">
                        <FileText size={10} />
                        {name.length > 20 ? name.substring(0, 20) + '...' : name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-gray-500">
                  <FileUp size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium text-gray-600 mb-2">Chưa có tài liệu</p>
                  <div className="text-xs text-left bg-white p-2 rounded border border-gray-100">
                    <p className="font-semibold text-sky-700 mb-1">💡 Gợi ý:</p>
                    <ul className="space-y-0.5 text-gray-600 text-[11px]">
                      <li>• SGK/Sách giáo viên</li>
                      <li>• Tài liệu chuyên môn</li>
                      <li>• Đề kiểm tra/Bài tập</li>
                      <li>• Văn bản pháp quy</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: SKKN Template */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 relative">
              {isProcessingTemplateFile && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-sm font-medium text-amber-700">Đang đọc mẫu...</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Tải lên mẫu yêu cầu SKKN:
                </label>
                <div className="flex gap-2 flex-shrink-0">
                  {templateFileName && (
                    <button
                      onClick={clearTemplate}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors border border-red-100"
                    >
                      Xóa
                    </button>
                  )}
                  <input
                    type="file"
                    ref={templateFileInputRef}
                    onChange={handleTemplateUpload}
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                  />
                  <button
                    onClick={() => templateFileInputRef.current?.click()}
                    className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition-colors flex items-center gap-1 border border-amber-200"
                  >
                    <FileUp size={12} /> Tải lên
                  </button>
                </div>
              </div>

              {templateFileName ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Mẫu SKKN đã tải:</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg">
                    <FileText size={16} />
                    <span className="text-sm font-medium truncate">{templateFileName}</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium">✓ AI sẽ bám sát cấu trúc mẫu này</p>
                </div>
              ) : (
                <div className="text-center py-3 text-gray-500">
                  <FileText size={24} className="mx-auto mb-2 opacity-50 text-amber-400" />
                  <p className="text-xs font-medium text-gray-600 mb-2">Chưa có mẫu</p>
                  <div className="text-xs text-left bg-white p-2 rounded border border-amber-100">
                    <p className="font-semibold text-amber-700 mb-1">📋 Mẫu yêu cầu SKKN:</p>
                    <ul className="space-y-0.5 text-gray-600 text-[11px]">
                      <li>• File Word/PDF mẫu từ Sở/Phòng GD</li>
                      <li>• AI sẽ bám sát cấu trúc mẫu</li>
                      <li>• Nếu không có, dùng mẫu chuẩn</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: SPECIAL REQUIREMENTS */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide flex items-center">
            4. Yêu cầu khác
            <span className="ml-2 text-xs bg-purple-100 text-purple-800 py-1 px-2 rounded-full font-normal capitalize normal-case tracking-normal">
              (Tùy chọn - AI sẽ tuân thủ nghiêm ngặt)
            </span>
          </h3>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <textarea
              name="specialRequirements"
              value={userInfo.specialRequirements || ''}
              onChange={handleChange}
              placeholder="Nhập các yêu cầu đặc biệt của bạn. Ví dụ:
• Giới hạn SKKN trong 25-30 trang
• Viết ngắn gọn phần cơ sở lý luận (khoảng 3 trang)
• Thêm nhiều bài toán thực tế, ví dụ minh họa
• Tập trung vào giải pháp ứng dụng AI
• Bổ sung thêm bảng biểu, số liệu thống kê
• Viết theo phong cách học thuật nghiêm túc..."
              className="w-full h-32 p-3 border border-purple-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white placeholder-gray-400 resize-none"
            />
            <p className="mt-2 text-xs text-purple-700">
              💡 AI sẽ phân tích và thực hiện NGHIÊM NGẶT các yêu cầu bạn đưa ra trong suốt quá trình viết SKKN.
            </p>
          </div>
        </div>

        {/* SECTION 5: MODE SELECTION */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-lg font-bold text-sky-800 mb-4">Tùy chọn khởi tạo</h3>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${mode === 'ai'
                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              <Sparkles size={20} />
              AI Lập Dàn Ý Chi Tiết
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${mode === 'manual'
                ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              <FileUp size={20} />
              Sử Dụng Dàn Ý Có Sẵn
            </button>
          </div>

          {mode === 'ai' ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>Hệ thống AI sẽ tự động phân tích đề tài và tạo ra dàn ý chi tiết gồm 6 phần chuẩn Bộ GD&ĐT. Bạn có thể chỉnh sửa lại sau khi tạo xong.</p>
              </div>
              <Button
                onClick={handleSubmitWithHistory}
                disabled={!isInfoValid || isSubmitting}
                isLoading={isSubmitting}
                className="w-full py-4 text-lg font-bold shadow-sky-500/30 shadow-lg"
              >
                {isSubmitting ? 'Đang khởi tạo...' : '🚀 Bắt đầu lập dàn ý ngay'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                {isProcessingFile && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                      <p className="text-sm font-medium text-sky-700">Đang đọc tài liệu...</p>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">Nội dung dàn ý của bạn:</label>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".txt,.md,.docx,.pdf"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1.5 rounded hover:bg-sky-100 transition-colors flex items-center gap-1.5 border border-sky-100"
                    >
                      <FileUp size={14} /> Upload (.docx, .pdf, .txt)
                    </button>
                  </div>
                </div>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Nội dung sẽ xuất hiện ở đây sau khi upload file, hoặc bạn có thể dán (paste) trực tiếp..."
                  className="w-full h-64 p-3 border border-gray-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500 font-mono"
                />
              </div>
              <Button
                onClick={() => onManualSubmit(manualContent)}
                disabled={!isInfoValid || !isManualValid || isProcessingFile}
                className="w-full py-4 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-green-500/30 shadow-lg"
                icon={<ClipboardPaste size={20} />}
              >
                Sử dụng Dàn ý này & Tiếp tục
              </Button>
              {!isManualValid && (
                <p className="text-center text-xs text-gray-500">Vui lòng nhập nội dung dàn ý (tối thiểu 50 ký tự)</p>
              )}
            </div>
          )}

          {!isInfoValid && (
            <p className="text-center text-red-500 text-sm mt-4">Vui lòng điền đầy đủ các thông tin bắt buộc (*) ở phần trên trước khi tiếp tục.</p>
          )}
        </div>
      </div>
    </div>
  );
};
