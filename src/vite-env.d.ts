/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Pages / peek builds — no Connect or spend. */
  readonly VITE_SHOWCASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
