'use client';

import { useCart } from '@/lib/contexts/cart-context';
import { formatCurrency } from '@/lib/utils';
import {
	ShoppingBag,
	CreditCard,
	Tag,
	Truck,
	Calculator,
	Wallet,
	Banknote,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCustomer } from '@/hooks/use-customer';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface OrderSummaryProps {
	className?: string;
}

export function OrderSummary({ className }: OrderSummaryProps) {
	const { cartItems, totalItems, totalPrice } = useCart();
	const { customer, isLoading, getAvailableBalance } = useCustomer();
	const [voucherBalance, setVoucherBalance] = useState(0);
	const [finalTotal, setFinalTotal] = useState(totalPrice);

	// Atualizar o saldo do voucher e o total final quando os dados mudarem
	useEffect(() => {
		if (!isLoading && customer) {
			const balance = getAvailableBalance();
			setVoucherBalance(balance);

			// Calcular o total final após aplicar o voucher
			// Se o saldo for maior que o preço total, o cliente não paga nada
			const newTotal = Math.max(0, totalPrice - balance);
			setFinalTotal(newTotal);
		} else {
			setVoucherBalance(0);
			setFinalTotal(totalPrice);
		}
	}, [isLoading, customer, totalPrice, getAvailableBalance]);

	// Valor do voucher a ser usado nesta compra (limitado ao totalPrice)
	const voucherUsed = Math.min(voucherBalance, totalPrice);

	// Saldo restante após esta compra
	const remainingBalance = Math.max(0, voucherBalance - totalPrice);

	return (
		<div
			className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 ${
				className || ''
			}`}
		>
			<div className="flex items-center gap-2 mb-4">
				<div className="h-8 w-8 rounded-full bg-brand-magenta/10 flex items-center justify-center">
					<ShoppingBag size={16} className="text-brand-magenta" />
				</div>
				<h2 className="text-lg font-bold bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
					Resumo do Pedido
				</h2>
			</div>

			{!isLoading && customer && voucherBalance > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-4 p-4 bg-brand-magenta/10 rounded-lg border border-brand-magenta/20"
				>
					<div className="flex items-center gap-2 mb-2">
						<Wallet size={16} className="text-brand-magenta" />
						<h3 className="font-medium text-brand-magenta">Seu Voucher</h3>
					</div>
					<div className="flex flex-col gap-1 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600">Saldo disponível:</span>
							<span className="font-semibold">
								{formatCurrency(voucherBalance)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Utilizado nesta compra:</span>
							<span className="font-semibold">
								{formatCurrency(voucherUsed)}
							</span>
						</div>
						<div className="flex justify-between border-t border-dashed border-brand-magenta/20 pt-1 mt-1">
							<span className="text-gray-600">Saldo restante:</span>
							<span className="font-semibold">
								{formatCurrency(remainingBalance)}
							</span>
						</div>
					</div>
				</motion.div>
			)}

			<div className="space-y-3">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<Tag size={16} className="text-gray-400" />
						<span className="text-gray-600">Itens:</span>
					</div>
					<span className="font-medium">{totalItems}</span>
				</div>

				{cartItems.length > 0 && (
					<div className="pt-3 space-y-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
						{cartItems.map((item) => (
							<div
								key={item.id}
								className="flex justify-between text-sm pb-2 border-b border-dashed border-gray-100"
							>
								<div className="flex items-center gap-2">
									<div className="h-6 w-6 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
										<img
											src={item.imageUrl}
											alt=""
											className="h-full w-full object-cover"
											onError={(e) => {
												(e.target as HTMLImageElement).src = '/placeholder.svg';
											}}
										/>
									</div>
									<span className="text-gray-700 font-medium truncate max-w-[120px]">
										{item.name}
									</span>
								</div>
								<div className="flex items-center gap-1 text-gray-900">
									<span className="text-xs text-gray-500">
										{item.quantity}x
									</span>
									<span>{formatCurrency(item.price)}</span>
								</div>
							</div>
						))}
					</div>
				)}

				<Separator className="my-3" />

				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<div className="flex items-center gap-2">
							<Calculator size={14} className="text-gray-400" />
							<span className="text-gray-500">Subtotal:</span>
						</div>
						<span className="text-gray-700">{formatCurrency(totalPrice)}</span>
					</div>

					{voucherUsed > 0 && (
						<div className="flex justify-between items-center text-sm">
							<div className="flex items-center gap-2">
								<Banknote size={14} className="text-green-500" />
								<span className="text-green-600">Voucher aplicado:</span>
							</div>
							<span className="text-green-600 font-medium">
								- {formatCurrency(voucherUsed)}
							</span>
						</div>
					)}

					<div className="flex justify-between items-center text-sm">
						<div className="flex items-center gap-2">
							<Truck size={14} className="text-gray-400" />
							<span className="text-gray-500">Entrega:</span>
						</div>
						<span className="text-green-500 font-medium">Grátis</span>
					</div>
				</div>

				<div className="mt-4 pt-4 border-t border-gray-100">
					<div className="flex justify-between items-center font-medium text-lg">
						<div className="flex items-center gap-2">
							<CreditCard size={18} className="text-brand-magenta" />
							<span>Total:</span>
						</div>
						<span className="text-brand-magenta font-bold">
							{formatCurrency(totalPrice)}
						</span>
					</div>

					{voucherUsed > 0 && (
						<div className="flex justify-between items-center text-sm mt-2">
							<span className="text-gray-700">Valor a pagar na entrega:</span>
							<span className="text-brand-blue font-semibold">R$ 0,00</span>
						</div>
					)}

					<div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
						<p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
							<CreditCard size={12} className="text-gray-400" />
							{finalTotal > 0
								? 'Pagamento seguro processado na entrega'
								: 'Pedido coberto integralmente pelo seu voucher'}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
