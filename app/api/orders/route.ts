import { NextRequest, NextResponse } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

export async function POST(request: NextRequest) {
  try {
    console.log('[Orders API] Iniciando processamento de novo pedido');
    
    // Obter token de autenticação
    const token = TrueCore.extractToken(request);
    if (!token) {
      console.error('[Orders API] Token de autenticação não encontrado');
      return NextResponse.json(
        { error: 'Token de autenticação não encontrado' },
        { status: 401 }
      );
    }

    // Obter dados do corpo da requisição
    const checkoutData = await request.json();
    console.log('[Orders API] Dados recebidos do checkout:', JSON.stringify(checkoutData));
    
    // Obter cliente pelo ID do Clerk
    const clerkId = checkoutData.clerkId;
    if (!clerkId) {
      console.error('[Orders API] ID do Clerk não fornecido');
      return NextResponse.json(
        { error: 'ID do Clerk não fornecido' },
        { status: 400 }
      );
    }
    
    // Buscar dados do cliente diretamente da API True Core
    console.log(`[Orders API] Buscando dados do cliente com Clerk ID: ${clerkId}`);
    
    // Obter a URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      console.error('[Orders API] URL da API True Core não configurada');
      return NextResponse.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }

    // Construir a URL completa para a API True Core
    const customerEndpoint = `/marketing/customers/byClerkId/${clerkId}`;
    const customerUrl = `${baseUrl}${customerEndpoint}`;
    
    console.log(`[Orders API] URL da API True Core: ${customerUrl}`);
    
    // Fazer a requisição diretamente para a API True Core
    const customerResponse = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!customerResponse.ok) {
      console.error(`[Orders API] Erro ao obter dados do cliente: ${customerResponse.status}`);
      return NextResponse.json(
        { error: 'Erro ao obter dados do cliente na API externa' },
        { status: 500 }
      );
    }
    
    // Extrair os dados do cliente da resposta
    try {
      const customerResponseData = await customerResponse.json();
      const customer = customerResponseData;
      console.log('[Orders API] Dados do cliente obtidos:', JSON.stringify(customer));
      
      // Determinar o tipo de cliente (Creator ou Top Master)
      let operation = "Top Master";
      let warehouse = "MKT-Top Master";
      
      if (customer.__category__?.name.includes('Creator') || 
          customer.category?.name?.includes('Creator') ||
          customer.__category__?.name.includes('Atleta') || 
          customer.category?.name?.includes('Atleta')) {
        operation = "Creator";
        warehouse = "MKT-Creator";
      }
      
      // Ensure we have a warehouse from API response if available
      if (customer.__warehouse__) {
        warehouse = customer.__warehouse__;
      }
      
      // Formatar endereço como string única
      const address = checkoutData.delivery;
      const formattedAddress = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.zipCode}${address.complement ? `, ${address.complement}` : ''}`;
      console.log('[Orders API] Endereço formatado:', formattedAddress);
      
      // Formatar itens do pedido
      const formattedItems = checkoutData.items.map((item: { id: string; quantity: number; price: number }) => ({
        productId: item.id,
        quantity: item.quantity,
        price: parseFloat(item.price.toString())
      }));
      
      // Construir corpo da requisição para True Core
      const orderData = {
        customerId: customer.id,
        type: "simples",
        operation: operation,
        total: checkoutData.payment.subtotal,
        shippingCost: 0,
        discount: checkoutData.payment.voucherUsed,
        status: "PENDING",
        notes: checkoutData.observations || "",
        items: formattedItems,
        paymentMethod: checkoutData.payment.finalTotal > 0 ? "credit_card" : "voucher",
        shippingAddress: formattedAddress,
        shippingCarrier: "Total Express",
        nome_deposito: warehouse
      };
      
      console.log('[Orders API] Dados do pedido formatados:', JSON.stringify(orderData));
      
      // Enviar para a API True Core
      const orderEndpoint = `${baseUrl}/marketing/orders`;
      console.log(`[Orders API] Enviando pedido para: ${orderEndpoint}`);
      
      const response = await fetch(orderEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      // Retorna a resposta da API
      if (!response.ok) {
        console.error(`[Orders API] Erro ao criar pedido: ${response.status}`);
        try {
          const errorText = await response.text();
          console.error('[Orders API] Resposta de erro bruta:', errorText.substring(0, 500));
          
          try {
            const errorData = JSON.parse(errorText);
            console.error('[Orders API] Detalhes do erro:', JSON.stringify(errorData));
            return NextResponse.json(
              { error: 'Erro ao criar pedido', details: errorData },
              { status: response.status }
            );
          } catch (e) {
            return NextResponse.json(
              { error: 'Erro ao criar pedido', details: errorText.substring(0, 200) },
              { status: response.status }
            );
          }
        } catch (e) {
          return NextResponse.json(
            { error: 'Erro ao criar pedido' },
            { status: response.status }
          );
        }
      }
      
      try {
        const orderResponseData = await response.json();
        console.log('[Orders API] Pedido criado com sucesso:', JSON.stringify(orderResponseData));
        return NextResponse.json(orderResponseData);
      } catch (jsonError) {
        const textResponse = await response.text();
        console.log('[Orders API] Resposta texto (não JSON):', textResponse.substring(0, 500));
        return NextResponse.json({
          success: true,
          message: 'Pedido criado com sucesso'
        });
      }
      
    } catch (parseError) {
      console.error('[Orders API] Erro ao processar resposta do cliente:', parseError);
      return NextResponse.json(
        { error: 'Erro ao processar dados do cliente' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Orders API] Erro ao processar pedido:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar pedido' },
      { status: 500 }
    );
  }
} 