import type { CircuitContext } from '../../contracts/circuit-context.js';

export type PromptTemplateVersion = 'sandbox-chat-v1' | 'sandbox-chat-v2';

export type ConversationTurnRole = 'user' | 'assistant';

export interface ConversationTurn {
  readonly role: ConversationTurnRole;
  readonly content: string;
  readonly createdAt: string;
}

export interface PromptSection {
  readonly title: string;
  readonly content: string;
}

export interface PromptOrchestrationInput {
  readonly conversationId: string;
  readonly circuitContext: CircuitContext;
  readonly history: ConversationTurn[];
  readonly userMessage: string;
}

export interface PromptEnvelope {
  readonly templateVersion: PromptTemplateVersion;
  readonly system: PromptSection[];
  readonly circuit: PromptSection[];
  readonly history: PromptSection[];
  readonly user: PromptSection[];
  readonly renderedPrompt: string;
}
