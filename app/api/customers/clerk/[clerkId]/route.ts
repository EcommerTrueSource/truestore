import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para buscar cliente pelo ID do Clerk
 * 
 * GET /api/customers/clerk/[clerkId]
 *
 * Esta rota atua como proxy para o endpoint True Core:
 * /marketing/customers/byClerkId/{clerkId}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  const { clerkId } = params;
  
  if (!clerkId) {
    return Response.json(
      { error: 'ID do Clerk não fornecido' },
      { status: 400 }
    );
  }
  
  console.log(`Buscando cliente pelo ID do Clerk: ${clerkId}`);
  return TrueCore.handleCustomerByClerkId(request, clerkId);
} 