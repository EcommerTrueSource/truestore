import { Customer } from './customer';

export interface OrderProduct {
  id: string;
  tinyId?: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  costPrice: string;
  stock: number;
  minStock: number;
  brand: string;
  ncm: string | null;
  gtin: string | null;
  active: boolean;
  categoryId: string | null;
  images: string[];
  attributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string;
  total: string;
  warehouse: string | null;
  createdAt: string;
  updatedAt: string;
  __product__: OrderProduct;
}

export interface Order {
  id: string;
  customerId: string;
  type: string;
  operation: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  shippingCost: string;
  discount: string;
  price: string;
  cost: string;
  notes: string;
  shippingAddress: string;
  shippingCarrier: string;
  nome_deposito: string;
  createdAt: string;
  updatedAt: string;
  tinySyncStatus: string;
  tinyId: string | null;
  tinySyncError: string | null;
  source: string;
  externalId: string | null;
  externalSequence: string | null;
  tinySyncRetries: number;
  __customer__: Customer;
  __items__: OrderItem[];
}

// Mapeamento de status para valores amigáveis em PT-BR
export const orderStatusMap = {
  'PENDING': 'pending',
  'PROCESSING': 'processing',
  'SHIPPED': 'shipped',
  'DELIVERED': 'delivered',
  'CANCELED': 'canceled'
} as const;

// Mapeamento de configurações de status para frontend
export const orderStatusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Em processamento', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
} as const;

// Funções utilitárias para converter entre valores da API e valores no frontend
export function mapStatusToFrontend(apiStatus: string): keyof typeof orderStatusConfig {
  const mappedStatus = orderStatusMap[apiStatus as keyof typeof orderStatusMap];
  return mappedStatus || 'pending';
}

export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function formatOrderTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
} 