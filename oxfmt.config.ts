import { defineConfig } from 'oxfmt';
import fmt from '@mengtaoxin/oxc-config/fmt';

export default defineConfig({
  ...fmt,
  ignorePatterns: [...(fmt.ignorePatterns ?? []), 'bin/', '.agents/'],
});
