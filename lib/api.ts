'use client';

import type { Product } from "@/types/product"
import type { Category } from "@/types/category"
import type { CartItem } from "@/types/cart"
import { ApiService } from "./services/api-service"
import { useApi } from '@/hooks/use-api';
import { tokenStore } from './token-store';
import { Customer } from '@/types/customer';


// Flag para usar API real ou dados mockados - sempre verdadeiro
const USE_REAL_API = true; // Sempre usar a API real

// Flag específica para categorias - SEMPRE TRUE, nunca usar mockadas
const USE_REAL_CATEGORIES = true;

/**
 * Busca produtos usando filtros opcionais
 */
export async function fetchProducts({
  categoryId,
  sortBy = "featured",
  search,
  jwtToken,
  page = 1,
  limit = 20
}: {
  categoryId?: string | null;
  sortBy?: string;
  search?: string | null;
  jwtToken?: string;
  page?: number;
  limit?: number;
}): Promise<Product[]> {
  try {
    // Verificar se temos um token JWT
    let token = jwtToken;
    
    // Se não foi fornecido, tentar obter do TokenStore global
    if (!token) {
      const storeToken = tokenStore.getToken();
      if (!storeToken) {
        console.error('[API] Token não fornecido e não encontrado no TokenStore');
        throw new Error('Token de autenticação necessário');
      } else {
        token = storeToken;
        console.log('[API] Usando token do TokenStore global para fetchProducts');
      }
    } else {
      // Armazenar o token fornecido no TokenStore global para uso futuro
      tokenStore.setToken(token, 86400);
      console.log('[API] Token fornecido foi armazenado no TokenStore global');
    }
    
    // Preparar parâmetros
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString()
    };
    
    // Aplicar filtro por categoria
      if (categoryId && categoryId !== 'all') {
        params.categoryId = categoryId;
      }
      
    // Aplicar ordenação
    if (sortBy && sortBy !== 'featured') {
      switch (sortBy) {
        case 'price-asc':
          params.sort = 'price';
          params.order = 'asc';
          break;
        case 'price-desc':
          params.sort = 'price';
          params.order = 'desc';
          break;
        case 'name-asc':
          params.sort = 'name';
          params.order = 'asc';
          break;
        case 'name-desc':
          params.sort = 'name';
          params.order = 'desc';
          break;
      }
      }
      
      if (search) {
        params.search = search;
      }
      
      // Construir string de consulta
      const queryString = new URLSearchParams(params).toString();
    // Usar nosso novo endpoint de API que lida com a autenticação corretamente
    const endpoint = `/api/marketing/products${queryString ? `?${queryString}` : ''}`;
    
    // Log com o token truncado para segurança
    const tokenPreview = token.substring(0, 10) + '...';
    console.log(`[API] Buscando produtos usando endpoint: ${endpoint} com token ${tokenPreview}`);
    
    // Tenta fazer a requisição
    const makeRequest = async (accessToken: string) => {
      console.log(`[API] Enviando requisição com token: ${accessToken.substring(0, 20)}...`);
      
      // Não enviar cabeçalho Authorization para evitar conflitos com o token do cookie
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // Importante para incluir cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Se o token expirou, isso será tratado pelo chamador
        if (response.status === 401) {
          console.error('[API] Token expirado ou inválido');
          tokenStore.clearToken();
          throw new Error('UNAUTHORIZED');
        }
        
        throw new Error(errorData.error || `Erro ao buscar produtos: ${response.status}`);
      }
      
      return response.json();
    };
    
    // Tenta fazer a requisição e, em caso de erro de autenticação, tenta renovar o token
    let responseData;
    try {
      // Primeira tentativa com o token atual
      responseData = await makeRequest(token);
    } catch (error) {
      // Se for erro de autenticação, tenta renovar o token e fazer nova requisição
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        console.log('[API] Tentando renovar o token e repetir a requisição...');
        
        try {
          // Importar dinamicamente o hook de autenticação para evitar dependência circular
          const { getAuth } = await import('@/lib/api-helpers');
          const authMethods = getAuth();
          
          if (authMethods && authMethods.getJwtToken) {
            // Obter novo token Clerk
            const newClerkToken = await authMethods.getJwtToken();
            
            if (newClerkToken) {
              // Trocar por um token True Core
              const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: newClerkToken }),
                credentials: 'include'
              });
              
              if (response.ok) {
                const tokenData = await response.json();
                if (tokenData.access_token) {
                  // Armazenar o novo token
                  tokenStore.setToken(tokenData.access_token, tokenData.expiresInSeconds || 24 * 60 * 60);
                  console.log('[API] Token renovado, tentando requisição novamente');
                  
                  // Tentar a requisição novamente com o novo token
                  responseData = await makeRequest(tokenData.access_token);
                } else {
                  console.error('[API] Token de acesso não encontrado na resposta:', tokenData);
                  throw new Error('Falha ao renovar token de acesso');
                }
              } else {
                const errorText = await response.text();
                console.error(`[API] Erro ao renovar token (${response.status}):`, errorText);
                throw new Error(`Erro ao renovar token: ${response.status}`);
              }
            } else {
              throw new Error('Não foi possível obter novo token Clerk');
            }
          } else {
            throw new Error('Serviço de autenticação não disponível');
          }
        } catch (renewError) {
          console.error('[API] Falha na renovação do token:', renewError);
          throw new Error('Falha ao renovar token de autenticação');
        }
      } else {
        // Se não for erro de autenticação, propaga o erro original
        throw error;
      }
    }
    
    // Processar a resposta conforme o formato da API real
    let products: Product[] = [];
    
    // A API real retorna um objeto com propriedade 'data' que contém o array de produtos
    if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
      // Filtrar apenas produtos ativos (active: true)
      const activeProducts = responseData.data.filter((item: any) => item.active === true);
      
      console.log(`[API] Filtrados ${activeProducts.length} produtos ativos de um total de ${responseData.data.length}`);
      
      // Mapear os produtos da API para o formato esperado pelo nosso app
      products = activeProducts.map((item: any) => ({
        // Usar o SKU como ID, ou tinyId como fallback, ou o ID original como último recurso
        id: item.sku || item.tinyId || item.id,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.price),
        originalPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg',
        categoryId: item.categoryId || '',
        // Incluir o objeto de categoria se disponível na resposta
        category: item.category || undefined,
        codigo: item.sku,
        unidade: item.attributes?.unidade || 'UN',
        // Preservar a propriedade active
        active: item.active
      }));
      
      console.log(`[API] Processados ${products.length} produtos ativos da API`);
    } else {
      console.error('[API] Formato inesperado na resposta da API de produtos:', responseData);
      throw new Error('Formato inesperado na resposta da API');
    }
    
    return products;
  } catch (error) {
    console.error('[API] Erro ao buscar produtos:', error);
    throw error; // Propagar o erro para ser tratado pelo componente
  }
}

