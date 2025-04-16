'use client';

import { useCart } from '@/lib/contexts/cart-context';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, CreditCard, Tag, Truck, Calculator } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
	className?: string;
}

export function OrderSummary({ className }: OrderSummaryProps) {
	const { cartItems, totalItems, totalPrice } = useCart();

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

					<div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
						<p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
							<CreditCard size={12} className="text-gray-400" />
							Pagamento seguro processado na entrega
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
