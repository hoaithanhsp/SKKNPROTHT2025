
import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, FALLBACK_MODELS } from "../constants";

let chatSession: Chat | null = null;
let currentApiKey: string | null = null;
let history: any[] = []; // Store history to restore when switching models

export const initializeGeminiChat = (apiKey: string) => {
  currentApiKey = apiKey;
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

export const sendMessageStream = async (message: string, onChunk: (text: string) => void) => {
  if (!currentApiKey) throw new Error("API Key not initialized");

  let lastError: any = null;

  // Try through the fallback models
  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`Trying model: ${model}`);

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
      return;

    } catch (error: any) {
      console.error(`Model ${model} failed:`, error);
      lastError = error;
      // Continue to next model
    }
  }

  // If all models fail
  throw lastError || new Error("All models failed to respond.");
};
