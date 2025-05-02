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

    console.log('[Orders History API] Token obtido com sucesso');
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[Orders History API] URL da API True Core não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Etapa 1: Obter o ID do cliente do usuário autenticado
    // Extrair clerkId da sessão do Clerk
    let clerkId = null;
    
    // Obter da sessão do Clerk
    const sessionCookie = request.cookies.get('__session')?.value;
    
    if (sessionCookie) {
      try {
        // Decode session JWT payload
        const payload = JSON.parse(
          Buffer.from(sessionCookie.split('.')[1], 'base64').toString()
        );
        clerkId = payload.sub; // 'sub' contém o ID do usuário no Clerk
        console.log(`[Orders History API] ClerkId extraído do cookie de sessão: ${clerkId}`);
      } catch (error) {
        console.error('[Orders History API] Erro ao extrair clerkId do cookie:', error);
      }
    }
    
    if (!clerkId) {
      console.error('[Orders History API] Não foi possível obter o clerkId do usuário');
      return NextResponse.json(
        { error: 'Usuário não identificado. Faça login novamente.' },
        { status: 401 }
      );
    }
    
    // Etapa 2: Buscar os dados do cliente DIRETAMENTE da API True Core
    console.log(`[Orders History API] Buscando cliente diretamente da API True Core com clerkId: ${clerkId}`);
    
    const customerEndpoint = `/marketing/customers/byClerkId/${clerkId}`;
    const customerUrl = `${baseUrl}${customerEndpoint}`;
    
    console.log(`[Orders History API] URL de busca do cliente: ${customerUrl}`);
    
    const customerResponse = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`[Orders History API] Status da resposta cliente: ${customerResponse.status}`);
    
    if (!customerResponse.ok) {
      console.error(`[Orders History API] Erro ao buscar cliente: ${customerResponse.status}`);
      const errorText = await customerResponse.text();
      console.error(`[Orders History API] Detalhes do erro: ${errorText.substring(0, 200)}`);
      
      return NextResponse.json(
        { error: 'Erro ao buscar dados do cliente' },
        { status: customerResponse.status }
      );
    }
    
    // Extrair os dados do cliente
    const customerData = await customerResponse.json();
    
    if (!customerData.id) {
      console.error('[Orders History API] ID do cliente não encontrado na resposta');
      console.error(`[Orders History API] Resposta recebida: ${JSON.stringify(customerData).substring(0, 200)}`);
      return NextResponse.json(
        { error: 'Cliente não encontrado ou sem ID válido' },
        { status: 404 }
      );
    }
    
    const customerId = customerData.id;
    console.log(`[Orders History API] ID do cliente encontrado: ${customerId}`);
    
    // Etapa 3: Buscar os pedidos do cliente
    const ordersEndpoint = `/marketing/orders/customer/${customerId}`;
    const ordersUrl = `${baseUrl}${ordersEndpoint}`;
    
    console.log(`[Orders History API] Buscando pedidos em: ${ordersUrl}`);
    
    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`[Orders History API] Status da resposta de pedidos: ${ordersResponse.status}`);
    
    if (!ordersResponse.ok) {
      const status = ordersResponse.status;
      let errorMessage = `Erro ao buscar histórico de pedidos: ${status}`;
      
      try {
        const errorText = await ordersResponse.text();
        console.error(`[Orders History API] Erro ao buscar pedidos: ${status}`);
        console.error(`[Orders History API] Resposta: ${errorText.substring(0, 200)}`);
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // Não é JSON, usar texto bruto
        }
      } catch (e) {
        console.error('[Orders History API] Erro ao processar resposta de erro:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: ordersResponse.status }
      );
    }
    
    // Processar e retornar os dados dos pedidos
    const ordersData = await ordersResponse.json();
    console.log(`[Orders History API] Encontrados ${ordersData.length} pedidos para o cliente ${customerId}`);
    
    if (Array.isArray(ordersData)) {
      // Filtrar dados sensíveis dos pedidos antes de retornar
      const filteredOrders = ordersData.map(order => {
        // Se o pedido tem dados do cliente, filtrar apenas para manter dados não sensíveis
        if (order.__customer__) {
          order.__customer__ = {
            id: order.__customer__.id,
            name: order.__customer__.name,
            email: order.__customer__.email,
            // Remover dados sensíveis como endereço completo, documento, telefone, etc.
          };
        }
        return order;
      });
      
      console.log(`[Orders History API] Dados filtrados para remover informações sensíveis`);
      console.log(`[Orders History API] IDs dos pedidos: ${filteredOrders.map(o => o.id.substring(0, 8)).join(', ')}`);
      
      return NextResponse.json({
        success: true,
        orders: filteredOrders
      });
    } else {
      console.error('[Orders History API] Resposta de pedidos não é um array');
      return NextResponse.json({
        success: true,
        orders: []
      });
    }
    
  } catch (error) {
    console.error('[Orders History API] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar histórico de pedidos' },
      { status: 500 }
    );
  }
} 