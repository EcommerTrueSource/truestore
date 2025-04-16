import { NextRequest, NextResponse } from 'next/server';

/**
 * Extrai o token True Core dos cookies da requisição ou do cabeçalho Authorization
 */
function extractToken(request: NextRequest): string | null {
  // Primeiro tenta obter do cabeçalho Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  // Depois tenta obter do cookie
  return request.cookies.get('true_core_token')?.value || null;
}

/**
 * Rota proxy para categorias do True Core
 * GET /api/marketing/categories
 */
export async function GET(request: NextRequest) {
  try {
    // Obter a URL base da API True Core
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o token
    const token = extractToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Construir a URL para a API True Core
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/marketing/products/categories`;
    
    // Fazer a requisição para a API True Core com o token
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Se a resposta não for ok, retornar o erro
    if (!response.ok) {
      const status = response.status;
      
      try {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status });
      } catch {
        return NextResponse.json(
          { error: 'Erro ao buscar categorias da API True Core' },
          { status }
        );
      }
    }

    // Obter os dados da resposta
    const categories = await response.json();
    
    // Adicionar a categoria "Todos os produtos" no início, se o array for válido
    const categoriesWithAll = [
      { id: 'all', name: 'Todos os produtos', slug: 'todos' },
      ...(Array.isArray(categories) ? categories : [])
    ];
    
    return NextResponse.json(categoriesWithAll);
    
  } catch (error) {
    console.error('Erro no proxy de categorias:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de categorias' },
      { status: 500 }
    );
  }
} 