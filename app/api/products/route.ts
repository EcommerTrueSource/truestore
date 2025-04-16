import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota proxy para busca de produtos no True Core
 * GET /api/products
 */
export async function GET(request: NextRequest) {
  return TrueCore.handleProducts(request);
}

/**
 * Rota proxy para criação de produtos no True Core
 * POST /api/products
 */
export async function POST(request: NextRequest) {
  return TrueCore.handleRequest(request, '/marketing/products');
} 