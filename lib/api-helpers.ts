'use client';

import type { AuthContextType } from '@/lib/contexts/auth-context';

/**
 * Obtém os métodos de autenticação sem causar dependência circular
 * Isso permite que api.ts possa usar métodos de autenticação sem importar o contexto diretamente
 */
export function getAuth(): Partial<AuthContextType> | null {
  // Apenas no lado do cliente
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore - Acessamos uma propriedade global personalizada
  if (window.__auth) {
    // @ts-ignore
    return window.__auth;
  }
  
  return null;
}

/**
 * Define os métodos de autenticação para uso global
 * Chamado pelo AuthProvider
 */
export function setAuth(auth: Partial<AuthContextType>): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - Definimos uma propriedade global personalizada
  window.__auth = auth;
} 