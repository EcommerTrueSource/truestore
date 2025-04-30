export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  imageUrl?: string
  categoryId: string
  category?: {
    id: string
    name: string
    description?: string
  }
  codigo?: string
  unidade?: string
  active?: boolean
  // Informações de estoque do warehouse
  warehouseStock?: {
    available: number
    total: number
    reserved: number
    warehouseName: string
    error?: string
  }
  // Flag para indicar se o produto está em estoque
  inStock?: boolean
}

export interface Category {
  id: string
  name: string
  iconName?: string
}

export interface Order {
  id: string
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  total: number
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string
}
