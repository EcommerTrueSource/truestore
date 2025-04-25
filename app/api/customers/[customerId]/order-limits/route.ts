import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Busca limites de pedidos para um cliente específico
 * GET /api/customers/[customerId]/order-limits
 *
 * Esta rota obtém informações sobre a categoria do cliente
 * que determinará qual warehouse utilizar na busca de produtos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // Obtém o ID do cliente de forma assíncrona (usando await para evitar erros)
    const customerId = (await params).customerId;

    if (!customerId) {
      console.log('[Order Limits] ID do cliente não fornecido');
      return Response.json(
        { success: false, error: 'ID do cliente não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[Order Limits] Buscando informações para o cliente: ${customerId}`);

    // Extrair token da requisição
    const token = TrueCore.extractToken(request);
    
    if (!token) {
      console.log('[Order Limits] Token de autenticação não fornecido');
      return Response.json(
        { success: false, error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }
    
    // Buscar informações de categoria para determinar warehouse
    const orderLimits = await TrueCore.getCustomerOrderLimits(customerId, token);
    
    if (!orderLimits) {
      console.log('[Order Limits] Informações do cliente não encontradas');
      return Response.json(
        { success: false, error: 'Informações do cliente não encontradas' },
        { status: 404 }
      );
    }
    
    // Retornar os dados necessários para a loja
    return Response.json(orderLimits);
  } catch (error) {
    console.error(`[Order Limits] Erro ao buscar informações do cliente:`, error);
    return Response.json(
      { success: false, error: 'Erro ao buscar informações do cliente' },
      { status: 500 }
    );
  }
} 