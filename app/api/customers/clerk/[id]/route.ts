import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter informações do cliente pelo ID do Clerk
 * 
 * Endpoint público: /api/customers/clerk/[id]
 * Endpoint interno: /marketing/customers/byClerkId/[id]
 * 
 * [id]: ID do usuário no Clerk
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkId = await params.id;
    
    if (!clerkId) {
      return Response.json(
        { error: 'ID do Clerk não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API:Customer] Buscando cliente pelo ID do Clerk: ${clerkId}`);
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      return Response.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = TrueCore.extractToken(request);
    
    if (!token) {
      return Response.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Construir a URL completa para a API True Core
    const endpoint = `/marketing/customers/byClerkId/${clerkId}`;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`[API:Customer] Fazendo requisição para: ${url}`);

    // Fazer a requisição para a API True Core
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 3600 } // Revalidar a cada hora
    });

    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      
      try {
        const errorData = await TrueCore.tryParseAsJson(response);
        console.error('[API:Customer] Erro da API True Core:', errorData);
        return Response.json(errorData, { status });
      } catch (error) {
        return Response.json(
          { error: `Erro ao acessar API True Core: ${endpoint}` },
          { status }
        );
      }
    }

    // Tentar obter a resposta como JSON
    const data = await TrueCore.tryParseAsJson(response);
    
    // Verificar a categoria do cliente para determinar o warehouse
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
      return Response.json({
        ...data,
        __warehouse__: warehouse
      });
    }
    
    console.log(`[API:Customer] Cliente obtido: ${data?.name || 'Desconhecido'}`);
    return Response.json(data);
  } catch (error) {
    console.error(`[API:Customer] Erro na obtenção do cliente:`, error);
    return Response.json(
      { error: 'Erro interno ao processar requisição de cliente' },
      { status: 500 }
    );
  }
} 