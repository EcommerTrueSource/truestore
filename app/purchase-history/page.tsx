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

// Interfaces para tipagem
interface OrderItem {
	id: number;
	name: string;
	price: number;
	quantity: number;
	imageUrl?: string;
}

interface Order {
	id: string;
	date: string;
	status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
	total: number;
	items: OrderItem[];
}

export default function PurchaseHistoryPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);
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

	useEffect(() => {
		// Simular carregamento de pedidos
		const loadOrders = async () => {
			setIsLoading(true);
			try {
				// Simulação de dados de pedidos
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const mockOrders: Order[] = [
					{
						id: 'P123456',
						date: '2023-10-12T14:30:00Z',
						status: 'delivered',
						total: 259.7,
						items: [
							{
								id: 1,
								name: 'Base Líquida Ultra HD',
								price: 89.9,
								quantity: 2,
								imageUrl:
									'https://images.unsplash.com/photo-1596704017254-9a89b5d155cc?auto=format&fit=crop&w=800&q=80',
							},
							{
								id: 2,
								name: 'Sérum Facial Vitamina C',
								price: 79.9,
								quantity: 1,
								imageUrl:
									'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
							},
						],
					},
					{
						id: 'P789012',
						date: '2023-11-05T10:15:00Z',
						status: 'shipped',
						total: 134.8,
						items: [
							{
								id: 3,
								name: 'Paleta de Sombras Sunset',
								price: 79.9,
								quantity: 1,
								imageUrl:
									'https://images.unsplash.com/photo-1596704017390-8a43a4c580e4?auto=format&fit=crop&w=800&q=80',
							},
							{
								id: 4,
								name: 'Máscara Facial Hidratante',
								price: 54.9,
								quantity: 1,
							},
						],
					},
					{
						id: 'P345678',
						date: '2023-12-18T16:45:00Z',
						status: 'processing',
						total: 175.6,
						items: [
							{
								id: 5,
								name: 'Kit Pincéis Profissionais',
								price: 175.6,
								quantity: 1,
							},
						],
					},
				];

				setOrders(mockOrders);
			} catch (error) {
				console.error('Erro ao carregar histórico de compras:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadOrders();
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
									<Card key={index} className="overflow-hidden border-gray-200">
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
															Pedido #{order.id}
														</div>
														<Badge className={statusConfig[order.status].color}>
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
														{order.items.map((item, idx) => (
															<div
																key={idx}
																className="flex items-center gap-3"
															>
																<div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
																	{item.imageUrl ? (
																		<img
																			src={item.imageUrl}
																			alt={item.name}
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
																		{formatCurrency(item.price)}
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

														<div className="text-sm text-gray-500">
															Total de itens:{' '}
															{order.items.reduce(
																(acc, item) => acc + item.quantity,
																0
															)}
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
			</div>
		</StoreLayout>
	);
}
