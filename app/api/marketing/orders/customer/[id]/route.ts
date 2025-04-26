import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter os pedidos de um cliente específico
 * 
 * Endpoint público: /api/marketing/orders/customer/[id]
 * Endpoint interno: /marketing/orders/customer/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const customerId = params.id;
  return TrueCore.handleRequest(request, `/marketing/orders/customer/${customerId}`);
} 