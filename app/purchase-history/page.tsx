'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	History,
	ShoppingBag,
	Package,
	CalendarDays,
	ChevronRight,
	AlertCircle,
	Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { tokenStore } from '@/lib/token-store';
import Image from 'next/image';

// Interfaces para tipagem
interface OrderProduct {
	id: string;
	name: string;
	price: string;
	quantity: number;
	imageUrl?: string;
}

interface OrderItem {
	id: string;
	productId: string;
	quantity: number;
	price: string;
	total: string;
	__product__?: {
		id: string;
		name: string;
		price: string;
		images?: string[];
		sku: string;
	};
}

interface OrderCustomer {
	id: string;
	name: string;
	email: string;
	phone: string;
	address?: {
		city: string;
		state: string;
		street: string;
		number: string;
		zipCode: string;
		complement?: string;
		neighborhood: string;
	};
}

interface Order {
	id: string;
	customerId: string;
	status: string;
	paymentMethod: string;
	paymentStatus: string;
	total: string;
	shippingCost: string;
	discount: string;
	shippingAddress: string;
	shippingCarrier: string;
	createdAt: string;
	updatedAt: string;
	__customer__?: OrderCustomer;
	__items__?: OrderItem[];
}

interface ProcessedOrder {
	id: string;
	date: string;
	status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
	total: number;
	paymentMethod: string;
	paymentStatus: string;
	shippingAddress: string;
	shippingCarrier: string;
	items: OrderProduct[];
}

