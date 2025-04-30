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
  
  // Obter a URL base da API True Core
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
    "https://painel-true-core-app-460815276546.us-central1.run.app/api";
  console.log(`[API Banner] URL da API: ${baseUrl}`);
  
  try {
    // Obter o token de autenticação
    const token = TrueCore.extractToken(request);
    console.log(`[API Banner] Token encontrado: ${token ? 'Sim' : 'Não'}`);
    
    // Se não tiver token, retornar erro em formato JSON
    if (!token) {
      console.log('[API Banner] Token não encontrado, retornando erro');
      return NextResponse.json(
        { error: 'Token não encontrado', imageUrl: null },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // URL completa do endpoint
    const apiUrl = `${baseUrl}/marketing/campaign/banner`;
    console.log(`[API Banner] Fazendo requisição para: ${apiUrl}`);
    
    // Fazer requisição diretamente ao endpoint
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
    console.log(`[API Banner] Content-Type: ${response.headers.get('content-type')}`);
    
    // Se a resposta não for bem-sucedida, retornar erro em formato JSON
    if (!response.ok) {
      console.log(`[API Banner] Resposta não ok: ${response.status}`);
      // Tentar obter mensagem de erro como JSON ou como texto
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Erro ao obter banner';
      } catch (e) {
        // Se não for JSON, tentar obter como texto
        errorMessage = await response.text();
      }
      
      return NextResponse.json(
        { error: `Erro HTTP: ${response.status}`, message: errorMessage, imageUrl: null },
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Tentar obter resposta como JSON, com fallback para resposta vazia com banner nulo
    let data;
    try {
      // Tentar obter o JSON da resposta
      data = await response.json();
      console.log(`[API Banner] Dados obtidos: ${JSON.stringify(data)}`);
    } catch (parseError: any) {
      console.error(`[API Banner] Erro ao processar JSON: ${parseError.message}`);
      // Se não for JSON válido, tentar obter como texto para diagnóstico
      const text = await response.text();
      console.error(`[API Banner] Conteúdo recebido (primeiros 200 caracteres): ${text.substring(0, 200)}`);
      
      // Retornar um objeto vazio com imageUrl null
      data = { imageUrl: null };
    }
    
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
    console.error(`[API Banner] Stack: ${error?.stack || 'Não disponível'}`);
    
    // Retornar erro como JSON para evitar HTML
    return NextResponse.json(
      { error: 'Erro ao obter banner', message: error?.message || 'Erro desconhecido', imageUrl: null }, 
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