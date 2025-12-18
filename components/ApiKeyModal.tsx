import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onSave: (key: string) => void;
    onClose: () => void;
    isDismissible?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, isDismissible = true }) => {
    const [key, setKey] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) setKey(savedKey);
    }, [isOpen]);

    const handleSave = () => {
        if (key.trim()) {
            onSave(key.trim());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                {isDismissible && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-sky-100 rounded-lg">
                        <Key className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Cấu hình API Key</h2>
                        <p className="text-sm text-gray-500">Kết nối với Google Gemini Pro</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Google Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Nhập API Key của bạn (AIza...)"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Key được lưu an toàn trong trình duyệt của bạn.
                            <br />
                            Chưa có key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Lấy miễn phí tại đây</a>.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        {isDismissible && (
                            <Button variant="secondary" onClick={onClose}>
                                Đóng
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={!key.trim()}>
                            Lưu cấu hình
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
