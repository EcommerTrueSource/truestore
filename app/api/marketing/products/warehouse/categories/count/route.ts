import { NextRequest } from 'next/server';
import { TrueCore } from '@/lib/true-core-proxy';

/**
 * Rota para buscar a contagem de produtos por categoria em um depósito específico
 * 
 * Endpoint público: /api/marketing/products/warehouse/categories/count
 * 
 * Parâmetros de consulta:
 * - warehouseName: string - Nome do depósito (obrigatório)
 * - inStock: boolean - Filtro de produtos em estoque (default: true)
 * - active: boolean - Filtro de produtos ativos (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    // Obter URL base da API True Core
    const baseUrl = TrueCore.getApiUrl();
    
    if (!baseUrl) {
      return Response.json(
        { error: 'URL da API True Core não configurada' },
        { status: 500 }
      );
    }
    
    // Obter parâmetros da URL
    const searchParams = new URL(request.url).searchParams;
    
    // Validar parâmetro warehouseName
    let warehouseName = searchParams.get('warehouseName');
    if (!warehouseName || warehouseName.trim() === '') {
      // Definir um valor padrão se não foi fornecido
      warehouseName = 'MKT-Creator';
      console.log('[TrueCore] warehouseName não fornecido, usando valor padrão:', warehouseName);
      
      // Atualizar os parâmetros da URL com o valor padrão
      searchParams.set('warehouseName', warehouseName);
    }
    
    // Construir URL para a API do True Core
    const apiUrl = `${baseUrl}/marketing/products/warehouse/categories/count?${searchParams.toString()}`;
    
    console.log(`[TrueCore] Buscando contagens de categorias do depósito ${warehouseName} em: ${apiUrl}`);
    
    // Obter token de acesso
    const accessToken = TrueCore.extractToken(request);
    
    // Fazer requisição ao backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TrueCore] Erro ao buscar contagens de categorias: ${response.status} - ${errorText}`);
      
      return Response.json(
        { error: `Erro ao buscar contagens de categorias: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Obter dados da resposta
    const data = await response.json();
    
    console.log(`[TrueCore] Recebidas ${data.categories?.length || 0} categorias com contagens para o depósito ${warehouseName}`);
    
    return Response.json(data);
  } catch (error: unknown) {
    console.error('[TrueCore] Erro ao processar requisição de contagens de categorias:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return Response.json(
      { error: `Erro interno do servidor: ${errorMessage}` },
      { status: 500 }
    );
  }
} 