/**
 * Busca categorias de produtos
 */
export async function fetchCategories(jwtToken?: string): Promise<Category[]> {
  try {
    console.log('[API] Iniciando fetchCategories...');
    
    // Verificar se temos um token JWT
    let token = jwtToken;
    
    // Se não foi fornecido, tentar obter do TokenStore global
    if (!token) {
      const storeToken = tokenStore.getToken();
      if (!storeToken) {
        console.error('[API] Token não fornecido e não encontrado no TokenStore para fetchCategories');
        
        // Verificar cookie (mesma estratégia usada na API de produtos)
        try {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(c => c.trim().startsWith('true_core_token='));
          if (tokenCookie) {
            token = tokenCookie.split('=')[1].trim();
            console.log('[API] Token extraído do cookie para categorias');
            
            // Armazenar para uso futuro
            tokenStore.setToken(token, 86400);
          }
        } catch (e) {
          console.error('[API] Erro ao verificar cookies:', e);
        }
        
        if (!token) {
          throw new Error('Token de autenticação necessário');
        }
      } else {
        token = storeToken;
        console.log('[API] Usando token do TokenStore global para fetchCategories');
      }
    } else {
      // Armazenar o token fornecido no TokenStore global para uso futuro
      tokenStore.setToken(token, 86400);
      console.log('[API] Token fornecido foi armazenado no TokenStore global (fetchCategories)');
    }
    
    // Usar nosso endpoint proxy que encaminha para a API True Core
    const endpoint = '/api/marketing/products/categories';
    
    console.log(`[API] Buscando categorias usando o endpoint: ${endpoint}`);
    
    // Enviar o token como cookie para garantir que esteja disponível para a API
    document.cookie = `true_core_token=${token}; path=/; max-age=3600`;
    console.log('[API] Token definido como cookie para requisições futuras');
    
    // Fazer a requisição usando fetch - IMPORTANTE: Usar credentials: 'include'
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        // NÃO enviar cabeçalho Authorization para evitar conflitos com o token do cookie
      },
      cache: 'no-store', // Importante: não usar cache
      credentials: 'include' // Importante para incluir cookies
    });
    
    if (!response.ok) {
      const errorStatus = response.status;
      let errorMessage = `Erro ao buscar categorias: ${errorStatus}`;
      
      try {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API] Erro na resposta (${errorStatus}):`, errorData);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error('[API] Erro ao analisar resposta de erro:', parseError);
      }
      
      // Se o token expirou, limpar do store
      if (errorStatus === 401) {
        console.error('[API] Token expirado ou inválido (categorias)');
        tokenStore.clearToken();
        
        // Tentar renovar o token e repetir a chamada
        try {
          // Importar dinamicamente o hook de autenticação para evitar dependência circular
          const { getAuth } = await import('@/lib/api-helpers');
          const authMethods = getAuth();
          
          if (authMethods && authMethods.getJwtToken) {
            // Obter novo token Clerk
            const newClerkToken = await authMethods.getJwtToken();
            
            if (newClerkToken) {
              // Trocar por um token True Core
              const tokenResponse = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: newClerkToken }),
                credentials: 'include'
              });
              
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                if (tokenData.access_token) {
                  // Tentar novamente com o novo token
                  console.log('[API] Token renovado, tentando buscar categorias novamente');
                  return fetchCategories(tokenData.access_token);
                }
              }
            }
          }
        } catch (renewError) {
          console.error('[API] Erro ao renovar token para categorias:', renewError);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Obter as categorias do response
    const responseData = await response.json();
    console.log('[API] Resposta de categorias processada com sucesso');
    
    if (!Array.isArray(responseData)) {
      console.error('[API] Formato inesperado na resposta de categorias:', responseData);
      
      // Verificar se a resposta tem uma propriedade 'data' que contém o array
      if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
        console.log('[API] Encontrado array de categorias na propriedade "data"');
        return responseData.data.map((category: Category) => ({
          ...category,
          slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-')
        }));
      }
      
      console.error('[API] Não foi possível extrair categorias da resposta');
      return []; // Retornar array vazio em vez de lançar erro
    }
    
    // Adicionar slug para cada categoria caso não exista
    const processedCategories = responseData.map((category: Category) => ({
      ...category,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-')
    }));
    
    console.log(`[API] ${processedCategories.length} categorias processadas com sucesso`);
    
    return processedCategories;
  } catch (error) {
    console.error('[API] Erro ao buscar categorias:', error);
    // Em vez de propagar o erro, retornar array vazio para evitar quebrar a UI
    return [];
  }
}

/**
 * Busca itens do carrinho
 */
export async function fetchCartItems(jwtToken?: string): Promise<CartItem[]> {
  try {
    // Verificar se temos um token JWT
    if (!jwtToken) {
      console.error('Token JWT não fornecido para fetchCartItems');
      throw new Error('Token de autenticação necessário');
    }
    
    // Usar o endpoint correto para o carrinho
    const endpoint = '/marketing/cart'; // Ajustar para o endpoint real do True Core
    
      // Buscar dados da API com o token JWT
    const options = { jwtToken };
    const response = await ApiService.get<any>(endpoint, options);
    
    // Processar a resposta para garantir que retornamos um array de itens de carrinho
    let items: CartItem[] = [];
    
    // Processar a resposta dependendo do formato retornado pela API
    if (Array.isArray(response)) {
      // A resposta já é um array de itens de carrinho
      items = response.map((item: any) => ({
        id: item.sku || item.tinyId || item.id,
        name: item.name || '',
        price: parseFloat(item.price || '0'),
        quantity: item.quantity || 1,
        imageUrl: item.imageUrl || '/placeholder.svg',
        codigo: item.sku || '',
        unidade: item.unidade || 'UN'
      }));
    } else if (response && typeof response === 'object') {
      // A resposta é um objeto, procurar um array em propriedades comuns
      const possibleArrayKeys = ['data', 'items', 'cart', 'cartItems', 'results', 'content'];
      
      for (const key of possibleArrayKeys) {
        if (key in response && Array.isArray(response[key])) {
          items = response[key].map((item: any) => ({
            id: item.sku || item.tinyId || item.id,
            name: item.name || '',
            price: parseFloat(item.price || '0'),
            quantity: item.quantity || 1,
            imageUrl: item.imageUrl || '/placeholder.svg',
            codigo: item.sku || '',
            unidade: item.unidade || 'UN'
          }));
          console.log(`Itens do carrinho encontrados na propriedade "${key}"`);
          break;
        }
      }
    }
    
    return items;
  } catch (error) {
    console.error('Erro ao buscar itens do carrinho:', error);
    throw error; // Propagar o erro para ser tratado pelo componente
  }
}

/**
 * Busca produtos usando a API avançada de busca
 */
export async function searchProducts({
  query,
  categoryId,
  categoryName,
  categoryItemCount,
  sortBy = "name-asc",
  page = 0, // Importante: a API usa base 0 para paginação
  limit = 20,
  minPrice,
  maxPrice,
  jwtToken,
  searchQuery,
  warehouseName
}: {
  query?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryItemCount?: number;
  sortBy?: string;
  page?: number; 
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  jwtToken?: string;
  searchQuery?: string;
  warehouseName?: string; // Parâmetro importante: determina o warehouse específico baseado na categoria do cliente (MKT-Creator ou MKT-Top Master)
}): Promise<Product[]> {
  try {
    console.log('[API] Usando função wrapper searchProducts');
    
    // Garantir que temos um warehouse definido para o cliente
    if (!warehouseName) {
      // Verificar no localStorage se há um warehouse salvo
      if (typeof window !== 'undefined') {
        const savedWarehouse = localStorage.getItem('warehouse_name');
        if (savedWarehouse) {
          console.log(`[API] Usando warehouse do localStorage: ${savedWarehouse}`);
          warehouseName = savedWarehouse;
        } else {
          // Padrão para Creator se nenhum for detectado
          console.log('[API] Nenhum warehouse encontrado, usando MKT-Creator como padrão');
          warehouseName = 'MKT-Creator';
        }
      }
    }
    
    // Se temos um termo de busca, usar a função de busca por termo
    if (searchQuery) {
      console.log(`[API] Redirecionando para searchProductsByTerm com termo: "${searchQuery}"`);
      const results = await searchProductsByTerm({
        term: searchQuery,
        page,
        limit,
        warehouseName, // Passar o warehouse definido
        jwtToken,
        retryCount: 0 // Iniciar com retry 0
      });
      return results;
    }
    
    // Caso contrário, usar a função de busca por categoria
    console.log(`[API] Redirecionando para fetchProductsByCategory com warehouse: ${warehouseName}`);
    const results = await fetchProductsByCategory({
      page,
      limit,
      warehouseName, // Passar o warehouse definido
      jwtToken,
      retryCount: 0, // Iniciar com retry 0
      categoryId
    });
    return results;
  } catch (error) {
    console.error('[API] Erro na função wrapper searchProducts:', error);
    // Em caso de erro retornar array vazio para evitar quebrar a UI
    return [];
  }
}

/**
 * Busca os dados do cliente pelo ID do Clerk
 * @param clerkId ID do usuário no Clerk
 * @param jwtToken Token de autenticação opcional
 * @returns Objeto com os dados do cliente
 */
export async function fetchCustomerByClerkId(
  clerkId: string,
  jwtToken?: string
): Promise<Customer | null> {
  try {
    console.log(`[API] Buscando cliente pelo ID do Clerk: ${clerkId}`);
    
    const url = `/api/customers/clerk/${clerkId}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      const errorData = await response.json().catch(() => ({}));
      
      console.error(`[API] Erro ao buscar cliente: ${statusCode}`, errorData);
      
      // Se o cliente não for encontrado, retornamos null em vez de lançar erro
      if (statusCode === 404) {
        console.log('[API] Cliente não encontrado');
        return null;
      }
      
      throw new Error(
        errorData.error || errorData.message || `Erro ao buscar cliente: ${statusCode}`
      );
    }
    
    const customer = await response.json();
    console.log(`[API] Cliente encontrado: ${customer.name}`);
    
    // Verificar a categoria do cliente e definir o warehouse adequado
    if (customer.__category__) {
      const categoryName = customer.__category__.name;
      console.log(`[API] Categoria do cliente: ${categoryName}`);
      
      // Salvar registro da categoria detectada para uso futuro
      if (typeof window !== 'undefined') {
        localStorage.setItem('category_extract', `Cliente identificado como ${categoryName}`);
        
        // Definir o warehouse com base na categoria do cliente
        if (categoryName.includes('Creator')) {
          console.log('[API] Cliente é Creator, definindo warehouse MKT-Creator');
          localStorage.setItem('warehouse_name', 'MKT-Creator');
        } else if (categoryName.includes('Top Master')) {
          console.log('[API] Cliente é Top Master, definindo warehouse MKT-Top Master');
          localStorage.setItem('warehouse_name', 'MKT-Top Master');
        } else {
          // Categoria padrão caso não seja identificada
          console.log('[API] Categoria não identificada, usando MKT-Creator como padrão');
          localStorage.setItem('warehouse_name', 'MKT-Creator');
        }
      }
    }
    
    return customer;
  } catch (error) {
    console.error('[API] Erro ao buscar cliente:', error);
    throw error;
  }
}

