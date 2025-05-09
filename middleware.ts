import { authMiddleware, redirectToSignIn } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login', '/sso-callback'];

// Rotas que devem ser lembradas quando o usuário atualiza a página
const preserveRoutes = ['/store', '/checkout', '/purchase-history', '/favorites', '/cart', '/order/', '/perfil'];

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
    
    // Criar cookie response para possíveis operações
    let response = NextResponse.next();
    
    // Se o usuário está autenticado e tentando acessar a página de login
    if (auth.userId && (path === '/login')) {
      // Verificar se há uma rota salva no cookie
      const lastRoute = req.cookies.get('lastRoute')?.value;
      
      if (lastRoute && !publicRoutes.includes(lastRoute)) {
        // Redirecionar para a última rota acessada
        const savedUrl = new URL(lastRoute, req.url);
        return NextResponse.redirect(savedUrl);
      } else {
        // Redirecionar para a página da loja se não houver rota salva
        const storeUrl = new URL('/store', req.url);
        return NextResponse.redirect(storeUrl);
      }
    }
    
    // Se o usuário não está autenticado e tentando acessar rotas protegidas
    if (!auth.userId && !publicRoutes.includes(path) && 
        !path.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      // Salvar a rota atual antes de redirecionar
      const shouldPreserve = preserveRoutes.some(route => path.startsWith(route));
      
      if (shouldPreserve) {
        // Criar uma resposta de redirecionamento para o login
        const loginUrl = new URL('/login', req.url);
        response = NextResponse.redirect(loginUrl);
        
        // Definir um cookie para lembrar da última rota acessada (válido por 30 minutos)
        response.cookies.set('lastRoute', path, { 
          maxAge: 60 * 30, // 30 minutos
          path: '/',
          httpOnly: true,
          sameSite: 'lax'
        });
        
        return response;
      }
      
      // Redirecionar para o login sem salvar a rota se não for uma rota a preservar
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Se for uma rota a ser preservada e o usuário está autenticado, salvar no cookie
    if (auth.userId) {
      const shouldPreserve = preserveRoutes.some(route => path.startsWith(route));
      
      if (shouldPreserve) {
        response.cookies.set('lastRoute', path, { 
          maxAge: 60 * 30, // 30 minutos 
          path: '/',
          httpOnly: true,
          sameSite: 'lax'
        });
      }
    }
    
    // Continuar com o comportamento padrão para outros casos
    return response;
  }
});

export const config = {
  // Configuração dos caminhos onde o middleware será executado
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
