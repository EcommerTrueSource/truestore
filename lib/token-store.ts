'use client';

/**
 * Store global para gerenciar o token do True Core
 */
class TokenStore {
  private static instance: TokenStore;
  private token: string | null = null;
  private expiresAt: number | null = null;
  // Tempo mínimo restante (em ms) para considerar um token ainda válido
  private readonly SAFETY_MARGIN = 5 * 60 * 1000; // 5 minutos

  private constructor() {
    // Ao inicializar, tentar recuperar o token do localStorage se existir
    this.migrateFromLocalStorage();
  }
  
  /**
   * Migração de tokens do localStorage para o TokenStore (memória)
   */
  private migrateFromLocalStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const storedToken = localStorage.getItem('true_core_token');
      if (storedToken) {
        try {
          const tokenData = JSON.parse(storedToken);
          if (tokenData.token && tokenData.expiresAt && Date.now() < tokenData.expiresAt) {
            this.token = tokenData.token;
            this.expiresAt = tokenData.expiresAt;
            console.log('Token migrado do localStorage para TokenStore');
          }
        } catch (e) {
          // Se não conseguir fazer parse do JSON, pode ser o token direto
          const expiresAt = Date.now() + 3600 * 1000; // 1 hora
          this.token = storedToken;
          this.expiresAt = expiresAt;
          console.log('Token raw migrado do localStorage para TokenStore');
        }
      }
    } catch (error) {
      console.error('Erro ao migrar token do localStorage:', error);
    }
  }

  /**
   * Obtém a instância única do TokenStore (singleton)
   */
  public static getInstance(): TokenStore {
    if (!TokenStore.instance) {
      TokenStore.instance = new TokenStore();
    }
    return TokenStore.instance;
  }

  /**
   * Define o token com sua data de expiração
   */
  public setToken(token: string, expiresInSeconds: number = 3600): void {
    if (!token) return;
    
    // Analisar o token JWT para extrair a expiração do payload
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload.exp) {
          // Se o token tem um campo exp, usar essa data ao invés do padrão
          const expTimestamp = payload.exp * 1000; // Converter para milissegundos
          const now = Date.now();
          const calculatedExpiresIn = Math.floor((expTimestamp - now) / 1000);
          
          if (calculatedExpiresIn > 0) {
            console.log(`[TokenStore] Token JWT contém exp, ajustando expiração para ${calculatedExpiresIn}s`);
            expiresInSeconds = calculatedExpiresIn;
          } else {
            console.warn(`[TokenStore] Token JWT já expirado! exp=${new Date(expTimestamp).toISOString()}`);
          }
        }
      }
    } catch (e) {
      console.warn(`[TokenStore] Não foi possível analisar o token JWT:`, e);
    }
    
    this.token = token;
    this.expiresAt = Date.now() + (expiresInSeconds * 1000);
    console.log(`[TokenStore] Token True Core armazenado. Expira em ${expiresInSeconds}s (${new Date(this.expiresAt).toISOString()})`);
    
    // Também armazenar no localStorage para persistência
    try {
      if (typeof window !== 'undefined') {
        const tokenData = {
          token: this.token,
          expiresAt: this.expiresAt
        };
        localStorage.setItem('true_core_token', JSON.stringify(tokenData));
        console.log(`[TokenStore] Token persistido no localStorage. Expira em ${new Date(this.expiresAt).toISOString()}`);
      }
    } catch (e) {
      console.error('[TokenStore] Erro ao persistir token no localStorage:', e);
    }
  }

  /**
   * Obtém o token atual, se for válido
   */
  public getToken(): string | null {
    if (!this.token || !this.expiresAt) {
      console.log('[TokenStore] Nenhum token armazenado');
      return null;
    }
    
    // Verificar se o token não expirou, considerando a margem de segurança
    if (Date.now() < (this.expiresAt - this.SAFETY_MARGIN)) {
      const secondsRemaining = Math.floor((this.expiresAt - Date.now()) / 1000);
      console.log(`[TokenStore] Token válido, expira em ${secondsRemaining}s (${new Date(this.expiresAt).toISOString()})`);
      return this.token;
    }
    
    console.log(`[TokenStore] Token expirado ou próximo da expiração. Expiração: ${new Date(this.expiresAt).toISOString()}`);
    // Token expirado ou próximo de expirar
    this.clearToken();
    return null;
  }

  /**
   * Verifica se o token é válido
   */
  public hasValidToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Retorna o tempo restante (em segundos) para expiração do token
   */
  public getTokenExpiryTimeRemaining(): number | null {
    if (!this.expiresAt) return null;
    const remaining = Math.max(0, this.expiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }

  /**
   * Limpa o token atual
   */
  public clearToken(): void {
    this.token = null;
    this.expiresAt = null;
    console.log('Token True Core removido da memória');
    
    // Também limpar do localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('true_core_token');
      }
    } catch (e) {
      console.error('Erro ao remover token do localStorage:', e);
    }
  }
}

// Exporta a instância como singleton
export const tokenStore = TokenStore.getInstance(); 