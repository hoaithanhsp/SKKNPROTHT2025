import React from 'react';
import { UserInfo } from '../types';
import { Button } from './Button';
import { BookOpen, School, GraduationCap, PenTool, MapPin, Calendar, Users, Cpu, Target, Monitor } from 'lucide-react';

interface Props {
  userInfo: UserInfo;
  onChange: (field: keyof UserInfo, value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

interface InputGroupProps {
  label: string;
  icon: any;
  required?: boolean;
  children: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, required, children }) => (
  <div className="w-full">
    <label className="block text-sm font-semibold text-gray-900 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative rounded-md shadow-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      {children}
    </div>
  </div>
);

export const SKKNForm: React.FC<Props> = ({ userInfo, onChange, onSubmit, isSubmitting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(e.target.name as keyof UserInfo, e.target.value);
  };

  // Only check required fields for validation
  const requiredFields: (keyof UserInfo)[] = ['topic', 'subject', 'level', 'grade', 'school', 'location', 'facilities'];
  const isFormValid = requiredFields.every(key => userInfo[key].trim() !== '');

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-sky-100 overflow-hidden my-8">
      <div className="bg-sky-600 p-6 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Thiết lập Thông tin Sáng kiến</h2>
        <p className="text-sky-100 opacity-90">Cung cấp thông tin chính xác để AI tạo ra bản thảo chất lượng nhất</p>
      </div>

      <div className="p-8 space-y-8">
        
        {/* SECTION 1: REQUIRED INFO */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide">
            1. Thông tin bắt buộc
          </h3>
          
          <div className="space-y-5">
            <InputGroup label="Tên đề tài SKKN" icon={PenTool} required>
              <input
                type="text"
                name="topic"
                value={userInfo.topic}
                onChange={handleChange}
                className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder='VD: "Ứng dụng AI để nâng cao hiệu quả dạy học môn Toán THPT"'
              />
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Môn học" icon={BookOpen} required>
                <input
                  type="text"
                  name="subject"
                  value={userInfo.subject}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Toán, Ngữ văn, Tiếng Anh..."
                />
              </InputGroup>

              <div className="grid grid-cols-2 gap-3">
                 <InputGroup label="Cấp học" icon={GraduationCap} required>
                    <select
                      name="level"
                      value={userInfo.level}
                      onChange={handleChange}
                      className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border appearance-none text-gray-900"
                    >
                        <option value="">Chọn cấp...</option>
                        <option value="Mầm non">Mầm non</option>
                        <option value="Tiểu học">Tiểu học</option>
                        <option value="THCS">THCS</option>
                        <option value="THPT">THPT</option>
                        <option value="GDTX">GDTX</option>
                    </select>
                 </InputGroup>
                 <InputGroup label="Khối lớp" icon={GraduationCap} required>
                    <input
                      type="text"
                      name="grade"
                      value={userInfo.grade}
                      onChange={handleChange}
                      className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                      placeholder="VD: Lớp 12, Khối 6-9"
                    />
                 </InputGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Tên trường / Đơn vị" icon={School} required>
                <input
                  type="text"
                  name="school"
                  value={userInfo.school}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Trường THPT Nguyễn Du"
                />
              </InputGroup>

              <InputGroup label="Địa điểm (Huyện, Tỉnh)" icon={MapPin} required>
                <input
                  type="text"
                  name="location"
                  value={userInfo.location}
                  onChange={handleChange}
                  className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Quận 1, TP.HCM"
                />
              </InputGroup>
            </div>

            <InputGroup label="Điều kiện CSVC (Tivi, Máy chiếu, WiFi...)" icon={Monitor} required>
              <input
                type="text"
                name="facilities"
                value={userInfo.facilities}
                onChange={handleChange}
                className="bg-gray-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                placeholder="VD: Phòng máy chiếu, Tivi thông minh, Internet ổn định..."
              />
            </InputGroup>
          </div>
        </div>

        {/* SECTION 2: OPTIONAL INFO */}
        <div>
          <h3 className="text-lg font-bold text-sky-800 border-b border-sky-100 pb-2 mb-4 uppercase tracking-wide flex items-center">
            2. Thông tin bổ sung
            <span className="ml-2 text-xs bg-sky-100 text-sky-800 py-1 px-2 rounded-full font-normal capitalize normal-case tracking-normal">
                (Khuyên dùng để tăng chi tiết)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="Sách giáo khoa" icon={BookOpen}>
                <input
                  type="text"
                  name="textbook"
                  value={userInfo.textbook}
                  onChange={handleChange}
                  className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Kết nối tri thức, Cánh diều..."
                />
            </InputGroup>

             <InputGroup label="Đối tượng nghiên cứu" icon={Users}>
                <input
                  type="text"
                  name="researchSubjects"
                  value={userInfo.researchSubjects}
                  onChange={handleChange}
                  className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: 45 HS lớp 12A (thực nghiệm)..."
                />
            </InputGroup>

            <InputGroup label="Thời gian thực hiện" icon={Calendar}>
                <input
                  type="text"
                  name="timeframe"
                  value={userInfo.timeframe}
                  onChange={handleChange}
                  className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Năm học 2024-2025"
                />
            </InputGroup>

            <InputGroup label="Ứng dụng AI/Công nghệ" icon={Cpu}>
                <input
                  type="text"
                  name="applyAI"
                  value={userInfo.applyAI}
                  onChange={handleChange}
                  className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                  placeholder="VD: Sử dụng ChatGPT, Canva, Padlet..."
                />
            </InputGroup>
            
            <div className="md:col-span-2">
                 <InputGroup label="Đặc thù / Trọng tâm đề tài" icon={Target}>
                    <input
                      type="text"
                      name="focus"
                      value={userInfo.focus}
                      onChange={handleChange}
                      className="bg-white focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 text-sm border-gray-300 rounded-md p-3 border text-gray-900 placeholder-gray-500"
                      placeholder="VD: Phát triển năng lực tự học, Chuyển đổi số..."
                    />
                </InputGroup>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={onSubmit} 
            disabled={!isFormValid || isSubmitting} 
            isLoading={isSubmitting}
            className="w-full py-4 text-lg font-bold shadow-sky-500/30 shadow-lg"
          >
            {isSubmitting ? 'Đang khởi tạo...' : 'Bắt đầu lập dàn ý chi tiết'}
          </Button>
          {!isFormValid && (
              <p className="text-center text-red-500 text-sm mt-2">Vui lòng điền đầy đủ các thông tin bắt buộc (*)</p>
          )}
        </div>
      </div>
    </div>
  );
};