import { createApiRouteHandler } from '@/lib/api-route-handler';

/**
 * Rota unificada para categorias
 * 
 * Este arquivo serve como ponto de entrada principal para todas as requisições de categorias.
 * Ele utiliza o handler genérico que encaminha as requisições para a API True Core.
 * A implementação detalhada da rota está em /api/marketing/products/categories
 * 
 * Endpoint público: /api/categories
 * Endpoint interno: /marketing/products/categories
 */
export const GET = createApiRouteHandler('/marketing/products/categories'); 