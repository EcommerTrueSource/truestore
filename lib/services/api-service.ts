'use client';

import { authService } from './auth-service';

class ApiServiceClass {
  private readonly baseUrl: string;

  constructor() {
    // Usar URL relativa para rotas de API internas
    this.baseUrl = '/api';
  }

  /**
   * Realiza uma requisição GET para a API
   * @param endpoint - Endpoint da API
   * @param options - Opções da requisição ou token JWT como string
   */
  async get<T>(endpoint: string, options?: string | { jwtToken?: string }): Promise<T> {
    let token: string | undefined;
    
    // Verificar se options é uma string (token) ou um objeto com jwtToken
    if (typeof options === 'string') {
      token = options;
    } else if (options && typeof options === 'object' && 'jwtToken' in options) {
      token = options.jwtToken;
    }
    
    return this.request<T>('GET', endpoint, undefined, token);
  }

  /**
   * Realiza uma requisição POST para a API
   * @param endpoint - Endpoint da API
   * @param body - Corpo da requisição
   * @param token - Token opcional (se não fornecido, será buscado do contexto de autenticação)
   */
  async post<T>(endpoint: string, body: any, token?: string): Promise<T> {
    return this.request<T>('POST', endpoint, body, token);
  }

  /**
   * Realiza uma requisição PUT para a API
   * @param endpoint - Endpoint da API
   * @param body - Corpo da requisição
   * @param token - Token opcional (se não fornecido, será buscado do contexto de autenticação)
   */
  async put<T>(endpoint: string, body: any, token?: string): Promise<T> {
    return this.request<T>('PUT', endpoint, body, token);
  }

  /**
   * Realiza uma requisição DELETE para a API
   * @param endpoint - Endpoint da API
   * @param token - Token opcional (se não fornecido, será buscado do contexto de autenticação)
   */
  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, token);
  }

  /**
   * Método genérico para realizar requisições
   * @param method - Método HTTP
   * @param endpoint - Endpoint da API
   * @param body - Corpo da requisição (opcional)
   * @param token - Token opcional (se não fornecido, será buscado do contexto de autenticação)
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Adicionar token de autenticação se disponível
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`Usando token para requisição ${method} ${endpoint}`);
    } else {
      console.warn(`Fazendo requisição ${method} ${endpoint} sem token de autenticação`);
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify(body);
    }

    console.log(`Enviando requisição ${method} para ${url}`);
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        let errorMessage = errorData.error || errorData.message || `Erro na requisição: ${statusCode}`;
        
        // Logs detalhados para problemas de autenticação
        if (statusCode === 401 || statusCode === 403) {
          console.error('Erro de autenticação na API:', errorData);
          errorMessage = 'Erro de autenticação. Por favor, faça login novamente.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Verificar se o conteúdo é JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        console.log(`Resposta JSON recebida de ${url}`);
        return jsonResponse;
      }
      
      // Para respostas não JSON
      const textResult = await response.text();
      console.log(`Resposta de texto recebida de ${url} (${textResult.length} caracteres)`);
      
      try {
        // Tenta converter para JSON mesmo assim
        return JSON.parse(textResult) as T;
      } catch {
        // Retorna o texto como resultado
        return textResult as unknown as T;
      }
    } catch (error) {
      console.error(`Erro ao fazer requisição ${method} para ${url}:`, error);
      throw error;
    }
  }
}

// Exportando instância singleton
export const ApiService = new ApiServiceClass(); 