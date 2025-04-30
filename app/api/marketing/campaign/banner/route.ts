import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter o banner da campanha de marketing
 * 
 * Endpoint público: /api/marketing/campaign/banner
 * Endpoint interno: /marketing/campaign/banner
 */
export async function GET(request: NextRequest) {
  console.log('[API Banner] Iniciando requisição');
  
  // Obter a URL base da API True Core do arquivo de configuração
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
    "https://painel-true-core-app-460815276546.us-central1.run.app/api";
  console.log(`[API Banner] URL da API: ${baseUrl}`);
  
  // Obter o token de autenticação
  const token = TrueCore.extractToken(request);
  console.log(`[API Banner] Token encontrado: ${token ? 'Sim' : 'Não'}`);
  
  if (!token) {
    // Retornar JSON vazio se não houver token
    console.log('[API Banner] Sem token disponível, retornando resposta vazia');
    return new Response(JSON.stringify({ imageUrl: null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  try {
    // Fazer chamada fetch direta para o endpoint da API sem usar o proxy
    const url = `${baseUrl.replace('/api', '')}/marketing/campaign/banner`;
    console.log(`[API Banner] Chamando API diretamente: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store' // Evita problemas de cache
    });
    
    if (!response.ok) {
      console.error(`[API Banner] Erro da API: ${response.status} ${response.statusText}`);
      throw new Error(`Erro ao chamar API: ${response.status}`);
    }
    
    // Processar resposta
    const data = await response.json();
    console.log(`[API Banner] Resposta obtida com sucesso: ${JSON.stringify(data)}`);
    
    // Retornar a resposta como JSON
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[API Banner] Erro:', error);
    // Em caso de erro, retornar um JSON vazio mas válido para não quebrar o frontend
    return new Response(JSON.stringify({ imageUrl: null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 