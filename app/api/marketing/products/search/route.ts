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
    console.log('[Search API] Token encontrado no cookie');
    console.log(`[Search API] Token encontrado: ${cookieToken.substring(0, 20)}...`);
    return cookieToken;
  }
  
  // Tentar extrair do cabeçalho Authorization como fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('[Search API] Token encontrado no cabeçalho Authorization');
    return token;
  }
  
  console.log('[Search API] Nenhum token encontrado na requisição');
  return null;
}

/**
 * Converte os parâmetros da nossa API para o formato esperado pela API do True Core
 */
function mapSearchParams(params: URLSearchParams): Record<string, string> {
  const mappedParams: Record<string, string> = {};
  
  // Mapeamento de parâmetros de pesquisa (nome ou termo)
  if (params.has('query')) {
    mappedParams.name = params.get('query') || '';
  }
  
  // Suporte para termo de busca (usado na barra de pesquisa)
  if (params.has('search')) {
    // Usar apenas term para a busca, não duplicar com name
    mappedParams.term = params.get('search') || '';
    console.log(`[Search API] Termo de busca: ${mappedParams.term}`);
    
    // Remover name quando temos term para evitar conflitos na API externa
    delete mappedParams.name;
  }
  
  // Paginação - estes parâmetros são aceitos
  if (params.has('page')) {
    mappedParams.page = params.get('page') || '1';
  }
  
  // Se temos uma categoria específica, aumentar o limite para pegar todos os produtos
  // da categoria de uma vez (até 100)
  if (params.has('categoryName') && params.get('categoryName') !== 'Todos os produtos') {
    // Quando filtramos por categoria, queremos pegar o máximo possível
    mappedParams.limit = '100';
  } else if (params.has('limit')) {
    // Se não estamos filtrando por categoria, usar o limite normal
    mappedParams.limit = params.get('limit') || '20';
  } else {
    // Valor padrão de limite
    mappedParams.limit = '20';
  }
  
  // Filtros de preço
  if (params.has('minPrice')) {
    mappedParams.minPrice = params.get('minPrice') || '';
  }
  
  if (params.has('maxPrice')) {
    mappedParams.maxPrice = params.get('maxPrice') || '';
  }
  
  // Sempre adicionar estes parâmetros para filtrar produtos
  mappedParams.inStock = 'true';
  mappedParams.active = 'true';
  
  // Verificar se existe um nome de categoria para filtrar
  if (params.has('categoryName')) {
    const categoryName = params.get('categoryName');
    if (categoryName && categoryName !== 'Todos os produtos') {
      // Passa diretamente o nome da categoria para a API
      mappedParams.category = categoryName;
    }
  }
  
  return mappedParams;
}

/**
 * Rota proxy para busca de produtos no True Core
 * GET /api/marketing/products/search
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Search API] Iniciando busca avançada de produtos');
    
    // Obter a URL base da API True Core
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('[Search API] URL da API não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = extractToken(request);
    
    if (!token) {
      console.error('[Search API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Copiar os parâmetros de consulta da requisição original
    const searchParams = request.nextUrl.searchParams;
    
    // Log para depuração dos parâmetros
    console.log('[Search API] Parâmetros de busca originais:');
    searchParams.forEach((value, key) => {
      console.log(`[Search API] - ${key}: ${value}`);
    });
    
    // Converter parâmetros para formato da API True Core
    const mappedParams = mapSearchParams(searchParams);
    
    // Armazenar categoryName para processamento após a resposta, se necessário
    const categoryName = searchParams.get('categoryName');
    
    // Log de parâmetros convertidos
    console.log('[Search API] Parâmetros convertidos para API True Core:');
    Object.entries(mappedParams).forEach(([key, value]) => {
      console.log(`[Search API] - ${key}: ${value}`);
    });
    
    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    const queryString = new URLSearchParams(mappedParams).toString();
    
    // Usar o endpoint correto de busca para categorias ou pesquisa
    // Determinamos qual endpoint usar com base nos parâmetros
    let endpoint = '/marketing/products';
    if (mappedParams.category || mappedParams.term) {
      endpoint = '/marketing/products/search';
      console.log('[Search API] Usando endpoint de busca específica para categorias ou pesquisa');
    }
    
    const url = `${baseUrl}${endpoint}?${queryString}`;
    console.log(`[Search API] Fazendo requisição para: ${url}`);
    
    // Fazer a requisição para a API True Core com o token
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);
    
    // Tentativa direta com fetch
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    // Se a resposta não for ok, tentar o endpoint alternativo
    if (!response.ok) {
      const status = response.status;
      console.error(`[Search API] Erro ao buscar produtos: ${status}`);
      
      // Se estávamos usando o endpoint de busca e falhou, tentar com o endpoint padrão
      if (endpoint === '/marketing/products/search') {
        console.log('[Search API] Tentando endpoint alternativo /marketing/products');
        
        const alternativeUrl = `${baseUrl}/marketing/products?${queryString}`;
        const alternativeResponse = await fetch(alternativeUrl, {
          method: 'GET',
          headers,
          cache: 'no-store'
        });
        
        if (alternativeResponse.ok) {
          console.log('[Search API] Endpoint alternativo retornou sucesso');
          const alternativeData = await alternativeResponse.text();
          try {
            const parsedData = JSON.parse(alternativeData);
            const data = processApiResponse(parsedData, categoryName, searchParams.get('sortBy'), searchParams.get('search')?.toLowerCase());
            return NextResponse.json(data);
          } catch (e) {
            console.error('[Search API] Erro ao processar resposta do endpoint alternativo:', e);
          }
        }
      }
      
      try {
        const errorData = await response.json();
        console.error(`[Search API] Detalhes do erro: ${JSON.stringify(errorData)}`);
        return NextResponse.json(errorData, { status });
      } catch {
        return NextResponse.json(
          { error: 'Erro ao buscar produtos da API True Core' },
          { status }
        );
      }
    }

    // Analisar os dados da resposta
    let data;
    try {
      const responseText = await response.text();
      console.log(`[Search API] Resposta bruta: ${responseText.substring(0, 200)}...`);
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[Search API] Erro ao fazer parse da resposta:`, e);
      return NextResponse.json(
        { error: 'Erro ao processar resposta da API' },
        { status: 500 }
      );
    }
    
    // Verificar se a resposta contém dados válidos
    if (!data) {
      console.error('[Search API] Resposta da API não contém dados válidos');
      return NextResponse.json(
        { error: 'Resposta da API não contém dados válidos' },
        { status: 500 }
      );
    }
    
    // Processar os dados e retornar a resposta
    const searchTerm = searchParams.get('search')?.toLowerCase();
    const processedData = processApiResponse(data, categoryName, searchParams.get('sortBy'), searchTerm);
    
    console.log(`[Search API] Retornando ${processedData.data?.length || 0} produtos processados`);
    return NextResponse.json(processedData);
    
  } catch (error) {
    console.error('[Search API] Erro não tratado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de busca' },
      { status: 500 }
    );
  }
}

/**
 * Processa dados recebidos da API e aplica filtros adicionais se necessário
 */
