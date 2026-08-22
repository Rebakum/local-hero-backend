import Anthropic from "@anthropic-ai/sdk";
import config from "../../../config";
import { buildLocalHeroContext } from "./context-builder";

/**
 * AI-powered live-chat replies via the Anthropic Claude API.
 *
 * The client is instantiated lazily so the app boots fine even when
 * ANTHROPIC_API_KEY is not configured (the assistant then degrades gracefully
 * to "no AI available"). When a key IS present, every reply is generated with
 * the current LocalHero context (see context-builder.ts) plus the recent
 * conversation history so the model remembers what was already discussed.
 */

const MODEL = config.anthropic.model || "claude-sonnet-4-6";

const getClient = (): Anthropic | null => {
  if (!config.anthropic.apiKey) return null;
  return new Anthropic({ apiKey: config.anthropic.apiKey });
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

export const isAiConfigured = (): boolean => Boolean(config.anthropic.apiKey);

/**
 * Generate a LocalHero-specific reply for a support conversation.
 *
 * @param history  Recent messages in Anthropic format (oldest → newest).
 *                 The last entry should be the user's latest message.
 * @param forceContextRefresh  Skip the short context cache (after content edits).
 */
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
  const window = history.slice(-20);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: window,
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return parseAiReply(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[LiveChat] Anthropic call failed:", detail);
    return {
      text: "I'm sorry, something went wrong on my side. A team member will jump in shortly.",
      needsHuman: true,
      error: detail,
    };
  }
};

/**
 * The model is instructed to return strict JSON:
 *   {"reply": "...", "needsHuman": true|false}
 * We defensively unwrap JSON fenced blocks and fall back to raw text when the
 * parse fails (treating an unparsable reply as needing a human).
 */
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