/**
 * API Key Manager - Quản lý nhiều API key với cơ chế xoay vòng
 */

// Trạng thái của một API key
export type ApiKeyStatus = 'active' | 'error' | 'cooldown';

// Thông tin một API key
export interface ApiKeyInfo {
    key: string;
    name: string;
    status: ApiKeyStatus;
    lastError?: string;
    errorCount: number;
    cooldownUntil?: number; // Timestamp khi hết cooldown
    addedAt: number;
}

// Kết quả khi xoay key
export interface ApiKeyRotationResult {
    success: boolean;
    hasMoreKeys: boolean;
    newKey?: string;
    message: string;
}

// Callback khi có sự kiện
export type KeyRotationCallback = (info: { fromKey: string; toKey: string; reason: string }) => void;
export type AllKeysFailedCallback = () => void;

const STORAGE_KEY = 'gemini_api_keys';
const MAX_KEYS = 10;
const COOLDOWN_DURATION = 60 * 1000; // 1 phút cooldown
const MAX_ERROR_COUNT = 3; // Số lần lỗi tối đa trước khi đưa vào cooldown

class ApiKeyManager {
    private keys: ApiKeyInfo[] = [];
    private currentIndex: number = 0;
    private onKeyRotation?: KeyRotationCallback;
    private onAllKeysFailed?: AllKeysFailedCallback;

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Đăng ký callback khi có key rotation
     */
    setOnKeyRotation(callback: KeyRotationCallback) {
        this.onKeyRotation = callback;
    }

    /**
     * Đăng ký callback khi tất cả key đều fail
     */
    setOnAllKeysFailed(callback: AllKeysFailedCallback) {
        this.onAllKeysFailed = callback;
    }

    /**
     * Load danh sách key từ localStorage
     */
    loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.keys = data.keys || [];
                this.currentIndex = data.currentIndex || 0;

