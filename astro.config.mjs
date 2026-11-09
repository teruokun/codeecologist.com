import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  site: 'https://codeecologist.com',
  output: 'static',
  build: {
    // The Content-Security-Policy in public/_headers allows no inline styles,
    // so every stylesheet is emitted as a file.
    inlineStylesheets: 'never',
  },
  env: {
    schema: {
      // "true" lets a build ship TODO(jeff) placeholder copy, and shows the
      // "draft site" banner on every page.
      ALLOW_PLACEHOLDERS: envField.boolean({
        context: 'server',
        access: 'public',
        default: false,
      }),
    },
  },
});
