import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
  initialKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, initialKey = '' }) => {
  const [key, setKey] = useState(initialKey);

  useEffect(() => {
    setKey(initialKey);
  }, [initialKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-sky-50">
            <Key className="w-6 h-6 text-sky-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Cấu hình Gemini API Key</h2>
          <p className="text-sm text-gray-500 mt-2">
            Nhập API Key của bạn để sử dụng ứng dụng. Key được lưu an toàn trên trình duyệt của bạn (LocalStorage).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={() => onSave(key)} 
              disabled={!key.trim()} 
              className="w-full shadow-lg shadow-sky-200"
            >
              Lưu & Bắt đầu
            </Button>
          </div>
          
          <p className="text-xs text-center text-gray-400">
            Chưa có key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">Lấy key miễn phí tại đây</a>
          </p>
        </div>
      </div>
    </div>
  );
};
