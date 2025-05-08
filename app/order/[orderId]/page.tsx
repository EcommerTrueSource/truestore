'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Package,
	ArrowLeft,
	Clock,
	Truck,
	CalendarDays,
	CreditCard,
	ShoppingBag,
	MapPin,
	AlertCircle,
	Loader2,
	CheckCircle2,
	FileText,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import {
	Order,
	mapStatusToFrontend,
	orderStatusConfig,
	formatOrderDate,
	formatOrderTime,
} from '@/types/order';
import { useToast } from '@/components/ui/use-toast';

// Animações
const fadeIn = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

export default function OrderDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const orderId = params?.orderId as string;
	const [order, setOrder] = useState<Order | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDeliveryInfoOpen, setIsDeliveryInfoOpen] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		const fetchOrderDetails = async () => {
			if (!orderId) return;

			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/orders/${orderId}`);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(
						errorData.error ||
							`Erro ao carregar detalhes do pedido: ${response.status}`
					);
				}

				const data = await response.json();
				setOrder(data.order);
			} catch (error) {
				console.error('Erro ao carregar detalhes do pedido:', error);
				setError(
					error instanceof Error
						? error.message
						: 'Erro ao carregar detalhes do pedido'
				);
				toast({
					variant: 'destructive',
					title: 'Erro ao carregar detalhes',
					description:
						error instanceof Error
							? error.message
							: 'Ocorreu um erro ao buscar os detalhes do pedido.',
				});
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrderDetails();
	}, [orderId, toast]);

	if (isLoading) {
		return (
			<StoreLayout>
				<div className="container max-w-4xl py-10 mx-auto">
					<div className="flex justify-center items-center min-h-[50vh]">
						<div className="relative">
							<div className="absolute -inset-4 rounded-full bg-gradient-to-r from-brand-magenta/20 to-brand-blue/20 blur-xl animate-pulse"></div>
							<Loader2 className="h-10 w-10 text-brand-magenta animate-spin relative" />
						</div>
					</div>
				</div>
			</StoreLayout>
		);
	}

	if (error || !order) {
		return (
			<StoreLayout>
				<div className="container max-w-4xl py-10 mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center py-16"
					>
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
							<AlertCircle className="h-10 w-10 text-red-500" />
						</div>
						<h2 className="mt-4 text-xl font-medium text-gray-900">
							{error || 'Pedido não encontrado'}
						</h2>
						<p className="mt-2 text-gray-500 max-w-md mx-auto">
							Não foi possível carregar os detalhes deste pedido.
						</p>
						<Button
							onClick={() => router.push('/purchase-history')}
							className="mt-6 bg-brand-magenta hover:bg-brand-magenta/90"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Voltar para o histórico
						</Button>
					</motion.div>
				</div>
			</StoreLayout>
		);
	}

	// Mapear o status para um formato amigável
	const statusKey = mapStatusToFrontend(order.status);
	const statusConfig = orderStatusConfig[statusKey];

	// Calcular totais
	const totalItems = order.__items__.reduce(
		(acc, item) => acc + item.quantity,
		0
	);
	const totalValue = parseFloat(order.total);
	const discount = parseFloat(order.discount) || 0;
	const shippingCost = parseFloat(order.shippingCost) || 0;

	return (
		<StoreLayout>
			<div className="container max-w-4xl py-10 mx-auto">
				{/* Botão para voltar */}
				<motion.div
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.3 }}
				>
					<Button
						variant="ghost"
						className="mb-6 flex items-center text-gray-600 hover:text-gray-900 group"
						onClick={() => router.push('/purchase-history')}
					>
						<ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
						Voltar para o histórico
					</Button>
				</motion.div>

				{/* Cabeçalho do Pedido */}
				<motion.div
					variants={fadeIn}
					initial="hidden"
					animate="visible"
					className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"
				>
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 rounded-full bg-brand-magenta/10 flex items-center justify-center">
								<Package className="h-6 w-6 text-brand-magenta" />
							</div>
							<div>
								<h1 className="text-2xl font-bold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent">
									Pedido #{order.id.substring(0, 8)}
								</h1>
								<p className="text-gray-500 text-sm">
									Realizado em {formatOrderDate(order.createdAt)} às{' '}
									{formatOrderTime(order.createdAt)}
								</p>
							</div>
						</div>
						<div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
							<Badge
								className={`${statusConfig.color} py-1.5 px-3 text-sm font-medium shadow-sm`}
							>
								{statusConfig.label}
							</Badge>
							{order.source === 'manual' && (
								<Badge
									variant="outline"
									className="bg-gray-50 text-gray-600 border-gray-200 text-xs py-1 px-2 shadow-sm"
								>
									Pedido Padrão (gerado pelo sistema)
								</Badge>
							)}
						</div>
					</div>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-6">
					{/* Detalhes do pedido (2/3 da largura) */}
					<motion.div
						variants={stagger}
						initial="hidden"
						animate="visible"
						className="md:col-span-2 space-y-6"
					>
						{/* Itens do pedido */}
						<motion.div
							variants={fadeIn}
							className="bg-white rounded-xl shadow-sm border border-gray-100"
						>
							<CardHeader className="pb-2">
								<CardTitle className="text-lg font-medium text-gray-900">
									Itens do Pedido
								</CardTitle>
							</CardHeader>
							<CardContent className="pb-2">
								<div className="space-y-4">
									{order.__items__.map((item) => (
										<motion.div
											key={item.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
										>
											<div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
												{item.__product__.images &&
												item.__product__.images.length > 0 ? (
													<img
														src={item.__product__.images[0]}
														alt={item.__product__.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<ShoppingBag className="h-6 w-6 text-gray-400" />
													</div>
												)}
											</div>
											<div className="flex-grow">
												<h3 className="font-medium text-gray-900">
													{item.__product__.name}
												</h3>
												<p className="text-sm text-gray-500">
													SKU: {item.__product__.sku}
												</p>
												<div className="flex justify-between items-center mt-2">
													<span className="text-sm text-gray-500">
														{item.quantity} x{' '}
														{formatCurrency(parseFloat(item.price))}
													</span>
													<span className="font-medium text-brand-magenta">
														{formatCurrency(parseFloat(item.total))}
													</span>
												</div>
											</div>
										</motion.div>
									))}
								</div>
							</CardContent>
						</motion.div>

						{/* Informações de Entrega */}
						<motion.div
							variants={fadeIn}
							className="bg-white rounded-xl shadow-sm border border-gray-100"
						>
							<div
								className="p-4 flex justify-between items-center cursor-pointer"
								onClick={() => setIsDeliveryInfoOpen(!isDeliveryInfoOpen)}
							>
								<div className="flex items-center gap-2">
									<Truck className="h-5 w-5 text-brand-magenta" />
									<h3 className="font-medium text-gray-900">
										Informações de Entrega
									</h3>
								</div>
								{isDeliveryInfoOpen ? (
									<ChevronUp className="h-5 w-5 text-gray-500" />
								) : (
									<ChevronDown className="h-5 w-5 text-gray-500" />
								)}
							</div>

							<AnimatePresence>
								{isDeliveryInfoOpen && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="overflow-hidden"
									>
										<Separator />
										<div className="p-4 space-y-3">
											<div className="flex items-start gap-2">
												<MapPin className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
												<div>
													<p className="font-medium text-gray-700">
														Endereço de Entrega
													</p>
													<p className="text-sm text-gray-600">
														{order.shippingAddress}
													</p>
												</div>
											</div>
											<div className="flex items-start gap-2">
												<Truck className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
												<div>
													<p className="font-medium text-gray-700">
														Transportadora
													</p>
													<p className="text-sm text-gray-600">
														{order.shippingCarrier}
													</p>
												</div>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>

						{/* Notas do Pedido (se existirem) */}
						{order.notes && order.notes !== 'Nenhuma observação' && (
							<motion.div
								variants={fadeIn}
								className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
							>
								<div className="flex items-start gap-2">
									<FileText className="h-5 w-5 text-brand-magenta mt-0.5 shrink-0" />
									<div>
										<h3 className="font-medium text-gray-900">Observações</h3>
										<p className="text-sm text-gray-600 mt-1">{order.notes}</p>
									</div>
								</div>
							</motion.div>
						)}
					</motion.div>

					{/* Resumo do pedido (1/3 da largura) */}
					<motion.div
						variants={fadeIn}
						initial="hidden"
						animate="visible"
						className="md:col-span-1"
					>
						<Card className="bg-white shadow-sm border border-gray-100 sticky top-6">
							<CardHeader className="pb-2">
								<CardTitle className="text-lg font-medium text-gray-900">
									Resumo do Pedido
								</CardTitle>
							</CardHeader>
							<CardContent className="pb-6">
								<div className="space-y-6">
									{/* Detalhes de Pagamento */}
									<div>
										<h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
											<CreditCard className="h-4 w-4 text-brand-magenta" />
											Pagamento
										</h3>
										<div className="bg-gray-50 rounded-lg p-3">
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Status</span>
												<span className="text-gray-900 font-medium capitalize">
													{order.paymentStatus.replace('_', ' ')}
												</span>
											</div>
										</div>
									</div>

									{/* Valores e Totais */}
									<div>
										<h3 className="text-sm font-medium text-gray-700 mb-3">
											Valores
										</h3>
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Subtotal</span>
												<span className="text-gray-900">
													{formatCurrency(totalValue)}
												</span>
											</div>

											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Frete</span>
												<span className="text-gray-900">
													{shippingCost > 0
														? formatCurrency(shippingCost)
														: 'Grátis'}
												</span>
											</div>

											{discount > 0 && (
												<div className="flex justify-between text-sm">
													<span className="text-gray-600">Desconto</span>
													<span className="text-green-600">
														-{formatCurrency(discount)}
													</span>
												</div>
											)}

											<Separator className="my-2" />

											<div className="flex justify-between font-medium">
												<span className="text-gray-900">Total</span>
												<span className="text-brand-magenta text-lg">
													{formatCurrency(totalValue)}
												</span>
											</div>
										</div>
									</div>

									{/* Resumo */}
									<div className="bg-gray-50 rounded-lg p-3 space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Data do pedido</span>
											<span className="text-gray-900">
												{formatOrderDate(order.createdAt)}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Itens</span>
											<span className="text-gray-900">{totalItems}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">ID do pedido</span>
											<span className="text-gray-900">
												{order.id.substring(0, 8)}
											</span>
										</div>
									</div>
								</div>
							</CardContent>
							<CardFooter className="pt-0">
								<Button
									variant="outline"
									className="w-full border-brand-magenta text-brand-magenta hover:bg-brand-magenta/5"
									onClick={() => router.push('/purchase-history')}
								>
									<ArrowLeft className="mr-2 h-4 w-4" />
									Voltar para o histórico
								</Button>
							</CardFooter>
						</Card>
					</motion.div>
				</div>
			</div>
		</StoreLayout>
	);
}
