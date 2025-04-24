import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota unificada para clientes
 * 
 * Este arquivo serve como ponto de entrada principal para todas as requisições relacionadas a clientes.
 * Ele utiliza o TrueCore.handleRequest para implementar a lógica de proxy.
 * 
 * Endpoint público: /api/customers
 * Endpoint interno: /marketing/customers
 */
export async function GET(request: NextRequest) {
  return TrueCore.handleRequest(request, '/marketing/customers');
}

/**
 * POST /api/customers - Cria um novo cliente
 */
export async function POST(request: NextRequest) {
  return TrueCore.handleRequest(request, '/marketing/customers');
} 