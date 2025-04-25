'use client';

import { useState } from 'react';

interface CepAddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface UseCepResult {
  isLoading: boolean;
  error: string | null;
  fetchAddress: (cep: string) => Promise<CepAddressData | null>;
  resetError: () => void;
}

export function useCep(): UseCepResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = () => setError(null);

  const validateCep = (cep: string): boolean => {
    // Remove caracteres não numéricos
    const numericCep = cep.replace(/\D/g, '');
    // Valida se tem 8 dígitos
    return numericCep.length === 8;
  };

  const formatCep = (cep: string): string => {
    // Remove caracteres não numéricos
    return cep.replace(/\D/g, '');
  };

  const fetchAddress = async (cep: string): Promise<CepAddressData | null> => {
    // Limpa erro anterior
    setError(null);

    // Formata o CEP antes de validar
    const formattedCep = formatCep(cep);

    // Valida o CEP
    if (!validateCep(formattedCep)) {
      setError('CEP inválido. Deve conter 8 dígitos.');
      return null;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${formattedCep}/json/`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar CEP: ${response.status}`);
      }

      const data: CepAddressData = await response.json();

      // Verifica se a API retornou erro
      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao buscar informações do CEP';
      
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, fetchAddress, resetError };
} 