import { NextRequest, NextResponse } from 'next/server';

/**
 * Extrai o token True Core dos cookies da requisição ou do cabeçalho Authorization
 */
function extractToken(request: NextRequest): string | null {
  // Primeiro tenta obter do cookie
  const cookieToken = request.cookies.get('true_core_token')?.value;
  if (cookieToken) {
    console.log('[Products API] Token encontrado no cookie');
    console.log(`[Products API] Token encontrado: ${cookieToken.substring(0, 20)}...`);
    return cookieToken;
  }
  
  console.log('[Products API] Nenhum token encontrado na requisição');
  return null;
}

/**
 * Rota proxy para produtos do True Core
 * GET /api/marketing/products
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Products API] Iniciando busca de produtos');
    
    // Obter a URL base da API True Core
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('[Products API] URL da API não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = extractToken(request);
    
    if (!token) {
      console.error('[Products API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Copiar os parâmetros de consulta da requisição original
    const searchParams = request.nextUrl.searchParams;
    
    // Log para depuração dos parâmetros, especialmente de categoria
    console.log('[Products API] Parâmetros de busca:');
    searchParams.forEach((value, key) => {
      console.log(`[Products API] - ${key}: ${value}`);
    });
    
    // Verificar especificamente o filtro de categoria
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      console.log(`[Products API] Filtrando por categoria ID: ${categoryId}`);
    } else {
      console.log('[Products API] Sem filtro de categoria aplicado');
    }
    
    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/marketing/products?${searchParams.toString()}`;
    console.log(`[Products API] Fazendo requisição para: ${url}`);
    
    // Fazer a requisição para a API True Core com o token
    const headers = new Headers();
    headers.append('Accept', '*/*');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);
    
    console.log(`[Products API] Enviando token: ${token.substring(0, 20)}...`);
    console.log(`[Products API] Authorization header: Bearer ${token.substring(0, 20)}...`);
    
    // Tentativa direta, sem fetch API
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      console.error(`[Products API] Erro ao buscar produtos: ${status}`);
      
      try {
        const errorData = await response.json();
        console.error(`[Products API] Detalhes do erro: ${JSON.stringify(errorData)}`);
        return NextResponse.json(errorData, { status });
      } catch {
        return NextResponse.json(
          { error: 'Erro ao buscar produtos da API True Core' },
          { status }
        );
      }
    }

    // Retornar os dados de resposta
    const data = await response.json();
    console.log(`[Products API] Produtos obtidos com sucesso: ${data?.data?.length || 0} itens`);
    
    // Log adicional para depurar se os resultados estão sendo filtrados corretamente
    if (categoryId && data?.data) {
      const productCategories = [...new Set(data.data.map((p: any) => p.categoryId))];
      console.log(`[Products API] IDs de categorias nos produtos retornados: ${productCategories.join(', ')}`);
      const matchingProducts = data.data.filter((p: any) => p.categoryId === categoryId);
      console.log(`[Products API] ${matchingProducts.length} de ${data.data.length} produtos correspondem exatamente ao filtro de categoria ${categoryId}`);
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Products API] Erro no proxy de produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de produtos' },
      { status: 500 }
    );
  }
} 