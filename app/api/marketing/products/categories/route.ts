import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter categorias de produtos
 * 
 * Endpoint público: /api/marketing/products/categories
 * Endpoint interno: /marketing/products/categories
 */
export async function GET(request: NextRequest) {
  try {
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
    const endpoint = '/marketing/products/categories';
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`[TrueCore] Fazendo requisição para: ${url}`);

    // Fazer a requisição para a API True Core
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 3600 } // Revalidar a cada hora (categorias mudam com menos frequência)
    });

    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      
      try {
        const errorData = await TrueCore.tryParseAsJson(response);
        console.error('[TrueCore] Erro da API True Core:', errorData);
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
    
    // Se a resposta for um array, adicionar a categoria "Todos os produtos"
    if (Array.isArray(data)) {
      const categoriesWithAll = [
        { 
          id: 'all', 
          name: 'Todos os produtos', 
          slug: 'todos',
          itemQuantity: data.reduce((total, cat) => total + (cat.itemQuantity || 0), 0)
        },
        ...data
      ];
      
      console.log(`[TrueCore] ${data.length} categorias obtidas, retornando ${categoriesWithAll.length} categorias com "Todos os produtos"`);
      return Response.json(categoriesWithAll);
    }
    
    // Se a resposta tiver uma propriedade 'data' e for um array, fazer o mesmo processamento
    if (data && data.data && Array.isArray(data.data)) {
      const categoriesWithAll = [
        { 
          id: 'all', 
          name: 'Todos os produtos', 
          slug: 'todos',
          itemQuantity: data.data.reduce((total: number, cat: any) => total + (cat.itemQuantity || 0), 0)
        },
        ...data.data
      ];
      
      console.log(`[TrueCore] ${data.data.length} categorias obtidas, retornando ${categoriesWithAll.length} categorias com "Todos os produtos"`);
      return Response.json(categoriesWithAll);
    }
    
    // Se não conseguimos identificar o formato, retornar os dados como estão
    console.log(`[TrueCore] Retornando dados de categorias em formato não padrão`);
    return Response.json(data);
  } catch (error) {
    console.error(`[TrueCore] Erro na obtenção de categorias:`, error);
    return Response.json(
      { error: 'Erro interno ao processar requisição de categorias' },
      { status: 500 }
    );
  }
} 