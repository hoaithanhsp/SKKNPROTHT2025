import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export const DocumentPreview: React.FC<Props> = ({ content }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when content adds up (optional, nice for streaming)
  // But for reading a doc, maybe better to let user scroll. 
  // Let's scroll only if we are near the bottom to avoid annoying jumps reading up.
  // Actually, for a document writer, auto-scrolling can be annoying. Let's not auto-scroll the whole window.

  return (
    <div className="bg-white shadow-xl rounded-xl border border-gray-200 min-h-[600px] h-full overflow-hidden flex flex-col">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <span className="text-gray-500 text-sm font-medium">Bản thảo SKKN.docx</span>
        <div className="w-8"></div> {/* Spacer for center alignment */}
      </div>
      
      <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
        {content ? (
          <article className="prose prose-sky prose-lg max-w-none text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
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
    </div>
  );
};