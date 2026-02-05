// Configure Monaco to use locally bundled version when available (SaaS build
// with MonacoWebpackPlugin), otherwise fall back to CDN (core standalone).
// This file is imported as a side-effect before any Monaco Editor usage.

import { loader } from '@monaco-editor/react';

if (typeof window !== 'undefined') {
  // Dynamic import avoids SSR crash (monaco-editor references window at import time)
  // and lets webpack code-split the module properly
  import('monaco-editor').then((monaco) => {
    loader.config({ monaco });
  }).catch(() => {
    // MonacoWebpackPlugin not present — @monaco-editor/react uses CDN by default
  });
}