// Função para buscar produtos por categoria do cliente
export async function fetchProductsByCategory({
  searchQuery,
  page = 0,
  limit = 12,
  jwtToken,
  warehouseName,
  retryCount = 0,
  categoryId
}: {
  searchQuery?: string;
  page?: number;
  limit?: number;
  jwtToken?: string;
  warehouseName?: string;
  retryCount?: number;
  categoryId?: string | null;
}): Promise<any> {
  // Limite máximo de tentativas
  const MAX_RETRIES = 3;
  
  try {
    console.log(`[API] Buscando produtos por categoria (tentativa ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // Verificar se temos um token JWT
    let token = jwtToken;
    
    // Se não foi fornecido, tentar obter do TokenStore global
    if (!token && typeof window !== 'undefined') {
      const storeToken = tokenStore.getToken();
      if (!storeToken) {
        console.error('[API] Token não fornecido e não encontrado no TokenStore');
        
        // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
        if (retryCount < MAX_RETRIES) {
          console.log(`[API] Aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          
          return fetchProductsByCategory({
            searchQuery,
            page,
            limit,
            jwtToken,
            warehouseName,
            retryCount: retryCount + 1,
            categoryId
          });
        }
        
        throw new Error('Token de autenticação necessário');
      } else {
        token = storeToken;
      }
    } else if (!token) {
      console.error('[API] Token não fornecido e TokenStore não disponível (SSR)');
      throw new Error('Token de autenticação necessário para busca de produtos');
    }
    
    // Construir parâmetros de consulta
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      inStock: 'true',  // Garantir que buscamos apenas produtos em estoque
      active: 'true'    // Garantir que buscamos apenas produtos ativos
    };
    
    // Adicionar termo de busca se fornecido
    if (searchQuery) {
      params.term = searchQuery;
    }
    
    // Adicionar warehouse se fornecido explicitamente
    if (warehouseName) {
      params.warehouseName = warehouseName;
      console.log(`[API] Usando warehouse específico: ${warehouseName}`);
    }
    
    // Adicionar categoria se fornecida
    if (categoryId) {
      // Caso especial: se for a categoria Proteínas, incluir ambos os IDs no parâmetro categoryIds
      if (categoryId === '8bb26b67-a7ce-4001-ae51-ceec0082fb89') {
        console.log('[API] Categoria Proteínas detectada, incluindo ambos os IDs conhecidos');
        params.categoryIds = JSON.stringify(['8bb26b67-a7ce-4001-ae51-ceec0082fb89', '8fade785-4ad2-4f53-b715-c4a662dd6be6']);
      } else {
        params.categoryId = categoryId;
      }
      console.log(`[API] Filtrando por categoria: ${categoryId}`);
    }
    
    // Construir string de consulta
    const queryString = new URLSearchParams(params).toString();
    
    // Usar o endpoint interno que protege a URL externa
    const endpoint = `/api/marketing/products/warehouse/search?${queryString}`;
    console.log(`[API] Buscando produtos usando endpoint: ${endpoint}`);
    
    // Fazer a requisição
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest' // Para evitar respostas HTML
      },
      credentials: 'include', // Importante para incluir cookies com o token
      cache: 'no-store'
    });
    
    // Verificar se a resposta está ok
    if (!response.ok) {
      const errorStatus = response.status;
      let errorMessage = `Erro ao buscar produtos: ${errorStatus}`;
      
      // Tentar obter detalhes do erro
      try {
        const contentType = response.headers.get('content-type');
        
        // Verificar se a resposta é JSON antes de tentar fazer o parse
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error(`[API] Erro ao buscar produtos: ${errorStatus}`, errorData);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } else {
          const errorText = await response.text();
          console.error(`[API] Erro não-JSON ao buscar produtos (${errorStatus}): ${errorText.substring(0, 200)}...`);
          
          // Tentar extrair mensagem de erro do HTML
          if (contentType && contentType.includes('text/html')) {
            // Extrair título do HTML
            const titleMatch = errorText.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              errorMessage = titleMatch[1];
            }
          }
        }
      } catch (e) {
        console.error(`[API] Erro ao processar resposta de erro:`, e);
      }
      
      // Tratar erros de autorização
      if (errorStatus === 401 || errorStatus === 403) {
        console.error('[API] Erro de autorização:', errorStatus);
        
        // Limpar token inválido
        if (typeof window !== 'undefined') {
          tokenStore.clearToken();
        }
        
        // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
        if (retryCount < MAX_RETRIES) {
          console.log(`[API] Tentando obter novo token e aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          
          return fetchProductsByCategory({
            searchQuery,
            page,
            limit,
            jwtToken: undefined, // Forçar obtenção de novo token
            warehouseName,
            retryCount: retryCount + 1,
            categoryId
          });
        }
        
        throw new Error(`Erro de autorização: ${errorMessage}`);
      }
      
      throw new Error(errorMessage);
    }
    
    // Clonar a resposta para possível análise de texto posterior
    const clonedResponse = response.clone();
    
    // Verificar o tipo de conteúdo da resposta
    const contentType = response.headers.get('content-type') || '';
    console.log(`[API] Tipo de conteúdo da resposta: ${contentType}`);
    
    // Tentar processar a resposta como JSON independentemente do content-type
    try {
      // Primeiro tentar processar normalmente
      const responseData = await response.json();
      
      // Log para debug
      console.log(`[API] Resposta processada como JSON com sucesso. Estrutura: ${JSON.stringify(Object.keys(responseData))}`);
      
      // Verificar se temos dados válidos na resposta
      let products: any[] = [];
      
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // Formato esperado: { data: [...] }
        products = responseData.data;
        console.log(`[API] Encontrados ${products.length} produtos no formato padrão { data: [...] }`);
      } else if (Array.isArray(responseData)) {
        // Formato alternativo: array direto
        products = responseData;
        console.log(`[API] Encontrados ${products.length} produtos em formato de array direto`);
      } else {
        // Tentar encontrar dados em outras propriedades possíveis
        const possibleDataProps = ['products', 'items', 'results', 'content'];
        
        for (const prop of possibleDataProps) {
          if (responseData[prop] && Array.isArray(responseData[prop])) {
            products = responseData[prop];
            console.log(`[API] Dados encontrados na propriedade "${prop}" com ${products.length} produtos`);
            break;
          }
        }
        
        // Se ainda não encontramos, logar o problema e tentar usar o objeto inteiro
        if (products.length === 0) {
          console.error('[API] Formato de resposta inesperado:', JSON.stringify(responseData).substring(0, 300) + '...');
          
          // Verificar se o objeto em si pode ser tratado como um produto
          if (responseData.id || responseData.sku || responseData.name) {
            console.log('[API] Tratando objeto único como produto');
            products = [responseData];
          } else {
            console.error('[API] Não foi possível encontrar dados de produtos na resposta');
            return []; // Retornar array vazio
          }
        }
      }
      
      console.log(`[API] ${products.length} produtos encontrados via categoria`);
      
      // Processar produtos para garantir formato consistente
      const processedProducts = products.map((item: any) => ({
        id: item.sku || item.tinyId || item.id,
        name: item.name || 'Produto sem nome',
        description: item.description || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
        originalPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg',
        categoryId: item.categoryId || '',
        category: item.category || undefined,
        codigo: item.sku || '',
        unidade: item.attributes?.unidade || 'UN',
        active: item.active !== undefined ? item.active : true
      }));
      
      // Retornar os dados processados
      return processedProducts;
    } catch (jsonError) {
      console.error('[API] Erro ao processar resposta como JSON:', jsonError);
      
      // Se falhou em processar como JSON e o content-type não é JSON, tentar processar o texto
      if (!contentType.includes('application/json')) {
        try {
          // Obter o texto bruto da resposta
          const responseText = await clonedResponse.text();
          console.log(`[API] Texto bruto da resposta (primeiros 100 caracteres): ${responseText.substring(0, 100)}...`);
          
          // Verificar se parece ser JSON (começa com { ou [)
          if ((responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) && 
              (responseText.trim().endsWith('}') || responseText.trim().endsWith(']'))) {
            
            console.log('[API] O conteúdo parece ser JSON, tentando parse manual');
            
            try {
              // Tentar interpretar manualmente como JSON
              const manualParsedData = JSON.parse(responseText);
              
              // Se conseguiu fazer o parse, continuar o processamento
              console.log('[API] Parse manual bem-sucedido, estrutura:', Object.keys(manualParsedData));
              
              // Verificar se temos dados válidos
              let products: any[] = [];
              
              if (manualParsedData && manualParsedData.data && Array.isArray(manualParsedData.data)) {
                products = manualParsedData.data;
                console.log(`[API] Encontrados ${products.length} produtos no formato { data: [...] } após parse manual`);
              } else if (Array.isArray(manualParsedData)) {
                products = manualParsedData;
                console.log(`[API] Encontrados ${products.length} produtos em formato de array após parse manual`);
              } else {
                // Tentar outras propriedades
                const possibleDataProps = ['products', 'items', 'results', 'content'];
                
                for (const prop of possibleDataProps) {
                  if (manualParsedData[prop] && Array.isArray(manualParsedData[prop])) {
                    products = manualParsedData[prop];
                    console.log(`[API] Dados encontrados na propriedade "${prop}" após parse manual`);
                    break;
                  }
                }
              }
              
              // Processar produtos encontrados
              if (products.length > 0) {
                const processedProducts = products.map((item: any) => ({
                  id: item.sku || item.tinyId || item.id,
                  name: item.name || 'Produto sem nome',
                  description: item.description || '',
                  price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
                  originalPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
                  imageUrl: item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg',
                  categoryId: item.categoryId || '',
                  category: item.category || undefined,
                  codigo: item.sku || '',
                  unidade: item.attributes?.unidade || 'UN',
                  active: item.active !== undefined ? item.active : true
                }));
                
                return processedProducts;
              }
            } catch (parseError) {
              console.error('[API] Erro no parse manual de JSON:', parseError);
            }
          }
          
          // Se parece ser HTML, pode ser um problema de autenticação
          if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
            console.error('[API] Resposta é HTML, não JSON');
            
            // Se ainda temos tentativas disponíveis, aguardar e tentar novamente
            if (retryCount < MAX_RETRIES) {
              console.log(`[API] Tentando novamente após receber HTML inesperado...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              
              return fetchProductsByCategory({
                searchQuery,
                page,
                limit,
                jwtToken: undefined, // Forçar obtenção de novo token
                warehouseName,
                retryCount: retryCount + 1,
                categoryId
              });
            }
            
            throw new Error('Recebida página HTML em vez de dados JSON');
          }
        } catch (textError) {
          console.error('[API] Erro ao obter texto bruto:', textError);
        }
      }
      
      // Se ainda não conseguimos resolver, e temos tentativas disponíveis, tentar novamente
      if (retryCount < MAX_RETRIES) {
        console.log(`[API] Tentando novamente após erro de processamento...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        
        return fetchProductsByCategory({
          searchQuery,
          page,
          limit,
          jwtToken,
          warehouseName,
          retryCount: retryCount + 1,
          categoryId
        });
      }
      
      // Após todas as tentativas, se não conseguimos processar a resposta, retornar array vazio
      console.error('[API] Falha em todas as tentativas de processar a resposta');
      return [];
    }
  } catch (error) {
    console.error('[API] Erro ao buscar produtos por categoria:', error);
    
    // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
    if (retryCount < MAX_RETRIES) {
      console.log(`[API] Erro na tentativa ${retryCount + 1}, aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      
      return fetchProductsByCategory({
        searchQuery,
        page,
        limit,
        jwtToken,
        warehouseName,
        retryCount: retryCount + 1,
        categoryId
      });
    }
    
    // Não propagar o erro, retornar array vazio em caso de erro
    console.log('[API] Retornando array vazio após todas as tentativas falharem');
    return [];
  }
}

