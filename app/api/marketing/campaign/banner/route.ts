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
  console.log(`[API Banner] URL da API: ${process.env.NEXT_PUBLIC_API_URL || 'não definida'}`);
  
  const token = TrueCore.extractToken(request);
  console.log(`[API Banner] Token encontrado: ${token ? 'Sim' : 'Não'}`);
  
  try {
    const response = await TrueCore.handleRequest(request, '/marketing/campaign/banner');
    console.log(`[API Banner] Status da resposta: ${response.status}`);
    return response;
  } catch (error) {
    console.error('[API Banner] Erro:', error);
    // Em caso de erro, retornar um JSON vazio mas válido para não quebrar o frontend
    return new Response(JSON.stringify({ imageUrl: null }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 