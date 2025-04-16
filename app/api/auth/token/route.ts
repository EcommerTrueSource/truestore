import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota proxy para autenticação com o True Core
 * POST /api/auth/token
 */
export async function POST(request: NextRequest) {
  return TrueCore.handleAuthToken(request);
} 