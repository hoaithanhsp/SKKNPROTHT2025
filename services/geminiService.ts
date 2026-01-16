
import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, FALLBACK_MODELS } from "../constants";

// Hàm phân tích và trả về thông báo lỗi thân thiện
const parseApiError = (error: any): string => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorString = JSON.stringify(error);

  // Kiểm tra lỗi quota exceeded (429)
  if (errorString.includes('429') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('exceeded')) {
    return 'QUOTA_EXCEEDED';
  }

  // Kiểm tra lỗi rate limit
  if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
    return 'RATE_LIMIT';
  }

  // Kiểm tra lỗi API key không hợp lệ
  if (errorMessage.includes('API_KEY_INVALID') ||
    errorMessage.includes('401') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('PERMISSION_DENIED')) {
    return 'INVALID_API_KEY';
  }

  // Kiểm tra lỗi kết nối
  if (errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection')) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN';
};

// Hàm tạo thông báo lỗi thân thiện
export const getFriendlyErrorMessage = (error: any): { type: string; title: string; message: string; suggestions: string[] } => {
  const errorType = parseApiError(error);

  switch (errorType) {
    case 'QUOTA_EXCEEDED':
      return {
        type: 'quota',
        title: '⚠️ Đã vượt quá giới hạn sử dụng',
        message: 'Bạn đã sử dụng hết lượt gọi API miễn phí trong ngày. Đây là giới hạn từ phía Google, không phải lỗi của ứng dụng.',
        suggestions: [
          '⏰ Đợi khoảng 1-2 phút rồi thử lại',
          '🔑 Sử dụng API Key khác nếu có',
          '📅 Đợi đến ngày hôm sau khi quota được reset',
          '💳 Nâng cấp tài khoản Google AI Studio để có thêm quota'
        ]
      };

    case 'RATE_LIMIT':
      return {
        type: 'rate_limit',
        title: '🚦 Đang gửi yêu cầu quá nhanh',
        message: 'Bạn đang gửi quá nhiều yêu cầu trong thời gian ngắn. Hãy chờ một chút rồi thử lại.',
        suggestions: [
          '⏳ Đợi 30-60 giây rồi thử lại',
          '🔄 Không bấm nút nhiều lần liên tiếp'
        ]
      };

    case 'INVALID_API_KEY':
      return {
        type: 'auth',
        title: '🔐 API Key không hợp lệ',
        message: 'API Key bạn đang sử dụng không đúng hoặc đã hết hạn.',
        suggestions: [
          '🔑 Kiểm tra lại API Key đã nhập',
          '🆕 Tạo API Key mới tại Google AI Studio',
          '📋 Đảm bảo copy đầy đủ API Key (không thừa/thiếu ký tự)'
        ]
      };

    case 'NETWORK_ERROR':
      return {
        type: 'network',
        title: '🌐 Lỗi kết nối mạng',
        message: 'Không thể kết nối đến máy chủ Google AI. Hãy kiểm tra kết nối internet của bạn.',
        suggestions: [
          '📶 Kiểm tra kết nối WiFi/Internet',
          '🔄 Thử làm mới trang (F5)',
          '🌍 Thử sử dụng mạng khác'
        ]
      };

    default:
      return {
        type: 'unknown',
        title: '❌ Đã xảy ra lỗi',
        message: error?.message || 'Có lỗi không xác định xảy ra khi gọi AI.',
        suggestions: [
          '🔄 Thử làm mới trang và thực hiện lại',
          '🔑 Kiểm tra API Key',
          '⏰ Đợi một lúc rồi thử lại'
        ]
      };
  }
};

let chatSession: Chat | null = null;
let currentApiKey: string | null = null;
let currentSelectedModel: string | null = null;
let history: any[] = []; // Store history to restore when switching models

export const initializeGeminiChat = (apiKey: string, selectedModel?: string) => {
  currentApiKey = apiKey;
  currentSelectedModel = selectedModel || FALLBACK_MODELS[0];
  chatSession = null;
  history = []; // Reset history on new initialization
};

const createChatSession = (model: string) => {
  if (!currentApiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey: currentApiKey });

  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 65536,
      thinkingConfig: { thinkingBudget: 2048 },
      tools: [{ googleSearch: {} }]
    },
    history: history
  });
};

// Sắp xếp models với model được chọn đầu tiên
const getOrderedModels = (): string[] => {
  if (!currentSelectedModel || !FALLBACK_MODELS.includes(currentSelectedModel)) {
    return FALLBACK_MODELS;
  }

  // Đưa model được chọn lên đầu, giữ nguyên thứ tự các model còn lại
  const orderedModels = [currentSelectedModel];
  for (const model of FALLBACK_MODELS) {
    if (model !== currentSelectedModel) {
      orderedModels.push(model);
    }
  }
  return orderedModels;
};

export const sendMessageStream = async (message: string, onChunk: (text: string) => void) => {
  if (!currentApiKey) throw new Error("API Key not initialized");

  let lastError: any = null;
  const modelsToTry = getOrderedModels();

  // Try through the fallback models
  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Đang thử model: ${model}`);

      // Always recreate session with current history to ensure we use the selected model
      // (or optimize to reuse if same model, but recreation is safer for fallback)
      chatSession = createChatSession(model);

      const responseStream = await chatSession.sendMessageStream({ message });

      let fullResponse = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
          fullResponse += chunk.text;
        }
      }

      // If successful, update history and break
      history.push({ role: 'user', parts: [{ text: message }] });
      history.push({ role: 'model', parts: [{ text: fullResponse }] });
      console.log(`✅ Model ${model} thành công!`);
      return;

    } catch (error: any) {
      console.error(`❌ Model ${model} thất bại:`, error.message || error);
      lastError = error;
      // Continue to next model
    }
  }

  // If all models fail
  throw lastError || new Error("Tất cả models đều thất bại. Vui lòng kiểm tra API key hoặc thử lại sau.");
};
