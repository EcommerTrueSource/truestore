import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter informações de um cliente pelo ID do Clerk
 * 
 * Endpoint público: /api/customers/clerk/[id]
 * Endpoint interno: /marketing/customers/byClerkId/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Garantir que estamos usando o ID completo
    const clerkId = params.id.trim();
    
    if (!clerkId) {
      console.error('[API:Customer] ID do Clerk inválido ou vazio');
      return NextResponse.json(
        { error: 'ID do Clerk inválido ou vazio' },
        { status: 400 }
      );
    }
    
    console.log(`[API:Customer] Buscando cliente pelo ID do Clerk: ${clerkId}`);
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[API:Customer] URL da API não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = TrueCore.extractToken(request);
    
    if (!token) {
      console.error('[API:Customer] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Construir a URL completa para a API True Core
    const url = `${baseUrl}/marketing/customers/byClerkId/${clerkId}`;
    console.log(`[API:Customer] Fazendo requisição para: ${url}`);
    
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

    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      console.error(`[API:Customer] Erro ao buscar cliente: ${status}`);
      
      try {
        // Verificar o tipo de conteúdo da resposta
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // Se for JSON, tentar processar normalmente
          const errorData = await response.json();
          console.error('[API:Customer] Erro detalhado:', errorData);
          return NextResponse.json(errorData, { status });
        } else {
          // Se não for JSON (ex: HTML), retornar um erro amigável
          const errorText = await response.text();
          console.error('[API:Customer] Resposta não-JSON:', errorText.slice(0, 200));
          
          return NextResponse.json(
            { error: `Erro no servidor ao buscar cliente: ${status}` },
            { status }
          );
        }
      } catch (parseError) {
        console.error('[API:Customer] Erro ao processar resposta de erro:', parseError);
        return NextResponse.json(
          { error: `Erro ao acessar API True Core: ${status}` },
          { status }
        );
      }
    }

    // Verificar o tipo de conteúdo antes de processar
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[API:Customer] Resposta não é JSON! Content-Type: ${contentType}`);
      
      // Obter o texto da resposta para diagnóstico
      const text = await response.text();
      console.error(`[API:Customer] Conteúdo da resposta não-JSON: ${text.slice(0, 200)}`);
      
      // Retornar erro informativo
      return NextResponse.json(
        { error: 'Resposta do servidor não é um JSON válido' },
        { status: 500 }
      );
    }
    
    // Processar a resposta JSON
    try {
      const data = await response.json();
      
      // Verificar se temos a categoria do cliente para determinar o warehouse
      let warehouse = 'MKT-Creator'; // Padrão
      
      if (data && data.__category__ && data.__category__.name) {
        const categoryName = data.__category__.name;
        
        if (categoryName.includes('Top Master') || categoryName === 'Clinica Top Master') {
          warehouse = 'MKT-Top Master';
          console.log(`[API:Customer] Cliente ${data.name} identificado como Top Master`);
        } else if (categoryName.includes('Creator') || 
                  categoryName.includes('Médico') || 
                  categoryName.includes('Nutricionista') || 
                  categoryName.includes('Influenciador') || 
                  categoryName.includes('Atleta')) {
          warehouse = 'MKT-Creator';
          console.log(`[API:Customer] Cliente ${data.name} identificado como Creator`);
        }
        
        // Adicionar informação do warehouse na resposta
        return NextResponse.json({
          ...data,
          __warehouse__: warehouse
        });
      }
      
      console.log(`[API:Customer] Cliente obtido: ${data?.name || 'Desconhecido'}`);
      return NextResponse.json(data);
    } catch (jsonError) {
      console.error('[API:Customer] Erro ao processar JSON da resposta:', jsonError);
      return NextResponse.json(
        { error: 'Erro ao processar dados do cliente' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API:Customer] Erro no proxy de cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de cliente' },
      { status: 500 }
    );
  }
} 