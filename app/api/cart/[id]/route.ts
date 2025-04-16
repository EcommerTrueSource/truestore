import { createApiRouteHandler } from '@/lib/api-route-handler';

// Configurar o handler para o endpoint de itens do carrinho por ID
export const GET = createApiRouteHandler('/cart/:id');
export const PUT = createApiRouteHandler('/cart/:id');
export const DELETE = createApiRouteHandler('/cart/:id'); 