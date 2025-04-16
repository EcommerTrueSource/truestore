'use client';

import axios from 'axios';
import { tokenStore } from '@/lib/token-store';
// Removendo o import do auth que causa o erro
// import { auth } from '@clerk/nextjs';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  expiresAt: string;
  expiresInSeconds: number;
}

// Nome da chave para armazenar o token no localStorage - mantido para compatibilidade
const API_TOKEN_KEY = 'true-store-api-token';

/**
 * Interface para representar um usuário autenticado
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  imageUrl?: string;
}

/**
 * Serviço responsável pela autenticação e gerenciamento de tokens
 */
class AuthService {
  // API endpoint para autenticação
  private readonly API_AUTH_ENDPOINT = '/api/auth/token';

  /**
   * Obtém o token de sessão do Clerk
   * @returns Promise com o token JWT ou null se não estiver autenticado
   * @deprecated Este método não deve ser usado diretamente. Use o hook useAuth do Clerk em componentes React.
   */
  async getClerkSessionToken(): Promise<string | null> {
    console.warn(
      'AuthService.getClerkSessionToken() não deve ser usado diretamente. ' +
      'Use o hook useAuth do Clerk em componentes React para obter o token JWT.'
    );
    
    // Retornando null em vez de tentar acessar auth()
    return null;
  }

  /**
   * Obtém um token JWT para uso nas requisições à API
   * Esta implementação gera ou recupera tokens para o True Core
   */
  async getApiToken(): Promise<string | null> {
    try {
      // Primeiro verificar se já temos um token armazenado válido no TokenStore global
      if (tokenStore.hasValidToken()) {
        // Retorna o token armazenado no TokenStore
        const token = tokenStore.getToken();
        console.log('Usando token True Core do store global');
        return token;
      }
      
      // Como fallback, verificar no localStorage (para compatibilidade)
      if (this.hasValidToken()) {
        // Migrar para o token store global
        const localToken = this.getStoredToken();
        if (localToken) {
          tokenStore.setToken(localToken);
          console.log('Token migrado do localStorage para o store global');
          return localToken;
        }
      }
      
      console.warn('Sem token válido - necessário fazer login');
      return null;
    } catch (error) {
      console.error('Erro ao obter token JWT:', error);
      return null;
    }
  }

  /**
   * Troca um token Clerk por um token True Core
   * @param clerkToken - Token JWT do Clerk
   * @returns Uma Promise que resolve para o token True Core ou null
   */
  async exchangeToken(clerkToken: string): Promise<string | null> {
    try {
      if (!clerkToken) {
        console.error('Token Clerk não fornecido para troca');
        return null;
      }
      
      // Se já temos um token válido no store global, retorná-lo
      if (tokenStore.hasValidToken()) {
        return tokenStore.getToken();
      }
      
      // Como fallback, verificar no localStorage (para compatibilidade)
      if (this.hasValidToken()) {
        const localToken = this.getStoredToken();
        if (localToken) {
          tokenStore.setToken(localToken);
          return localToken;
        }
      }
      
      console.log('Trocando token Clerk por token True Core...');
      
      // Chamar a API para trocar o token
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: clerkToken }),
        credentials: 'include' // Importante para permitir o cookie ser definido pelo servidor
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Erro ao trocar token:', error);
        return null;
      }
      
      const data = await response.json() as TokenResponse;
      
      if (!data.access_token) {
        console.error('Token não retornado pela API');
        return null;
      }
      
      // Armazenar o token no TokenStore global
      tokenStore.setToken(data.access_token, data.expiresInSeconds || 86400);
      
      // Como fallback, também armazenar no localStorage (para compatibilidade)
      this.storeToken(data.access_token);
      
      console.log('Token True Core obtido e armazenado com sucesso');
      return data.access_token;
    } catch (error) {
      console.error('[AuthService] Erro ao trocar token:', error);
      return null;
    }
  }

  /**
   * Armazena um token no localStorage com data de expiração
   * @param token Token a ser armazenado
   * @deprecated Use o TokenStore global
   */
  private storeToken(token: string): void {
    try {
      if (typeof window === 'undefined' || !token) return;
      
      // Calcular a expiração (token dura 24 horas a partir de agora)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      
      // Armazenar o token com data de expiração
      const tokenData = {
        token,
        expiresAt
      };
      
      localStorage.setItem(API_TOKEN_KEY, JSON.stringify(tokenData));
      console.log('Token armazenado no localStorage (compatibilidade)');
    } catch (error) {
      console.error('[AuthService] Erro ao armazenar token:', error);
    }
  }
  
  /**
   * Obtém o token armazenado
   * @returns O token armazenado ou null se não encontrado ou expirado
   * @deprecated Use o TokenStore global
   */
  private getStoredToken(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const tokenData = localStorage.getItem(API_TOKEN_KEY);
      if (!tokenData) return null;
      
      const parsed = JSON.parse(tokenData);
      
      // Verificar se o token não expirou
      if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
        return parsed.token;
      }
      
      // Se expirou, remover do armazenamento
      localStorage.removeItem(API_TOKEN_KEY);
      return null;
    } catch (error) {
      console.error('[AuthService] Erro ao recuperar token:', error);
      return null;
    }
  }

  /**
   * Verifica se temos um token válido armazenado no localStorage
   * @deprecated Use tokenStore.hasValidToken()
   */
  hasValidToken(): boolean {
    try {
      // Verificar se estamos no ambiente do navegador antes de acessar localStorage
      if (typeof window === 'undefined') {
        return false;
      }
      
      const tokenData = localStorage.getItem(API_TOKEN_KEY);
      if (!tokenData) return false;
      
      const parsed = JSON.parse(tokenData);
      // Verificar se temos um token e se não expirou
      return !!parsed.token && !!parsed.expiresAt && Date.now() < parsed.expiresAt;
    } catch (error) {
      console.error('[AuthService] Erro ao verificar token:', error);
      return false;
    }
  }

  /**
   * Limpa o token de API armazenado em cache
   */
  clearApiToken() {
    // Limpar no store global
    tokenStore.clearToken();
    
    // Limpar no localStorage (compatibilidade)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(API_TOKEN_KEY);
      console.log('Token de API limpo do cache');
    }
  }
  
  /**
   * Método de compatibilidade: alias para clearApiToken
   */
  clearToken() {
    this.clearApiToken();
  }

  /**
   * Armazena um token diretamente (método para compatibilidade com TokenStore)
   * @param token Token a ser armazenado
   */
  storeTokenDirectly(token: string): void {
    this.storeToken(token);
  }
}

// Singleton
export const authService = new AuthService(); 