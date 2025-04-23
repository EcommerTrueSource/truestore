import { NextRequest, NextResponse } from 'next/server';

/**
 * Utilitário para criar handlers de API que encaminham requisições para a API externa
 * 
 * Este arquivo fornece um criador de rotas simplificado que encaminha requisições
 * da API pública do frontend para a API True Core (backend). Ele funciona como uma
 * camada de abstração que oculta detalhes de implementação da API externa.
 * 
 * Cada rota criada com este utilitário segue um padrão de proxy consistente:
 * - Extrai o token de autenticação da requisição
 * - Encaminha a requisição com o método original para o endpoint correspondente
 * - Processa os parâmetros de rota (como :id) substituindo-os pelos valores reais
 * - Retorna a resposta da API externa para o cliente
 * 
 * @param apiPath - Caminho da API externa (sem a URL base)
 */
export function createApiRouteHandler(apiPath: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  return async function handler(
    request: NextRequest,
    { params }: { params: Record<string, string> }
  ) {
    try {
      // Verificar se a URL da API está configurada
      if (!apiUrl) {
        console.error('URL da API externa não configurada');
        return NextResponse.json(
          { error: 'Configuração do servidor incompleta' },
          { status: 500 }
        );
      }
      
      // Obter o token JWT do cabeçalho de autorização
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Token de autenticação não fornecido' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }
      
      // Log informativo
      console.log(`Processando requisição para ${apiPath}`);
      
      // Extrair informações da requisição
      const method = request.method;
      const searchParams = request.nextUrl.searchParams.toString();
      const queryString = searchParams ? `?${searchParams}` : '';
      
      // Construir a URL completa para a API externa
      let finalPath = apiPath;
      
      // Substituir parâmetros dinâmicos no caminho (ex: :id)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          finalPath = finalPath.replace(`:${key}`, value);
        });
      }
      
      const url = `${apiUrl.replace(/\/api$/, '')}${finalPath}${queryString}`;
      
      // Construir os cabeçalhos para a API externa
      const headers = new Headers();
      // Usar diretamente o token JWT recebido do cliente
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      
      // Copiar outros cabeçalhos relevantes
      request.headers.forEach((value, key) => {
        if (
          !['host', 'connection', 'content-length', 'authorization'].includes(key.toLowerCase())
        ) {
          headers.set(key, value);
        }
      });
      
      // Construir as opções da requisição
      const options: RequestInit = {
        method,
        headers,
        redirect: 'follow',
      };
      
      // Adicionar corpo da requisição para métodos não-GET
      if (method !== 'GET' && method !== 'HEAD') {
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const body = await request.json().catch(() => ({}));
          options.body = JSON.stringify(body);
        } else if (contentType.includes('multipart/form-data')) {
          options.body = await request.formData();
        } else {
          options.body = await request.text();
        }
      }
      
      // Encaminhar a requisição para a API externa
      console.log(`Enviando requisição para API externa: ${url}`);
      const response = await fetch(url, options);
      console.log(`Resposta recebida com status: ${response.status}`);
      
      // Construir a resposta para o cliente
      let responseData;
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (e) {
          console.error('Erro ao parsear resposta JSON:', e);
          responseData = { error: 'Erro ao processar resposta da API' };
        }
      } else {
        responseData = await response.text();
      }
        
      return NextResponse.json(responseData, { status: response.status });
    } catch (error) {
      console.error(`Erro ao processar requisição para ${apiPath}:`, error);
      return NextResponse.json(
        { error: 'Erro interno ao processar requisição', details: String(error) },
        { status: 500 }
      );
    }
  };
} 