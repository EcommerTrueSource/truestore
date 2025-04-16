import { NextRequest, NextResponse } from 'next/server';

/**
 * Rota para trocar um token JWT do Clerk por um token de API externa
 * POST /api/auth
 */
export async function POST(request: NextRequest) {
  try {
    // Obter o token JWT do Clerk do corpo da requisição
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token JWT não fornecido' },
        { status: 400 }
      );
    }

    // Obter a URL base da API externa
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('URL da API externa não configurada');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    // Remover o segmento /api da URL base
    const apiBaseUrl = apiUrl.replace('/api', '');
    
    // Log para debug
    console.log(`URL da API para troca de token: ${apiBaseUrl}/auth/token`);

    // Em ambiente de desenvolvimento, podemos retornar um token mockado
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_API === 'true') {
      console.log('Usando token mockado para desenvolvimento');
      return NextResponse.json({
        access_token: 'mock_access_token_for_development',
        expires_in: 86400, // 24 horas
        user: {
          id: '123',
          name: 'Usuário Teste',
          email: 'teste@example.com',
          role: 'user'
        }
      });
    }

    // Trocar o token JWT por um token de API
    const response = await fetch(`${apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      console.error(`Erro na troca de token: ${response.status}`);
      let errorMessage = 'Falha ao autenticar com API externa';
      
      try {
        const errorData = await response.json();
        console.error('Detalhes do erro:', errorData);
        if (errorData.error) errorMessage = errorData.error;
      } catch (e) {
        // Falha ao parsear erro como JSON
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const tokenData = await response.json();
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Erro ao processar requisição de token:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de token' },
      { status: 500 }
    );
  }
} 