'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
	ShoppingBag,
	CheckCircle,
	MapPin,
	Calendar,
	Clock,
	CreditCard,
	Package,
	ArrowRight,
	AlertCircle,
	Copy,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OrderItem {
	id: number;
	name: string;
	price: number;
	quantity: number;
	image?: string;
}

interface OrderData {
	name: string;
	phone: string;
	delivery: {
		zipCode: string;
		street: string;
		number: string;
		complement: string;
		neighborhood: string;
		city: string;
		state: string;
		country: string;
	};
	observations: string;
	items: OrderItem[];
	timestamp: string;
}

export default function ConfirmationPage() {
	const router = useRouter();
	const [orderData, setOrderData] = useState<OrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [orderNumber, setOrderNumber] = useState('');
	const [orderDate, setOrderDate] = useState('');
	const [orderTime, setOrderTime] = useState('');
	const [copySuccess, setCopySuccess] = useState(false);

	useEffect(() => {
		// Simulação de carregamento de dados com tempo reduzido
		setTimeout(() => {
			try {
				const storedOrder = sessionStorage.getItem('orderData');
				if (storedOrder) {
					const parsedOrder = JSON.parse(storedOrder);
					setOrderData(parsedOrder);

					// Gerar número de pedido aleatório
					const randomOrderNumber = `P${Math.floor(
						100000 + Math.random() * 900000
					)}`;
					setOrderNumber(randomOrderNumber);

					// Formatar data e hora
					const orderDateTime = new Date(parsedOrder.timestamp);
					setOrderDate(
						new Intl.DateTimeFormat('pt-BR', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						}).format(orderDateTime)
					);

					setOrderTime(
						new Intl.DateTimeFormat('pt-BR', {
							hour: '2-digit',
							minute: '2-digit',
						}).format(orderDateTime)
					);
				}
			} catch (error) {
				console.error('Erro ao carregar dados do pedido:', error);
			} finally {
				setIsLoading(false);
			}
		}, 300);
	}, []);

	const calculateTotal = () => {
		if (!orderData?.items) return 0;
		return orderData.items.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
	};

	const copyOrderNumber = () => {
		navigator.clipboard.writeText(orderNumber).then(() => {
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		});
	};

	if (isLoading) {
		return (
			<StoreLayout>
				<div className="h-full flex flex-col items-center justify-center p-8">
					<div className="mb-4 flex justify-center">
						<svg
							className="animate-spin h-10 w-10 text-brand"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
					<h3 className="text-lg font-medium text-gray-900">
						Processando seu pedido...
					</h3>
					<p className="text-gray-500 text-center mt-2">
						Estamos finalizando os detalhes da sua compra.
					</p>
				</div>
			</StoreLayout>
		);
	}

	if (!orderData) {
		return (
			<StoreLayout>
				<div className="max-w-4xl mx-auto py-12">
					<div className="text-center py-16 bg-white rounded-xl shadow-sm">
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mb-6">
							<AlertCircle className="h-10 w-10 text-amber-500" />
						</div>
						<h2 className="mt-4 text-2xl font-medium text-gray-900">
							Nenhum pedido encontrado
						</h2>
						<p className="mt-2 text-gray-500">
							Não conseguimos encontrar informações sobre o seu pedido.
						</p>
						<Button
							onClick={() => router.push('/store')}
							className="mt-6 bg-brand-magenta hover:bg-brand-magenta/90"
						>
							Voltar para a loja
						</Button>
					</div>
				</div>
			</StoreLayout>
		);
	}

	return (
		<StoreLayout>
			<div className="max-w-5xl mx-auto py-8">
				<div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
					<div className="text-center pb-8 mb-8 border-b border-dashed border-gray-100">
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6">
							<CheckCircle className="h-10 w-10 text-green-500" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900">
							Pedido Confirmado!
						</h1>
						<p className="mt-2 text-gray-600">
							Recebemos seu pedido e ele já está em processamento.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center mt-6 gap-2">
							<div className="flex items-center">
								<span className="text-gray-500 mr-2">Número do Pedido:</span>
								<span className="font-medium text-brand-magenta">
									{orderNumber}
								</span>
							</div>
							<button
								onClick={copyOrderNumber}
								className="inline-flex items-center text-xs text-gray-500 hover:text-brand-magenta p-1"
							>
								<Copy size={14} className="mr-1" />
								{copySuccess ? 'Copiado!' : 'Copiar'}
							</button>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<ShoppingBag size={18} className="text-brand-magenta" />
								Resumo do Pedido
							</h2>

							<Card className="border border-gray-100">
								<CardContent className="p-4">
									<div className="space-y-4">
										<div className="space-y-3">
											{orderData.items.map((item) => (
												<div key={item.id} className="flex items-start gap-3">
													<div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded overflow-hidden">
														{item.image ? (
															<img
																src={item.image}
																alt={item.name}
																className="h-full w-full object-cover"
															/>
														) : (
															<div className="h-full w-full flex items-center justify-center">
																<Package size={20} className="text-gray-400" />
															</div>
														)}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">
															{item.name}
														</p>
														<p className="text-xs text-gray-500">
															Qtd: {item.quantity} ×{' '}
															{formatCurrency(item.price)}
														</p>
													</div>
													<div className="text-sm font-medium text-brand-magenta">
														{formatCurrency(item.price * item.quantity)}
													</div>
												</div>
											))}
										</div>

										<div className="pt-3 border-t border-gray-100">
											<div className="flex justify-between items-center">
												<span className="text-sm text-gray-500">Subtotal</span>
												<span className="font-medium">
													{formatCurrency(calculateTotal())}
												</span>
											</div>
											<div className="flex justify-between items-center mt-1">
												<span className="text-sm text-gray-500">Frete</span>
												<span className="text-sm text-green-600 font-medium">
													Grátis
												</span>
											</div>
											<div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
												<span className="font-medium">Total</span>
												<span className="font-bold text-brand-magenta">
													{formatCurrency(calculateTotal())}
												</span>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<div>
							<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<MapPin size={18} className="text-brand-magenta" />
								Detalhes da Entrega
							</h2>

							<Card className="border border-gray-100 mb-4">
								<CardContent className="p-4">
									<div className="space-y-3">
										<div>
											<p className="text-sm font-medium text-gray-700">
												Cliente
											</p>
											<p className="text-sm text-gray-600">{orderData.name}</p>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-700">
												Telefone
											</p>
											<p className="text-sm text-gray-600">{orderData.phone}</p>
										</div>
										{orderData.delivery.street !== 'Não informado' && (
											<div>
												<p className="text-sm font-medium text-gray-700">
													Endereço
												</p>
												<p className="text-sm text-gray-600">
													{orderData.delivery.street},{' '}
													{orderData.delivery.number}
													{orderData.delivery.complement &&
														` - ${orderData.delivery.complement}`}
												</p>
												<p className="text-sm text-gray-600">
													{orderData.delivery.neighborhood},{' '}
													{orderData.delivery.city} - {orderData.delivery.state}
												</p>
												<p className="text-sm text-gray-600">
													{orderData.delivery.zipCode}
												</p>
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Calendar size={18} className="text-brand-magenta" />
								Data e Hora
							</h2>

							<Card className="border border-gray-100">
								<CardContent className="p-4">
									<div className="flex justify-between items-center">
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-gray-500" />
											<span className="text-sm text-gray-600">
												Data do Pedido
											</span>
										</div>
										<span className="text-sm font-medium">{orderDate}</span>
									</div>
									<div className="flex justify-between items-center mt-2">
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4 text-gray-500" />
											<span className="text-sm text-gray-600">Horário</span>
										</div>
										<span className="text-sm font-medium">{orderTime}</span>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="mt-8 pt-6 border-t border-dashed border-gray-100 text-center">
						<Button
							onClick={() => router.push('/store')}
							className="bg-brand-magenta hover:bg-brand-magenta/90"
						>
							Continuar Comprando
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
						<p className="mt-4 text-sm text-gray-500">
							Um email com os detalhes do pedido foi enviado para você.
						</p>
					</div>
				</div>
			</div>
		</StoreLayout>
	);
}
