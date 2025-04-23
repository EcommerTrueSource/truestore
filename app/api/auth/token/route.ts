import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota proxy para autenticação com o True Core
 * POST /api/auth/token
 */
export async function POST(request: NextRequest) {
  try {
    // Ler o corpo da requisição para debug
    const rawBody = await request.text();
    console.log('[API] Recebida requisição para /api/auth/token');
    console.log(`[API] Corpo da requisição: ${rawBody}`);
    
    // Tentar parsear como JSON
    let body;
    try {
      body = JSON.parse(rawBody);
      console.log(`[API] Corpo parseado: ${JSON.stringify({
        ...body,
        password: body.password ? '******' : undefined
      })}`);
    } catch (e) {
      console.error('[API] Erro ao parsear corpo da requisição:', e);
      body = {};
    }
    
    // Recriar a requisição com o corpo parseado
    const modifiedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
      redirect: request.redirect,
      signal: request.signal,
    });
    
    // Chamar o manipulador genérico
    return TrueCore.handleAuthToken(modifiedRequest);
  } catch (error) {
    console.error('[API] Erro ao processar requisição /api/auth/token:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar requisição de token' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 