export default function PurchaseHistoryPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<ProcessedOrder[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('all');

	// Textos e cores para cada status
	const statusConfig = {
		pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
		processing: {
			label: 'Em processamento',
			color: 'bg-blue-100 text-blue-800',
		},
		shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
		delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
		canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
	};

	// Mapear status da API para status da interface
	const mapApiStatus = (
		apiStatus: string
	): 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled' => {
		const statusMap: Record<
			string,
			'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled'
		> = {
			PENDING: 'pending',
			PROCESSING: 'processing',
			SHIPPED: 'shipped',
			DELIVERED: 'delivered',
			CANCELED: 'canceled',
			COMPLETED: 'delivered',
			// Adicionar mais mapeamentos se necessário
		};

		return statusMap[apiStatus] || 'pending';
	};

	useEffect(() => {
		const fetchOrders = async () => {
			setIsLoading(true);
			setError(null);

			try {
				// Verificar se temos um token válido
				if (!tokenStore.hasValidToken()) {
					console.error(
						'[PurchaseHistory] Token inválido, não é possível buscar pedidos'
					);
					setError('Erro de autenticação. Por favor, faça login novamente.');
					setIsLoading(false);
					return;
				}

				// Verificar se temos o ID do cliente
				const clerkId = localStorage.getItem('clerk_user_id');
				if (!clerkId) {
					console.error('[PurchaseHistory] ID do cliente não encontrado');
					setError(
						'Usuário não identificado. Por favor, faça login novamente.'
					);
					setIsLoading(false);
					return;
				}

				// Buscar o cliente pelo ID do Clerk para obter o ID do True Core
				const token = tokenStore.getToken();
				const customerResponse = await fetch(
					`/api/customers/clerk/${clerkId}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							Authorization: `Bearer ${token}`,
						},
						credentials: 'include',
					}
				);

				if (!customerResponse.ok) {
					throw new Error(
						`Erro ao buscar informações do cliente: ${customerResponse.status}`
					);
				}

				const customerData = await customerResponse.json();
				if (!customerData || !customerData.id) {
					throw new Error('Informações do cliente não encontradas');
				}

				const customerId = customerData.id;
				console.log(`[PurchaseHistory] ID do cliente obtido: ${customerId}`);

				// Buscar os pedidos do cliente
				const ordersResponse = await fetch(
					`/api/marketing/orders/customer/${customerId}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							Authorization: `Bearer ${token}`,
						},
						credentials: 'include',
					}
				);

				if (!ordersResponse.ok) {
					throw new Error(`Erro ao buscar pedidos: ${ordersResponse.status}`);
				}

				const ordersData = await ordersResponse.json();

				if (!Array.isArray(ordersData)) {
					throw new Error('Formato de resposta inválido');
				}

				// Processar os pedidos
				const processedOrders: ProcessedOrder[] = ordersData.map(
					(order: Order) => {
						const items: OrderProduct[] =
							order.__items__?.map((item) => ({
								id: item.productId,
								name: item.__product__?.name || 'Produto não identificado',
								price: item.price,
								quantity: item.quantity,
								imageUrl: item.__product__?.images?.[0] || undefined,
							})) || [];

						return {
							id: order.id,
							date: order.createdAt,
							status: mapApiStatus(order.status),
							total: parseFloat(order.total),
							paymentMethod: order.paymentMethod,
							paymentStatus: order.paymentStatus,
							shippingAddress: order.shippingAddress,
							shippingCarrier: order.shippingCarrier,
							items,
						};
					}
				);

				// Ordenar pedidos por data (mais recentes primeiro)
				processedOrders.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
				);

				setOrders(processedOrders);
				console.log(
					`[PurchaseHistory] ${processedOrders.length} pedidos carregados`
				);
			} catch (error) {
				console.error('[PurchaseHistory] Erro ao carregar pedidos:', error);
				setError(
					error instanceof Error
						? error.message
						: 'Erro ao carregar o histórico de compras'
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrders();
	}, []);

	const filteredOrders =
		activeTab === 'all'
			? orders
			: orders.filter((order) => order.status === activeTab);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		}).format(date);
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	};

	// Função para formatar o método de pagamento
	const formatPaymentMethod = (method: string) => {
		const methodMap: Record<string, string> = {
			credit_card: 'Cartão de crédito',
			debit_card: 'Cartão de débito',
			bank_slip: 'Boleto bancário',
			pix: 'PIX',
			transfer: 'Transferência bancária',
			// Adicionar mais métodos conforme necessário
		};

		return methodMap[method] || method;
	};

	return (
		<StoreLayout>
			<div className="max-w-6xl mx-auto py-8">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="h-10 w-10 rounded-full bg-brand-magenta/10 flex items-center justify-center">
							<History size={20} className="text-brand-magenta" />
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
								Histórico de Compras
							</h1>
							<p className="text-gray-500 text-sm">
								Acompanhe e gerencie seus pedidos anteriores
							</p>
						</div>
					</div>
				</div>

				{error ? (
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
						<div className="text-center py-8">
							<div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
								<AlertCircle className="h-8 w-8 text-red-500" />
							</div>
							<h2 className="text-xl font-medium text-gray-900 mb-2">
								Erro ao carregar pedidos
							</h2>
							<p className="text-gray-500 max-w-md mx-auto mb-6">{error}</p>
							<Button
								onClick={() => window.location.reload()}
								className="bg-brand-magenta hover:bg-brand-magenta/90"
							>
								Tentar novamente
							</Button>
						</div>
					</div>
				) : (
					<Tabs
						defaultValue="all"
						value={activeTab}
						onValueChange={setActiveTab}
						className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6"
					>
						<TabsList className="grid grid-cols-5 mb-4">
							<TabsTrigger
								value="all"
								className="data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								Todos
							</TabsTrigger>
							<TabsTrigger
								value="processing"
								className="data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								Em Processamento
							</TabsTrigger>
							<TabsTrigger
								value="shipped"
								className="data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								Enviados
							</TabsTrigger>
							<TabsTrigger
								value="delivered"
								className="data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								Entregues
							</TabsTrigger>
							<TabsTrigger
								value="canceled"
								className="data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								Cancelados
							</TabsTrigger>
						</TabsList>

						<TabsContent value={activeTab} className="mt-2">
							{isLoading ? (
								// Estado de carregamento
								<div className="space-y-4">
									{Array.from({ length: 3 }).map((_, index) => (
										<Card
											key={index}
											className="overflow-hidden border-gray-200"
										>
											<CardContent className="p-0">
												<div className="p-4 space-y-3 animate-pulse">
													<div className="h-4 bg-gray-200 rounded w-1/4"></div>
													<div className="h-4 bg-gray-200 rounded w-1/2"></div>
													<div className="h-4 bg-gray-200 rounded w-3/4"></div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							) : filteredOrders.length > 0 ? (
								// Lista de pedidos
								<div className="space-y-4">
									{filteredOrders.map((order) => (
										<Card
											key={order.id}
											className="overflow-hidden border-gray-200 hover:border-brand-magenta transition-colors"
										>
											<CardContent className="p-0">
												<div className="flex flex-col md:flex-row border-b border-gray-100">
													<div className="p-4 md:w-3/5 flex-grow">
														<div className="flex items-center gap-3 mb-2">
															<Package className="h-5 w-5 text-brand-magenta" />
															<div className="font-medium">
																Pedido #{order.id.substring(0, 8)}
															</div>
															<Badge
																className={statusConfig[order.status].color}
															>
																{statusConfig[order.status].label}
															</Badge>
														</div>

														<div className="mt-2 grid grid-cols-2 gap-2 text-sm">
															<div className="flex items-center gap-1 text-gray-500">
																<CalendarDays className="h-4 w-4" />
																<span>{formatDate(order.date)}</span>
															</div>
															<div className="flex items-center gap-1 text-gray-500">
																<Clock className="h-4 w-4" />
																<span>{formatTime(order.date)}</span>
															</div>
														</div>

														<div className="mt-4 space-y-2">
															{order.items.map((item) => (
																<div
																	key={item.id}
																	className="flex items-center gap-3"
																>
																	<div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
																		{item.imageUrl ? (
																			<Image
																				src={item.imageUrl}
																				alt={item.name}
																				width={40}
																				height={40}
																				className="w-full h-full object-cover"
																			/>
																		) : (
																			<div className="w-full h-full flex items-center justify-center">
																				<ShoppingBag className="h-5 w-5 text-gray-400" />
																			</div>
																		)}
																	</div>
																	<div className="flex-grow min-w-0">
																		<p className="text-sm font-medium text-gray-900 truncate">
																			{item.name}
																		</p>
																		<p className="text-xs text-gray-500">
																			{item.quantity} x{' '}
																			{formatCurrency(parseFloat(item.price))}
																		</p>
																	</div>
																</div>
															))}
														</div>
													</div>

													<div className="bg-gray-50 p-4 md:w-2/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100">
														<div>
															<p className="text-sm text-gray-500 mb-1">
																Valor total
															</p>
															<p className="text-lg font-bold text-brand-magenta mb-4">
																{formatCurrency(order.total)}
															</p>

															<div className="grid grid-cols-1 gap-2 text-sm">
																<div className="text-gray-500">
																	<span className="font-medium">
																		Forma de pagamento:
																	</span>{' '}
																	{formatPaymentMethod(order.paymentMethod)}
																</div>
																<div className="text-gray-500">
																	<span className="font-medium">Entrega:</span>{' '}
																	{order.shippingCarrier || 'Não especificada'}
																</div>
																<div className="text-gray-500">
																	<span className="font-medium">
																		Total de itens:
																	</span>{' '}
																	{order.items.reduce(
																		(acc, item) => acc + item.quantity,
																		0
																	)}
																</div>
															</div>
														</div>

														<Button
															variant="outline"
															className="mt-4 border-gray-200 text-brand-magenta hover:bg-brand-magenta/5 hover:border-brand-magenta"
															onClick={() => router.push(`/order/${order.id}`)}
														>
															Ver detalhes
															<ChevronRight className="ml-1 h-4 w-4" />
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							) : (
								// Estado vazio
								<div className="text-center py-16">
									<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
										<AlertCircle className="h-10 w-10 text-gray-400" />
									</div>
									<h2 className="mt-4 text-xl font-medium text-gray-900">
										{activeTab === 'all'
											? 'Você ainda não fez nenhum pedido'
											: `Você não tem pedidos ${statusConfig[
													activeTab as keyof typeof statusConfig
											  ].label.toLowerCase()}`}
									</h2>
									<p className="mt-2 text-gray-500 max-w-md mx-auto">
										{activeTab === 'all'
											? 'Comece a comprar para ver seu histórico de pedidos aqui.'
											: 'Filtre por outra categoria ou faça um novo pedido.'}
									</p>
									<Button
										onClick={() => router.push('/store')}
										className="mt-6 bg-brand-magenta hover:bg-brand-magenta/90"
									>
										<ShoppingBag className="mr-2 h-4 w-4" />
										Ir às compras
									</Button>
								</div>
							)}
						</TabsContent>
					</Tabs>
				)}
			</div>
		</StoreLayout>
	);
}
