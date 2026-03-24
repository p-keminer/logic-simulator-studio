import { describe, expect, it } from 'vitest';
import { reduceCircuitContext } from '../../src/modules/circuit-context/circuit-context-reducer';
import { DefaultPromptOrchestrator } from '../../src/modules/prompt-orchestrator/prompt-orchestrator';
import { InMemoryConversationHistoryStore } from '../../src/modules/prompt-orchestrator/conversation-history-store';
import { createWhitelistedCircuitFixture } from '../circuit-context/fixtures';

describe('prompt orchestrator', () => {
  it('builds a deterministic sandbox prompt template with scoped history and active-circuit payload', async () => {
    const orchestrator = new DefaultPromptOrchestrator();
    const circuitContext = reduceCircuitContext(createWhitelistedCircuitFixture());

    expect(circuitContext).not.toBeNull();

    const prompt = await orchestrator.build({
      conversationId: 'sandbox-conversation-1',
      circuitContext: circuitContext!,
      history: [
        {
          role: 'user',
          content: 'What does this circuit do?',
          createdAt: '2026-03-21T00:00:00.000Z',
        },
        {
          role: 'assistant',
          content:
            'This sandbox can only prepare the prompt and active-circuit context.',
          createdAt: '2026-03-21T00:00:01.000Z',
        },
      ],
      userMessage: 'Explain the active circuit timing.',
    });

    expect(prompt.templateVersion).toBe('sandbox-chat-v2');
    expect(prompt.renderedPrompt).toContain(
      '# SANDBOX CHAT TEMPLATE sandbox-chat-v2',
    );
    expect(prompt.renderedPrompt).toContain(
      'conversationId=sandbox-conversation-1',
    );
    expect(prompt.renderedPrompt).toContain(
      'Do not expand to the wider workspace, repository, or filesystem.',
    );
    expect(prompt.renderedPrompt).toContain('scope=active-circuit');
    expect(prompt.renderedPrompt).toContain('"scope":"active-circuit"');
    expect(prompt.renderedPrompt).toContain('role=user');
    expect(prompt.renderedPrompt).toContain('role=assistant');
    expect(prompt.renderedPrompt).toContain('Explain the active circuit timing.');
  });
});

// H3 History-Limit: Eigener Describe-Block um den Store isoliert zu testen.
describe('conversation history store (H3 history-limit)', () => {
  const makeTurn = (n: number) => ({
    role: (n % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Turn ${n}`,
    createdAt: `2026-03-21T00:00:0${n}.000Z`,
  });

  it('retains all turns while below the configured cap', async () => {
    const store = new InMemoryConversationHistoryStore({
      maxStoredTurnsPerConversation: 6,
    });

    await store.appendTurns('session-1', 'conv-1', [makeTurn(0), makeTurn(1)]);
    await store.appendTurns('session-1', 'conv-1', [makeTurn(2), makeTurn(3)]);

    const record = await store.get('session-1', 'conv-1');
    expect(record?.turns).toHaveLength(4);
    expect(record?.turns[0].content).toBe('Turn 0');
    expect(record?.turns[3].content).toBe('Turn 3');
  });

  it('drops oldest turns once the cap is exceeded (H3 model-lock, sliding window)', async () => {
    const store = new InMemoryConversationHistoryStore({
      maxStoredTurnsPerConversation: 4,
    });

    // Insgesamt 6 Turns -> nur die 4 neuesten duerfen uebrig bleiben
    await store.appendTurns('session-1', 'conv-1', [
      makeTurn(0),
      makeTurn(1),
      makeTurn(2),
    ]);
    await store.appendTurns('session-1', 'conv-1', [
      makeTurn(3),
      makeTurn(4),
      makeTurn(5),
    ]);

    const record = await store.get('session-1', 'conv-1');
    expect(record?.turns).toHaveLength(4);
    expect(record?.turns[0].content).toBe('Turn 2');
    expect(record?.turns[3].content).toBe('Turn 5');
  });

  it('does not mix turns from different conversations', async () => {
    const store = new InMemoryConversationHistoryStore({
      maxStoredTurnsPerConversation: 4,
    });

    await store.appendTurns('session-1', 'conv-A', [makeTurn(0), makeTurn(1)]);
    await store.appendTurns('session-1', 'conv-B', [makeTurn(2), makeTurn(3)]);

    const recordA = await store.get('session-1', 'conv-A');
    const recordB = await store.get('session-1', 'conv-B');

    expect(recordA?.turns).toHaveLength(2);
    expect(recordA?.turns[0].content).toBe('Turn 0');
    expect(recordB?.turns).toHaveLength(2);
    expect(recordB?.turns[0].content).toBe('Turn 2');
  });
});
