/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BROKER_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
