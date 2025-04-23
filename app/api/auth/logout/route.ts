import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Função auxiliar que limpa todos os cookies e prepara a resposta de redirecionamento
 */
async function handleLogout() {
  // Criar resposta com redirecionamento para a página de login
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_WEB_ADDRESS || 'http://localhost:3000'), {
    // Status 307 garante que o método da requisição seja preservado
    status: 307
  });
  
  // Limpar o cookie principal de autenticação na resposta
  response.cookies.delete('true_core_token');
  response.cookies.delete('user_session');
  response.cookies.delete('auth_state');
  
  // Tentativa explícita de definir os cookies como expirados
  response.cookies.set('true_core_token', '', { expires: new Date(0) });
  response.cookies.set('user_session', '', { expires: new Date(0) });
  response.cookies.set('auth_state', '', { expires: new Date(0) });
  
  // Adicionar headers para garantir que nada seja cacheado
  response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * Rota de API para realizar o logout do usuário - Método POST
 * Permite solicitações POST para o logout
 */
export async function POST() {
  return handleLogout();
}

/**
 * Rota de API para realizar o logout do usuário - Método GET
 * Permite que o iframe ou links diretos possam fazer logout via GET
 */
export async function GET() {
  return handleLogout();
} 