// Função para busca de produtos por termo específico
export async function searchProductsByTerm({
  term,
  page = 0,
  limit = 12,
  warehouseName,
  jwtToken,
  retryCount = 0
}: {
  term: string;
  page?: number;
  limit?: number;
  warehouseName?: string;
  jwtToken?: string;
  retryCount?: number;
}): Promise<any> {
  // Limite máximo de tentativas
  const MAX_RETRIES = 3;

  try {
    console.log(`[API] Buscando produtos com termo: "${term}" (tentativa ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // Verificar se temos um token JWT
    let token = jwtToken;
    
    // Se não foi fornecido, tentar obter do TokenStore global
    if (!token && typeof window !== 'undefined') {
      const storeToken = tokenStore.getToken();
      if (!storeToken) {
        console.error('[API] Token não fornecido e não encontrado no TokenStore');
        
        // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
        if (retryCount < MAX_RETRIES) {
          console.log(`[API] Aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          
          return searchProductsByTerm({
            term,
            page,
            limit,
            warehouseName,
            jwtToken,
            retryCount: retryCount + 1
          });
        }
        
        throw new Error('Token de autenticação necessário');
      } else {
        token = storeToken;
      }
    } else if (!token) {
      console.error('[API] Token não fornecido e TokenStore não disponível (SSR)');
      throw new Error('Token de autenticação necessário para busca de produtos');
    }
    
    // Construir parâmetros de consulta
    const params: Record<string, string> = {
      term,
      page: page.toString(),
      limit: limit.toString(),
      inStock: 'true',  // Garantir que buscamos apenas produtos em estoque
      active: 'true'    // Garantir que buscamos apenas produtos ativos
    };
    
    // Adicionar warehouse se especificado, senão usar o padrão 'geral'
    if (warehouseName) {
      params.warehouseName = warehouseName;
      console.log(`[API] Usando warehouse específico para busca: ${warehouseName}`);
    }
    
    // Construir string de consulta
    const queryString = new URLSearchParams(params).toString();
    
    // Usar o endpoint interno que protege a URL externa
    const endpoint = `/api/marketing/products/warehouse/search?${queryString}`;
    console.log(`[API] Buscando produtos usando endpoint: ${endpoint}`);
    
    // Fazer a requisição
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest' // Para evitar respostas HTML
      },
      credentials: 'include', // Importante para incluir cookies com o token
      cache: 'no-store'
    });
    
    // Verificar se a resposta está ok
    if (!response.ok) {
      const errorStatus = response.status;
      let errorMessage = `Erro ao buscar produtos: ${errorStatus}`;
      
      // Tentar obter detalhes do erro
      try {
        const contentType = response.headers.get('content-type');
        
        // Verificar se a resposta é JSON antes de tentar fazer o parse
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error(`[API] Erro ao buscar produtos com termo "${term}": ${errorStatus}`, errorData);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } else {
          const errorText = await response.text();
          console.error(`[API] Erro não-JSON ao buscar produtos com termo "${term}" (${errorStatus}): ${errorText.substring(0, 200)}...`);
          
          // Tentar extrair mensagem de erro do HTML
          if (contentType && contentType.includes('text/html')) {
            // Extrair título do HTML
            const titleMatch = errorText.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              errorMessage = titleMatch[1];
            }
          }
        }
      } catch (e) {
        console.error(`[API] Erro ao processar resposta de erro:`, e);
        }
        
      // Tratar erros de autorização
        if (errorStatus === 401 && typeof window !== 'undefined') {
          console.error('[API] Token expirado ou inválido');
          tokenStore.clearToken();
          
          // Se ainda temos tentativas disponíveis, aguardar e tentar novamente
          if (retryCount < MAX_RETRIES) {
            console.log(`[API] Tentando obter novo token e aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            
            return searchProductsByTerm({
              term,
              page, 
              limit,
              warehouseName,
              jwtToken: undefined, // Forçar obtenção de novo token
              retryCount: retryCount + 1
            });
          }
          
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      throw new Error(errorMessage);
    }
    
    // Verificar o tipo de conteúdo da resposta
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[API] Resposta não é JSON (${contentType})`);
      
      // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
      if (retryCount < MAX_RETRIES) {
        console.log(`[API] Aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        
        return searchProductsByTerm({
          term,
          page,
          limit,
          warehouseName,
          jwtToken,
          retryCount: retryCount + 1
        });
      }
      
      // Se for HTML, tentar extrair informações de erro
      try {
        const htmlContent = await response.text();
        
        // Tentar extrair título ou mensagem de erro
        const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          throw new Error(`Resposta HTML recebida: ${titleMatch[1]}`);
        } else {
          throw new Error(`Resposta não é JSON: ${contentType}`);
        }
      } catch (e) {
        throw new Error(`Resposta não é JSON: ${contentType}`);
      }
    }
    
    // Clonar a resposta para processamento seguro em caso de erro
    const clonedResponse = response.clone();
    
    // Processar a resposta
    try {
      const responseData = await response.json();
      
      // Verificar se temos dados válidos na resposta
      let products: any[] = [];
      
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // Formato esperado: { data: [...] }
        products = responseData.data;
      } else if (Array.isArray(responseData)) {
        // Formato alternativo: array direto
        products = responseData;
      } else {
        // Tentar encontrar dados em outras propriedades possíveis
        const possibleDataProps = ['products', 'items', 'results', 'content'];
        
        for (const prop of possibleDataProps) {
          if (responseData[prop] && Array.isArray(responseData[prop])) {
            products = responseData[prop];
            console.log(`[API] Dados encontrados na propriedade "${prop}"`);
            break;
          }
        }
        
        // Se ainda não encontramos, logar o problema e tentar usar o objeto inteiro
        if (products.length === 0) {
          console.error('[API] Formato de resposta inesperado:', JSON.stringify(responseData).substring(0, 300) + '...');
          
          // Verificar se o objeto em si pode ser tratado como um produto
          if (responseData.id || responseData.sku || responseData.name) {
            console.log('[API] Tratando objeto único como produto');
            products = [responseData];
          } else {
            console.error('[API] Não foi possível encontrar dados de produtos na resposta');
            return []; // Retornar array vazio
          }
        }
      }
      
      console.log(`[API] ${products.length} produtos encontrados via busca por termo "${term}"`);
      
      // Processar produtos para garantir formato consistente
      const processedProducts = products.map((item: any) => ({
        id: item.sku || item.tinyId || item.id,
        name: item.name || 'Produto sem nome',
        description: item.description || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
        originalPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg',
        categoryId: item.categoryId || '',
        category: item.category || undefined,
        codigo: item.sku || '',
        unidade: item.attributes?.unidade || 'UN',
        active: item.active !== undefined ? item.active : true
      }));
      
      // Retornar os dados processados
      return processedProducts;
    } catch (e) {
      console.error(`[API] Erro ao processar resposta JSON:`, e);
      
      // Tentar diagnosticar o problema
      try {
        const rawText = await clonedResponse.text();
        console.error('[API] Texto bruto da resposta:', rawText.substring(0, 500) + '...');
        
        // Se parece ser HTML, pode ser um problema de sessão/autenticação
        if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html>')) {
          if (rawText.includes('login') || rawText.includes('auth') || rawText.includes('session')) {
            console.error('[API] Resposta HTML indica problema de autenticação');
            
            // Limpar token e tentar novamente se possível
            if (typeof window !== 'undefined') {
              tokenStore.clearToken();
            }
            
            throw new Error('Sessão expirada ou token inválido');
          } else {
            throw new Error('Recebida uma página HTML em vez de dados JSON');
          }
        }
      } catch (textError) {
        console.error('[API] Erro ao obter texto bruto:', textError);
      }
      
      throw new Error(`Erro ao processar JSON: ${e}`);
    }
  } catch (error) {
    console.error(`[API] Erro ao buscar produtos com termo "${term}":`, error);
    
    // Se ainda temos tentativas disponíveis, aguardar um pouco e tentar novamente
    if (retryCount < MAX_RETRIES) {
      console.log(`[API] Erro na tentativa ${retryCount + 1}, aguardando ${1000 * (retryCount + 1)}ms antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      
      return searchProductsByTerm({
        term,
        page,
        limit,
        warehouseName,
        jwtToken,
        retryCount: retryCount + 1
      });
    }
    
    // Não propagar o erro, retornar array vazio em caso de erro
    console.log('[API] Retornando array vazio após todas as tentativas falharem');
    return [];
  }
}

/**
 * Busca produtos de um warehouse específico
 * @param warehouseName Nome do warehouse (default: MKT-Creator)
 * @param page Página de resultados (default: 0)
 * @param limit Limite de resultados por página (default: 12)
 * @param inStock Filtrar apenas produtos em estoque (default: true)
 * @param active Filtrar apenas produtos ativos (default: true)
 * @param term Termo para pesquisa de produtos (opcional)
 */
export async function searchWarehouseProducts({
  warehouseName = 'MKT-Creator',
  page = 0,
  limit = 12,
  inStock = true,
  active = true,
  term = ''
}: {
  warehouseName?: string;
  page?: number;
  limit?: number;
  inStock?: boolean;
  active?: boolean;
  term?: string;
} = {}) {
  try {
    const queryParams = new URLSearchParams({
      warehouseName: warehouseName,
      page: page.toString(),
      limit: limit.toString(),
      inStock: inStock.toString(),
      active: active.toString()
    });

    // Adicionar o termo de busca se fornecido
    if (term && term.trim()) {
      queryParams.append('term', term.trim());
      console.log(`[API] Buscando produtos com termo: "${term}" no warehouse: ${warehouseName}`);
    }

    // Utilizar a rota específica para busca de produtos por warehouse
    const response = await fetch(`/api/marketing/products/warehouse/search?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao buscar produtos do warehouse:', error);
      throw new Error(`Erro ao buscar produtos (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar produtos do warehouse:', error);
    throw error;
  }
}
