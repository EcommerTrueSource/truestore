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
  
  try {
    // Obter o token de autenticação
    const token = TrueCore.extractToken(request);
    console.log(`[API Banner] Token encontrado: ${token ? 'Sim' : 'Não'}`);
    
    // Verificar se existe um token válido
    if (!token) {
      console.warn('[API Banner] Token não encontrado, usando banner padrão');
      return NextResponse.json(
        { imageUrl: '/placeholder-banner-true.png' },
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    }
    
    // URL completa do endpoint - usando o endpoint correto
    const apiUrl = `${baseUrl}/marketing/campaign/banner`;
    console.log(`[API Banner] Fazendo requisição para: ${apiUrl}`);
    
    // Fazer requisição diretamente ao endpoint com o token
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    
    console.log(`[API Banner] Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    // Obter o JSON da resposta
    const data = await response.json();
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
    
    // Verificar se o erro é devido à indisponibilidade do backend ou erro 404
    if (error?.message?.includes('fetch') || 
        error?.message?.includes('network') || 
        error?.message?.includes('404')) {
      console.log('[API Banner] Erro na conexão com o backend ou recurso não encontrado, retornando banner padrão');
      return NextResponse.json(
        { imageUrl: '/placeholder-banner-true.png' },
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    }
    
    // Retornar erro como JSON para evitar HTML
    return NextResponse.json(
      { error: 'Erro ao obter banner', message: error?.message || 'Erro desconhecido' }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }
} 