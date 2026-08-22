export interface CreateThreadInput {
  name?: string;
  email?: string;
  body?: string;

  sessionId?: string;
}

export interface SendMessageInput {
  body: string;
}

export type ThreadStatus = "AI_ACTIVE" | "PENDING_HUMAN" | "RESOLVED";

export type MessageSenderRole = "GUEST" | "USER" | "AI" | "ADMIN";