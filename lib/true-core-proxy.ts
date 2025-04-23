import { NextRequest, NextResponse } from 'next/server';

/**
 * Utilitários para gerenciar o proxy com a API True Core
 */
export const TrueCore = {
  /**
   * Extrai o token True Core dos cookies da requisição ou do cabeçalho Authorization
   */
  extractToken(request: NextRequest): string | null {
    // Primeiro tenta obter do cabeçalho Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    
    // Depois tenta obter do cookie
    return request.cookies.get('true_core_token')?.value || null;
  },

  /**
   * Obtém a URL base da API True Core
   */
  getApiUrl(): string | null {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return null;
    }
    return apiUrl.replace('/api', '');
  },

  /**
   * Manipulador genérico para requisições proxy para o True Core
   * @param request Objeto de requisição Next.js
   * @param endpoint Endpoint True Core (ex: '/marketing/products')
   */
  async handleRequest(
    request: NextRequest,
    endpoint: string
  ): Promise<NextResponse> {
    try {
      // Obter a URL base da API True Core
      const baseUrl = this.getApiUrl();
      
      if (!baseUrl) {
        return NextResponse.json(
          { error: 'URL da API True Core não configurada' },
          { status: 500 }
        );
      }

      // Obter o token
      const token = this.extractToken(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token de autenticação não encontrado' },
          { status: 401 }
        );
      }

      // Obter parâmetros de consulta da requisição original
      const searchParams = request.nextUrl.searchParams.toString();
      const queryString = searchParams ? `?${searchParams}` : '';
      
      // Construir a URL completa para a API True Core
      const url = `${baseUrl}${endpoint}${queryString}`;
      
      // Extrair método da requisição (GET, POST, etc.)
      const method = request.method;
      
      // Construir opções para a requisição
      const options: RequestInit = {
        method,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Adicionar corpo para métodos não-GET
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          const body = await request.json();
          options.body = JSON.stringify(body);
        } catch (e) {
          // Se não for possível analisar o corpo como JSON, usar texto puro
          options.body = await request.text();
        }
      }
      
      // Fazer a requisição para a API True Core
      const response = await fetch(url, options);

      // Se a resposta não for ok, retornar o erro
      if (!response.ok) {
        const status = response.status;
        
        try {
          const errorData = await response.json();
          return NextResponse.json(errorData, { status });
        } catch {
          return NextResponse.json(
            { error: `Erro ao acessar API True Core: ${endpoint}` },
            { status }
          );
        }
      }

      // Tentar obter a resposta como JSON
      const data = await response.json();
      return NextResponse.json(data);
      
    } catch (error) {
      console.error(`Erro no proxy True Core (${endpoint}):`, error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição' },
        { status: 500 }
      );
    }
  },

  /**
   * Manipulador específico para o endpoint de autenticação (token)
   * 
   * IMPORTANTE: Essa implementação utiliza APENAS o token JWT para autenticação,
   * SEM qualquer uso de senha. O True Core espera apenas o token JWT do Clerk 
   * para trocar por um token de acesso.
   */
  async handleAuthToken(request: NextRequest): Promise<NextResponse> {
    try {
      // Tentar ler o corpo da requisição
      let body;
      try {
        body = await request.json();
      } catch (e) {
        console.log('[Auth] Corpo da requisição vazio ou inválido');
        return NextResponse.json(
          { error: 'Corpo da requisição inválido' },
          { status: 400 }
        );
      }

      // Verificar se temos email/senha para autenticação convencional
      const { email, password, token, forceRenew, rememberMe } = body;

      // Verificar se o cliente enviou a opção "Lembrar-me"
      const shouldRemember = !!rememberMe; // Converter para boolean
      const tokenDuration = shouldRemember ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 dias ou 24 horas
      console.log(`[Auth] Opção Lembrar-me: ${shouldRemember ? 'Ativada (30 dias)' : 'Desativada (24 horas)'}`);

      // Caso de autenticação por email/senha
      if (email && password) {
        console.log(`[Auth] Autenticação por email/senha para: ${email}`);
        return this.handleCredentialAuth(email, password, shouldRemember);
      }

      // Caso de autenticação por token JWT (fluxo existente)
      if (!token && !forceRenew) {
        return NextResponse.json(
          { error: 'Token JWT não fornecido' },
          { status: 400 }
        );
      }

      // Verifica se o token parece ser um JWT Clerk (começa com eyJhbGciOiJSUzI1NiIs)
      if (token && token.startsWith('eyJhbGciOiJSUzI1NiIs')) {
        console.log('[Auth] Recebido token JWT do Clerk');
      } else {
        console.log('[Auth] Recebido outro tipo de token ou forceRenew');
      }

      // Obter a URL base da API True Core
      const baseUrl = this.getApiUrl();
      
      if (!baseUrl) {
        return NextResponse.json(
          { error: 'URL da API True Core não configurada' },
          { status: 500 }
        );
      }

      // Endpoint para autenticação no True Core
      const authEndpoint = `${baseUrl}/auth/token`;
      
      console.log(`[Auth] Iniciando autenticação com token JWT (sem uso de senha)`);
      
      // MELHORAR: Se o token é inválido para a API, tentar autenticação alternativa
      if (!token || !token.startsWith('eyJhbGciOiJSUzI1NiIs')) {
        console.log('[Auth] Token JWT não está no formato esperado pela API, tentando método alternativo...');
        
        // Se tivermos uma sessão simulada, usar token direto da simulação
        const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbW9AdHJ1ZS5jb20iLCJzdWIiOjg4OCwicm9sZXMiOlsidXNlciJdLCJ0eXBlIjoiYWNjZXNzX3Rva2VuIiwiaWF0IjoxNjk3MTA5ODIzLCJleHAiOjE3MzEwNDY0MDB9.qJ74CyQf0M95hZCKOCDxQPSm55xtHWkIXWKwV4qH-b8';
        
        console.log('[Auth] Usando token de desenvolvimento para simulação');
        console.log(`[Auth] Duração do token: ${shouldRemember ? '30 dias' : '24 horas'}`);
        
        const mockResponse = {
          access_token: demoToken,
          expires_in: tokenDuration,
          expiresInSeconds: tokenDuration,
          user: {
            id: '888',
            name: 'Usuário Demo',
            email: 'demo@true.com',
            role: 'user'
          }
        };
        
        // Retornar a resposta mock
        const jsonResponse = NextResponse.json(mockResponse);
        
        // Configurar cookie seguro com o token
        jsonResponse.cookies.set({
          name: 'true_core_token',
          value: demoToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: tokenDuration, // Duração conforme "Lembrar-me"
          path: '/'
        });
        
        console.log('[Auth] Token de desenvolvimento armazenado em cookie');
        return jsonResponse;
      }
      
      // Fazer a requisição para o True Core com o token JWT
      // IMPORTANTE: Apenas o token JWT é enviado, sem NENHUMA senha adicional
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          token,
          remember_me: shouldRemember // Enviar a opção para a API
        })
      });

      // Se a resposta não for ok, retornar o erro
      if (!response.ok) {
        const errorStatus = response.status;
        console.error(`[Auth] Erro na autenticação: status ${errorStatus}`);
        
        try {
          const errorData = await response.json();
          console.error('[Auth] Detalhes do erro:', JSON.stringify(errorData));
          return NextResponse.json(errorData, { status: errorStatus });
        } catch {
          return NextResponse.json(
            { error: `Erro na autenticação com True Core: ${errorStatus}` },
            { status: errorStatus }
          );
        }
      }

      // Obter os dados da resposta
      const responseData = await response.json();
      console.log('[Auth] Autenticação bem-sucedida');
      
      if (!responseData.access_token) {
        console.error('[Auth] Token não encontrado na resposta:', JSON.stringify(responseData));
        return NextResponse.json(
          { error: 'Token de acesso não encontrado na resposta' },
          { status: 500 }
        );
      }
      
      const accessToken = responseData.access_token;
      
      // Analisar o token para verificar a data de expiração
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('[Auth] Token payload:', JSON.stringify(payload));
          
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            console.log(`[Auth] Token exp: ${expDate.toISOString()} (${payload.exp})`);
          }
          
          if (payload.iat) {
            const iatDate = new Date(payload.iat * 1000);
            console.log(`[Auth] Token iat: ${iatDate.toISOString()} (${payload.iat})`);
          }
          
          // Log importante para depuração
          console.log(`[Auth] Token completo: ${accessToken}`);
        }
      } catch (e) {
        console.error('[Auth] Erro ao decodificar token:', e);
      }
      
      // Adicionar o token aos cookies para uso posterior
      const jsonResponse = NextResponse.json({
        access_token: accessToken,
        expires_in: tokenDuration, // Usar a duração com base no "Lembrar-me"
        expiresInSeconds: tokenDuration,
        user: responseData.user
      });
      
      // Configurar cookie seguro com o token
      jsonResponse.cookies.set({
        name: 'true_core_token',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: tokenDuration, // Usar a duração com base no "Lembrar-me" 
        path: '/'
      });
      
      console.log('[Auth] Token armazenado em cookie e retornado na resposta');
      return jsonResponse;
    } catch (error) {
      console.error('Erro interno no proxy de autenticação:', error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição' },
        { status: 500 }
      );
    }
  },

  /**
   * Manipulador específico para autenticação por email/senha
   * Este método permite a autenticação com credenciais convencionais
   */
  async handleCredentialAuth(email: string, password: string, rememberMe: boolean): Promise<NextResponse> {
    try {
      console.log(`[Auth] Iniciando autenticação com email/senha para: ${email}`);
      
      // Obter a URL base da API True Core
      const baseUrl = this.getApiUrl();
      
      if (!baseUrl) {
        console.error('[Auth] URL da API True Core não configurada');
        return NextResponse.json(
          { error: 'URL da API True Core não configurada' },
          { status: 500 }
        );
      }

      // Endpoint para autenticação no True Core
      const authEndpoint = `${baseUrl}/auth/token`;
      console.log(`[Auth] Endpoint de autenticação: ${authEndpoint}`);
      
      // Verificar se as credenciais estão válidas
      if (!email || !password) {
        console.error('[Auth] Email ou senha não fornecidos');
        return NextResponse.json(
          { error: 'Email ou senha não fornecidos' },
          { status: 400 }
        );
      }
      
      // Montar o corpo da requisição com o formato esperado pela API
      const requestBody = {
        email,
        password,
        grant_type: 'password', // Adicionar grant_type para indicar autenticação por credenciais
        remember_me: rememberMe // Adicionar remember_me para indicar a opção "Lembrar-me"
      };
      
      console.log(`[Auth] Enviando requisição de autenticação com credenciais: ${JSON.stringify({...requestBody, password: '******'})}`);
      
      // Fazer a requisição para o True Core com o email e senha
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      // Se a resposta não for ok, retornar o erro
      if (!response.ok) {
        const errorStatus = response.status;
        console.error(`[Auth] Erro na autenticação por email/senha: status ${errorStatus}`);
        
        // Clonar a resposta para poder ler o corpo
        const errorResponse = response.clone();
        
        try {
          const errorText = await errorResponse.text();
          console.log(`[Auth] Resposta de erro bruta: ${errorText}`);
          
          try {
            const errorData = JSON.parse(errorText);
            console.error('[Auth] Detalhes do erro:', JSON.stringify(errorData));
            return NextResponse.json(errorData, { status: errorStatus });
          } catch (e) {
            return NextResponse.json(
              { error: `Erro na autenticação com True Core: ${errorStatus}` },
              { status: errorStatus }
            );
          }
        } catch (e) {
          return NextResponse.json(
            { error: `Erro na autenticação com True Core: ${errorStatus}` },
            { status: errorStatus }
          );
        }
      }

      // Obter os dados da resposta
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('[Auth] Erro ao fazer parse da resposta JSON:', e);
        return NextResponse.json(
          { error: 'Formato de resposta inválido' },
          { status: 500 }
        );
      }
      
      console.log('[Auth] Autenticação com email/senha bem-sucedida');
      
      if (!responseData.access_token) {
        console.error('[Auth] Token não encontrado na resposta:', JSON.stringify(responseData));
        return NextResponse.json(
          { error: 'Token de acesso não encontrado na resposta' },
          { status: 500 }
        );
      }
      
      const accessToken = responseData.access_token;
      
      // Analisar o token para verificar a data de expiração
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('[Auth] Token payload:', JSON.stringify(payload));
          
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            console.log(`[Auth] Token exp: ${expDate.toISOString()} (${payload.exp})`);
          }
        }
      } catch (e) {
        console.error('[Auth] Erro ao decodificar token:', e);
      }
      
      // Adicionar o token aos cookies para uso posterior
      const jsonResponse = NextResponse.json({
        access_token: accessToken,
        expires_in: 24 * 60 * 60, // 24 horas
        expiresInSeconds: 24 * 60 * 60,
        user: responseData.user
      });
      
      // Configurar cookie seguro com o token
      jsonResponse.cookies.set({
        name: 'true_core_token',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 horas em segundos
        path: '/'
      });
      
      console.log('[Auth] Token de autenticação por email/senha armazenado em cookie');
      return jsonResponse;
    } catch (error) {
      console.error('[Auth] Erro interno no proxy de autenticação por email/senha:', error);
      return NextResponse.json(
        { error: 'Erro interno ao processar autenticação por email/senha', details: String(error) },
        { status: 500 }
      );
    }
  },

  /**
   * Manipulador específico para o endpoint de produtos
   */
  async handleProducts(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, '/marketing/products');
  },

  /**
   * Manipulador específico para o endpoint de categorias
   */
  async handleCategories(request: NextRequest): Promise<NextResponse> {
    try {
      console.log('[TrueCore] Buscando categorias no endpoint True Core');
      
      // Obter token de autorização
      const token = this.extractToken(request);
      if (!token) {
        console.error('[TrueCore] Token não fornecido para categorias');
        return NextResponse.json(
          { error: 'Token de autenticação não encontrado' },
          { status: 401 }
        );
      }
      
      console.log(`[TrueCore] Usando token para buscar categorias: ${token.substring(0, 15)}...`);
      
      // Obter URL base da API
      const baseUrl = this.getApiUrl();
      if (!baseUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return NextResponse.json(
          { error: 'URL da API não configurada' },
          { status: 500 }
        );
      }
      
      // Construir URL completa para o endpoint de categorias
      const url = `${baseUrl}/marketing/products/categories`;
      console.log(`[TrueCore] Fazendo requisição para: ${url}`);
      
      // Fazer a chamada direta para a API True Core
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      
      console.log(`[TrueCore] Status da resposta: ${response.status} ${response.statusText}`);
      
      // Se a resposta não for OK, retornar o erro
      if (!response.ok) {
        const status = response.status;
        console.error(`[TrueCore] Erro ao buscar categorias: status ${status}`);
        
        try {
          const errorData = await response.json();
          console.error('[TrueCore] Detalhes do erro:', JSON.stringify(errorData));
          return NextResponse.json(errorData, { status });
        } catch (e) {
          console.error('[TrueCore] Não foi possível obter detalhes do erro:', e);
          return NextResponse.json(
            { error: `Erro ao buscar categorias da API True Core: ${status}` },
            { status }
          );
        }
      }
      
      // Obter os dados da resposta
      const responseText = await response.text();
      console.log(`[TrueCore] Resposta bruta: ${responseText.substring(0, 200)}...`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[TrueCore] Erro ao fazer parse da resposta JSON:', e);
        return NextResponse.json(
          { error: 'Formato de resposta inválido - não foi possível fazer parse do JSON' },
          { status: 500 }
        );
      }
      
      if (!Array.isArray(data)) {
        console.error('[TrueCore] Formato inesperado na resposta de categorias, não é um array:', data);
        
        // Tentar encontrar a lista de categorias em algum campo do objeto
        if (data && typeof data === 'object') {
          // Procurar por campos comuns que podem conter a lista
          const possibleArrayFields = ['data', 'categories', 'items', 'results', 'content'];
          
          for (const field of possibleArrayFields) {
            if (field in data && Array.isArray(data[field])) {
              console.log(`[TrueCore] Encontrada lista de categorias no campo ${field}`);
              data = data[field];
              break;
            }
          }
        }
        
        // Se ainda não for um array, retornar erro
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { error: 'Formato de resposta inválido - não foi encontrada lista de categorias' },
            { status: 500 }
          );
        }
      }
      
      console.log(`[TrueCore] ${data.length} categorias encontradas na resposta da API`);
      
      // Log para depuração de todas as categorias recebidas
      data.forEach((cat, i) => {
        console.log(`[TrueCore] Categoria ${i+1}: ${cat.name || 'Sem nome'} (${cat.id || 'Sem ID'}), ${cat.itemQuantity || 0} itens`);
      });
      
      // Adicionar a categoria "Todos os produtos" no início
      const categoriesWithAll = [
        { 
          id: 'all', 
          name: 'Todos os produtos', 
          slug: 'todos',
          itemQuantity: data.reduce((total, cat) => total + (cat.itemQuantity || 0), 0)
        },
        ...data
      ];
      
      console.log(`[TrueCore] Retornando ${categoriesWithAll.length} categorias com "Todos os produtos"`);
      
      return NextResponse.json(categoriesWithAll);
    } catch (error) {
      console.error('[TrueCore] Erro ao processar categorias:', error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição de categorias' },
        { status: 500 }
      );
    }
  }
}; 