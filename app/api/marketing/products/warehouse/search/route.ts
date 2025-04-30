import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota específica para busca de produtos por warehouse
 * 
 * Endpoint público: /api/marketing/products/warehouse/search
 * Endpoint interno: /marketing/products/warehouse/search
 * 
 * Esta rota encaminha a requisição para o endpoint específico do True Core
 * que permite buscar produtos de um warehouse específico.
 * 
 * Parâmetros de consulta:
 * - inStock: boolean - Produtos em estoque (default: true)
 * - active: boolean - Produtos ativos (default: true)
 * - warehouseName: string - Nome do warehouse (default: MKT-Creator)
 * - page: number - Página de resultados (default: 0)
 * - limit: number - Limite de resultados por página (default: 12)
 * - term: string - Termo para busca de produtos (opcional)
 * - category: string - ID da categoria para filtrar produtos (opcional)
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
    
    // Log de todos os parâmetros recebidos para diagnóstico
    console.log(`[TrueCore] Parâmetros recebidos: ${JSON.stringify(Object.fromEntries(searchParams.entries()))}`);
    
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
    
    // Garantir que o parâmetro 'category' seja mantido se já estiver presente
    if (searchParams.has('category')) {
      console.log(`[TrueCore] Usando categoria com ID: ${searchParams.get('category')}`);
      
      // Importante: O painel-true precisa deste parâmetro para usar o fluxo especial de filtragem
      // que integra dados do PostgreSQL (categorias) com BigQuery (estoque)
      searchParams.set('usePostgresFirst', 'true');
    }
    
    // Adicionar/garantir filtros padrão se não estiverem presentes
    if (!searchParams.has('inStock')) searchParams.set('inStock', 'true');
    if (!searchParams.has('active')) searchParams.set('active', 'true');
    
    // Garantir que temos o parâmetro warehouseName
    if (!searchParams.has('warehouseName')) {
      searchParams.set('warehouseName', 'MKT-Creator');
    }
    
    // Adicionar parâmetros de paginação se não estiverem presentes
    if (!searchParams.has('page')) searchParams.set('page', '0');
    if (!searchParams.has('limit')) searchParams.set('limit', '12');
    
    // Adicionar timestamp para evitar cache
    searchParams.set('_t', Date.now().toString());
    
    // Tratar parâmetro especial categoryIds (array de IDs de categoria)
    if (searchParams.has('categoryIds')) {
      try {
        // Obter e parsear o array JSON
        const categoryIdsStr = searchParams.get('categoryIds');
        if (categoryIdsStr) {
          const categoryIds = JSON.parse(categoryIdsStr);
          
          // Se for um array válido, adicionar como filtro específico para a API
          if (Array.isArray(categoryIds) && categoryIds.length > 0) {
            console.log(`[TrueCore] Usando múltiplos IDs de categoria: ${categoryIds.join(', ')}`);
            
            // Remover o parâmetro original para evitar confusão
            searchParams.delete('categoryIds');
            
            // Adicionar o primeiro ID como categoria principal
            if (!searchParams.has('category')) {
              searchParams.set('category', categoryIds[0]);
              searchParams.set('usePostgresFirst', 'true');
            }
          }
        }
      } catch (e) {
        console.error('[TrueCore] Erro ao processar categoryIds:', e);
      }
    }
    
    // Construir a URL completa para a API True Core
    const endpoint = '/marketing/products/warehouse/search';
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
      next: { revalidate: 0 } // Não usar cache
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
      console.log(`[TrueCore] ${data.data.length} produtos obtidos com sucesso do warehouse`);
      
      // Log específico para categoria, se aplicável
      if (searchParams.has('category')) {
        const categoryId = searchParams.get('category');
        const matchingProducts = data.data.filter((p: any) => 
          p.categoryId === categoryId || 
          (p.category && p.category.id === categoryId)
        );
        console.log(`[TrueCore] Produtos da categoria ${categoryId}: ${matchingProducts.length} de ${data.data.length} (${matchingProducts.length > 0 ? Math.round(matchingProducts.length/data.data.length*100) : 0}%)`);
        
        // Verificar informações de estoque para depuração
        const withStock = data.data.filter((p: any) => p.warehouseStock && p.warehouseStock.available > 0).length;
        console.log(`[TrueCore] Produtos com estoque disponível: ${withStock} de ${data.data.length} (${withStock > 0 ? Math.round(withStock/data.data.length*100) : 0}%)`);
      }
    }
    
    return Response.json(data);
  } catch (error) {
    console.error(`[TrueCore] Erro na obtenção de produtos por warehouse:`, error);
    return Response.json(
      { error: 'Erro interno ao processar requisição de produtos' },
      { status: 500 }
    );
  }
} 