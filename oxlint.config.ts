import { defineConfig } from 'oxlint';
import node from '@mengtaoxin/oxc-config/node';

export default defineConfig({
  extends: [node],
  // Empty array = do not re-add default plugins on top of the preset.
  plugins: [],
});
