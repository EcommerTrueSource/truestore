import { NextRequest, NextResponse } from 'next/server';

/**
 * Extrai o token True Core dos cookies da requisição ou do cabeçalho Authorization
 * 
 * @deprecated Recomenda-se usar TrueCore.extractToken para padronização
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
 * Rota proxy principal para produtos do True Core
 * 
 * Esta é a implementação de referência para obtenção de produtos.
 * Recomenda-se acessar produtos através do ponto de entrada unificado /api/products
 * 
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
    
    // Filtrar produtos por categoria usando o campo description
    if (categoryId && categoryId !== 'all' && data?.data) {
      console.log(`[Products API] Aplicando filtro adicional por categoria ID: ${categoryId}`);
      
      // Primeiro, tentamos filtrar pelo categoryId diretamente (compatibilidade)
      let filteredProducts = data.data.filter((p: any) => p.categoryId === categoryId);
      
      // Se não encontramos nada, tentar filtrar pelo campo description
      if (filteredProducts.length === 0) {
        console.log('[Products API] Nenhum produto encontrado pelo categoryId, tentando filtrar pelo campo description');
        
        // Buscar a categoria correspondente para obter o nome
        const categoryName = searchParams.get('categoryName');
        
        if (categoryName) {
          console.log(`[Products API] Filtrando produtos por categoria: "${categoryName}" no campo description`);
          
          filteredProducts = data.data.filter((p: any) => {
            if (p.description && typeof p.description === 'string') {
              // Verificar se a descrição contém o nome da categoria
              const containsCategory = p.description.includes(categoryName);
              // Log detalhado para debug
              if (containsCategory) {
                console.log(`[Products API] Produto "${p.name}" corresponde à categoria "${categoryName}" na descrição: "${p.description}"`);
              }
              return containsCategory;
            }
            return false;
          });
          
          console.log(`[Products API] ${filteredProducts.length} produtos encontrados pelo campo description`);
        } else {
          console.log('[Products API] Nome da categoria não fornecido, não é possível filtrar pelo campo description');
        }
      }
      
      // Se encontramos produtos filtrados, atualizar a resposta
      if (filteredProducts.length > 0) {
        console.log(`[Products API] Retornando ${filteredProducts.length} produtos filtrados`);
        data.data = filteredProducts;
      } else {
        console.log('[Products API] Nenhum produto corresponde aos critérios de filtro da categoria');
      }
    }
    
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