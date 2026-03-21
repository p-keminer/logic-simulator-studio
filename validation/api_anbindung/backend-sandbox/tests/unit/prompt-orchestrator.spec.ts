import { describe, expect, it } from 'vitest';
import { reduceCircuitContext } from '../../src/modules/circuit-context/circuit-context-reducer';
import { DefaultPromptOrchestrator } from '../../src/modules/prompt-orchestrator/prompt-orchestrator';
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

    expect(prompt.templateVersion).toBe('sandbox-chat-v1');
    expect(prompt.renderedPrompt).toContain(
      '# SANDBOX CHAT TEMPLATE sandbox-chat-v1',
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
