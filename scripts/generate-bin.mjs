import { chmodSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const binDir = join(root, 'bin');

rmSync(binDir, { recursive: true, force: true });
mkdirSync(binDir, { recursive: true });

let entries;
try {
  entries = readdirSync(distDir, { withFileTypes: true });
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    console.error('dist/ not found. Run tsc before generate-bin.');
    process.exit(1);
  }
  throw error;
}

const scripts = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => basename(entry.name, '.js'));

for (const name of scripts) {
  const wrapperPath = join(binDir, name);
  const contents = `#!/bin/bash
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$DIR/dist/${name}.js" "$@"
`;
  writeFileSync(wrapperPath, contents, { encoding: 'utf8' });
  chmodSync(wrapperPath, 0o755);
}

console.log(`Generated ${scripts.length} executable(s) in bin/: ${scripts.join(', ') || '(none)'}`);
