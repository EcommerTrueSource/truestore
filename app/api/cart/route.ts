import { createApiRouteHandler } from '@/lib/api-route-handler';

// Configurar o handler para o endpoint do carrinho
export const GET = createApiRouteHandler('/cart');
export const POST = createApiRouteHandler('/cart');
export const PUT = createApiRouteHandler('/cart');
export const DELETE = createApiRouteHandler('/cart'); 