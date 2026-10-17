import type { AiGitSubmitConfig } from './config.js';

const CHARS_PER_TOKEN = 4;

export const SYSTEM_PROMPT = `You are an AI programming assistant that writes git commit messages.

Follow Conventional Commits rules exactly. The commit message MUST use this structure:

<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]

Rules:
- The message MUST start with a type (a noun such as feat, fix, etc.), followed by an optional scope in parentheses, an optional !, then a colon and space, then a short description.
- Use feat when the change adds a new feature. Use fix when the change fixes a bug.
- Other allowed types when they fit better: build, chore, ci, docs, style, refactor, perf, test, revert.
- A scope MAY be provided after the type to name an area of the codebase, e.g. feat(parser): ...
- The description MUST be a short summary of the change (aim for about 72 characters or less on the subject line).
- A longer body MAY follow after one blank line when useful context is needed.
- Footers MAY follow after another blank line. Breaking changes MUST be marked with ! after the type/scope and/or a footer starting with BREAKING CHANGE: followed by a description.
- Output ONLY the commit message. No markdown fences, no surrounding quotes, no commentary, no links, no URLs.`;

export interface CommitContext {
  repositoryName: string;
  branchName: string;
  stagedStat: string;
  stagedDiff: string;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function truncateDiffToTokenBudget(
  diff: string,
  maxDiffTokens: number,
): { diff: string; truncated: boolean } {
  const maxChars = Math.max(0, maxDiffTokens * CHARS_PER_TOKEN);
  if (diff.length <= maxChars) {
    return { diff, truncated: false };
  }
  const marker = '\n... (diff truncated)\n';
  const keep = Math.max(0, maxChars - marker.length);
  return { diff: `${diff.slice(0, keep)}${marker}`, truncated: true };
}

export function buildUserPrompt(context: CommitContext): string {
  const parts = [
    '# REPOSITORY DETAILS:',
    `Repository name: ${context.repositoryName}`,
    `Branch name: ${context.branchName || '(unknown)'}`,
    '',
  ];

  if (context.stagedStat.trim() !== '') {
    parts.push('# STAGED CHANGE SUMMARY:', context.stagedStat.trimEnd(), '');
  }

  parts.push('# STAGED DIFF:', context.stagedDiff, '');
  parts.push(
    'Generate a single Conventional Commits message for the STAGED DIFF.',
    'Output ONLY the commit message.',
  );

  return parts.join('\n');
}

export function buildChatMessages(
  context: CommitContext,
  maxInputTokens: number,
): { messages: ChatMessage[]; truncated: boolean } {
  const fixedParts = `${SYSTEM_PROMPT}\n${buildUserPrompt({
    ...context,
    stagedDiff: '',
  })}`;
  const fixedTokens = estimateTokens(fixedParts);
  const diffBudget = Math.max(256, maxInputTokens - fixedTokens);
  const { diff, truncated } = truncateDiffToTokenBudget(context.stagedDiff, diffBudget);

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildUserPrompt({ ...context, stagedDiff: diff }),
    },
  ];

  return { messages, truncated };
}

export function stripCommitMessageFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:\w+)?\s*\n?/, '');
    text = text.replace(/\n?```\s*$/, '');
    text = text.trim();
  }
  return text;
}

export interface GenerateCommitMessageDeps {
  fetchFn?: typeof fetch;
}

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export async function generateCommitMessage(
  context: CommitContext,
  config: Pick<
    AiGitSubmitConfig,
    'apiKey' | 'baseUrl' | 'model' | 'maxInputTokens' | 'maxOutputTokens'
  >,
  deps: GenerateCommitMessageDeps = {},
): Promise<string> {
  const fetchFn = deps.fetchFn ?? fetch;
  const { messages } = buildChatMessages(context, config.maxInputTokens);

  const url = `${config.baseUrl}/chat/completions`;
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxOutputTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new LlmError(
      `LLM request failed with status ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
    );
  }

  const data = (await response.json()) as ChatCompletionsResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new LlmError('LLM returned an empty commit message.');
  }

  return stripCommitMessageFences(content);
}
