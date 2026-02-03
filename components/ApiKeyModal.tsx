import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, X, Zap, Cpu, Sparkles, ExternalLink } from 'lucide-react';
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
    const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0]);
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    // Load từ localStorage khi modal mở
    useEffect(() => {
        if (isOpen) {
            const savedKey = localStorage.getItem('gemini_api_key') || '';
            const savedModel = localStorage.getItem('selected_model');

            setApiKey(savedKey);
            if (savedModel && FALLBACK_MODELS.includes(savedModel)) {
                setSelectedModel(savedModel);
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        const trimmedKey = apiKey.trim();

        if (!trimmedKey) {
            setError('Vui lòng nhập API Key');
            return;
        }

        if (!trimmedKey.startsWith('AIza')) {
            setError('API Key không hợp lệ. Key phải bắt đầu bằng "AIza..."');
            return;
        }

        // Lưu vào localStorage
        localStorage.setItem('gemini_api_key', trimmedKey);
        localStorage.setItem('selected_model', selectedModel);

        setError('');
        onSave(trimmedKey, selectedModel);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                    {isDismissible && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-sky-100 rounded-lg">
                            <Key className="w-6 h-6 text-sky-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Thiết lập Model & API Key</h2>
                            <p className="text-sm text-gray-500">Kết nối với Google Gemini AI</p>
                        </div>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Model Selection */}
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
                        <p className="text-xs text-gray-500 mt-2 italic">
                            💡 Nếu model đang chọn bị lỗi/quá tải, hệ thống sẽ tự động thử các model khác theo thứ tự.
                        </p>
                    </div>

                    {/* API Key Input */}
                    <div className="border-t pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔑 API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setError('');
                            }}
                            placeholder="Nhập API Key (AIza...)"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none text-sm font-mono"
                        />

                        {/* Error message */}
                        {error && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Help text */}
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-semibold text-amber-800 mb-2">
                                📖 Hướng dẫn lấy API Key miễn phí:
                            </p>
                            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                                <li>Truy cập Google AI Studio</li>
                                <li>Đăng nhập bằng tài khoản Google</li>
                                <li>Nhấn "Create API Key" hoặc "Get API Key"</li>
                                <li>Copy key và dán vào ô trên</li>
                            </ol>
                            <a
                                href="https://aistudio.google.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                            >
                                <ExternalLink size={16} />
                                Lấy API Key tại đây
                            </a>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                            <p>💡 API Key được lưu trên trình duyệt của bạn, không gửi đến bất kỳ server nào khác ngoài Google AI.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                    {isDismissible && (
                        <Button variant="secondary" onClick={onClose}>
                            Đóng
                        </Button>
                    )}
                    <Button onClick={handleSave}>
                        Lưu cấu hình
                    </Button>
                </div>
            </div>
        </div>
    );
};
