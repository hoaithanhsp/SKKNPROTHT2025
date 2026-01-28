import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Edit, Save, X, FileText } from 'lucide-react';
import { Button } from './Button';

/**
 * Format content để đảm bảo xuống dòng đúng cách
 * Xử lý các pattern thường gặp trong văn bản AI output
 */
function formatContent(text: string): string {
  if (!text) return text;

  let formatted = text;

  // Pattern 1: Xuống dòng trước "Bước X:" nếu không ở đầu dòng
  formatted = formatted.replace(/([^\n])(\s*Bước\s+\d+\s*:)/gi, '$1\n\n$2');

  // Pattern 2: Xuống dòng trước các mục số lớn "1.", "2.", "3." etc nếu không ở đầu dòng
  // Chỉ áp dụng khi theo sau là chữ in hoa (tiêu đề mới)
  formatted = formatted.replace(/([^\n\d])(\s*\d+\.\s+[A-ZĐÀÁẢÃẠ])/g, '$1\n\n$2');

  // Pattern 3: Xuống dòng trước các tiêu đề có số như "1.1.", "1.2.", "2.1." etc
  formatted = formatted.replace(/([^\n])(\s*\d+\.\d+\.?\s+[A-ZĐ])/g, '$1\n\n$2');

  // Pattern 4: Xuống dòng trước dấu gạch ngang "-" khi là mục lớn (theo sau là chữ in hoa)
  // KHÔNG thêm xuống dòng nếu đã ở đầu dòng
  formatted = formatted.replace(/([^\n-])(\s*-\s+[A-ZĐÀÁẢÃẠ])/g, '$1\n\n$2');

  // Pattern 5: Xuống dòng trước "+)" khi là mục con
  // KHÔNG thêm xuống dòng nếu đã ở đầu dòng
  formatted = formatted.replace(/([^\n+])(\s*\+\)\s+)/g, '$1\n$2');

  // Pattern 6: Xuống dòng trước các keyword quan trọng
  const keywords = [
    'Nhiệm vụ:',
    'Hoạt động nhóm:',
    'Công thức minh họa:',
    'Kiểm tra:',
    'Ví dụ:',
    'Lưu ý:',
    'Ghi nhận kết quả:',
    'Báo cáo:',
    'Công cụ/tài liệu hỗ trợ:',
    'Phần mềm:',
    'Prompt mẫu cho Gemini:',
  ];

  keywords.forEach(keyword => {
    const regex = new RegExp(`([^\\n])\\s*(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    formatted = formatted.replace(regex, '$1\n\n$2');
  });

  // Pattern 7: Đảm bảo sau dấu "." có xuống dòng nếu tiếp theo là chữ in hoa (câu mới)
  // Chỉ áp dụng khi có nhiều spaces liên tiếp (dấu hiệu của đoạn văn bị dính)
  formatted = formatted.replace(/\.(\s{2,})([A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])/g, '.\n\n$2');

  // Dọn dẹp: Loại bỏ quá nhiều dòng trống liên tiếp (giữ tối đa 2)
  formatted = formatted.replace(/\n{4,}/g, '\n\n\n');

  return formatted;
}

interface Props {
  content: string;
  onUpdate?: (newContent: string) => void;
  isEditable?: boolean;
}

export const DocumentPreview: React.FC<Props> = ({ content, onUpdate, isEditable = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync content when not editing (e.g. streaming updates)
  useEffect(() => {
    if (!isEditing) {
      setTempContent(content);
    }
  }, [content, isEditing]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(tempContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  const toggleEdit = () => {
    if (isEditing) {
      handleCancel();
    } else {
      setIsEditing(true);
      // Focus textarea after render
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Memoize formatted content để tránh tính toán lại mỗi lần render
  const formattedContent = useMemo(() => formatContent(content), [content]);

  return (
    <div className="bg-white shadow-xl rounded-xl border border-gray-200 min-h-[600px] h-full overflow-hidden flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <span className="text-gray-500 text-sm font-medium flex items-center gap-2">
            <FileText size={14} />
            Bản thảo SKKN.docx
          </span>
        </div>

        {isEditable && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <X size={14} /> Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Save size={14} /> Lưu thay đổi
                </button>
              </>
            ) : (
              <button
                onClick={toggleEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded hover:bg-sky-100 transition-colors"
              >
                <Edit size={14} /> Chỉnh sửa
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            className="w-full h-full p-8 md:p-12 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-800 bg-gray-50 overflow-y-auto custom-scrollbar"
            placeholder="Nhập nội dung tại đây..."
            spellCheck={false}
          />
        ) : (
          <div className="h-full overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar p-8 md:p-12">
            {content ? (
              <article className="prose prose-sky prose-lg max-w-none text-gray-900 pb-12">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {formattedContent}
                </ReactMarkdown>
                <div ref={bottomRef} />
              </article>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-sky-500 rounded-full animate-spin"></div>
                <p>Đang chờ nội dung từ chuyên gia AI...</p>
              </div>
            )}
          </div>
        )}

        {/* Overlay for save hint */}
        {isEditing && (
          <div className="absolute bottom-4 right-6 bg-black/75 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
            Nhấn "Lưu thay đổi" để cập nhật nội dung cho AI
          </div>
        )}
      </div>
    </div>
  );
};
