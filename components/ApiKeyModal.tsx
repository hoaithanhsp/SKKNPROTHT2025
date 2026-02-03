import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, X, Zap, Cpu, Sparkles, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { FALLBACK_MODELS, MODEL_INFO } from '../constants';
import { apiKeyManager, ApiKeyInfo, ApiKeyStatus } from '../services/apiKeyManager';

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

const StatusIcon: React.FC<{ status: ApiKeyStatus }> = ({ status }) => {
    switch (status) {
        case 'active':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'cooldown':
            return <Clock className="w-4 h-4 text-yellow-500" />;
    }
};

const StatusBadge: React.FC<{ status: ApiKeyStatus }> = ({ status }) => {
    const styles = {
        active: 'bg-green-100 text-green-700',
        error: 'bg-red-100 text-red-700',
        cooldown: 'bg-yellow-100 text-yellow-700'
    };
    const labels = {
        active: 'Hoạt động',
        error: 'Lỗi',
        cooldown: 'Đang chờ'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, isDismissible = true }) => {
    const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0]);
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Load keys khi modal mở
    useEffect(() => {
        if (isOpen) {
            loadKeys();
            const savedModel = localStorage.getItem('selected_model');
            if (savedModel && FALLBACK_MODELS.includes(savedModel)) {
                setSelectedModel(savedModel);
            }
        }
    }, [isOpen]);

    const loadKeys = () => {
        apiKeyManager.loadFromStorage();
        setKeys(apiKeyManager.getAllKeys());
    };

    const handleAddKey = () => {
        setError('');
        setSuccessMessage('');

        if (!newKeyValue.trim()) {
            setError('Vui lòng nhập API Key');
            return;
        }

        const result = apiKeyManager.addKey(newKeyValue.trim(), newKeyName.trim());
        if (result.success) {
            setNewKeyName('');
            setNewKeyValue('');
            setSuccessMessage(result.message);
            loadKeys();
            setTimeout(() => setSuccessMessage(''), 3000);
        } else {
            setError(result.message);
        }
    };

    const handleRemoveKey = (key: string) => {
        setError('');
        setSuccessMessage('');
        const result = apiKeyManager.removeKey(key);
        if (result.success) {
            setSuccessMessage(result.message);
            loadKeys();
            setTimeout(() => setSuccessMessage(''), 3000);
        } else {
            setError(result.message);
        }
    };

    const handleResetKey = (key: string) => {
        setError('');
        const result = apiKeyManager.resetKey(key);
        if (result.success) {
            setSuccessMessage(result.message);
            loadKeys();
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    // Đặt key cụ thể làm active
    const handleSetActiveKey = (key: string) => {
        setError('');
        const result = apiKeyManager.setActiveKey(key);
        if (result.success) {
            setSuccessMessage(result.message);
            loadKeys();
            setTimeout(() => setSuccessMessage(''), 3000);
        } else {
            setError(result.message);
        }
    };

    // Reset tất cả key về active
    const handleResetAllKeys = () => {
        setError('');
        const result = apiKeyManager.resetAllKeys();
        if (result.success) {
            setSuccessMessage('Đã reset tất cả key về trạng thái hoạt động');
            loadKeys();
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleSave = () => {
        localStorage.setItem('selected_model', selectedModel);
        const activeKey = apiKeyManager.getActiveKey();
        if (activeKey) {
            onSave(activeKey, selectedModel);
        } else if (keys.length === 0) {
            setError('Vui lòng thêm ít nhất 1 API Key');
        } else {
            onClose();
        }
    };

    const stats = apiKeyManager.getKeyStats();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    </div>

                    {/* API Keys Section */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                📋 Danh sách API Key ({stats.total}/10)
                            </label>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3 h-3" /> {stats.active}
                                </span>
                                <span className="flex items-center gap-1 text-yellow-600">
                                    <Clock className="w-3 h-3" /> {stats.cooldown}
                                </span>
                                <span className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="w-3 h-3" /> {stats.error}
                                </span>
                                {/* Nút reset tất cả key */}
                                {(stats.cooldown > 0 || stats.error > 0) && (
                                    <button
                                        onClick={handleResetAllKeys}
                                        className="flex items-center gap-1 px-2 py-1 text-sky-600 hover:bg-sky-50 rounded transition-colors ml-2"
                                        title="Reset tất cả key về trạng thái hoạt động"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Reset tất cả</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Key List */}
                        {keys.length > 0 ? (
                            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                {keys.map((keyInfo, index) => (
                                    <div
                                        key={keyInfo.key}
                                        className={`flex items-center gap-3 p-3 rounded-lg border ${index === apiKeyManager.getCurrentIndex() && keyInfo.status === 'active'
                                            ? 'border-sky-300 bg-sky-50'
                                            : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <StatusIcon status={keyInfo.status} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 truncate">
                                                    {keyInfo.name}
                                                </span>
                                                <StatusBadge status={keyInfo.status} />
                                                {index === apiKeyManager.getCurrentIndex() && keyInfo.status === 'active' && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded-full">
                                                        Đang dùng
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {apiKeyManager.maskKey(keyInfo.key)}
                                            </p>
                                            {keyInfo.lastError && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    Lỗi: {keyInfo.lastError}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Nút đặt làm key chính - chỉ hiển thị nếu không phải key đang dùng */}
                                            {!(index === apiKeyManager.getCurrentIndex() && keyInfo.status === 'active') && keyInfo.status === 'active' && (
                                                <button
                                                    onClick={() => handleSetActiveKey(keyInfo.key)}
                                                    className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                                                    title="Đặt làm key chính"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {keyInfo.status !== 'active' && (
                                                <button
                                                    onClick={() => handleResetKey(keyInfo.key)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="Kích hoạt lại"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveKey(keyInfo.key)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Xóa key"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg mb-4">
                                <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Chưa có API key nào</p>
                            </div>
                        )}

                        {/* Add New Key Form */}
                        {stats.total < 10 && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="Tên (tùy chọn)"
                                        className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none text-sm"
                                    />
                                    <input
                                        type="password"
                                        value={newKeyValue}
                                        onChange={(e) => setNewKeyValue(e.target.value)}
                                        placeholder="API Key (AIza...)"
                                        className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none text-sm font-mono"
                                    />
                                </div>
                                <button
                                    onClick={handleAddKey}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm API Key
                                </button>
                            </div>
                        )}

                        {/* Messages */}
                        {error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                {successMessage}
                            </div>
                        )}

                        {/* Help text */}
                        <div className="mt-4 text-xs text-gray-500 space-y-1">
                            <p className="text-amber-600 font-medium">
                                ⭐ Khuyến nghị: Nhập nhiều API key từ nhiều tài khoản Google khác nhau để có trải nghiệm sử dụng app mượt mà nhất!
                            </p>
                            <p>
                                💡 Hệ thống sẽ tự động chuyển sang key tiếp theo khi key hiện tại gặp lỗi quota/rate limit.
                            </p>
                            <p>
                                Chưa có key? <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">Lấy miễn phí tại đây</a>.
                            </p>
                            <p>
                                📖 <a href="https://tinyurl.com/hdsdpmTHT" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">Xem hướng dẫn lấy API key</a>
                            </p>
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
                    <Button onClick={handleSave} disabled={keys.length === 0}>
                        Lưu cấu hình
                    </Button>
                </div>
            </div>
        </div>
    );
};
