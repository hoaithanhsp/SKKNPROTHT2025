import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError('');

    // Fake loading delay for realism
    setTimeout(() => {
      if (password === 'SKKN100' || password === 'SKKN111') {
        onUnlock();
      } else {
        setError('Mật khẩu không đúng. Vui lòng thử lại.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden animate-fadeIn">
        <div className="bg-sky-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SKKN PRO</h1>
          <p className="text-sky-100 text-sm mt-1">Hệ thống bảo mật nội bộ</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nhập mật khẩu truy cập
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-colors text-lg tracking-widest"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 font-medium animate-pulse">
                  {error}
                </p>
              )}
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <ShieldCheck size={12} />
                Kết nối an toàn được mã hóa
              </p>
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-lg shadow-sky-500/30"
              isLoading={isLoading}
              disabled={!password}
            >
              {isLoading ? 'Đang xác thực...' : 'Mở khóa ứng dụng'}
            </Button>
          </form>
        </div>

        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Phiên bản: v8.0.2 (Education Enterprise)
          </p>
        </div>
      </div>
    </div>
  );
};