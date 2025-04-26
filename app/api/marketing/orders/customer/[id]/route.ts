import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter os pedidos de um cliente específico
 * 
 * Endpoint público: /api/marketing/orders/customer/[id]
 * Endpoint interno: /marketing/orders/customer/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[API:Orders] Buscando pedidos do cliente: ${params.id}`);
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[API:Orders] URL da API não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = TrueCore.extractToken(request);
    
    if (!token) {
      console.error('[API:Orders] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Obter parâmetros de consulta da requisição original
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    
    // Construir a URL completa para a API True Core
    const customerId = params.id;
    const endpoint = `/marketing/orders/customer/${customerId}`;
    const url = `${baseUrl}${endpoint}${queryString}`;
    
    console.log(`[API:Orders] Fazendo requisição para: ${url}`);
    
    // Fazer a requisição para a API True Core
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    console.log(`[API:Orders] Status da resposta: ${response.status}`);
    
    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      console.error(`[API:Orders] Erro ao buscar pedidos: ${status}`);
      
      try {
        // Verificar o tipo de conteúdo da resposta
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // Se for JSON, tentar processar normalmente
          const errorData = await response.json();
          console.error('[API:Orders] Erro detalhado:', errorData);
          return NextResponse.json(errorData, { status });
        } else {
          // Se não for JSON (ex: HTML), retornar um erro amigável
          const errorText = await response.text();
          console.error('[API:Orders] Resposta não-JSON:', errorText.slice(0, 200));
          
          return NextResponse.json(
            { error: `Erro no servidor ao buscar pedidos: ${status}` },
            { status }
          );
        }
      } catch (parseError) {
        console.error('[API:Orders] Erro ao processar resposta de erro:', parseError);
        return NextResponse.json(
          { error: `Erro ao acessar API True Core: ${status}` },
          { status }
        );
      }
    }

    // Verificar o tipo de conteúdo antes de processar
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[API:Orders] Resposta não é JSON! Content-Type: ${contentType}`);
      
      // Obter o texto da resposta para diagnóstico
      const text = await response.text();
      console.error(`[API:Orders] Conteúdo da resposta não-JSON: ${text.slice(0, 200)}`);
      
      // Retornar um array vazio como fallback, para evitar erro no cliente
      return NextResponse.json([], { status: 200 });
    }
    
    // Processar a resposta JSON
    try {
      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log(`[API:Orders] ${data.length} pedidos encontrados para o cliente`);
      } else {
        console.log('[API:Orders] Resposta não é um array:', typeof data);
        // Tentar encontrar array em alguma propriedade
        if (data && typeof data === 'object') {
          const possibleArrayProps = ['data', 'orders', 'items', 'results'];
          for (const prop of possibleArrayProps) {
            if (data[prop] && Array.isArray(data[prop])) {
              console.log(`[API:Orders] Array encontrado em data.${prop}`);
              return NextResponse.json(data[prop]);
            }
          }
        }
      }
      
      return NextResponse.json(data);
    } catch (jsonError) {
      console.error('[API:Orders] Erro ao processar JSON da resposta:', jsonError);
      return NextResponse.json(
        { error: 'Erro ao processar dados dos pedidos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API:Orders] Erro no proxy de pedidos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de pedidos' },
      { status: 500 }
    );
  }
} 