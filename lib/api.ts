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
  page = 1,
  limit = 20,
  minPrice,
  maxPrice,
  jwtToken,
  searchQuery
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
        console.log('[API] Usando token do TokenStore global para searchProducts');
      }
    } else {
      // Armazenar o token fornecido no TokenStore global para uso futuro
      tokenStore.setToken(token, 86400);
      console.log('[API] Token fornecido foi armazenado no TokenStore global');
    }
    
    // Preparar parâmetros para a busca
    const params: Record<string, string> = {
      page: page.toString()
    };
    
    // Ajustar o limite baseado no número de itens na categoria e a paginação
    let adjustedLimit = limit;
    let adjustedPage = page;

    if (categoryId && categoryId !== 'all' && categoryName) {
      // Se temos uma categoria específica selecionada, vamos buscar mais produtos
      // Limite fixo de 100 produtos por requisição para categorias
      adjustedLimit = 100;
      
      // Se estamos na página > 1, ajustamos os parâmetros para buscar o próximo conjunto de dados
      if (page > 1) {
        // A API usa paginação baseada em 0, então ajustamos para obter o conjunto correto
        adjustedPage = page - 1;
        console.log(`[API] Buscando página ${adjustedPage} da categoria com limite de ${adjustedLimit}`);
      } else {
        console.log('[API] Primeira página de categoria com limite de 100 produtos');
      }
    } else if (categoryItemCount && categoryItemCount > 0) {
      console.log(`[API] Ajustando limite para o número de itens na categoria: ${categoryItemCount}`);
      // Se estamos na primeira página, usamos o total de itens se for menor que PRODUCTS_PER_PAGE
      if (page === 1 && categoryItemCount < limit) {
        adjustedLimit = categoryItemCount;
      } else if (categoryItemCount > 12) {
        // Se temos mais de 12 itens, mantemos o limite original para paginação
        adjustedLimit = limit;
      } else {
        // Para categorias com poucos itens, buscamos todos de uma vez
        adjustedLimit = categoryItemCount;
      }
    }

    // Definir o limite ajustado e a página
    params.limit = adjustedLimit.toString();
    params.page = adjustedPage.toString();
    
    // Adicionar query de busca se fornecida
    if (query) {
      params.query = query;
    }
    
    // Adicionar termo de busca para a API (usado com o input de busca)
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    // Adicionar ID da categoria se fornecida e não for 'all'
    if (categoryId && categoryId !== 'all') {
      params.categoryId = categoryId;
      
      // Sempre enviar nome da categoria se estiver disponível
      // para filtro preciso na API
      if (categoryName) {
        params.categoryName = categoryName;
        console.log(`[API] Filtrando pela categoria: ${categoryName}`);
      }
    }
    
    // Ordenação
    if (sortBy) {
      params.sortBy = sortBy;
    }
    
    // Filtros de preço
    if (minPrice !== undefined && minPrice > 0) {
      params.minPrice = minPrice.toString();
    }
    
    if (maxPrice !== undefined && maxPrice > 0) {
      params.maxPrice = maxPrice.toString();
    }
    
    // Construir string de consulta
    const queryString = new URLSearchParams(params).toString();
    
    // Construir um endpoint seguro - em caso de falha da API de busca, temos um fallback
    let endpoint;
    let useFallback = false;
    
    // Primeiro tentar usar o endpoint de busca avançada
    endpoint = `/api/marketing/products/search${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[API] Buscando produtos com busca avançada: ${endpoint}`);
    
    // Enviar o token como cookie para garantir que esteja disponível para a API
    document.cookie = `true_core_token=${token}; path=/; max-age=3600`;
    
    // Fazer a requisição
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store',
        credentials: 'include' // Importante para incluir cookies
      });
      
      // Se ocorrer erro 400 (Bad Request), provavelmente há incompatibilidade com os parâmetros
      // Vamos tentar com o endpoint padrão de produtos
      if (response.status === 400) {
        console.log('[API] Erro 400 na API de busca avançada, tentando endpoint padrão...');
        useFallback = true;
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          console.error('[API] Token expirado ou inválido');
          tokenStore.clearToken();
          throw new Error('UNAUTHORIZED');
        }
        
        throw new Error(errorData.error || `Erro ao buscar produtos: ${response.status}`);
      }
    } catch (fetchError: any) {
      if (useFallback || fetchError.message !== 'UNAUTHORIZED') {
        // Se não for erro de autenticação ou se já temos um flag para fallback, tentar endpoint padrão
        console.log('[API] Usando endpoint padrão de produtos como fallback');
        endpoint = `/api/marketing/products${queryString ? `?${queryString}` : ''}`;
        
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          cache: 'no-store',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 401) {
            console.error('[API] Token expirado ou inválido no endpoint fallback');
            tokenStore.clearToken();
            throw new Error('UNAUTHORIZED');
          }
          
          throw new Error(errorData.error || `Erro ao buscar produtos (fallback): ${response.status}`);
        }
      } else {
        // Se for outro erro, propagar
        throw fetchError;
      }
    }
    
    // Obter dados da resposta
    const responseData = await response.json();
    
    // Processar a resposta - converter para formato esperado
    let products: Product[] = [];
    
    // A API retorna um objeto com propriedade 'data' que contém o array de produtos
    if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
      // Filtrar apenas produtos ativos (active: true)
      const activeProducts = responseData.data.filter((item: any) => item.active === true);
      
      console.log(`[API] Filtrados ${activeProducts.length} produtos ativos de um total de ${responseData.data.length}`);
      
      // Mapear os produtos da API para o formato esperado pelo nosso app
      products = activeProducts.map((item: any) => ({
        id: item.sku || item.tinyId || item.id,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.price),
        originalPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : '/placeholder.svg',
        categoryId: item.categoryId || '',
        category: item.category || undefined,
        codigo: item.sku,
        unidade: item.attributes?.unidade || 'UN',
        active: item.active
      }));
      
      console.log(`[API] Processados ${products.length} produtos ativos da busca avançada`);
    } else {
      console.error('[API] Formato inesperado na resposta da API de busca avançada:', responseData);
      throw new Error('Formato inesperado na resposta da API');
    }
    
    return products;
  } catch (error) {
    console.error('[API] Erro ao realizar busca avançada de produtos:', error);
    throw error; // Propagar o erro para ser tratado pelo componente
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
    
    return customer;
  } catch (error) {
    console.error('[API] Erro ao buscar cliente:', error);
    throw error;
  }
}
