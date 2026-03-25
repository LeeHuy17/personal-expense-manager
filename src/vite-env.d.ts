/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  // Thêm các biến env khác của bạn ở đây...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}