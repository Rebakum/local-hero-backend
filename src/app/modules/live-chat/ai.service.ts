import { GoogleGenAI } from "@google/genai";
import config from "../../../config";
import { buildLocalHeroContext } from "./context-builder";

const MODEL = config.gemini.model || "gemini-2.5-flash";

const getClient = (): GoogleGenAI | null => {
  if (!config.gemini.apiKey) return null;
  return new GoogleGenAI({ apiKey: config.gemini.apiKey });
};

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiReply {
  text: string;
  needsHuman: boolean;
  error?: string;
}

export const isAiConfigured = (): boolean => Boolean(config.gemini.apiKey);


export const generateAiReply = async (
  history: AiChatMessage[],
  forceContextRefresh = false
): Promise<AiReply> => {
  const client = getClient();
  if (!client) {
    return {
      text: "I'm sorry, the AI assistant is not configured right now. A team member will be with you shortly.",
      needsHuman: true,
    };
  }

  const system = await buildLocalHeroContext(forceContextRefresh);

  // Guard rails: limit the window sent to the model (last ~20 turns).
  const contents = history.slice(-20).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: system,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text?.trim() || "";

    return parseAiReply(text);
  } catch (error) {
    console.error("[LiveChat] Full Gemini error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[LiveChat] Gemini call failed:", detail);
    return {
      text: "I'm sorry, something went wrong on my side. A team member will jump in shortly.",
      needsHuman: true,
      error: detail,
    };
  }
};


const parseAiReply = (raw: string): AiReply => {
  let candidate = raw.trim();

  // Strip ```json ... ``` fences if present.
  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidate = fenced[1].trim();

  try {
    const parsed = JSON.parse(candidate) as { reply?: unknown; needsHuman?: unknown };
    return {
      text: typeof parsed.reply === "string" ? parsed.reply : raw,
      needsHuman: parsed.needsHuman === true,
    };
  } catch {
    return { text: raw, needsHuman: true };
  }
};