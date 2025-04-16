import { authMiddleware, redirectToSignIn } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login', '/cadastro', '/sso-callback'];

export default authMiddleware({
  // Rotas que não requerem autenticação
  publicRoutes,
  // Ignorar rotas de API, arquivos estáticos e outros
  ignoredRoutes: ["/api/webhook", "/_next", "/favicon.ico", "/logo-true.svg", "/icons"],
  
  // Adicionar lógica de redirecionamento personalizada
  afterAuth(auth, req) {
    // Caminho atual da requisição
    const url = req.nextUrl;
    const path = url.pathname;
    
    // Se o usuário está autenticado e tentando acessar a página de login
    if (auth.userId && (path === '/login' || path === '/cadastro')) {
      // Redirecionar para a página da loja
      const storeUrl = new URL('/store', req.url);
      return NextResponse.redirect(storeUrl);
    }
    
    // Se o usuário não está autenticado e tentando acessar rotas protegidas
    if (!auth.userId && !publicRoutes.includes(path) && 
        !path.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      // Redirecionar para o login
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Continuar com o comportamento padrão para outros casos
    return NextResponse.next();
  }
});

export const config = {
  // Configuração dos caminhos onde o middleware será executado
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
