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
 * Extrai o ID do Clerk do token ou dos headers
 */
async function extractClerkIdFromToken(request: NextRequest, token: string): Promise<string | null> {
  try {
    // Primeiro, verificar se temos o ID nos headers do Clerk
    const clerkUserId = request.headers.get('x-clerk-user-id');
    if (clerkUserId) {
      console.log(`[Search API] ID do Clerk obtido do header: ${clerkUserId}`);
      return clerkUserId;
    }
    
    // Se não encontramos no header, tentar extrair do token
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    const data = JSON.parse(decodedPayload);
    
    console.log('[Search API] Payload do token JWT:', JSON.stringify(data));
    
    // Verificar se temos a chave sub no token (que contém o ID do usuário)
    if (data.sub) {
      // O sub pode ser o ID numérico ou o ID completo com prefixo
      return data.sub.toString();
    }
    
    // Se não encontramos no token, verificar se temos informações no cookie
    const clerkJWT = request.cookies.get('__clerk_jwt')?.value;
    if (clerkJWT) {
      try {
        const clerkPayload = clerkJWT.split('.')[1];
        if (clerkPayload) {
          const clerkData = JSON.parse(Buffer.from(clerkPayload, 'base64').toString('utf-8'));
          if (clerkData.sub) {
            console.log(`[Search API] ID do Clerk obtido do cookie __clerk_jwt: ${clerkData.sub}`);
            return clerkData.sub;
          }
        }
      } catch (e) {
        console.error('[Search API] Erro ao extrair ID do cookie do Clerk:', e);
      }
    }
    
    console.log('[Search API] Não foi possível encontrar o ID do Clerk no token ou headers');
    return null;
  } catch (error) {
    console.error('[Search API] Erro ao extrair ID do Clerk:', error);
    console.error('[Search API] Detalhes do erro:', error);
    return null;
  }
}

/**
 * Obtém os dados do cliente diretamente do True Core
 */
async function getCustomerCategory(clerkId: string, token: string, apiUrl: string): Promise<string | null> {
  try {
    // Garantir que estamos usando o ID completo
    const cleanClerkId = clerkId.trim();
    
    if (!cleanClerkId) {
      console.error('[Search API] ID do Clerk inválido ou vazio');
      return null;
    }
    
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/marketing/customers/byClerkId/${cleanClerkId}`;
    console.log(`[Search API] Buscando informações do cliente: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`[Search API] Erro ao buscar cliente: ${response.status}`);
      
      // Registrar mais detalhes sobre o erro para diagnóstico
      try {
        const errorText = await response.text();
        console.error('[Search API] Resposta de erro:', errorText);
      } catch (e) {
        console.error('[Search API] Não foi possível ler resposta de erro');
      }
      
      return null;
    }
    
    const customer = await response.json();
    
    if (customer && customer.__category__) {
      console.log(`[Search API] Categoria do cliente encontrada: ${customer.__category__.name}`);
      return customer.__category__.name;
    }
    
    console.log('[Search API] Cliente encontrado, mas sem categoria definida');
    return null;
  } catch (error) {
    console.error('[Search API] Erro ao buscar cliente:', error);
    return null;
  }
}

/**
 * Converte os parâmetros da nossa API para o formato esperado pela API do True Core
 */
