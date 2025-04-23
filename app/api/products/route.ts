import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota unificada para produtos
 * 
 * Este arquivo serve como ponto de entrada principal para todas as requisições de produtos.
 * Ele utiliza o TrueCore.handleProducts que implementa a lógica complexa de proxy.
 * 
 * Endpoint público: /api/products
 * Endpoint interno: /marketing/products
 * 
 * GET /api/products - Lista todos os produtos com filtros opcionais
 */
export async function GET(request: NextRequest) {
  return TrueCore.handleProducts(request);
}

/**
 * POST /api/products - Cria um novo produto
 * 
 * Esta rota utiliza o manipulador genérico do TrueCore para encaminhar
 * a requisição para a API externa.
 */
export async function POST(request: NextRequest) {
  return TrueCore.handleRequest(request, '/marketing/products');
} 