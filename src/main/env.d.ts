/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_APP_ENV: 'development' | 'production';
  readonly MAIN_VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
