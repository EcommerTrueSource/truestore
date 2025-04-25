import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Extrai o token True Core dos cookies da requisição ou do cabeçalho Authorization
 */
function extractToken(request: NextRequest): string | null {
  // Primeiro tenta obter do cookie
  const cookieToken = request.cookies.get('true_core_token')?.value;
  if (cookieToken) {
    console.log('[Profile API] Token encontrado no cookie');
    return cookieToken;
  }
  
  // Tentar extrair do cabeçalho Authorization como fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('[Profile API] Token encontrado no cabeçalho Authorization');
    return token;
  }
  
  console.log('[Profile API] Nenhum token encontrado na requisição');
  return null;
}

/**
 * Rota para obter o perfil do cliente logado
 * 
 * GET /api/customers/profile
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Profile API] Iniciando obtenção do perfil do cliente');
    
    // Obter token
    const token = extractToken(request);
    
    if (!token) {
      console.error('[Profile API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Obter o ID do cliente a partir do token
    try {
      const tokenPayload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(tokenPayload, 'base64').toString('utf-8'));
      
      if (!payload.sub) {
        console.error('[Profile API] Sub não encontrado no token');
        return NextResponse.json(
          { error: 'ID do cliente não encontrado no token' },
          { status: 400 }
        );
      }

      // Obter o cliente pelo ID
      const customerId = payload.sub;
      console.log(`[Profile API] Obtendo perfil do cliente ID: ${customerId}`);
      
      // Usar o TrueCore para buscar dados do cliente
      const customerData = await TrueCore.getCustomerById(customerId, token);
      
      if (!customerData) {
        console.error('[Profile API] Cliente não encontrado');
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        );
      }
      
      // Adicionar categoria ao objeto de resposta
      const categoryData = await TrueCore.getCustomerCategory(customerId, token);
      
      if (categoryData) {
        console.log(`[Profile API] Categoria encontrada: ${categoryData.name}`);
        customerData.__category__ = categoryData;
      }
      
      return NextResponse.json(customerData);
    } catch (error) {
      console.error('[Profile API] Erro ao processar token:', error);
      return NextResponse.json(
        { error: 'Erro ao processar token de autenticação' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Profile API] Erro não tratado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição' },
      { status: 500 }
    );
  }
} 