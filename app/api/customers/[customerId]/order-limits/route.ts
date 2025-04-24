import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para buscar limites de pedidos de um cliente
 * 
 * GET /api/customers/[customerId]/order-limits
 *
 * Esta rota atua como proxy para o endpoint True Core:
 * /marketing/customers/{customerId}/order-limits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const { customerId } = params;
  
  if (!customerId) {
    return Response.json(
      { error: 'ID do cliente não fornecido' },
      { status: 400 }
    );
  }
  
  console.log(`Buscando limites de pedidos para o cliente: ${customerId}`);
  return TrueCore.handleCustomerOrderLimits(request, customerId);
} 