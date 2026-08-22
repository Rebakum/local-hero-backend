export interface CreateThreadInput {
  name?: string;
  email?: string;
  body?: string;
  // Frictionless guest sessions: the widget sends a client-generated
  // sessionId (crypto.randomUUID) which becomes the thread identifier.
  sessionId?: string;
}

export interface SendMessageInput {
  body: string;
}

export type ThreadStatus = "AI_ACTIVE" | "PENDING_HUMAN" | "RESOLVED";

export type MessageSenderRole = "GUEST" | "USER" | "AI" | "ADMIN";