function processApiResponse(data: any, categoryName: string | null, sortBy: string | null, searchTerm: string | null = null): any {
  // Processar dados recebidos da API - garantir que estejam em formato consistente
  let processedData: { data: any[] } = { data: [] };
  
  // Se data já for um array, encapsular no formato esperado pela UI
  if (Array.isArray(data)) {
    console.log(`[Search API] Resposta da API é um array com ${data.length} produtos`);
    processedData = { data };
  } 
  // Se data tiver propriedade 'data' com array de produtos (formato padrão)
  else if (data.data && Array.isArray(data.data)) {
    console.log(`[Search API] Resposta da API contém ${data.data.length} produtos em data.data`);
    processedData = data;
  } 
  // Se houver outra propriedade que contenha o array de produtos
  else {
    console.log('[Search API] Buscando array de produtos em propriedades alternativas');
    const possibleArrayKeys = ['products', 'items', 'results', 'content'];
    
    let foundData = false;
    for (const key of possibleArrayKeys) {
      if (key in data && Array.isArray(data[key])) {
        console.log(`[Search API] Dados de produtos encontrados em data.${key}`);
        processedData = { data: data[key] };
        foundData = true;
        break;
      }
    }
    
    if (!foundData) {
      console.error('[Search API] Formato de resposta não reconhecido');
      return { data: [], error: 'Formato de resposta da API não reconhecido' };
    }
  }
  
  // Aplicar filtro por termo de busca se fornecido
  if (searchTerm && processedData.data) {
    console.log(`[Search API] Aplicando filtro adicional por termo de busca: ${searchTerm}`);
    
    // Filtrar produtos que contenham o termo de busca no nome, descrição ou atributos
    const filteredProducts = processedData.data.filter((p: any) => {
      // Verificar no nome do produto
      if (p.name && typeof p.name === 'string' && p.name.toLowerCase().includes(searchTerm)) {
        console.log(`[Search API] Produto encontrado por name matching: ${p.name}`);
        return true;
      }
      
      // Verificar na descrição do produto
      if (p.description && typeof p.description === 'string' && p.description.toLowerCase().includes(searchTerm)) {
        console.log(`[Search API] Produto encontrado por description matching: ${p.name}`);
        return true;
      }
      
      // Verificar em atributos
      if (p.attributes) {
        // Verificar em todos os atributos do produto
        for (const [key, value] of Object.entries(p.attributes)) {
          if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
            console.log(`[Search API] Produto encontrado por attribute matching (${key}): ${p.name}`);
            return true;
          }
        }
      }
      
      return false;
    });
    
    if (filteredProducts.length > 0) {
      console.log(`[Search API] ${filteredProducts.length} produtos encontrados para o termo de busca "${searchTerm}"`);
      processedData.data = filteredProducts;
    } else {
      console.log(`[Search API] Nenhum produto encontrado para o termo de busca "${searchTerm}"`);
      if (processedData.data.length > 0) {
        console.log('[Search API] Verificando primeiros 3 produtos recebidos da API para debug:');
        const sample = processedData.data.slice(0, 3);
        sample.forEach((p: any, index: number) => {
          console.log(`[Search API] Produto ${index + 1}:`);
          console.log(`[Search API] - Nome: ${p.name}`);
          console.log(`[Search API] - Descrição: ${p.description?.substring(0, 50) || 'N/A'}`);
        });
      }
    }
  }
  
  // Filtrar produtos por nome da categoria
  if (categoryName && categoryName !== 'Todos os produtos' && processedData.data) {
    console.log(`[Search API] Aplicando filtro por nome de categoria: ${categoryName}`);
    
    // Filtrar produtos que contêm o nome da categoria
    const filteredProducts = processedData.data.filter((p: any) => {
      // Verificar no atributo categoria (mais específico e seguro)
      if (p.attributes && p.attributes.categoria && typeof p.attributes.categoria === 'string') {
        // Converter para lowercase para fazer comparação case-insensitive
        const categoriaLowerCase = p.attributes.categoria.toLowerCase();
        const categoryNameLowerCase = categoryName.toLowerCase();
        
        // Verificar se o texto da categoria inclui o nome da categoria que buscamos
        // OU se faz parte de uma subcategoria (formato: "Categoria Pai >> Categoria Filho")
        if (categoriaLowerCase.includes(categoryNameLowerCase)) {
          // Log apenas para produtos de exemplo (limitar quantidade de logs)
          if (processedData.data.indexOf(p) < 3) {
            console.log(`[Search API] Exemplo de produto encontrado por attributes.categoria: ${p.name} - Categoria: ${p.attributes.categoria}`);
          }
          return true;
        }
        
        // Verificar partes de categorias separadas por ">>"
        const categoriaParts = p.attributes.categoria.split('>>').map((part: string) => part.trim().toLowerCase());
        if (categoriaParts.some((part: string) => part === categoryNameLowerCase)) {
          if (processedData.data.indexOf(p) < 3) {
            console.log(`[Search API] Exemplo de produto encontrado por subcategoria em attributes.categoria: ${p.name}`);
          }
          return true;
        }
      }
      
      // Tentar encontrar na propriedade category.name se existir
      if (p.category && p.category.name && typeof p.category.name === 'string') {
        const categoryLowerCase = p.category.name.toLowerCase();
        const categoryNameLowerCase = categoryName.toLowerCase();
        
        if (categoryLowerCase.includes(categoryNameLowerCase)) {
          if (processedData.data.indexOf(p) < 3) {
            console.log(`[Search API] Exemplo de produto encontrado por category.name: ${p.name}`);
          }
          return true;
        }
      }
      
      // Tentar encontrar na descrição
      if (p.description && typeof p.description === 'string') {
        const descLowerCase = p.description.toLowerCase();
        const categoryNameLowerCase = categoryName.toLowerCase();
        
        if (descLowerCase.includes(categoryNameLowerCase)) {
          console.log(`[Search API] Produto encontrado por description: ${p.name}`);
          return true;
        }
      }
      
      // Verificar também no nome do produto (algumas APIs armazenam a categoria no nome)
      if (p.name && typeof p.name === 'string') {
        const nameLowerCase = p.name.toLowerCase();
        const categoryNameLowerCase = categoryName.toLowerCase();
        
        if (nameLowerCase.includes(categoryNameLowerCase)) {
          console.log(`[Search API] Produto encontrado por name: ${p.name}`);
          return true;
        }
      }
      
      return false;
    });
    
    if (filteredProducts.length > 0) {
      console.log(`[Search API] ${filteredProducts.length} produtos encontrados para a categoria "${categoryName}"`);
      processedData.data = filteredProducts;
    } else {
      console.log(`[Search API] Nenhum produto encontrado para a categoria "${categoryName}"`);
      console.log(`[Search API] Verificando primeiros 2 produtos recebidos da API para debug:`);
      if (processedData.data.length > 0) {
        const sample = processedData.data.slice(0, 2);
        sample.forEach((p: any, index: number) => {
          console.log(`[Search API] Produto ${index + 1}:`);
          console.log(`[Search API] - Nome: ${p.name}`);
          console.log(`[Search API] - Categoria: ${p.attributes?.categoria || 'N/A'}`);
          if (p.category) console.log(`[Search API] - Category Obj: ${JSON.stringify(p.category)}`);
        });
      }
    }
  }
  
  // Aplicar ordenação manualmente conforme o parâmetro sortBy
  if (sortBy && processedData.data && Array.isArray(processedData.data)) {
    console.log(`[Search API] Aplicando ordenação: ${sortBy}`);
    
    switch (sortBy) {
      case 'price-asc':
        processedData.data.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-desc':
        processedData.data.sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'name-asc':
        processedData.data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        processedData.data.sort((a: any, b: any) => b.name.localeCompare(a.name));
        break;
      // Caso featured ou padrão, não precisamos ordenar (já vem ordenado por relevância)
    }
  }
  
  return processedData;
} 