                // Reset các key đã hết cooldown
                this.checkAndResetCooldowns();
            }

            // Migration: nếu có key cũ theo format cũ
            const oldKey = localStorage.getItem('gemini_api_key');
            if (oldKey && this.keys.length === 0) {
                this.addKey(oldKey, 'Key mặc định');
            }
        } catch (e) {
            console.error('Lỗi load API keys:', e);
            this.keys = [];
            this.currentIndex = 0;
        }
    }

    /**
     * Lưu danh sách key vào localStorage
     */
    saveToStorage(): void {
        try {
            const data = {
                keys: this.keys,
                currentIndex: this.currentIndex
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            // Cập nhật key cũ để tương thích ngược
            const activeKey = this.getActiveKey();
            if (activeKey) {
                localStorage.setItem('gemini_api_key', activeKey);
            }
        } catch (e) {
            console.error('Lỗi lưu API keys:', e);
        }
    }

    /**
     * Kiểm tra và reset các key đã hết cooldown
     */
    private checkAndResetCooldowns(): void {
        const now = Date.now();
        let hasChanges = false;

        this.keys.forEach(keyInfo => {
            if (keyInfo.status === 'cooldown' && keyInfo.cooldownUntil && keyInfo.cooldownUntil <= now) {
                keyInfo.status = 'active';
                keyInfo.errorCount = 0;
                keyInfo.cooldownUntil = undefined;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveToStorage();
        }
    }

    /**
     * Thêm một API key mới
     */
    addKey(key: string, name?: string): { success: boolean; message: string } {
        // Kiểm tra đã đạt giới hạn chưa
        if (this.keys.length >= MAX_KEYS) {
            return { success: false, message: `Đã đạt giới hạn ${MAX_KEYS} key` };
        }

        // Kiểm tra key đã tồn tại chưa
        const trimmedKey = key.trim();
        if (this.keys.some(k => k.key === trimmedKey)) {
            return { success: false, message: 'Key này đã tồn tại' };
        }

        // Validate format cơ bản
        if (!trimmedKey || trimmedKey.length < 10) {
            return { success: false, message: 'Key không hợp lệ' };
        }

        const newKey: ApiKeyInfo = {
            key: trimmedKey,
            name: name?.trim() || `Key ${this.keys.length + 1}`,
            status: 'active',
            errorCount: 0,
            addedAt: Date.now()
        };

        this.keys.push(newKey);
        this.saveToStorage();

        return { success: true, message: 'Đã thêm key thành công' };
    }

    /**
     * Xóa một API key
     */
    removeKey(key: string): { success: boolean; message: string } {
        const index = this.keys.findIndex(k => k.key === key);
        if (index === -1) {
            return { success: false, message: 'Không tìm thấy key' };
        }

        // Nếu xóa key đang active, chuyển sang key tiếp theo
        if (index === this.currentIndex) {
            if (this.keys.length > 1) {
                this.currentIndex = (this.currentIndex + 1) % (this.keys.length - 1);
            } else {
                this.currentIndex = 0;
            }
        } else if (index < this.currentIndex) {
            this.currentIndex--;
        }

        this.keys.splice(index, 1);
        this.saveToStorage();

        return { success: true, message: 'Đã xóa key' };
    }

    /**
     * Lấy key đang active
     */
    getActiveKey(): string | null {
        this.checkAndResetCooldowns();

        if (this.keys.length === 0) {
            return null;
        }

        // Tìm key active gần nhất từ currentIndex
        for (let i = 0; i < this.keys.length; i++) {
            const idx = (this.currentIndex + i) % this.keys.length;
            const keyInfo = this.keys[idx];
            if (keyInfo.status === 'active') {
                this.currentIndex = idx;
                return keyInfo.key;
            }
        }

        return null;
    }

    /**
     * Đánh dấu key bị lỗi và xoay sang key tiếp theo
     */
    markKeyError(key: string, errorType: string): ApiKeyRotationResult {
        const keyInfo = this.keys.find(k => k.key === key);
        if (!keyInfo) {
            return { success: false, hasMoreKeys: false, message: 'Không tìm thấy key' };
        }

        keyInfo.lastError = errorType;
        keyInfo.errorCount++;

        // Nếu vượt quá số lần lỗi tối đa, đưa vào cooldown
        if (keyInfo.errorCount >= MAX_ERROR_COUNT) {
            keyInfo.status = 'cooldown';
            keyInfo.cooldownUntil = Date.now() + COOLDOWN_DURATION;
        } else if (errorType === 'INVALID_API_KEY') {
            // Invalid key thì đánh dấu error ngay
            keyInfo.status = 'error';
        }

        this.saveToStorage();

        // Thử xoay sang key tiếp theo
        return this.rotateToNextKey(errorType);
    }

    /**
     * Xoay sang key tiếp theo
     */
    rotateToNextKey(reason: string = 'manual'): ApiKeyRotationResult {
        this.checkAndResetCooldowns();

        const fromKey = this.keys[this.currentIndex]?.key;

        // Tìm key active tiếp theo
        for (let i = 1; i <= this.keys.length; i++) {
            const nextIndex = (this.currentIndex + i) % this.keys.length;
            const nextKey = this.keys[nextIndex];

            if (nextKey.status === 'active') {
                this.currentIndex = nextIndex;
                this.saveToStorage();

                // Gọi callback
                if (this.onKeyRotation && fromKey) {
                    this.onKeyRotation({
                        fromKey: this.maskKey(fromKey),
                        toKey: this.maskKey(nextKey.key),
                        reason
                    });
                }

                return {
                    success: true,
                    hasMoreKeys: true,
                    newKey: nextKey.key,
                    message: `Đã chuyển sang key: ${nextKey.name}`
                };
            }
        }

        // Không có key nào available
        if (this.onAllKeysFailed) {
            this.onAllKeysFailed();
        }

        return {
            success: false,
            hasMoreKeys: false,
            message: 'Tất cả API key đều không khả dụng'
        };
    }

    /**
     * Lấy tất cả key (ẩn bớt ký tự)
     */
    getAllKeys(): ApiKeyInfo[] {
        this.checkAndResetCooldowns();
        return [...this.keys];
    }

    /**
     * Lấy số lượng key theo trạng thái
     */
    getKeyStats(): { total: number; active: number; error: number; cooldown: number } {
        this.checkAndResetCooldowns();
        return {
            total: this.keys.length,
            active: this.keys.filter(k => k.status === 'active').length,
            error: this.keys.filter(k => k.status === 'error').length,
            cooldown: this.keys.filter(k => k.status === 'cooldown').length
        };
    }

    /**
     * Reset key về trạng thái active
     */
    resetKey(key: string): { success: boolean; message: string } {
        const keyInfo = this.keys.find(k => k.key === key);
        if (!keyInfo) {
            return { success: false, message: 'Không tìm thấy key' };
        }

        keyInfo.status = 'active';
        keyInfo.errorCount = 0;
        keyInfo.cooldownUntil = undefined;
        keyInfo.lastError = undefined;

        this.saveToStorage();
        return { success: true, message: 'Đã kích hoạt lại key' };
    }

    /**
     * Cập nhật tên key
     */
    updateKeyName(key: string, newName: string): { success: boolean; message: string } {
        const keyInfo = this.keys.find(k => k.key === key);
        if (!keyInfo) {
            return { success: false, message: 'Không tìm thấy key' };
        }

        keyInfo.name = newName.trim() || keyInfo.name;
        this.saveToStorage();
        return { success: true, message: 'Đã cập nhật tên key' };
    }

    /**
     * Ẩn bớt ký tự của key để hiển thị
     */
    maskKey(key: string): string {
        if (!key || key.length < 8) return '***';
        return key.substring(0, 4) + '...' + key.substring(key.length - 4);
    }

    /**
     * Kiểm tra còn key khả dụng không
     */
    hasAvailableKeys(): boolean {
        this.checkAndResetCooldowns();
        return this.keys.some(k => k.status === 'active');
    }

    /**
     * Lấy index của key hiện tại
     */
    getCurrentIndex(): number {
        return this.currentIndex;
    }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager();
