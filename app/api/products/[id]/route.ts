import { createApiRouteHandler } from '@/lib/api-route-handler';

// Configurar o handler para o endpoint de produtos por ID
export const GET = createApiRouteHandler('/products/:id');
export const PUT = createApiRouteHandler('/products/:id');
export const DELETE = createApiRouteHandler('/products/:id'); 