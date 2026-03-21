export type BackendBrokerErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface BackendBrokerSessionRegistration {
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
  status: 'active';
}

export interface BackendBrokerSessionDeletion {
  deleted: true;
  sessionId: string;
  deletedAt: string;
}

export interface BackendBrokerCircuitPort {
  gateId: string;
  port: string;
}

export interface BackendBrokerCircuitNode {
  id: string;
  kind: string;
  label?: string;
}

export interface BackendBrokerCircuitGate {
  id: string;
  type: string;
  label?: string;
  inputs: BackendBrokerCircuitPort[];
  outputs: BackendBrokerCircuitPort[];
}

export interface BackendBrokerCircuitConnection {
  from: BackendBrokerCircuitPort;
  to: BackendBrokerCircuitPort;
}

export interface BackendBrokerCircuitCountSummary {
  selectedElementIds: number;
  nodes: number;
  gates: number;
  connections: number;
}

export type BackendBrokerCircuitReductionReason =
  | 'invalid-entries-removed'
  | 'duplicate-entries-removed'
  | 'selected-elements-trimmed'
  | 'nodes-trimmed'
  | 'gates-trimmed'
  | 'connections-trimmed'
  | 'notes-trimmed'
  | 'payload-size-capped';

export interface BackendBrokerCircuitReduction {
  wasReduced: boolean;
  reasons: BackendBrokerCircuitReductionReason[];
  original: BackendBrokerCircuitCountSummary;
  retained: BackendBrokerCircuitCountSummary;
  notesIncluded: boolean;
  serializedBytes: number;
  maxSerializedBytes: number;
}

export interface BackendBrokerCircuitContext {
  scope: 'active-circuit';
  version: string;
  circuitId: string;
  circuitName?: string;
  selectedElementIds: string[];
  nodes: BackendBrokerCircuitNode[];
  gates: BackendBrokerCircuitGate[];
  connections: BackendBrokerCircuitConnection[];
  notes?: string;
  reduction: BackendBrokerCircuitReduction;
}

export interface BackendBrokerChatRequest {
  sessionId: string;
  message: string;
  circuitContext: BackendBrokerCircuitContext;
  conversationId?: string;
}

export interface BackendBrokerChatResponse {
  message: string;
  conversationId?: string;
  model?: string;
  circuitContextVersion: string;
}

export interface BackendBrokerChatResetRequest {
  sessionId: string;
  conversationId?: string;
  reason?: string;
}

export interface BackendBrokerChatResetResponse {
  reset: true;
  sessionId: string;
  conversationId?: string;
  clearedConversationIds: string[];
  clearedTurns: number;
  resetAt: string;
}

export interface BackendBrokerErrorBody {
  code: BackendBrokerErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface BackendBrokerErrorEnvelope {
  error: BackendBrokerErrorBody;
}

export type BackendBrokerConversationRole = 'user' | 'assistant' | 'system';

export interface BackendBrokerConversationMessage {
  id: string;
  role: BackendBrokerConversationRole;
  content: string;
  createdAt: string;
  model?: string;
}
