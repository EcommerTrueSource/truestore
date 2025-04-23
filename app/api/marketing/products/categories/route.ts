import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Extrai o token de forma mais simplificada, seguindo o padrão da rota de produtos
 * 
 * @deprecated Recomenda-se usar TrueCore.extractToken para padronização
 */
function extractToken(request: NextRequest): string | null {
  // Extrair token apenas do cookie
  const cookieToken = request.cookies.get('true_core_token')?.value;
  if (cookieToken) {
    console.log('[API Categories] Token encontrado no cookie');
    return cookieToken;
  }
  
  // Tentar extrair do cabeçalho Authorization como fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('[API Categories] Token encontrado no cabeçalho Authorization');
    return token;
  }
  
  console.log('[API Categories] Nenhum token encontrado na requisição');
  return null;
}

/**
 * Rota proxy principal para categorias de produtos no True Core
 * 
 * Esta é a implementação de referência para obtenção de categorias.
 * É chamada indiretamente através do ponto de entrada unificado /api/categories
 * 
 * GET /api/marketing/products/categories
 */
export async function GET(request: NextRequest) {
  console.log('[API Categories] Recebendo requisição para listar categorias');
  
  try {
    // Obter a URL base da API True Core
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('[API Categories] URL da API não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Verificar se existe um token no cookie usando o método simplificado
    const token = extractToken(request);
    
    if (!token) {
      console.error('[API Categories] Token não encontrado na requisição');
      return NextResponse.json({ error: 'Token de autenticação não fornecido' }, { status: 401 });
    }
    
    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/marketing/products/categories`;
    console.log(`[API Categories] Fazendo requisição para: ${url}`);
    
    // Fazer a requisição para a API True Core com o token
    const headers = new Headers();
    headers.append('Accept', '*/*');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);
    
    // Fazer a requisição diretamente, sem proxy adicional
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    // Log do status para depuração
    console.log(`[API Categories] Resposta obtida com status: ${response.status}`);
    
    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      console.error(`[API Categories] Erro ao buscar categorias: ${status}`);
      
      try {
        const errorData = await response.json();
        console.error(`[API Categories] Detalhes do erro:`, errorData);
        return NextResponse.json(errorData, { status });
      } catch {
        return NextResponse.json(
          { error: 'Erro ao buscar categorias da API True Core' },
          { status }
        );
      }
    }
    
    // Obter as categorias da resposta
    let responseData;
    try {
      const responseText = await response.text();
      console.log(`[API Categories] Resposta bruta: ${responseText.substring(0, 100)}...`);
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[API Categories] Erro ao fazer parse da resposta:`, e);
      return NextResponse.json(
        { error: 'Erro ao processar resposta do servidor' },
        { status: 500 }
      );
    }
    
    // Se a resposta não for um array, verificar se tem uma propriedade 'data'
    let categories = Array.isArray(responseData) ? responseData : 
                     (responseData && responseData.data && Array.isArray(responseData.data)) ? 
                     responseData.data : [];
    
    if (categories.length === 0) {
      console.warn('[API Categories] Nenhuma categoria encontrada na resposta');
    } else {
      console.log(`[API Categories] ${categories.length} categorias extraídas da resposta`);
    }
    
    // Adicionar slug para cada categoria caso não exista
    categories = categories.map((category: any) => ({
      ...category,
      slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-') || category.id
    }));
    
    // Adicionar a categoria "Todos os produtos" no início
    const categoriesWithAll = [
      { 
        id: 'all', 
        name: 'Todos os produtos', 
        slug: 'todos',
        itemQuantity: categories.reduce((total: number, cat: any) => total + (Number(cat.itemQuantity) || 0), 0)
      },
      ...categories
    ];
    
    console.log(`[API Categories] Retornando ${categoriesWithAll.length} categorias com "Todos os produtos"`);
    
    return NextResponse.json(categoriesWithAll);
  } catch (error) {
    console.error('[API Categories] Erro não tratado ao processar categorias:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de categorias' },
      { status: 500 }
    );
  }
} 