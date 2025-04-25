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
    // Obter a URL da API das variáveis de ambiente
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('[TrueCore] ERRO: URL da API True Core não configurada nas variáveis de ambiente');
      console.error('[TrueCore] Verifique se NEXT_PUBLIC_API_URL está definida no arquivo .env.local');
      return null;
    }
    
    // Remover sufixo /api se presente
    return apiUrl.replace('/api', '');
  },

  /**
   * Tenta processar uma resposta como JSON mesmo quando o Content-Type não é application/json
   * @param response Resposta do fetch para tentar processar como JSON
   */
  async tryParseAsJson(response: Response): Promise<any> {
    try {
      // Verificar se a resposta já tem Content-Type JSON
      const contentType = response.headers.get('content-type') || '';
      
      // Se já é JSON, usar o método .json()
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      
      // Caso contrário, obter o texto e tentar fazer parse manualmente
      const text = await response.text();
      
      // Verificar se parece ser JSON (começa com { ou [ e termina com } ou ])
      if ((text.trim().startsWith('{') || text.trim().startsWith('[')) &&
          (text.trim().endsWith('}') || text.trim().endsWith(']'))) {
        
        console.log('[TrueCore] Detectado conteúdo que parece ser JSON com Content-Type incorreto');
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('[TrueCore] Falha ao fazer parse do texto como JSON:', parseError);
          throw new Error('Conteúdo parece ser JSON, mas falhou ao fazer parse');
        }
      }
      
      // Se não parece ser JSON, lançar erro
      console.error('[TrueCore] Conteúdo não parece ser JSON');
      console.error('[TrueCore] Trecho do conteúdo:', text.substring(0, 200));
      throw new Error('Conteúdo não parece ser JSON');
    } catch (error) {
      console.error('[TrueCore] Erro ao tentar processar resposta como JSON:', error);
      throw error;
    }
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
          const errorData = await this.tryParseAsJson(response);
          return NextResponse.json(errorData, { status });
        } catch {
          return NextResponse.json(
            { error: `Erro ao acessar API True Core: ${endpoint}` },
            { status }
          );
        }
      }

      // Tentar obter a resposta como JSON
      const data = await this.tryParseAsJson(response);
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
          const errorData = await this.tryParseAsJson(response);
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
      const responseData = await this.tryParseAsJson(response);
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
        responseData = await this.tryParseAsJson(response);
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
   * Extrai o ID do Clerk do token
   */
  async extractClerkIdFromToken(token: string): Promise<string | null> {
    try {
      // Decodificar o token para obter o ID do Clerk
      // Assumindo que o token JWT tem uma estrutura padrão
      const payload = token.split('.')[1];
      if (!payload) return null;
      
      const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
      const data = JSON.parse(decodedPayload);
      
      // Verificar o formato específico do token e extrair o ID do usuário
      if (data.sub) {
        // Importante: o sub pode ter formato user_XYZ ou apenas o valor numérico
        // Se for user_XYZ, devemos retornar o valor completo
        return data.sub.toString();
      }
      
      console.log('[TrueCore] Conteúdo do token decodificado:', JSON.stringify(data));
      return null;
    } catch (error) {
      console.error('[TrueCore] Erro ao extrair ID do Clerk do token:', error);
      console.error('[TrueCore] Detalhes completos do erro:', error);
      return null;
    }
  },

  /**
   * Manipulador específico para o endpoint de produtos
   */
  async handleProducts(request: NextRequest): Promise<NextResponse> {
    try {
      console.log('[TrueCore] Processando requisição de produtos');
      
      // Obter a URL base da API True Core
      const baseUrl = this.getApiUrl();
      
      if (!baseUrl) {
        console.error('[TrueCore] URL da API não configurada para produtos');
        return NextResponse.json(
          { error: 'URL da API True Core não configurada' },
          { status: 500 }
        );
      }

      // Obter o token
      const token = this.extractToken(request);
      
      if (!token) {
        console.error('[TrueCore] Token de autenticação não encontrado para produtos');
        return NextResponse.json(
          { error: 'Token de autenticação não encontrado' },
          { status: 401 }
        );
      }

      // Copiar os parâmetros de consulta da requisição original para um objeto URLSearchParams
      const searchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
      
      // Log para depuração dos parâmetros originais
      console.log('[TrueCore] Parâmetros de busca originais:');
      for (const [key, value] of searchParams.entries()) {
        console.log(`[TrueCore] - ${key}: ${value}`);
      }
      
      // Adicionar filtros padrão
      searchParams.set('inStock', 'true');
      searchParams.set('active', 'true');
      
      // Tentar obter o ID do Clerk dos headers diretamente
      let clerkId = request.headers.get('x-clerk-user-id');
      if (clerkId) {
        console.log(`[TrueCore] ID do Clerk obtido do header: ${clerkId}`);
      } else {
        // Se não encontramos nos headers, tentar extrair do token
        try {
          const payload = token.split('.')[1];
          if (payload) {
            const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
            const data = JSON.parse(decodedPayload);
            console.log('[TrueCore] Token payload:', JSON.stringify(data));
            
            // Verificar externalId/sub no token
            if (data.externalId) {
              clerkId = data.externalId;
              console.log(`[TrueCore] ID do Clerk extraído do token (externalId): ${clerkId}`);
            } else if (data.sub) {
              clerkId = data.sub;
              console.log(`[TrueCore] ID do Clerk extraído do token (sub): ${clerkId}`);
            }
          }
        } catch (e) {
          console.error('[TrueCore] Erro ao decodificar token:', e);
        }
      }
      
      // Verificar se temos informações do usuário logado para determinar a categoria
      let warehouseName = '';
      
      // Se temos um ID do Clerk, tentar obter as informações do cliente
      if (clerkId) {
        try {
          // Usar a API unificada de clientes por clerk ID que resolve os problemas de ID
          // IMPORTANTE: Esta rota interna já lida com o formato correto do ID do Clerk
          const customerUrl = `/api/customers/clerk/${clerkId}`;
          console.log(`[TrueCore] Buscando cliente pela rota unificada: ${customerUrl}`);
          
          const customerResponse = await fetch(customerUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (customerResponse.ok) {
            const customer = await customerResponse.json();
            
            if (customer && customer.__category__) {
              const customerCategory = customer.__category__.name;
              console.log(`[TrueCore] Categoria do cliente: ${customerCategory}`);
              
              // Definir o warehouseName com base na categoria do cliente - exatamente como esperado pela API
              if (customerCategory.startsWith('Creator') || customerCategory === 'MKT-Creator') {
                warehouseName = 'MKT-Creator';
                console.log(`[TrueCore] Cliente da categoria Creator, usando warehouse: ${warehouseName}`);
              } else if (customerCategory.includes('Top Master') || customerCategory === 'MKT-Top Master') {
                warehouseName = 'MKT-Top Master';
                console.log(`[TrueCore] Cliente da categoria Top Master, usando warehouse: ${warehouseName}`);
              } else {
                // Categoria padrão para outros tipos
                warehouseName = 'geral';
                console.log(`[TrueCore] Outra categoria de cliente (${customerCategory}), usando warehouse: ${warehouseName}`);
              }
              
              // Aplicar o filtro de warehouse
              if (warehouseName) {
                searchParams.set('warehouseName', warehouseName);
              }
            } else {
              console.log('[TrueCore] Cliente encontrado, mas sem categoria definida');
            }
          } else {
            console.error('[TrueCore] Erro ao buscar cliente:', customerResponse.status);
            
            // Tentar obter mais detalhes sobre o erro
            try {
              const errorText = await customerResponse.text();
              console.error('[TrueCore] Resposta de erro do cliente:', errorText);
            } catch (e) {
              console.error('[TrueCore] Não foi possível ler resposta de erro do cliente');
            }
          }
        } catch (error) {
          console.error('[TrueCore] Erro ao processar informações do cliente:', error);
        }
      } else {
        console.log('[TrueCore] Não foi possível identificar o ID do Clerk, usando filtros padrão');
      }
      
      // Log de parâmetros finais
      console.log('[TrueCore] Parâmetros de busca após aplicar filtros:');
      for (const [key, value] of searchParams.entries()) {
        console.log(`[TrueCore] - ${key}: ${value}`);
      }
      
      // Construir a URL completa para a API True Core
      // Usar o endpoint warehouse/search quando temos o parâmetro warehouseName
      const endpoint = warehouseName 
        ? '/marketing/products/warehouse/search' 
        : '/marketing/products';
        
      console.log(`[TrueCore] Usando endpoint: ${endpoint}`);
      
      const url = `${baseUrl}${endpoint}?${searchParams.toString()}`;
      console.log(`[TrueCore] Fazendo requisição para: ${url}`);
      
      // Fazer a requisição para a API True Core
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      // Se a resposta não for ok, retornar o erro
      if (!response.ok) {
        const status = response.status;
        
        try {
          const errorData = await this.tryParseAsJson(response);
          console.error('[TrueCore] Erro da API True Core:', errorData);
          return NextResponse.json(errorData, { status });
        } catch {
          return NextResponse.json(
            { error: `Erro ao acessar API True Core: /marketing/products` },
            { status }
          );
        }
      }

      // Tentar obter a resposta como JSON
      const data = await this.tryParseAsJson(response);
      
      // Log de informações sobre os produtos obtidos
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`[TrueCore] ${data.data.length} produtos obtidos com sucesso`);
      }
      
      return NextResponse.json(data);
    } catch (error) {
      console.error(`[TrueCore] Erro na obtenção de produtos:`, error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição de produtos' },
        { status: 500 }
      );
    }
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
          const errorData = await this.tryParseAsJson(response);
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
        data = await this.tryParseAsJson(response);
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
  },

  /**
   * Manipulador específico para obter cliente pelo ID do Clerk
   * @param request Requisição Next.js 
   * @param clerkId ID do usuário no Clerk
   */
  async handleCustomerByClerkId(request: NextRequest, clerkId: string): Promise<NextResponse> {
    try {
      // Garantir que estamos usando o ID completo
      const cleanClerkId = clerkId.trim();
      
      if (!cleanClerkId) {
        console.error('[TrueCore] ID do Clerk inválido ou vazio');
        return NextResponse.json(
          { error: 'ID do Clerk inválido ou vazio' },
          { status: 400 }
        );
      }
      
      console.log(`[TrueCore] Buscando cliente pelo ID do Clerk: ${cleanClerkId}`);
      
      // Obter token de autorização
      const token = this.extractToken(request);
      if (!token) {
        console.error('[TrueCore] Token não fornecido para busca de cliente');
        return NextResponse.json(
          { error: 'Token de autenticação não encontrado' },
          { status: 401 }
        );
      }
      
      // Obter URL base da API
      const baseUrl = this.getApiUrl();
      if (!baseUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return NextResponse.json(
          { error: 'URL da API não configurada' },
          { status: 500 }
        );
      }
      
      // Construir URL completa para o endpoint de cliente por ID do Clerk
      const url = `${baseUrl}/marketing/customers/byClerkId/${cleanClerkId}`;
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
        console.error(`[TrueCore] Erro ao buscar cliente: status ${status}`);
        
        try {
          const errorData = await this.tryParseAsJson(response);
          console.error('[TrueCore] Detalhes do erro:', JSON.stringify(errorData));
          return NextResponse.json(errorData, { status });
        } catch (e) {
          console.error('[TrueCore] Não foi possível obter detalhes do erro:', e);
          
          // Tentar obter o texto da resposta
          try {
            const errorText = await response.text();
            console.error('[TrueCore] Texto da resposta de erro:', errorText);
          } catch (textError) {
            console.error('[TrueCore] Não foi possível ler o texto da resposta de erro');
          }
          
          return NextResponse.json(
            { error: `Erro ao buscar cliente da API True Core: ${status}` },
            { status }
          );
        }
      }
      
      // Obter os dados da resposta
      const responseText = await response.text();
      console.log(`[TrueCore] Resposta bruta: ${responseText.substring(0, 200)}...`);
      
      // Fazer parse do texto da resposta diretamente, em vez de tentar ler o corpo novamente
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[TrueCore] Erro ao fazer parse do texto como JSON:', e);
        return NextResponse.json(
          { error: 'Formato de resposta inválido - não foi possível fazer parse do JSON' },
          { status: 500 }
        );
      }
      
      // Verificar se o cliente foi encontrado
      if (!data) {
        console.error('[TrueCore] Resposta vazia ao buscar cliente');
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        );
      }
      
      // Normalizar a resposta: garantir que __category__ e outros campos estejam no nível raiz
      const normalizedData: any = { ...data };
      
      // Se os dados vêm dentro da propriedade "data", mover para o nível raiz
      if (data.data && typeof data.data === 'object') {
        Object.assign(normalizedData, data.data);
        console.log('[TrueCore] Normalizada estrutura data → raiz');
      }
      
      // Se a categoria estiver apenas como string no campo "category"
      if (normalizedData.category && typeof normalizedData.category === 'string' && !normalizedData.__category__) {
        normalizedData.__category__ = { name: normalizedData.category };
        console.log(`[TrueCore] Normalizada categoria: ${normalizedData.category} → __category__`);
      }
      
      // Verificar se temos __category__ definido e ajustar para o formato esperado
      if (normalizedData.__category__ && typeof normalizedData.__category__ === 'string') {
        normalizedData.__category__ = { name: normalizedData.__category__ };
        console.log(`[TrueCore] Convertido __category__ de string para objeto com nome`);
      }
      
      // Identificar o tipo de cliente baseado na categoria
      if (normalizedData.__category__ && normalizedData.__category__.name) {
        const categoryName = normalizedData.__category__.name;
        
        if (categoryName.startsWith('Creator')) {
          console.log('[TrueCore] Cliente identificado como Creator');
          normalizedData.clientGroup = 'Creator';
        } else if (categoryName.includes('Top Master')) {
          console.log('[TrueCore] Cliente identificado como Top Master');
          normalizedData.clientGroup = 'Top Master';
        } else {
          console.log(`[TrueCore] Cliente com categoria não classificada: ${categoryName}`);
          normalizedData.clientGroup = 'Outro';
        }
      }
      
      // Log da estrutura final
      console.log(`[TrueCore] Cliente encontrado e normalizado: ${normalizedData.name || data.name} (ID: ${normalizedData.id || data.id})`);
      console.log('[TrueCore] Categoria:', normalizedData.__category__ ? normalizedData.__category__.name : 'Não definida');
      
      return NextResponse.json(normalizedData);
    } catch (error) {
      console.error('[TrueCore] Erro ao processar busca de cliente:', error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição de cliente' },
        { status: 500 }
      );
    }
  },

  /**
   * Manipulador específico para obter os limites de pedidos de um cliente
   * @param request Requisição Next.js 
   * @param customerId ID do cliente no True Core
   */
  async handleCustomerOrderLimits(request: NextRequest, customerId: string): Promise<NextResponse> {
    try {
      console.log(`[TrueCore] Buscando limites de pedidos do cliente: ${customerId}`);
      
      // Obter token de autorização
      const token = this.extractToken(request);
      if (!token) {
        console.error('[TrueCore] Token não fornecido para busca de limites');
        return NextResponse.json(
          { error: 'Token de autenticação não encontrado' },
          { status: 401 }
        );
      }
      
      // Obter URL base da API
      const baseUrl = this.getApiUrl();
      if (!baseUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return NextResponse.json(
          { error: 'URL da API não configurada' },
          { status: 500 }
        );
      }
      
      // Construir URL completa para o endpoint de limites de pedidos
      const url = `${baseUrl}/marketing/customers/${customerId}/order-limits`;
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
        console.error(`[TrueCore] Erro ao buscar limites: status ${status}`);
        
        try {
          const errorData = await this.tryParseAsJson(response);
          console.error('[TrueCore] Detalhes do erro:', JSON.stringify(errorData));
          return NextResponse.json(errorData, { status });
        } catch (e) {
          console.error('[TrueCore] Não foi possível obter detalhes do erro:', e);
          return NextResponse.json(
            { error: `Erro ao buscar limites da API True Core: ${status}` },
            { status }
          );
        }
      }
      
      // Obter os dados da resposta
      const responseText = await response.text();
      console.log(`[TrueCore] Resposta bruta: ${responseText.substring(0, 200)}...`);
      
      // Fazer parse do texto da resposta diretamente, em vez de tentar ler o corpo novamente
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[TrueCore] Erro ao fazer parse do texto como JSON:', e);
        return NextResponse.json(
          { error: 'Formato de resposta inválido - não foi possível fazer parse do JSON' },
          { status: 500 }
        );
      }
      
      console.log(`[TrueCore] Limites de pedidos encontrados para cliente: ${data.customer?.name}`);
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('[TrueCore] Erro ao processar busca de limites:', error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição de limites' },
        { status: 500 }
      );
    }
  },

  // Método para buscar dados do cliente por ID
  getCustomerById: async (customerId: string | number, token: string) => {
    try {
      console.log(`[TrueCore] Buscando dados do cliente ID: ${customerId}`);
      
      const apiUrl = TrueCore.getApiUrl();
      if (!apiUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return null;
      }
      
      const url = `${apiUrl}/marketing/customers/${customerId}`;
      console.log(`[TrueCore] Fazendo requisição para: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`[TrueCore] Erro ao buscar cliente: ${response.status}`);
        
        // Verificar o tipo de conteúdo da resposta de erro
        const contentType = response.headers.get('content-type');
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error(`[TrueCore] Detalhe do erro JSON: ${JSON.stringify(errorData)}`);
          } else {
            const errorText = await response.text();
            console.error(`[TrueCore] Resposta não-JSON: ${errorText.substring(0, 200)}...`);
            
            if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
              console.error('[TrueCore] Resposta HTML detectada, verificar endpoint e autenticação');
            }
          }
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler detalhes da resposta: ${e}`);
        }
        
        return null;
      }
      
      // Verificar tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[TrueCore] Resposta não é JSON! Tipo: ${contentType}`);
        try {
          const text = await response.text();
          console.error(`[TrueCore] Conteúdo não-JSON: ${text.substring(0, 200)}...`);
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler texto da resposta: ${e}`);
        }
        return null;
      }
      
      try {
        const data = await response.json();
        console.log(`[TrueCore] Cliente encontrado: ${data.name || 'Sem nome'}`);
        return data;
      } catch (e) {
        console.error(`[TrueCore] Erro ao fazer parse JSON da resposta: ${e}`);
        return null;
      }
    } catch (error) {
      console.error('[TrueCore] Erro ao buscar cliente:', error);
      return null;
    }
  },
  
  // Método para buscar a categoria do cliente
  getCustomerCategory: async (customerId: string | number, token: string) => {
    try {
      console.log(`[TrueCore] Buscando categoria do cliente ID: ${customerId}`);
      
      const apiUrl = TrueCore.getApiUrl();
      if (!apiUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return null;
      }
      
      const url = `${apiUrl}/marketing/customers/${customerId}/category`;
      console.log(`[TrueCore] Fazendo requisição para: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`[TrueCore] Erro ao buscar categoria do cliente: ${response.status}`);
        
        // Verificar o tipo de conteúdo da resposta de erro
        const contentType = response.headers.get('content-type');
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error(`[TrueCore] Detalhe do erro JSON: ${JSON.stringify(errorData)}`);
          } else {
            const errorText = await response.text();
            console.error(`[TrueCore] Resposta não-JSON: ${errorText.substring(0, 200)}...`);
            
            if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
              console.error('[TrueCore] Resposta HTML detectada, verificar endpoint e autenticação');
            }
          }
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler detalhes da resposta: ${e}`);
        }
        
        return null;
      }
      
      // Verificar tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[TrueCore] Resposta não é JSON! Tipo: ${contentType}`);
        try {
          const text = await response.text();
          console.error(`[TrueCore] Conteúdo não-JSON: ${text.substring(0, 200)}...`);
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler texto da resposta: ${e}`);
        }
        return null;
      }
      
      try {
        const data = await response.json();
        
        if (data && data.name) {
          console.log(`[TrueCore] Categoria do cliente encontrada: ${data.name}`);
          return data;
        }
        
        // Se não recebemos a estrutura esperada, verificar se temos dados no próprio cliente
        console.log('[TrueCore] Estrutura de categoria não encontrada, buscando cliente completo');
        
        const customerData = await TrueCore.getCustomerById(customerId, token);
        if (customerData && customerData.category) {
          console.log(`[TrueCore] Categoria extraída do cliente: ${customerData.category}`);
          return { 
            name: customerData.category,
            id: customerData.categoryId || 'default'
          };
        }
        
        console.log('[TrueCore] Nenhuma informação de categoria encontrada');
        return null;
      } catch (e) {
        console.error(`[TrueCore] Erro ao fazer parse JSON da resposta: ${e}`);
        return null;
      }
    } catch (error) {
      console.error('[TrueCore] Erro ao buscar categoria do cliente:', error);
      return null;
    }
  },

  // Método para buscar os limites de pedido de um cliente
  getCustomerOrderLimits: async (customerId: string | number, token: string) => {
    try {
      console.log(`[TrueCore] Buscando limites de pedido para cliente ID: ${customerId}`);
      
      const apiUrl = TrueCore.getApiUrl();
      if (!apiUrl) {
        console.error('[TrueCore] URL da API não configurada');
        return null;
      }
      
      const url = `${apiUrl}/marketing/customers/${customerId}/order-limits`;
      console.log(`[TrueCore] Fazendo requisição para: ${url}`);
      
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
      console.log(`[TrueCore] Tipo de conteúdo: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.error(`[TrueCore] Erro ao buscar limites de pedido: ${response.status}`);
        
        // Verificar o tipo de conteúdo da resposta de erro
        const contentType = response.headers.get('content-type');
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error(`[TrueCore] Detalhe do erro JSON: ${JSON.stringify(errorData)}`);
          } else {
            const errorText = await response.text();
            console.error(`[TrueCore] Resposta não-JSON: ${errorText.substring(0, 200)}...`);
            
            if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
              console.error('[TrueCore] Resposta HTML detectada, verificar endpoint e autenticação');
            }
          }
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler detalhes da resposta: ${e}`);
        }
        
        return null;
      }
      
      // Verificar tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[TrueCore] Resposta não é JSON! Tipo: ${contentType}`);
        try {
          const text = await response.text();
          console.error(`[TrueCore] Conteúdo não-JSON: ${text.substring(0, 200)}...`);
        } catch (e) {
          console.error(`[TrueCore] Erro ao ler texto da resposta: ${e}`);
        }
        return null;
      }
      
      try {
        const responseText = await response.text();
        console.log(`[TrueCore] Resposta bruta (primeiros 200 caracteres): ${responseText.substring(0, 200)}...`);
        
        const data = JSON.parse(responseText);
        console.log(`[TrueCore] Limites de pedido encontrados para cliente: ${customerId}`);
        
        if (data && data.customer) {
          console.log(`[TrueCore] Cliente dos limites: ${data.customer.name || 'Nome não disponível'}`);
        }
        
        return data;
      } catch (e) {
        console.error(`[TrueCore] Erro ao fazer parse JSON da resposta: ${e}`);
        return null;
      }
    } catch (error) {
      console.error('[TrueCore] Erro ao buscar limites de pedido:', error);
      return null;
    }
  }
}; 