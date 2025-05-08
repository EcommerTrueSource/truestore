import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter o banner da campanha de marketing
 * 
 * Endpoint público: /api/marketing/campaign/banner
 * Endpoint interno: /marketing/campaign/banner
 */
export async function GET(request: NextRequest) {
  console.log('[API Banner] Iniciando requisição');
  
  // Obter a URL base da API True Core sem o /api final
  const baseUrlRaw = process.env.NEXT_PUBLIC_API_URL || 
    "https://painel-true-core-app-460815276546.us-central1.run.app";
  
  // Remover /api do final se estiver presente para evitar duplicação
  const baseUrl = baseUrlRaw.endsWith('/api') 
    ? baseUrlRaw.slice(0, -4) 
    : baseUrlRaw;
    
  console.log(`[API Banner] URL da API base: ${baseUrl}`);
  
  // Função para buscar o banner de um endpoint específico
  const fetchBannerFromEndpoint = async (url: string, authToken: string | null = null) => {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log(`[API Banner] Tentando obter banner de: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    return await response.json();
  };
  
  try {
    // Obter o token de autenticação
    const token = TrueCore.extractToken(request);
    console.log(`[API Banner] Token encontrado: ${token ? 'Sim' : 'Não'}`);
    
    let data;
    
    // Primeiro, tentamos o endpoint autenticado se tiver token
    if (token) {
      try {
        const authenticatedUrl = `${baseUrl}/marketing/campaign/banner`;
        console.log(`[API Banner] Tentando endpoint autenticado: ${authenticatedUrl}`);
        data = await fetchBannerFromEndpoint(authenticatedUrl, token);
        console.log('[API Banner] Banner obtido com sucesso do endpoint autenticado');
      } catch (error) {
        console.warn('[API Banner] Falha ao obter do endpoint autenticado, tentando endpoint público', error instanceof Error ? error.message : 'Erro desconhecido');
        // Se falhar, tentamos o endpoint público como fallback
        try {
          const publicUrl = `${baseUrl}/public/banners/active`;
          data = await fetchBannerFromEndpoint(publicUrl);
          console.log('[API Banner] Banner obtido com sucesso do endpoint público');
        } catch (publicError) {
          console.error('[API Banner] Falha também no endpoint público, usando banner padrão', publicError instanceof Error ? publicError.message : 'Erro desconhecido');
          // Se ambos falharem, usamos o banner padrão
          data = { imageUrl: '/placeholder-banner-true.png' };
        }
      }
    } else {
      // Sem token, usamos diretamente o endpoint público
      try {
        const publicUrl = `${baseUrl}/public/banners/active`;
        console.log(`[API Banner] Sem token, usando endpoint público: ${publicUrl}`);
        data = await fetchBannerFromEndpoint(publicUrl);
        console.log('[API Banner] Banner obtido com sucesso do endpoint público');
      } catch (publicError) {
        console.error('[API Banner] Falha no endpoint público, usando banner padrão', publicError instanceof Error ? publicError.message : 'Erro desconhecido');
        // Se falhar, usamos o banner padrão
        data = { imageUrl: '/placeholder-banner-true.png' };
      }
    }
    
    // Se após todas as tentativas não tivermos dados válidos, usar um fallback
    if (!data || !data.imageUrl) {
      console.warn('[API Banner] Dados inválidos recebidos, usando banner padrão');
      data = { imageUrl: '/placeholder-banner-true.png' };
    }
    
    console.log(`[API Banner] Dados obtidos: ${JSON.stringify(data)}`);
    
    // Retornar resposta JSON
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    console.error(`[API Banner] Erro: ${error?.message || 'Desconhecido'}`);
    
    // SEMPRE retornar um JSON válido, mesmo em caso de erro
    return NextResponse.json(
      { imageUrl: '/placeholder-banner-true.png', error: error?.message || 'Erro desconhecido' },
      { 
        status: 200, // Retornar 200 com fallback em vez de erro
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }
} 