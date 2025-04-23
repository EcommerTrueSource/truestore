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
