import { describe, expect, it, vi } from 'vitest';
import {
  SYSTEM_PROMPT,
  buildChatMessages,
  buildUserPrompt,
  estimateTokens,
  generateCommitMessage,
  stripCommitMessageFences,
  truncateDiffToTokenBudget,
} from './llm.js';

describe('estimateTokens / truncateDiffToTokenBudget', () => {
  it('estimates tokens as ceil(chars / 4)', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns the full diff when under budget', () => {
    expect(truncateDiffToTokenBudget('short', 100)).toEqual({
      diff: 'short',
      truncated: false,
    });
  });

  it('truncates long diffs and appends a marker', () => {
    const long = 'x'.repeat(1000);
    const result = truncateDiffToTokenBudget(long, 10);
    expect(result.truncated).toBe(true);
    expect(result.diff).toContain('... (diff truncated)');
    expect(result.diff.length).toBeLessThanOrEqual(10 * 4);
  });
});

describe('buildUserPrompt / buildChatMessages', () => {
  it('includes repo, branch, and staged diff without recent commits or URLs', () => {
    const prompt = buildUserPrompt({
      repositoryName: 'tfscripts',
      branchName: 'main',
      stagedStat: ' file.ts | 2 ++\n',
      stagedDiff: 'diff --git a/file.ts',
    });

    expect(prompt).toContain('Repository name: tfscripts');
    expect(prompt).toContain('Branch name: main');
    expect(prompt).toContain('diff --git a/file.ts');
    expect(prompt.toLowerCase()).not.toContain('recent');
    expect(prompt).not.toContain('http');
    expect(SYSTEM_PROMPT).not.toContain('http');
    expect(SYSTEM_PROMPT).toContain('Conventional Commits');
  });

  it('respects the max input token budget by truncating the diff', () => {
    const hugeDiff = 'd'.repeat(50_000);
    const { messages, truncated } = buildChatMessages(
      {
        repositoryName: 'repo',
        branchName: 'main',
        stagedStat: '',
        stagedDiff: hugeDiff,
      },
      500,
    );

    expect(truncated).toBe(true);
    const user = messages.find((m) => m.role === 'user');
    expect(user?.content).toContain('... (diff truncated)');
    expect(estimateTokens(messages.map((m) => m.content).join('\n'))).toBeLessThan(
      hugeDiff.length / 4,
    );
  });
});

describe('stripCommitMessageFences', () => {
  it('strips surrounding markdown fences', () => {
    expect(stripCommitMessageFences('```\nfeat: add x\n```')).toBe('feat: add x');
    expect(stripCommitMessageFences('```text\nfix: y\n```')).toBe('fix: y');
    expect(stripCommitMessageFences('feat: plain')).toBe('feat: plain');
  });
});

describe('generateCommitMessage', () => {
  it('posts to chat/completions and returns the stripped message', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```\nfeat(cli): add submit\n```' } }],
      }),
    });

    const message = await generateCommitMessage(
      {
        repositoryName: 'tfscripts',
        branchName: 'main',
        stagedStat: 'a.ts | 1 +\n',
        stagedDiff: 'diff --git a/a.ts',
      },
      {
        apiKey: 'key',
        baseUrl: 'https://api.example.com/v1',
        model: 'gpt-test',
        maxInputTokens: 8000,
        maxOutputTokens: 1024,
      },
      { fetchFn },
    );

    expect(message).toBe('feat(cli): add submit');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer key',
        }),
      }),
    );
    const body = JSON.parse((fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('gpt-test');
    expect(body.max_tokens).toBe(1024);
    expect(body.messages[0].content).not.toContain('http');
  });
});
