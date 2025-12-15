import React, { useState, useEffect } from 'react';
import { Key, Save, X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
    existingKey?: string;
    isMandatory?: boolean; // If true, cannot close without saving (unless key exists)
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
    isOpen,
    onClose,
    onSave,
    existingKey = '',
    isMandatory = false
}) => {
    const [key, setKey] = useState(existingKey);
    const [error, setError] = useState('');

    useEffect(() => {
        setKey(existingKey);
    }, [existingKey]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!key.trim()) {
            setError('Vui lòng nhập API Key');
            return;
        }
        onSave(key.trim());
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                            <Key size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Cấu hình API Key</h2>
                    </div>
                    {!isMandatory && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                        <p className="font-medium mb-1">Tại sao cần API Key?</p>
                        <p className="opacity-90">Ứng dụng sử dụng Google Gemini Advanced để tạo nội dung. Bạn cần nhập API Key của riêng mình để sử dụng không giới hạn.</p>
                        <div className="mt-2 text-xs">
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-bold underline hover:text-blue-900"
                            >
                                Lấy API Key miễn phí tại đây
                            </a>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Nhập khóa API bắt đầu bằng AIza..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                        />
                        {error && (
                            <p className="flex items-center gap-1 text-red-600 text-sm mt-1">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} className="w-full sm:w-auto" icon={<Save size={18} />}>
                            Lưu cấu hình
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
