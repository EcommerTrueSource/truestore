import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter informações de um cliente pelo ID do Clerk
 * 
 * Endpoint público: /api/customers/clerk/[id]
 * Endpoint interno: /marketing/customers/byClerkId/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clerkId = params.id;
  return TrueCore.handleCustomerByClerkId(request, clerkId);
} 