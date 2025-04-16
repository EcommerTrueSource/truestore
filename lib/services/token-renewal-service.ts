'use client';

import { authService } from './auth-service';
import { useAuth } from '@/lib/contexts/auth-context';

// Constantes para controle da renovação
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const TOKEN_RENEWAL_THRESHOLD = 15 * 60 * 1000; // 15 minutos antes da expiração

let renewalIntervalId: NodeJS.Timeout | null = null;
let getJwtTokenCallback: (() => Promise<string | null>) | null = null;

/**
 * Serviço para gerenciar a renovação automática do token
 */
export const TokenRenewalService = {
  /**
   * Inicia o job de verificação periódica do token
   * @param tokenCallback - Função para obter o token JWT quando necessário
   */
  startRenewalJob(tokenCallback?: () => Promise<string | null>) {
    // Evitar múltiplas instâncias do job
    if (renewalIntervalId) {
      this.stopRenewalJob();
    }

    // Armazenar o callback se fornecido
    if (tokenCallback) {
      getJwtTokenCallback = tokenCallback;
    }

    // Verificar imediatamente
    this.checkAndRenewToken();

    // Configurar verificação periódica com bind para preservar o contexto
    const boundCheck = this.checkAndRenewToken.bind(this);
    renewalIntervalId = setInterval(boundCheck, TOKEN_CHECK_INTERVAL);

    return () => this.stopRenewalJob();
  },

  /**
   * Interrompe o job de renovação
   */
  stopRenewalJob() {
    if (renewalIntervalId) {
      clearInterval(renewalIntervalId);
      renewalIntervalId = null;
    }
  },

  /**
   * Verifica se o token precisa ser renovado e, se necessário, renova-o
   */
  async checkAndRenewToken() {
    try {
      // Verificar se o usuário está autenticado antes de prosseguir
      if (!authService.hasValidToken()) {
        return;
      }

      // Obter dados do token atual
      const tokenData = localStorage.getItem('true-store-api-token');
      if (!tokenData) return;

      const { expiresAt } = JSON.parse(tokenData);
      const timeUntilExpiration = expiresAt - Date.now();

      // Se o token estiver próximo da expiração, renová-lo
      if (timeUntilExpiration < TOKEN_RENEWAL_THRESHOLD) {
        console.log('Token próximo de expirar, renovando...');
        
        // Obter token JWT usando o callback armazenado ou de outro meio
        let clerkToken = null;
        
        if (getJwtTokenCallback) {
          // Usar o callback fornecido para obter o token
          clerkToken = await getJwtTokenCallback();
        }
        
        if (!clerkToken) {
          console.error('Não foi possível obter o token JWT para renovação');
          return;
        }

        // Renovar o token passando o JWT do Clerk
        const result = await authService.getApiToken(clerkToken);
        if (result && result.access_token) {
          console.log('Token renovado com sucesso');
        } else {
          console.error('Falha ao renovar o token da API');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar/renovar token:', error);
    }
  }
}; 