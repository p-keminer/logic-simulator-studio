import {
  appBridgeChatRequestSchema,
  appBridgeCurrentCircuitChatRequestSchema,
  appBridgeChatResetRequestSchema,
  type AppBridgeChatRequest,
  type AppBridgeCurrentCircuitChatRequest,
  type AppBridgeChatResetRequest,
} from '../../contracts/app-bridge.js';
import {
  chatRequestSchema,
  chatResetRequestSchema,
  type ChatRequest,
  type ChatResetRequest,
  type ChatResetResponse,
} from '../../contracts/chat.js';
import { createSandboxError } from '../../shared/errors.js';
import { reduceCircuitContext } from '../circuit-context/circuit-context-reducer.js';
import { mapAppBridgeSnapshotToCircuitSource } from '../circuit-context/app-bridge-mapper.js';
import type { CurrentCircuitSnapshotProvider } from '../circuit-context/current-circuit-snapshot-provider.js';
import type { CircuitContextBuildOptions, CircuitSource } from '../circuit-context/types.js';
import type {
  ChatRequestHandler,
  ChatRequestHandlerResult,
  ChatRequestHandlingContext,
} from './chat-request-handler.js';

export interface AppBridgeHarnessOptions {
  readonly circuitContext?: Partial<CircuitContextBuildOptions>;
  readonly currentCircuitSnapshotProvider?: CurrentCircuitSnapshotProvider;
}

export interface PreparedAppBridgeChatRequest {
  readonly bridgeVersion: AppBridgeChatRequest['snapshot']['bridgeVersion'];
  readonly chatRequest: ChatRequest;
  readonly circuitSource: CircuitSource;
}

export interface PreparedCurrentCircuitAppBridgeChatRequest
  extends PreparedAppBridgeChatRequest {
  readonly providerId: string;
  readonly providerMode: string;
}

export interface PreparedAppBridgeChatResetRequest {
  readonly chatResetRequest: ChatResetRequest;
}

export interface AppBridgeChatDispatchResult {
  readonly prepared: PreparedAppBridgeChatRequest;
  readonly result: ChatRequestHandlerResult;
}

export interface CurrentCircuitAppBridgeChatDispatchResult {
  readonly prepared: PreparedCurrentCircuitAppBridgeChatRequest;
  readonly result: ChatRequestHandlerResult;
}

export interface AppBridgeChatResetDispatchResult {
  readonly prepared: PreparedAppBridgeChatResetRequest;
  readonly result: ChatResetResponse;
}

export class LocalAppBridgeHarness {
  private readonly currentCircuitSnapshotProvider?: CurrentCircuitSnapshotProvider;

  constructor(
    private readonly chatRequestHandler: ChatRequestHandler,
    private readonly options: AppBridgeHarnessOptions = {},
  ) {
    this.currentCircuitSnapshotProvider = options.currentCircuitSnapshotProvider;
  }

  private getCurrentCircuitSnapshotProvider(): CurrentCircuitSnapshotProvider {
    if (!this.currentCircuitSnapshotProvider) {
      throw createSandboxError(
        'CONFLICT',
        'Current-circuit snapshot provider is not configured in the sandbox.',
        409,
      );
    }

    return this.currentCircuitSnapshotProvider;
  }

  private buildCircuitContext(snapshot: AppBridgeChatRequest['snapshot']) {
    const circuitSource = mapAppBridgeSnapshotToCircuitSource(snapshot);
    const circuitContext = reduceCircuitContext(
      circuitSource,
      this.options.circuitContext,
    );

    if (!circuitContext) {
      throw createSandboxError(
        'BAD_REQUEST',
        'Open-circuit snapshot could not be prepared for the sandbox.',
        400,
      );
    }

    return {
      circuitContext,
      circuitSource,
    };
  }

  prepareChatRequest(
    input: AppBridgeChatRequest,
  ): PreparedAppBridgeChatRequest {
    const parsedInput = appBridgeChatRequestSchema.parse(input);
    const { circuitContext, circuitSource } = this.buildCircuitContext(
      parsedInput.snapshot,
    );

    return {
      bridgeVersion: parsedInput.snapshot.bridgeVersion,
      circuitSource,
      chatRequest: chatRequestSchema.parse({
        sessionId: parsedInput.sessionId,
        message: parsedInput.userMessage,
        conversationId: parsedInput.conversation?.conversationId,
        circuitContext,
      }),
    };
  }

  prepareChatResetRequest(
    input: AppBridgeChatResetRequest,
  ): PreparedAppBridgeChatResetRequest {
    const parsedInput = appBridgeChatResetRequestSchema.parse(input);

    return {
      chatResetRequest: chatResetRequestSchema.parse({
        sessionId: parsedInput.sessionId,
        conversationId: parsedInput.conversation?.conversationId,
        reason: parsedInput.resetReason,
      }),
    };
  }

  async prepareChatRequestFromCurrentCircuit(
    input: AppBridgeCurrentCircuitChatRequest,
  ): Promise<PreparedCurrentCircuitAppBridgeChatRequest> {
    const parsedInput = appBridgeCurrentCircuitChatRequestSchema.parse(input);
    const provider = this.getCurrentCircuitSnapshotProvider();
    const description = provider.describe();
    const snapshot = await provider.getCurrentCircuit();

    if (!snapshot) {
      throw createSandboxError(
        'NOT_FOUND',
        'Current-circuit snapshot is not available in the sandbox.',
        404,
      );
    }

    const prepared = this.prepareChatRequest({
      sessionId: parsedInput.sessionId,
      userMessage: parsedInput.userMessage,
      conversation: parsedInput.conversation,
      snapshot,
    });

    return {
      ...prepared,
      providerId: description.providerId,
      providerMode: description.providerMode,
    };
  }

  async handleChat(
    input: AppBridgeChatRequest,
    context: ChatRequestHandlingContext = {},
  ): Promise<AppBridgeChatDispatchResult> {
    const prepared = this.prepareChatRequest(input);

    return {
      prepared,
      result: await this.chatRequestHandler.handle(prepared.chatRequest, context),
    };
  }

  async handleChatFromCurrentCircuit(
    input: AppBridgeCurrentCircuitChatRequest,
    context: ChatRequestHandlingContext = {},
  ): Promise<CurrentCircuitAppBridgeChatDispatchResult> {
    const prepared = await this.prepareChatRequestFromCurrentCircuit(input);

    return {
      prepared,
      result: await this.chatRequestHandler.handle(prepared.chatRequest, context),
    };
  }

  async handleReset(
    input: AppBridgeChatResetRequest,
    context: ChatRequestHandlingContext = {},
  ): Promise<AppBridgeChatResetDispatchResult> {
    const prepared = this.prepareChatResetRequest(input);

    return {
      prepared,
      result: await this.chatRequestHandler.reset(
        prepared.chatResetRequest,
        context,
      ),
    };
  }
}