function mapSearchParams(params: URLSearchParams, warehouseName: string = ''): Record<string, string> {
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
  
  // Adicionar o filtro de warehouse se disponível
  if (warehouseName) {
    mappedParams.warehouseName = warehouseName;
    console.log(`[Search API] Adicionando filtro de warehouse: ${warehouseName}`);
  }
  
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
    
    // Tentar obter o ID do Clerk dos headers diretamente
    let clerkId = request.headers.get('x-clerk-user-id');
    if (clerkId) {
      console.log(`[Search API] ID do Clerk obtido do header: ${clerkId}`);
    } else {
      // Se não encontramos nos headers, tentar extrair do token
      try {
        const payload = token.split('.')[1];
        if (payload) {
          const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
          const data = JSON.parse(decodedPayload);
          console.log('[Search API] Payload do token JWT:', JSON.stringify(data));
          
          // Verificar externalId/sub no token
          if (data.externalId) {
            clerkId = data.externalId;
            console.log(`[Search API] ID do Clerk extraído do token (externalId): ${clerkId}`);
          } else if (data.sub) {
            clerkId = data.sub;
            console.log(`[Search API] ID do Clerk extraído do token (sub): ${clerkId}`);
          }
        }
      } catch (e) {
        console.error('[Search API] Erro ao decodificar token:', e);
      }
    }
    
    // Verificar se temos informações do usuário logado para determinar a categoria
    let warehouseName = '';
    
    // Vamos usar diretamente a rota unificada do cliente para buscar a categoria
    if (clerkId) {
      try {
        // IMPORTANTE: Obter a origem de forma dinâmica para funcionar em qualquer ambiente
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 
                        (request.headers.get('x-forwarded-proto') || 'https');
        const origin = `${protocol}://${host}`;
        
        const customerUrl = `${origin}/api/customers/clerk/${clerkId}`;
        console.log(`[Search API] Buscando cliente pela rota unificada: ${customerUrl}`);
        
        const response = await fetch(customerUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const customer = await response.json();
          
          if (customer && customer.__category__) {
            const categoryName = customer.__category__.name;
            console.log(`[Search API] Categoria do cliente: ${categoryName}`);
            
            // Definir o warehouseName com base na categoria do cliente - exatamente como esperado pela API
            if (categoryName.includes('Creator')) {
              warehouseName = 'MKT-Creator';
              console.log(`[Search API] Cliente da categoria Creator, usando warehouse: ${warehouseName}`);
            } else if (categoryName.includes('Top Master')) {
              warehouseName = 'MKT-Top Master';
              console.log(`[Search API] Cliente da categoria Top Master, usando warehouse: ${warehouseName}`);
            } else {
              // Categoria padrão para outros tipos
              warehouseName = 'geral';
              console.log(`[Search API] Outra categoria de cliente, usando warehouse: ${warehouseName}`);
            }
          } else {
            console.log('[Search API] Cliente encontrado, mas sem categoria definida');
          }
        } else {
          console.error(`[Search API] Erro ao buscar cliente: ${response.status}`);
          try {
            const errorData = await response.text();
            console.error('[Search API] Resposta de erro:', errorData);
          } catch (e) {
            console.error('[Search API] Não foi possível ler resposta de erro');
          }
        }
      } catch (error) {
        console.error('[Search API] Erro ao buscar cliente:', error);
      }
    }
    
    // Converter parâmetros para o formato da API True Core
    const mappedParams: Record<string, string> = {};
    
    // Paginação
    mappedParams.page = searchParams.get('page') || '1';
    mappedParams.limit = searchParams.get('limit') || '12';
    
    // Termo de busca (opcional)
    if (searchParams.has('search')) {
      mappedParams.term = searchParams.get('search') || '';
      console.log(`[Search API] Termo de busca: ${mappedParams.term}`);
    } else if (searchParams.has('query')) {
      mappedParams.name = searchParams.get('query') || '';
    }
    
    // Filtros de preço (opcional)
    if (searchParams.has('minPrice')) {
      mappedParams.minPrice = searchParams.get('minPrice') || '';
    }
    
    if (searchParams.has('maxPrice')) {
      mappedParams.maxPrice = searchParams.get('maxPrice') || '';
    }
    
    // Filtros de ordenação (opcional)
    if (searchParams.has('sortBy')) {
      mappedParams.sortBy = searchParams.get('sortBy') || '';
    }
    
    // Filtros de categoria (opcional)
    if (searchParams.has('categoryId') && searchParams.get('categoryId') !== 'all') {
      mappedParams.categoryId = searchParams.get('categoryId') || '';
      
      if (searchParams.has('categoryName') && searchParams.get('categoryName') !== 'Todos os produtos') {
        mappedParams.categoryName = searchParams.get('categoryName') || '';
        mappedParams.category = searchParams.get('categoryName') || '';
      }
    }
    
    // Filtros OBRIGATÓRIOS
    mappedParams.inStock = 'true';
    mappedParams.active = 'true';
    
    // Adicionar o warehouse se disponível
    if (warehouseName) {
      mappedParams.warehouseName = warehouseName;
      console.log(`[Search API] Adicionando filtro de warehouse: ${warehouseName}`);
    }
    
    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    const queryString = new URLSearchParams(mappedParams).toString();
    
    // Definir o endpoint baseado na disponibilidade do warehouse
    // Se temos um warehouse, SEMPRE usar o endpoint warehouse/search
    const endpoint = warehouseName 
      ? '/marketing/products/warehouse/search' 
      : '/marketing/products';
      
    console.log(`[Search API] Usando endpoint: ${endpoint}`);
    
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
    
    // Processar os dados (filtrar produtos inativos se necessário)
    if (data.data && Array.isArray(data.data)) {
      // Filtrar apenas produtos ativos
      const filteredProducts = data.data.filter((product: any) => product.active === true);
      console.log(`[Search API] Filtrados ${filteredProducts.length} produtos ativos de ${data.data.length} no total`);
      
      // Aplicar ordenação se solicitado
      const sortBy = searchParams.get('sortBy');
      if (sortBy) {
        console.log(`[Search API] Aplicando ordenação: ${sortBy}`);
        
        switch (sortBy) {
          case 'price-asc':
            filteredProducts.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
            break;
          case 'price-desc':
            filteredProducts.sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
            break;
          case 'name-asc':
            filteredProducts.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
            break;
          case 'name-desc':
            filteredProducts.sort((a: any, b: any) => (b.name || '').localeCompare(a.name || ''));
            break;
          case 'newest':
            filteredProducts.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            break;
          default:
            // Não aplicar ordenação
            break;
        }
      }
      
      data.data = filteredProducts;
      console.log(`[Search API] Retornando ${filteredProducts.length} produtos processados`);
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Search API] Erro não tratado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de busca' },
      { status: 500 }
    );
  }
} 