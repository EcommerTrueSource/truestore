import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Endpoint para buscar detalhes de um pedido específico
 * GET /api/orders/[orderId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[Order Details API] Buscando detalhes do pedido: ${orderId}`);
    
    // Obter token de autenticação
    const token = TrueCore.extractToken(request);
    if (!token) {
      console.error('[Order Details API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[Order Details API] URL da API True Core não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Buscar o pedido na API True Core
    const orderEndpoint = `/marketing/orders/${orderId}`;
    const orderUrl = `${baseUrl}${orderEndpoint}`;
    
    console.log(`[Order Details API] URL de busca do pedido: ${orderUrl}`);
    
    const orderResponse = await fetch(orderUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!orderResponse.ok) {
      console.error(`[Order Details API] Erro ao buscar pedido: ${orderResponse.status}`);
      
      let errorMessage = `Erro ao buscar detalhes do pedido: ${orderResponse.status}`;
      try {
        const errorText = await orderResponse.text();
        console.error(`[Order Details API] Detalhes do erro: ${errorText.substring(0, 200)}`);
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // Não é JSON válido, usar o texto como está
        }
      } catch (e) {
        console.error('[Order Details API] Erro ao processar resposta de erro:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: orderResponse.status }
      );
    }
    
    // Processar o pedido
    const orderData = await orderResponse.json();
    console.log(`[Order Details API] Pedido encontrado com ID: ${orderData.id}`);
    
    // Filtrar dados sensíveis antes de retornar
    if (orderData.__customer__) {
      // Manter apenas informações não sensíveis do cliente
      orderData.__customer__ = {
        id: orderData.__customer__.id,
        name: orderData.__customer__.name,
        email: orderData.__customer__.email,
        // Podemos adicionar mais campos conforme necessário, mas evitando dados sensíveis
      };
    }
    
    return NextResponse.json({
      success: true,
      order: orderData
    });
    
  } catch (error) {
    console.error('[Order Details API] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar detalhes do pedido' },
      { status: 500 }
    );
  }
} 