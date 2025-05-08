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
	Loader2,
	Truck,
	CheckCircle,
	XCircle,
	FileText,
	Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
	Order,
	OrderItem,
	formatOrderDate,
	formatOrderTime,
	mapStatusToFrontend,
	orderStatusConfig,
} from '@/types/order';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function PurchaseHistoryPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('all');
	const { toast } = useToast();

	const tabConfig = [
		{
			id: 'all',
			label: 'Todos os pedidos',
			icon: <FileText className="h-4 w-4 mr-1" />,
		},
		{
			id: 'pending',
			label: 'Pendentes',
			icon: <Clock className="h-4 w-4 mr-1" />,
		},
		{
			id: 'processing',
			label: 'Em processamento',
			icon: <Package className="h-4 w-4 mr-1" />,
		},
		{
			id: 'shipped',
			label: 'Enviados',
			icon: <Truck className="h-4 w-4 mr-1" />,
		},
		{
			id: 'delivered',
			label: 'Entregues',
			icon: <CheckCircle className="h-4 w-4 mr-1" />,
		},
		{
			id: 'canceled',
			label: 'Cancelados',
			icon: <XCircle className="h-4 w-4 mr-1" />,
		},
	];

	useEffect(() => {
		// Carregar pedidos do cliente da API
		const loadOrders = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch('/api/orders/history');

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(
						errorData.error || `Erro ao carregar pedidos: ${response.status}`
					);
				}

				const data = await response.json();
				setOrders(data.orders || []);

				// Log para debug
				console.log(`Carregados ${data.orders?.length || 0} pedidos`);
			} catch (error) {
				console.error('Erro ao carregar histórico de compras:', error);
				setError(
					error instanceof Error ? error.message : 'Erro ao carregar pedidos'
				);
				toast({
					variant: 'destructive',
					title: 'Erro ao carregar histórico',
					description:
						error instanceof Error
							? error.message
							: 'Ocorreu um erro ao buscar seu histórico de pedidos',
				});
			} finally {
				setIsLoading(false);
			}
		};

		loadOrders();
	}, [toast]);

	const filteredOrders =
		activeTab === 'all'
			? orders
			: orders.filter((order) => {
					const mappedStatus = mapStatusToFrontend(order.status);
					return mappedStatus === activeTab;
			  });

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
								Histórico de Pedidos
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
					{/* Versão mobile: grid de botões */}
					<div className="md:hidden mb-4">
						<div className="grid grid-cols-2 gap-2 mb-2">
							{tabConfig.slice(0, 4).map((tab) => (
								<Button
									key={tab.id}
									variant={activeTab === tab.id ? 'default' : 'outline'}
									className={cn(
										'flex items-center justify-center h-10 px-2 text-sm',
										activeTab === tab.id
											? 'bg-brand-magenta text-white'
											: 'bg-white hover:bg-brand-magenta/10 hover:text-brand-magenta hover:border-brand-magenta'
									)}
									onClick={() => setActiveTab(tab.id)}
								>
									{tab.icon}
									<span className="truncate">{tab.label}</span>
								</Button>
							))}
						</div>
						<div className="grid grid-cols-2 gap-2">
							{tabConfig.slice(4).map((tab) => (
								<Button
									key={tab.id}
									variant={activeTab === tab.id ? 'default' : 'outline'}
									className={cn(
										'flex items-center justify-center h-10 px-2 text-sm',
										activeTab === tab.id
											? 'bg-brand-magenta text-white'
											: 'bg-white hover:bg-brand-magenta/10 hover:text-brand-magenta hover:border-brand-magenta'
									)}
									onClick={() => setActiveTab(tab.id)}
								>
									{tab.icon}
									<span className="truncate">{tab.label}</span>
								</Button>
							))}
						</div>
					</div>

					{/* Versão desktop: tabs horizontais */}
					<TabsList className="hidden md:flex w-full mb-4 overflow-x-auto">
						{tabConfig.map((tab) => (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="flex items-center whitespace-nowrap data-[state=active]:bg-brand-magenta data-[state=active]:text-white"
							>
								{tab.icon}
								{tab.label}
							</TabsTrigger>
						))}
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
						) : error ? (
							// Estado de erro
							<div className="text-center py-16">
								<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
									<AlertCircle className="h-10 w-10 text-red-500" />
								</div>
								<h2 className="mt-4 text-xl font-medium text-gray-900">
									Erro ao carregar histórico
								</h2>
								<p className="mt-2 text-gray-500 max-w-md mx-auto">{error}</p>
								<Button
									onClick={() => router.push('/store')}
									className="mt-6 bg-brand-magenta hover:bg-brand-magenta/90"
								>
									<ShoppingBag className="mr-2 h-4 w-4" />
									Voltar para a loja
								</Button>
							</div>
						) : filteredOrders.length > 0 ? (
							// Lista de pedidos
							<div className="space-y-4">
								{filteredOrders.map((order) => {
									const statusKey = mapStatusToFrontend(order.status);
									const statusConfig = orderStatusConfig[statusKey];

									return (
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
															<Badge className={statusConfig.color}>
																{statusConfig.label}
															</Badge>
															{order.source === 'manual' && (
																<Badge
																	variant="outline"
																	className="bg-gradient-to-r from-brand-magenta/10 to-brand-orange/10 text-gray-700 border-brand-magenta/20 text-xs py-1 px-2 shadow-sm flex items-center gap-1 whitespace-nowrap max-w-[calc(100vw-3rem)] truncate md:max-w-none"
																>
																	<Settings
																		size={12}
																		className="text-brand-magenta shrink-0"
																	/>
																	<span className="truncate">
																		Pedido Padrão (gerado pelo sistema)
																	</span>
																</Badge>
															)}
														</div>

														<div className="mt-2 grid grid-cols-2 gap-2 text-sm">
															<div className="flex items-center gap-1 text-gray-500">
																<CalendarDays className="h-4 w-4" />
																<span>{formatOrderDate(order.createdAt)}</span>
															</div>
															<div className="flex items-center gap-1 text-gray-500">
																<Clock className="h-4 w-4" />
																<span>{formatOrderTime(order.createdAt)}</span>
															</div>
														</div>

														<div className="mt-4 space-y-2">
															{order.__items__.map((item) => (
																<div
																	key={item.id}
																	className="flex items-center gap-3"
																>
																	<div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
																		{item.__product__.images &&
																		item.__product__.images.length > 0 ? (
																			<img
																				src={item.__product__.images[0]}
																				alt={item.__product__.name}
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
																			{item.__product__.name}
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
																{formatCurrency(parseFloat(order.total))}
															</p>

															<div className="text-sm text-gray-500">
																Total de itens:{' '}
																{order.__items__.reduce(
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
									);
								})}
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
										: `Você não tem pedidos ${orderStatusConfig[
												activeTab as keyof typeof orderStatusConfig
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
