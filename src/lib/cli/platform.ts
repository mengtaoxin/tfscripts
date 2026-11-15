const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  darwin: 'macOS',
  linux: 'Linux',
  win32: 'Windows',
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export class PlatformNotSupportedError extends Error {
  readonly command: string;
  readonly platform: string;

  constructor(command: string, platform: string) {
    super(`${command} is not supported on ${platformLabel(platform)}.`);
    this.name = 'PlatformNotSupportedError';
    this.command = command;
    this.platform = platform;
  }
}

export function assertSupportedPlatform(options: {
  command: string;
  supported: readonly string[];
  platform?: string;
}): void {
  const platform = options.platform ?? process.platform;
  if (options.supported.includes(platform)) {
    return;
  }
  throw new PlatformNotSupportedError(options.command, platform);
}
