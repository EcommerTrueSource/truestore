'use client';

import { useState } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/contexts/cart-context';
import { formatCurrency } from '@/lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CartItemProps {
	id: string;
	name: string;
	price: number;
	quantity: number;
	imageUrl?: string;
}

export function CartItem({
	id,
	name,
	price,
	quantity,
	imageUrl,
}: CartItemProps) {
	const { updateQuantity, removeFromCart } = useCart();
	const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

	const formattedPrice = formatCurrency(price);
	const formattedTotal = formatCurrency(price * quantity);

	const handleRemoveItem = () => {
		setOpenRemoveDialog(false);
		removeFromCart(id);
	};

	return (
		<div className="flex items-center py-5 space-x-4 group hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
			<div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md relative">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={name}
						className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
						onError={(e) => {
							(e.target as HTMLImageElement).src = '/placeholder.svg';
						}}
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
						<span className="text-xs text-gray-500">Sem imagem</span>
					</div>
				)}
				<Badge
					variant="secondary"
					className="absolute bottom-0 right-0 bg-white/80 backdrop-blur-sm text-xs text-gray-700 border-0"
				>
					{formattedPrice}
				</Badge>
			</div>

			<div className="flex-1 flex flex-col">
				<div className="flex justify-between">
					<h3 className="font-medium text-gray-900">{name}</h3>
					<AlertDialog
						open={openRemoveDialog}
						onOpenChange={setOpenRemoveDialog}
					>
						<AlertDialogTrigger asChild>
							<button
								className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
								aria-label="Remover item"
							>
								<Trash2 size={18} />
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Remover item do carrinho?</AlertDialogTitle>
								<AlertDialogDescription>
									Deseja remover "{name}" do seu carrinho de compras?
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleRemoveItem}
									className="bg-red-500 hover:bg-red-600"
								>
									Sim, remover
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>

				<div className="mt-1 flex items-end justify-between">
					<div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 p-1">
						<button
							onClick={() => updateQuantity(id, quantity - 1)}
							disabled={quantity <= 1}
							className="p-1 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
							aria-label="Diminuir quantidade"
						>
							<Minus size={14} />
						</button>

						<span className="mx-3 w-5 text-center font-medium text-gray-900">
							{quantity}
						</span>

						<button
							onClick={() => updateQuantity(id, quantity + 1)}
							className="p-1 rounded-md hover:bg-gray-200 transition-colors"
							aria-label="Aumentar quantidade"
						>
							<Plus size={14} />
						</button>
					</div>

					<div className="flex flex-col items-end">
						<div className="text-brand-magenta font-bold">{formattedTotal}</div>
						{quantity > 1 && (
							<div className="text-xs text-gray-500">
								{quantity}x {formattedPrice}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
