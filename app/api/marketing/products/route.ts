import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

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
 * Extrai o ID do Clerk do token ou dos headers
 */
async function extractClerkIdFromToken(request: NextRequest, token: string): Promise<string | null> {
  try {
    // Primeiro, verificar se temos o ID nos headers do Clerk
    const clerkUserId = request.headers.get('x-clerk-user-id');
    if (clerkUserId) {
      console.log(`[Products API] ID do Clerk obtido do header: ${clerkUserId}`);
      return clerkUserId;
    }
    
    // Se não encontramos no header, tentar extrair do token
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    const data = JSON.parse(decodedPayload);
    
    console.log('[Products API] Payload do token JWT:', JSON.stringify(data));
    
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
            console.log(`[Products API] ID do Clerk obtido do cookie __clerk_jwt: ${clerkData.sub}`);
            return clerkData.sub;
          }
        }
      } catch (e) {
        console.error('[Products API] Erro ao extrair ID do cookie do Clerk:', e);
      }
    }
    
    console.log('[Products API] Não foi possível encontrar o ID do Clerk no token ou headers');
    return null;
  } catch (error) {
    console.error('[Products API] Erro ao extrair ID do Clerk:', error);
    console.error('[Products API] Detalhes do erro:', error);
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
      console.error('[Products API] ID do Clerk inválido ou vazio');
      return null;
    }
    
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/marketing/customers/byClerkId/${cleanClerkId}`;
    console.log(`[Products API] Buscando informações do cliente: ${url}`);
    
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
      console.error(`[Products API] Erro ao buscar cliente: ${response.status}`);
      
      // Registrar mais detalhes sobre o erro para diagnóstico
      try {
        const errorText = await response.text();
        console.error('[Products API] Resposta de erro:', errorText);
      } catch (e) {
        console.error('[Products API] Não foi possível ler resposta de erro');
      }
      
      return null;
    }
    
    const customer = await response.json();
    
    if (customer && customer.__category__) {
      console.log(`[Products API] Categoria do cliente encontrada: ${customer.__category__.name}`);
      return customer.__category__.name;
    }
    
    console.log('[Products API] Cliente encontrado, mas sem categoria definida');
    return null;
  } catch (error) {
    console.error('[Products API] Erro ao buscar cliente:', error);
    return null;
  }
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

    // Copiar os parâmetros de consulta da requisição original para um objeto URLSearchParams
    const searchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    
    // Log para depuração dos parâmetros originais
    console.log('[Products API] Parâmetros de busca originais:');
    for (const [key, value] of searchParams.entries()) {
      console.log(`[Products API] - ${key}: ${value}`);
    }
    
    // Verificar especificamente o filtro de categoria
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      console.log(`[Products API] Filtrando por categoria ID: ${categoryId}`);
    } else {
      console.log('[Products API] Sem filtro de categoria aplicado');
    }
    
    // Adicionar filtros padrão
    searchParams.set('inStock', 'true');
    searchParams.set('active', 'true');
    
    // Tentar obter o ID do Clerk dos headers diretamente
    let clerkId = request.headers.get('x-clerk-user-id');
    if (clerkId) {
      console.log(`[Products API] ID do Clerk obtido do header: ${clerkId}`);
    } else {
      // Se não encontramos nos headers, tentar extrair do token
      try {
        const payload = token.split('.')[1];
        if (payload) {
          const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
          const data = JSON.parse(decodedPayload);
          console.log('[Products API] Payload do token JWT:', JSON.stringify(data));
          
          // Verificar externalId/sub no token
          if (data.externalId) {
            clerkId = data.externalId;
            console.log(`[Products API] ID do Clerk extraído do token (externalId): ${clerkId}`);
          } else if (data.sub) {
            clerkId = data.sub;
            console.log(`[Products API] ID do Clerk extraído do token (sub): ${clerkId}`);
          }
        }
      } catch (e) {
        console.error('[Products API] Erro ao decodificar token:', e);
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
        console.log(`[Products API] Buscando cliente pela rota unificada: ${customerUrl}`);
        
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
            console.log(`[Products API] Categoria do cliente: ${categoryName}`);
            
            // Definir o warehouseName com base na categoria do cliente - exatamente como esperado pela API
            if (categoryName.includes('Creator')) {
              warehouseName = 'MKT-Creator';
              console.log(`[Products API] Cliente da categoria Creator, usando warehouse: ${warehouseName}`);
            } else if (categoryName.includes('Top Master')) {
              warehouseName = 'MKT-Top Master';
              console.log(`[Products API] Cliente da categoria Top Master, usando warehouse: ${warehouseName}`);
            } else {
              // Categoria padrão para outros tipos
              warehouseName = 'geral';
              console.log(`[Products API] Outra categoria de cliente, usando warehouse: ${warehouseName}`);
            }
            
            // Aplicar o filtro de warehouse
            if (warehouseName) {
              searchParams.set('warehouseName', warehouseName);
            }
          } else {
            console.log('[Products API] Cliente encontrado, mas sem categoria definida');
          }
        } else {
          console.error(`[Products API] Erro ao buscar cliente: ${response.status}`);
          try {
            const errorData = await response.text();
            console.error('[Products API] Resposta de erro:', errorData);
          } catch (e) {
            console.error('[Products API] Não foi possível ler resposta de erro');
          }
        }
      } catch (error) {
        console.error('[Products API] Erro ao buscar cliente:', error);
      }
    }
    
    console.log('[Products API] Parâmetros de busca após aplicar filtros:');
    for (const [key, value] of searchParams.entries()) {
      console.log(`[Products API] - ${key}: ${value}`);
    }
    
    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    
    // Definir o endpoint baseado na disponibilidade do warehouse
    // Se temos um warehouse, SEMPRE usar o endpoint warehouse/search
    const endpoint = warehouseName 
      ? '/marketing/products/warehouse/search' 
      : '/marketing/products';
      
    console.log(`[Products API] Usando endpoint: ${endpoint}`);
    
    const url = `${baseUrl}${endpoint}?${searchParams.toString()}`;
    console.log(`[Products API] Fazendo requisição para: ${url}`);
    
    // Fazer a requisição para a API True Core com o token
    const headers = new Headers();
    headers.append('Accept', '*/*');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);
    
    console.log(`[Products API] Enviando token: ${token.substring(0, 20)}...`);
    
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
    
    // Filtrar produtos apenas se necessário (alguns endpoints já retornam filtrados)
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
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Products API] Erro no proxy de produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de produtos' },
      { status: 500 }
    );
  }
} 