'use client';

/**
 * TokenStore - Armazenamento local para tokens de autenticação
 * 
 * Este módulo gerencia o armazenamento e recuperação de tokens JWT
 * tanto no localStorage quanto na memória durante o tempo de vida da sessão.
 */

// Nome da chave usada para armazenar o token no localStorage
const TOKEN_KEY = 'true_core_token';
// Nome da chave para controle de recargas da página
const RELOAD_TRACKER_KEY = 'store_reload_tracker';

/**
 * Classe para gerenciar tokens de autenticação
 */
class TokenStore {
	[x: string]: any;
  private token: string | null = null;
  private hasCheckedStorage: boolean = false;
  private tokenExpiresAt: number | null = null;

  /**
   * Inicializa o armazenamento de tokens verificando o localStorage
   */
  constructor() {
    // A verificação do localStorage é feita sob demanda
    // para evitar problemas com SSR
  }

  /**
   * Verifica se existe um token válido (tanto em memória quanto no localStorage)
   */
  hasValidToken(): boolean {
    // Se já temos um token em memória, ele é válido
    if (this.token) {
      return true;
    }

    // Verificar localStorage, mas apenas no lado do cliente
    if (typeof window !== 'undefined' && !this.hasCheckedStorage) {
      this.hasCheckedStorage = true;
      
      // Primeiro, verificar localStorage
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        // Verificar se o token parece válido (pelo menos é um JWT)
        if (this.isTokenFormatValid(storedToken)) {
          this.token = storedToken;
          return true;
        }
      }
      
      // Se não encontrou no localStorage, verificar nos cookies
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === TOKEN_KEY && value) {
            // Verificar validade do token do cookie
            if (this.isTokenFormatValid(value)) {
              // Armazenar o token em memória para uso futuro
              this.token = value;
              // Sincronizar com localStorage para maior consistência
              try {
                localStorage.setItem(TOKEN_KEY, value);
              } catch (e) {
                console.error("[TokenStore] Erro ao sincronizar token do cookie para localStorage:", e);
              }
              return true;
            }
          }
        }
      } catch (e) {
        console.error("[TokenStore] Erro ao verificar cookies:", e);
      }
    }

    return false;
  }

  /**
   * Verifica se um token tem formato válido de JWT
   */
  private isTokenFormatValid(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Um JWT válido tem formato xxxxx.yyyyy.zzzzz
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Verificar se cada parte parece ser Base64 válido
    try {
      // Verificar se pelo menos o payload (segunda parte) pode ser decodificado
      const payload = JSON.parse(atob(this.base64UrlDecode(parts[1])));
      
      // Verificar se o token tem campos básicos de JWT
      if (!payload.sub && !payload.email) { // Aceitar tokens que tenham pelo menos sub OU email
        return false;
      }

      // Verificar se o token não está expirado
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          console.log("[TokenStore] Token expirado");
          return false;
        }
      }

      return true;
    } catch (e) {
      console.error("[TokenStore] Erro ao verificar token:", e);
      return false;
    }
  }

  /**
   * Decodifica uma string Base64URL para Base64 padrão
   */
  private base64UrlDecode(input: string): string {
    // Converter Base64URL para Base64
    let output = input.replace(/-/g, '+').replace(/_/g, '/');
    
    // Adicionar padding se necessário
    const padding = output.length % 4;
    if (padding) {
      if (padding === 1) {
        throw new Error('Base64URL string inválida');
      }
      output += '=='.slice(0, 4 - padding);
    }
    
    return output;
  }

  /**
   * Obter o token atual (da memória ou do localStorage)
   */
  getToken(): string | null {
    // Se temos token em memória, retorná-lo
    if (this.token) {
      return this.token;
    }

    // Verificar localStorage, mas apenas no lado do cliente
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken && this.isTokenFormatValid(storedToken)) {
        this.token = storedToken;
        return storedToken;
      }
    }

    return null;
  }

  /**
   * Armazena um novo token (tanto em memória quanto no localStorage)
   * @param token O token JWT a ser armazenado
   * @param expiresInSeconds Duração do token em segundos
   */
  setToken(token: string, expiresInSeconds: number): void {
    if (!token) {
      console.warn("[TokenStore] Tentativa de armazenar token vazio ignorada");
      return;
    }

    // Armazenar em memória
    this.token = token;
    this.tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);

    // Armazenar no localStorage (apenas no lado do cliente)
    if (typeof window !== 'undefined') {
      try {
        // Armazenar o token
        localStorage.setItem(TOKEN_KEY, token);
        
        // Também armazenar a expiração
        localStorage.setItem(`${TOKEN_KEY}_exp`, this.tokenExpiresAt.toString());
        
        console.log(`[TokenStore] Token armazenado com sucesso (expira em ${expiresInSeconds} segundos)`);
      } catch (e) {
        console.error("[TokenStore] Erro ao armazenar token no localStorage:", e);
      }
    }
  }

  /**
   * Calcula quanto tempo resta até a expiração do token em segundos
   * Retorna null se não tivermos informação sobre a expiração
   */
  getTokenExpiryTimeRemaining(): number | null {
    try {
      if (typeof window === 'undefined') return null;
      
      // Primeiro tentar obter da memória
      if (this.tokenExpiresAt) {
        const remaining = (this.tokenExpiresAt - Date.now()) / 1000;
        return remaining > 0 ? remaining : 0;
      }
      
      // Se não temos em memória, tentar obter do localStorage
      const expiresAtStr = localStorage.getItem(`${TOKEN_KEY}_exp`);
      if (!expiresAtStr) return null;
      
      const expiresAt = parseInt(expiresAtStr, 10);
      const remaining = (expiresAt - Date.now()) / 1000;
      
      // Atualizar a memória também
      this.tokenExpiresAt = expiresAt;
      
      return remaining > 0 ? remaining : 0;
    } catch (e) {
      console.error('[TokenStore] Erro ao calcular tempo de expiração:', e);
      return null;
    }
  }

  /**
   * Remove o token atual (tanto da memória quanto do localStorage)
   */
  clearToken(): void {
    // Limpar da memória
    this.token = null;
    this.tokenExpiresAt = null;

    // Limpar do localStorage (apenas no lado do cliente)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(`${TOKEN_KEY}_exp`);
        console.log("[TokenStore] Token e expiração removidos com sucesso");
      } catch (e) {
        console.error("[TokenStore] Erro ao remover token do localStorage:", e);
      }
    }
  }

  /**
   * Controla o número de tentativas de recarregamento para evitar loops
   */
  trackReload(maxReloads: number = 2): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Verificar o tempo da última recarga
      const lastReloadTime = sessionStorage.getItem('last_reload_time');
      const now = Date.now();
      
      // Se a última recarga foi muito recente (menos de 2 segundos atrás), 
      // incrementar o contador de recargas rápidas
      if (lastReloadTime) {
        const timeSinceLastReload = now - parseInt(lastReloadTime, 10);
        
        if (timeSinceLastReload < 2000) { // 2 segundos
          console.log(`[TokenStore] Recarga muito rápida (${timeSinceLastReload}ms), possível loop de recargas`);
          // Bloquear recargas adicionais se estamos recarregando muito rápido
          localStorage.setItem(RELOAD_TRACKER_KEY, maxReloads.toString());
          return false;
        }
      }
      
      // Registrar o tempo da recarga atual
      sessionStorage.setItem('last_reload_time', now.toString());
      
      // Obter o contador atual
      const currentCountStr = localStorage.getItem(RELOAD_TRACKER_KEY) || '0';
      const currentCount = parseInt(currentCountStr, 10);
      
      // Se já excedemos o limite, não permitir mais recargas
      if (currentCount >= maxReloads) {
        console.log(`[TokenStore] Limite de ${maxReloads} recargas atingido`);
        return false;
      }
      
      // Incrementar o contador
      localStorage.setItem(RELOAD_TRACKER_KEY, (currentCount + 1).toString());
      return true;
    } catch (e) {
      console.error("[TokenStore] Erro ao rastrear recargas:", e);
      return false;
    }
  }

  /**
   * Resetar o contador de recargas
   */
  resetReloadTracker(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(RELOAD_TRACKER_KEY);
        sessionStorage.removeItem('last_reload_time');
        console.log("[TokenStore] Contador de recargas resetado com sucesso");
      } catch (e) {
        console.error("[TokenStore] Erro ao resetar contador de recargas:", e);
      }
    }
  }
}

// Exportar uma única instância para toda a aplicação
export const tokenStore = new TokenStore(); 