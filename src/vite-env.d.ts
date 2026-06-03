/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL del GRS (incluye prefijo /api). */
  readonly VITE_GRS_BASE_URL?: string;
  /** Base URL del microservicio zempo. */
  readonly VITE_ZEMPO_BASE_URL?: string;
  /** Base URL del microservicio ath. */
  readonly VITE_ATH_BASE_URL?: string;
  /** API key Bearer de zempo (opcional; mejor configurar en Ajustes). */
  readonly VITE_ZEMPO_API_KEY?: string;
  /** API key de ath (opcional). */
  readonly VITE_ATH_API_KEY?: string;
  /** Idioma del header `language` del GRS. */
  readonly VITE_LANGUAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
