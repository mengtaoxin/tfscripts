export interface ProgressWriter {
  set(text: string): void;
  end(): void;
}

export interface StdoutLike {
  readonly isTTY?: boolean | undefined;
  write(chunk: string): unknown;
}

export function createStdoutProgress(stdout: StdoutLike = process.stdout): ProgressWriter {
  return {
    set(text: string): void {
      if (!stdout.isTTY) {
        return;
      }
      stdout.write(`\r${text}\x1b[K`);
    },
    end(): void {
      if (!stdout.isTTY) {
        return;
      }
      stdout.write('\n');
    },
  };
}
