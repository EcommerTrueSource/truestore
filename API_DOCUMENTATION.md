# Documentação de APIs Proxy

Este guia explica o sistema de roteamento e proxy usado para conectar o frontend à API externa True Core.

## Estrutura de Rotas

### Rotas Unificadas (Pontos de Entrada)

- **`/api/categories`** - Entrada unificada para categorias
- **`/api/products`** - Entrada unificada para produtos
- **`/api/products/[id]`** - Operações em produtos específicos

### Implementações Detalhadas

- **`/api/marketing/categories`** - *(LEGADO)* Implementação alternativa de categorias
- **`/api/marketing/products/categories`** - Implementação principal de categorias
- **`/api/marketing/products`** - Implementação principal de produtos
- **`/api/marketing/products/search`** - Implementação de busca avançada

## Fluxo de Dados

O fluxo de dados entre o frontend e a API externa segue este padrão:

1. Frontend chama `/api/categories` ou `/api/products`
2. A rota unificada encaminha para a implementação detalhada
3. A implementação detalhada se comunica com a API externa True Core
4. A resposta é processada e retornada ao frontend

## Token de Autenticação

A autenticação é gerenciada através de:
- Cookie `true_core_token`
- Cabeçalho Authorization

## Categorias e Produtos

Categorias são obtidas através de `/api/categories` e incluem uma categoria especial "Todos os produtos".

Produtos podem ser filtrados por categoria usando o parâmetro `categoryId` ou `categoryName`.

## API de Cliente por ID do Clerk

### Endpoint

```
GET /api/customers/clerk/:clerkId
```

Este endpoint busca os dados de um cliente utilizando seu ID do Clerk (externalId). Importante para aplicações que precisam obter informações detalhadas do cliente baseado na autenticação do Clerk.

### Proxy

O endpoint atua como um proxy para a API True Core:

```
GET /marketing/customers/byClerkId/:clerkId
```

### Implementação

A implementação segue o mesmo padrão de outros endpoints na aplicação:

1. A rota `/app/api/customers/clerk/[clerkId]/route.ts` recebe a requisição
2. Ela utiliza o método `TrueCore.handleCustomerByClerkId` para fazer a requisição proxy
3. Os dados retornados incluem informações detalhadas do cliente, incluindo:
   - Dados básicos (nome, documento, contato)
   - Endereço
   - Categoria associada
   - Limites de crédito
   - Saldo disponível

### Hook e Contexto

Foi criado um sistema para facilitar o acesso aos dados do cliente no frontend:

1. `CustomerProvider`: Contexto global que gerencia o estado do cliente
2. `useCustomer()`: Hook personalizado para acessar os dados do cliente em qualquer componente

### Modelo de Dados

O cliente é representado pelo seguinte modelo:

```typescript
interface Customer {
  id: string;
  tinyId?: string | null;
  externalId: string; // Corresponde ao ID do Clerk
  name: string;
  type: string;
  document: string;
  email: string;
  phone: string;
  birthDate: string;
  address: CustomerAddress;
  creditLimit?: number | null;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  source: string;
  __category__?: CustomerCategory;
}

interface CustomerCategory {
  id: string;
  name: string;
  description: string;
  ticketValue: string;
  isCustomTicket: boolean;
  frequencyPerMonth: number;
  createdAt: string;
  updatedAt: string;
}
```

### Uso no Frontend

Para usar os dados do cliente em um componente:

```tsx
'use client';

import { useCustomer } from '@/hooks/use-customer';

export function MyComponent() {
  const { customer, isLoading, error, getAvailableBalance } = useCustomer();
  
  if (isLoading) return <p>Carregando...</p>;
  if (error) return <p>Erro ao carregar dados do cliente</p>;
  if (!customer) return <p>Cliente não encontrado</p>;
  
  return (
    <div>
      <h1>Olá, {customer.name}</h1>
      <p>Seu saldo disponível: R$ {getAvailableBalance()}</p>
      <p>Categoria: {customer.__category__?.name || 'Não atribuída'}</p>
    </div>
  );
}
```
