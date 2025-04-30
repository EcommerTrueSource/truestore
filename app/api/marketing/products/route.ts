import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para produtos de marketing
 * 
 * Endpoint público: /api/marketing/products
 * Endpoint interno: /marketing/products
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

    // Copiar os parâmetros de consulta da requisição original
    const searchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    
    // Remover parâmetro 'categoryName' se existir, pois não é mais necessário
    if (searchParams.has('categoryName')) {
      console.log(`[TrueCore] Removendo parâmetro 'categoryName' obsoleto`);
      searchParams.delete('categoryName');
    }
    
    // Se houver 'categoryId', convertê-lo para 'category' para o backend
    if (searchParams.has('categoryId')) {
      const categoryId = searchParams.get('categoryId');
      if (categoryId) {
        console.log(`[TrueCore] Convertendo 'categoryId' para 'category': ${categoryId}`);
        searchParams.set('category', categoryId);
      }
      searchParams.delete('categoryId'); // Remover o original
    }
    
    // Adicionar filtros padrão se não estiverem presentes
    if (!searchParams.has('inStock')) searchParams.set('inStock', 'true');
    if (!searchParams.has('active')) searchParams.set('active', 'true');
    
    // Construir a URL completa para a API True Core
    const endpoint = '/marketing/products';
    const url = `${baseUrl}${endpoint}?${searchParams.toString()}`;
    
    console.log(`[TrueCore] Fazendo requisição para: ${url}`);

    // Fazer a requisição para a API True Core
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 60 } // Revalidar a cada 60 segundos
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
    
    // Log de informações sobre os produtos obtidos
    if (data && data.data && Array.isArray(data.data)) {
      console.log(`[TrueCore] ${data.data.length} produtos obtidos com sucesso`);
    }
    
    return Response.json(data);
  } catch (error) {
    console.error(`[TrueCore] Erro na obtenção de produtos:`, error);
    return Response.json(
      { error: 'Erro interno ao processar requisição de produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return TrueCore.handleRequest(request, '/marketing/products');
} 