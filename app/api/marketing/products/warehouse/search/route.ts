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
 * - categoryIds: string[] - Array JSON de IDs de categorias para agrupar (opcional)
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
    
    // Tratar parâmetro especial categoryIds (array de IDs de categoria)
    let categoryIds: string[] = [];
    if (searchParams.has('categoryIds')) {
      try {
        // Obter e parsear o array JSON
        const categoryIdsStr = searchParams.get('categoryIds');
        if (categoryIdsStr) {
          const parsedIds = JSON.parse(categoryIdsStr);
          
          // Se for um array válido, processar IDs de categorias
          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            categoryIds = parsedIds;
            console.log(`[TrueCore] Usando múltiplos IDs de categoria: ${categoryIds.join(', ')}`);
          }
        }
      } catch (e) {
        console.error('[TrueCore] Erro ao processar categoryIds:', e);
      }
      
      // Remover o parâmetro do URL para não confundir o backend
      searchParams.delete('categoryIds');
    }
    
    // Garantir que o parâmetro 'category' seja mantido se já estiver presente
    if (searchParams.has('category')) {
      console.log(`[TrueCore] Usando categoria com ID: ${searchParams.get('category')}`);
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
    
    // Verificar se devemos ignorar cache com base em parâmetros _t ou _nocache
    const skipCache = searchParams.has('_t') || searchParams.has('_nocache');
    
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
      next: skipCache ? { revalidate: 0 } : { revalidate: 60 } // Configuração de cache baseada nos parâmetros
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
    
    // Se temos IDs de categorias adicionais para agrupar, precisamos fazer requisições adicionais
    if (categoryIds.length > 1) {
      console.log(`[TrueCore] Buscando produtos de ${categoryIds.length - 1} categorias adicionais para agrupamento`);
      
      const mainCategoryId = categoryIds[0]; // Já foi usado na requisição principal
      const additionalIds = categoryIds.slice(1); // Categorias adicionais para buscar
      const warehouseName = searchParams.get('warehouseName') || 'MKT-Creator';
      
      // Array para armazenar todas as requisições adicionais
      const additionalRequests = additionalIds.map(catId => {
        // Criar novos parâmetros para cada categoria relacionada
        const catParams = new URLSearchParams();
        catParams.set('category', catId);
        catParams.set('warehouseName', warehouseName);
        catParams.set('inStock', 'true');
        catParams.set('active', 'true');
        catParams.set('page', '0');
        catParams.set('limit', '100'); // Limite maior para pegar mais produtos
        
        const catUrl = `${baseUrl}${endpoint}?${catParams.toString()}`;
        console.log(`[TrueCore] Buscando produtos da categoria relacionada (${catId}): ${catUrl}`);
        
        // Retornar promessa da requisição
        return fetch(catUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(resp => {
          if (!resp.ok) {
            console.error(`[TrueCore] Erro ao buscar produtos da categoria ${catId}: ${resp.status}`);
            return { data: [] }; // Retornar array vazio em caso de erro
          }
          return TrueCore.tryParseAsJson(resp);
        }).catch(err => {
          console.error(`[TrueCore] Falha na requisição para categoria ${catId}:`, err);
          return { data: [] }; // Retornar array vazio em caso de erro
        });
      });
      
      // Executar todas as requisições adicionais
      const additionalResults = await Promise.all(additionalRequests);
      
      // Mapa para rastrear produtos já incluídos (por SKU ou ID) para evitar duplicatas
      const includedProducts = new Set();
      
      // Adicionar produtos da categoria principal ao set
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((product: any) => {
          const productId = product.sku || product.id;
          includedProducts.add(productId);
        });
      }
      
      // Adicionar produtos das categorias relacionadas
      let addedProductsCount = 0;
      
      additionalResults.forEach((result, index) => {
        if (result.data && Array.isArray(result.data)) {
          // Filtrar produtos para evitar duplicatas
          const newProducts = result.data.filter((product: any) => {
            const productId = product.sku || product.id;
            if (!includedProducts.has(productId)) {
              includedProducts.add(productId);
              return true;
            }
            return false;
          });
          
          // Adicionar produtos não duplicados ao resultado principal
          if (data.data && Array.isArray(data.data)) {
            data.data.push(...newProducts);
            addedProductsCount += newProducts.length;
          }
          
          console.log(`[TrueCore] Adicionados ${newProducts.length} produtos da categoria ${additionalIds[index]}`);
        }
      });
      
      console.log(`[TrueCore] Total de produtos agrupados: ${data.data?.length || 0} (${addedProductsCount} adicionados de categorias relacionadas)`);
    }
    
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