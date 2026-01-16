import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, X, Zap, Cpu, Sparkles } from 'lucide-react';
import { FALLBACK_MODELS, MODEL_INFO } from '../constants';

interface ApiKeyModalProps {
    isOpen: boolean;
    onSave: (key: string, selectedModel: string) => void;
    onClose: () => void;
    isDismissible?: boolean;
}

const ModelIcon: React.FC<{ modelId: string }> = ({ modelId }) => {
    if (modelId.includes('3-flash')) return <Zap className="w-5 h-5" />;
    if (modelId.includes('3-pro')) return <Sparkles className="w-5 h-5" />;
    return <Cpu className="w-5 h-5" />;
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, isDismissible = true }) => {
    const [key, setKey] = useState('');
    const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0]);

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        const savedModel = localStorage.getItem('selected_model');
        if (savedKey) setKey(savedKey);
        if (savedModel && FALLBACK_MODELS.includes(savedModel)) {
            setSelectedModel(savedModel);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (key.trim()) {
            localStorage.setItem('selected_model', selectedModel);
            onSave(key.trim(), selectedModel);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
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
                        <h2 className="text-xl font-bold text-gray-900">Thiết lập Model & API Key</h2>
                        <p className="text-sm text-gray-500">Kết nối với Google Gemini AI</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Model Selection Cards */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Chọn Model AI
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {FALLBACK_MODELS.map((modelId) => {
                                const info = MODEL_INFO[modelId];
                                const isSelected = selectedModel === modelId;
                                return (
                                    <button
                                        key={modelId}
                                        onClick={() => setSelectedModel(modelId)}
                                        className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                                ? 'border-sky-500 bg-sky-50 shadow-md'
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            <ModelIcon modelId={modelId} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${isSelected ? 'text-sky-700' : 'text-gray-900'}`}>
                                                    {info?.name || modelId}
                                                </span>
                                                {info?.isDefault && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {info?.description || ''}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            💡 Nếu model gặp lỗi, hệ thống sẽ tự động chuyển sang model tiếp theo.
                        </p>
                    </div>

                    {/* API Key Input */}
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
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p>
                                Key được lưu an toàn trong trình duyệt của bạn.
                            </p>
                            <p>
                                Chưa có key? <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">Lấy miễn phí tại đây</a>.
                            </p>
                            <p>
                                📖 <a href="https://tinyurl.com/hdsdpmTHT" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">Xem hướng dẫn lấy API key</a>
                            </p>
                        </div>
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
