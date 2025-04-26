import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para obter os pedidos do cliente
 * 
 * Endpoint público: /api/orders/customer
 * Endpoint interno: /marketing/customers/clerk/{clerkId} -> /marketing/orders/customer/{customerId}
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[CustomerOrders API] Iniciando busca de pedidos do cliente');
    
    // Obter token de autenticação
    const token = TrueCore.extractToken(request);
    if (!token) {
      console.error('[CustomerOrders API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    if (!baseUrl) {
      console.error('[CustomerOrders API] URL da API True Core não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Obter o ID do Clerk do cabeçalho ou cookie
    const clerkIdFromHeader = request.headers.get('x-clerk-user-id');
    const searchParams = request.nextUrl.searchParams;
    const clerkIdFromParam = searchParams.get('clerkId');
    
    const clerkId = clerkIdFromHeader || clerkIdFromParam;
    
    if (!clerkId) {
      console.error('[CustomerOrders API] ID do Clerk não fornecido');
      return NextResponse.json(
        { error: 'ID do Clerk não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[CustomerOrders API] Buscando cliente com Clerk ID: ${clerkId}`);
    
    // Primeiro, obter o cliente pelo ID do Clerk
    const customerEndpoint = `/marketing/customers/byClerkId/${clerkId}`;
    const customerUrl = `${baseUrl}${customerEndpoint}`;
    
    // Fazer a requisição para obter o cliente
    const customerResponse = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!customerResponse.ok) {
      console.error(`[CustomerOrders API] Erro ao obter cliente: ${customerResponse.status}`);
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }
    
    // Extrair os dados do cliente da resposta
    const customer = await customerResponse.json();
    console.log(`[CustomerOrders API] Cliente encontrado com ID: ${customer.id}`);
    
    // Agora, obter os pedidos do cliente usando o ID do cliente
    const ordersEndpoint = `/marketing/orders/customer/${customer.id}`;
    const ordersUrl = `${baseUrl}${ordersEndpoint}`;
    
    console.log(`[CustomerOrders API] Buscando pedidos do cliente em: ${ordersUrl}`);
    
    // Fazer a requisição para obter os pedidos
    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!ordersResponse.ok) {
      console.error(`[CustomerOrders API] Erro ao obter pedidos: ${ordersResponse.status}`);
      return NextResponse.json(
        { error: 'Erro ao obter pedidos do cliente' },
        { status: 500 }
      );
    }
    
    // Extrair os pedidos da resposta
    const orders = await ordersResponse.json();
    console.log(`[CustomerOrders API] ${orders.length} pedidos encontrados`);
    
    // Retornar os pedidos como resposta
    return NextResponse.json(orders);
    
  } catch (error) {
    console.error('[CustomerOrders API] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição' },
      { status: 500 }
    );
  }
} 