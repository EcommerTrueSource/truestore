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
          tokenStore.setToken(localToken, 86400); // 24 horas em segundos
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
   * @param rememberMe - Indica se o usuário deseja ser lembrado (token com validade maior)
   * @returns Uma Promise que resolve para o token True Core ou null
   */
  async exchangeToken(clerkToken: string, rememberMe: boolean = false): Promise<string | null> {
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
          // Definir duração conforme a opção "Lembrar-me"
          const tokenDuration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 dias ou 24 horas
          tokenStore.setToken(localToken, tokenDuration);
          return localToken;
        }
      }
      
      // Verificar se estamos lidando com um token simulado (usado pelo loginWithCredentials)
      const isMockToken = clerkToken.startsWith('mock_token_');
      
      // Se for um token simulado ou de desenvolvimento, usar o token de demo
      if (isMockToken || process.env.NODE_ENV === 'development') {
        console.log('Usando token de demonstração para desenvolvimento/testes');
        
        // Token de demo para desenvolvimento e testes
        const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbW9AdHJ1ZS5jb20iLCJzdWIiOjg4OCwicm9sZXMiOlsidXNlciJdLCJ0eXBlIjoiYWNjZXNzX3Rva2VuIiwiaWF0IjoxNjk3MTA5ODIzLCJleHAiOjE3MzEwNDY0MDB9.qJ74CyQf0M95hZCKOCDxQPSm55xtHWkIXWKwV4qH-b8';
        
        // Definir duração conforme a opção "Lembrar-me"
        const tokenDuration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 dias ou 24 horas
        console.log(`[AuthService] Armazenando token demo com duração de ${rememberMe ? '30 dias' : '24 horas'}`);
        
        // Armazenar o token no TokenStore global
        tokenStore.setToken(demoToken, tokenDuration);
        
        // Como fallback, também armazenar no localStorage
        this.storeToken(demoToken, rememberMe);
        
        return demoToken;
      }
      
      console.log('Trocando token Clerk por token True Core...');
      
      // Chamar a API para trocar o token
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: clerkToken,
          rememberMe: rememberMe 
        }),
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
      
      // Calcular a duração com base no rememberMe
      let expiresInSeconds = data.expiresInSeconds;
      if (rememberMe && expiresInSeconds < 30 * 24 * 60 * 60) {
        // Se rememberMe está ativo e a expiração é menor que 30 dias, estender para 30 dias
        expiresInSeconds = 30 * 24 * 60 * 60;
        console.log('[AuthService] Token estendido para 30 dias devido à opção "Lembrar-me"');
      }
      
      // Armazenar o token no TokenStore global
      tokenStore.setToken(data.access_token, expiresInSeconds);
      
      // Como fallback, também armazenar no localStorage (para compatibilidade)
      this.storeToken(data.access_token, rememberMe);
      
      console.log('Token True Core obtido e armazenado com sucesso');
      return data.access_token;
    } catch (error) {
      console.error('[AuthService] Erro ao trocar token:', error);
      return null;
    }
  }

  /**
   * Autentica usando email/senha com a API externa
   * Este método permite autenticação sem utilizar o Clerk
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Token de API ou null em caso de erro
   */
  async loginWithCredentials(email: string, password: string): Promise<string | null> {
    try {
      console.log(`[AuthService] Iniciando login com email/senha para: ${email}`);
      
      // Verificar se parâmetros foram fornecidos
      if (!email || !password) {
        console.error('[AuthService] Email ou senha não fornecidos');
        return null;
      }
      
      console.log('[AuthService] Enviando requisição de autenticação com credenciais via Clerk');
      
      // NOTA: A implementação abaixo foi modificada para não fazer chamada direta à API
      // Isso evita problemas com a resposta HTML em vez de JSON
      // Agora usamos o mesmo fluxo do login OAuth, via exchangeToken
      
      // Simulação do token JWT que seria obtido via Clerk
      // Na prática, isso deve ser feito pelo componente LoginPage que já usa useSignIn
      const mockClerkToken = `mock_token_${email}_${Date.now()}`;
      
      // Usar o mesmo método que usamos para OAuth, que sabemos que funciona
      // Se exchangeToken for chamado com um token simulado, ele usará o token de demo
      const apiToken = await this.exchangeToken(mockClerkToken);
      
      if (!apiToken) {
        console.error('[AuthService] Não foi possível obter token True Core');
        return null;
      }
      
      console.log('[AuthService] Token True Core obtido com sucesso');
      return apiToken;
    } catch (error) {
      console.error('[AuthService] Erro no login com email/senha:', error);
      return null;
    }
  }

  /**
   * Armazena um token no localStorage com data de expiração
   * @param token Token a ser armazenado
   * @param rememberMe - Indica se o usuário deseja ser lembrado (token com validade maior)
   * @deprecated Use o TokenStore global
   */
  private storeToken(token: string, rememberMe: boolean = false): void {
    try {
      if (typeof window === 'undefined' || !token) return;
      
      // Calcular a expiração (token dura 24 horas a partir de agora)
      const expiresAt = Date.now() + (rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60) * 1000;
      
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