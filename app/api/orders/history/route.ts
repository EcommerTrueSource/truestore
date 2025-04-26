import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Endpoint para buscar o histórico de pedidos do cliente autenticado
 * GET /api/orders/history
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Orders History API] Iniciando busca de histórico de pedidos');
    
    // Obter token de autenticação
    const token = TrueCore.extractToken(request);
    if (!token) {
      console.error('[Orders History API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Extrair o clerkId do token JWT para identificar o cliente
    const clerkId = await TrueCore.extractClerkIdFromToken(token);
    
    if (!clerkId) {
      console.error('[Orders History API] Não foi possível extrair o clerkId do token');
      return NextResponse.json(
        { error: 'Usuário não identificado' },
        { status: 400 }
      );
    }

    console.log(`[Orders History API] Busca para clerkId: ${clerkId}`);
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[Orders History API] URL da API True Core não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Primeiro, buscar o ID interno do cliente baseado no clerkId
    console.log(`[Orders History API] Buscando dados do cliente com Clerk ID: ${clerkId}`);
    const customerEndpoint = `/marketing/customers/byClerkId/${clerkId}`;
    const customerUrl = `${baseUrl}${customerEndpoint}`;
    
    // Fazer a requisição para a API True Core
    const customerResponse = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!customerResponse.ok) {
      console.error(`[Orders History API] Erro ao obter dados do cliente: ${customerResponse.status}`);
      return NextResponse.json(
        { error: 'Erro ao obter dados do cliente na API externa' },
        { status: customerResponse.status }
      );
    }
    
    // Extrair os dados do cliente da resposta
    const customerData = await customerResponse.json();
    const customerId = customerData.id;
    
    if (!customerId) {
      console.error('[Orders History API] ID do cliente não encontrado na resposta');
      return NextResponse.json(
        { error: 'Cliente não encontrado ou sem ID válido' },
        { status: 404 }
      );
    }
    
    console.log(`[Orders History API] ID do cliente encontrado: ${customerId}`);
    
    // Agora, buscar os pedidos do cliente
    const ordersEndpoint = `/marketing/orders/customer/${customerId}`;
    const ordersUrl = `${baseUrl}${ordersEndpoint}`;
    
    console.log(`[Orders History API] Buscando pedidos na URL: ${ordersUrl}`);
    
    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!ordersResponse.ok) {
      console.error(`[Orders History API] Erro ao buscar pedidos: ${ordersResponse.status}`);
      return NextResponse.json(
        { error: 'Erro ao buscar histórico de pedidos' },
        { status: ordersResponse.status }
      );
    }
    
    // Processar e retornar os dados dos pedidos
    const ordersData = await ordersResponse.json();
    console.log(`[Orders History API] Encontrados ${ordersData.length} pedidos para o cliente ${customerId}`);
    
    return NextResponse.json({
      success: true,
      orders: ordersData
    });
    
  } catch (error) {
    console.error('[Orders History API] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar histórico de pedidos' },
      { status: 500 }
    );
  }
} 