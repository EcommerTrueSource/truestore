'use client';

import { useState, useCallback } from 'react';
import { ApiService } from '@/lib/services/api-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook genérico para fazer chamadas à API com estado de carregamento
 */
export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  // Obter o hook de autenticação para acessar o token JWT
  const { isAuthenticated, getJwtToken } = useAuth();

  // Função auxiliar para obter o token JWT se necessário
  const getAuthToken = useCallback(async () => {
    if (isAuthenticated) {
      return await getJwtToken();
    }
    return null;
  }, [isAuthenticated, getJwtToken]);

  /**
   * Executa um GET para a API
   */
  const get = useCallback(async (endpoint: string) => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));

    try {
      const jwtToken = await getAuthToken();
      const data = await ApiService.get<T>(endpoint, jwtToken || undefined);
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, isLoading: false, error: apiError });
      throw apiError;
    }
  }, [getAuthToken]);

  /**
   * Executa um POST para a API
   */
  const post = useCallback(async (endpoint: string, body: any) => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));

    try {
      const jwtToken = await getAuthToken();
      const data = await ApiService.post<T>(endpoint, body, jwtToken || undefined);
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, isLoading: false, error: apiError });
      throw apiError;
    }
  }, [getAuthToken]);

  /**
   * Executa um PUT para a API
   */
  const put = useCallback(async (endpoint: string, body: any) => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));

    try {
      const jwtToken = await getAuthToken();
      const data = await ApiService.put<T>(endpoint, body, jwtToken || undefined);
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, isLoading: false, error: apiError });
      throw apiError;
    }
  }, [getAuthToken]);

  /**
   * Executa um DELETE para a API
   */
  const del = useCallback(async (endpoint: string) => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));

    try {
      const jwtToken = await getAuthToken();
      const data = await ApiService.delete<T>(endpoint, jwtToken || undefined);
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, isLoading: false, error: apiError });
      throw apiError;
    }
  }, [getAuthToken]);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
    reload: get,  // alias para facilitar o uso
  };
} 