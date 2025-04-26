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
      let operation = "top_master";
      let warehouse = "MKT-Top Master";
      
      if (customer.__category__?.name.includes('Creator') || 
          customer.category?.name?.includes('Creator') ||
          customer.__category__?.name.includes('Atleta') || 
          customer.category?.name?.includes('Atleta')) {
        operation = "creator";
        warehouse = "MKT-Creator";
      }
      
      // Ensure we have a warehouse from API response if available
      if (customer.__warehouse__) {
        warehouse = customer.__warehouse__;
      }

      // Obter limites do cliente antes de processar o pedido
      console.log(`[Orders API] Verificando limites para o cliente ID: ${customer.id}`);
      const limitsEndpoint = `${baseUrl}/marketing/customers/${customer.id}/order-limits`;
      const limitsResponse = await fetch(limitsEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!limitsResponse.ok) {
        console.error(`[Orders API] Erro ao obter limites do cliente: ${limitsResponse.status}`);
        return NextResponse.json(
          { error: 'Não foi possível verificar os limites disponíveis para este cliente' },
          { status: 500 }
        );
      }

      const limitsData = await limitsResponse.json();
      console.log('[Orders API] Limites do cliente:', JSON.stringify(limitsData));

      // Verificar se o cliente tem limite de frequência disponível
      if (limitsData.limits?.frequencyPerMonth?.hasLimit && 
          limitsData.limits.frequencyPerMonth.remaining <= 0) {
        console.error('[Orders API] Cliente atingiu o limite de pedidos para o período');
        return NextResponse.json({
          error: 'Limite de pedidos atingido',
          details: {
            message: `Você atingiu o limite de ${limitsData.limits.frequencyPerMonth.limit} pedidos para o período atual.`,
            period: limitsData.limits.frequencyPerMonth.period,
            limit: limitsData.limits.frequencyPerMonth.limit,
            used: limitsData.limits.frequencyPerMonth.used
          }
        }, { status: 400 });
      }

      // Verificar se o cliente tem saldo disponível
      const subtotal = parseFloat(checkoutData.payment.subtotal);
      if (limitsData.limits?.ticketValue?.hasLimit) {
        const remaining = parseFloat(limitsData.limits.ticketValue.remaining);
        
        if (remaining <= 0) {
          console.error('[Orders API] Cliente não tem saldo disponível');
          return NextResponse.json({
            error: 'Saldo insuficiente',
            details: {
              message: 'Você não possui saldo disponível para realizar este pedido.',
              period: limitsData.limits.ticketValue.period,
              limit: limitsData.limits.ticketValue.limit,
              used: limitsData.limits.ticketValue.used,
              remaining: limitsData.limits.ticketValue.remaining
            }
          }, { status: 400 });
        }
        
        if (subtotal > remaining) {
          console.error(`[Orders API] Valor do pedido (${subtotal}) excede o saldo disponível (${remaining})`);
          return NextResponse.json({
            error: 'Saldo insuficiente',
            details: {
              message: `O valor do pedido (R$ ${subtotal.toFixed(2)}) excede seu saldo disponível (R$ ${remaining.toFixed(2)}).`,
              period: limitsData.limits.ticketValue.period,
              limit: limitsData.limits.ticketValue.limit,
              used: limitsData.limits.ticketValue.used,
              remaining: limitsData.limits.ticketValue.remaining
            }
          }, { status: 400 });
        }
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
        paymentMethod: "pix",
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
            
            // Melhorar mensagens de erro com base no código/mensagem retornado
            let userFriendlyError = 'Erro ao criar pedido';
            let errorDetails = errorData;
            
            // Verificar se temos mensagens de erro específicas
            if (errorData.message && Array.isArray(errorData.message)) {
              // Formatar as mensagens para o usuário final
              const friendlyMessages = errorData.message.map((msg: string) => {
                if (msg.includes('operation must be one of')) {
                  return 'Tipo de operação inválido. Por favor, contate o suporte.';
                }
                if (msg.includes('paymentMethod must be one of')) {
                  return 'Método de pagamento inválido. Por favor, contate o suporte.';
                }
                return msg;
              });
              
              errorDetails = {
                ...errorData,
                friendlyMessage: friendlyMessages.join(' '),
              };
            }
            
            return NextResponse.json(
              { error: userFriendlyError, details: errorDetails },
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
        return NextResponse.json({
          ...orderResponseData,
          success: true,
          message: 'Pedido criado com sucesso'
        });
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