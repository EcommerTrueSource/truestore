import { createApiRouteHandler } from '@/lib/api-route-handler';

/**
 * Rotas para operações em produtos específicos por ID
 * 
 * Estas rotas servem como pontos de entrada para operações em produtos individuais.
 * Utilizam o handler genérico que encaminha as requisições para a API True Core,
 * substituindo o parâmetro :id pelo ID real do produto fornecido na URL.
 * 
 * Endpoint público: /api/products/[id]
 * Endpoint interno: /products/:id
 * 
 * GET - Obtém detalhes de um produto específico
 * PUT - Atualiza um produto existente
 * DELETE - Remove um produto
 */
export const GET = createApiRouteHandler('/products/:id');
export const PUT = createApiRouteHandler('/products/:id');
export const DELETE = createApiRouteHandler('/products/:id'); 