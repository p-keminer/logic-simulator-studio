/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BROKER_BASE_URL?: string;
  readonly VITE_ENABLE_BACKEND_BROKER_UI?: '0' | '1';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
