'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
	ShoppingCart,
	Heart,
	Share2,
	Plus,
	Minus,
	Trash2,
	CheckCircle,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { formatCurrency } from '@/lib/utils';
import { useFavorites } from '@/lib/contexts/favorites-context';
import { useCart } from '@/lib/contexts/cart-context';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
	product: Product;
	categories?: Category[];
	viewMode?: 'grid' | 'list';
	hideFavoriteShare?: boolean;
}

export function ProductCard({
	product,
	categories = [],
	viewMode = 'grid',
	hideFavoriteShare = false,
}: ProductCardProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [showAddedFeedback, setShowAddedFeedback] = useState(false);
	const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
	const [isAddingToCart, setIsAddingToCart] = useState(false);
	const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
	const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
	const router = useRouter();

	const isProductFavorite = isFavorite(product.id);
	const cartItem = cartItems.find((item) => item.id === product.id);
	const itemInCart = cartItem ? cartItem.quantity : 0;
	const isListView = viewMode === 'list';

	// Encontrar a categoria com base no categoryId do produto
	const getCategory = () => {
		// Se o produto já tiver o objeto de categoria, use-o diretamente
		if (product.category && product.category.name) {
			return {
				id: product.category.id || product.categoryId || '',
				name: product.category.name,
			};
		}

		// Caso contrário, tente encontrar pelo categoryId
		if (product.categoryId) {
			// Buscar a categoria usando o categoryId
			const category = categories.find((cat) => cat.id === product.categoryId);

			// Se encontrou, retornar o objeto
			if (category) {
				return {
					id: category.id,
					name: category.name,
				};
			}

			// Tentar encontrar por correspondência parcial se for um UUID
			if (product.categoryId.includes('-')) {
				const strippedProductCategoryId = product.categoryId.replace(/-/g, '');
				const matchedCategory = categories.find(
					(cat) => cat.id.replace(/-/g, '') === strippedProductCategoryId
				);

				if (matchedCategory) {
					return {
						id: matchedCategory.id,
						name: matchedCategory.name,
					};
				}
			}
		}

		// Verificar se temos a descrição com informação da categoria
		if (product.description && typeof product.description === 'string') {
			// Procurar padrões como "Categoria importada do Tiny: Nome da Categoria"
			const categoryMatch = product.description.match(
				/Categoria(?:\s+importada\s+do\s+Tiny)?:\s+([^,\.]+)/i
			);
			if (categoryMatch && categoryMatch[1]) {
				const categoryName = categoryMatch[1].trim();

				// Encontrar a categoria pelo nome
				const categoryByName = categories.find(
					(cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
				);

				if (categoryByName) {
					return {
						id: categoryByName.id,
						name: categoryByName.name,
					};
				}

				// Se não encontrou, retornar apenas o nome
				return {
					id: '',
					name: categoryName,
				};
			}
		}

		// Retornar objeto padrão como fallback
		return {
			id: '',
			name: 'Geral',
		};
	};

	// Obter a categoria completa para o produto atual
	const productCategory = getCategory();

	// Função auxiliar para obter apenas o nome da categoria (compatibilidade com código existente)
	const getCategoryName = () => productCategory.name;

	const handleLike = (e: React.MouseEvent) => {
		e.preventDefault();
		if (isProductFavorite) {
			removeFromFavorites(product.id);
		} else {
			addToFavorites(product);
		}
	};

	const handleShare = (e: React.MouseEvent) => {
		e.preventDefault();
		// Implementar compartilhamento via API Web Share se disponível
		if (navigator.share) {
			navigator
				.share({
					title: product.name,
					text: `Confira ${product.name} por ${formatCurrency(product.price)}`,
					url: window.location.href,
				})
				.catch((err) => console.error('Erro ao compartilhar:', err));
		} else {
			// Fallback: copiar para área de transferência
			navigator.clipboard
				.writeText(
					`${product.name} - ${formatCurrency(product.price)} - ${
						window.location.href
					}`
				)
				.then(() => {
					alert('Link copiado para a área de transferência!');
				});
		}
	};

	const handleAddToCart = () => {
		setIsAddingToCart(true);

		// Simular um pequeno delay para mostrar o estado de carregamento
		setTimeout(() => {
			addToCart(product);
			setIsAddingToCart(false);

			// Feedback visual
			setShowAddedFeedback(true);
			setTimeout(() => {
				setShowAddedFeedback(false);
			}, 1500);
		}, 600);
	};

	const handleIncreaseQuantity = () => {
		updateQuantity(product.id, itemInCart + 1);
	};

	const handleDecreaseQuantity = () => {
		if (itemInCart > 1) {
			updateQuantity(product.id, itemInCart - 1);
		} else {
			setOpenRemoveDialog(true);
		}
	};

	const handleRemoveFromCart = () => {
		setOpenRemoveDialog(false);
		removeFromCart(product.id);
	};

	return (
		<>
			{/* Diálogo de confirmação para remover o produto */}
			<AlertDialog open={openRemoveDialog} onOpenChange={setOpenRemoveDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover produto do carrinho?</AlertDialogTitle>
						<AlertDialogDescription>
							Deseja remover "{product.name}" do seu carrinho de compras?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveFromCart}
							className="bg-red-500 hover:bg-red-600"
						>
							Sim, remover
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div
				className={`bg-white rounded-xl overflow-hidden card-hover-effect group ${
					isListView ? 'flex' : 'block'
				}`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div
					className={`relative overflow-hidden bg-gray-100 ${
						isListView ? 'h-32 w-32 flex-shrink-0' : 'h-52'
					}`}
				>
					<div
						className={`absolute inset-0 flex items-center justify-center text-gray-400 transition-opacity ${
							isImageLoaded ? 'opacity-0' : 'opacity-100'
						}`}
					>
						<ShoppingCart size={24} className="opacity-20" />
					</div>
					<Image
						src={product.imageUrl || '/placeholder.svg?height=300&width=300'}
						alt={product.name}
						fill
						className={`object-cover transition-all duration-700 ${
							isHovered ? 'scale-110' : 'scale-100'
						} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
						onLoad={() => setIsImageLoaded(true)}
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
					/>

					{/* Quick action buttons - only show if hideFavoriteShare is false */}
					{!hideFavoriteShare && (
						<div
							className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
								isHovered
									? 'opacity-100 translate-x-0'
									: 'opacity-0 translate-x-2'
							}`}
						>
							<button
								onClick={handleLike}
								className={`h-8 w-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 ${
									isProductFavorite
										? 'bg-brand-magenta text-white'
										: 'bg-white/80 text-gray-600 hover:bg-white'
								}`}
								aria-label={
									isProductFavorite
										? 'Remover dos favoritos'
										: 'Adicionar aos favoritos'
								}
							>
								<Heart
									size={isListView ? 14 : 16}
									fill={isProductFavorite ? 'currentColor' : 'none'}
								/>
							</button>

							{!isListView && (
								<button
									onClick={handleShare}
									className="h-8 w-8 rounded-full backdrop-blur-md bg-white/80 text-gray-600 flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
									aria-label="Compartilhar produto"
								>
									<Share2 size={16} />
								</button>
							)}
						</div>
					)}

					{/* Category badge */}
					<div
						className={`absolute bottom-3 left-3 transition-all duration-300 ${
							isHovered
								? 'translate-y-0 opacity-100'
								: 'translate-y-2 opacity-0'
						}`}
					>
						<Badge
							variant="outline"
							className="bg-white/80 backdrop-blur-sm text-xs font-medium text-gray-700 border-0 cursor-pointer hover:bg-white/90"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (productCategory.id) {
									const params = new URLSearchParams();
									params.set('category', productCategory.id);
									params.set('categoryName', productCategory.name);
									router.push(`/store?${params.toString()}`);
								}
							}}
						>
							{getCategoryName()}
						</Badge>
					</div>

					{/* Cart count badge */}
					{itemInCart > 0 && !isHovered && (
						<div className="absolute top-3 left-3">
							<Badge className="badge-brand">{itemInCart} no carrinho</Badge>
						</div>
					)}

					{/* Botão de remover do carrinho quando hovering */}
					{itemInCart > 0 && (
						<div
							className={`absolute top-3 left-3 transition-all duration-300 ${
								isHovered ? 'translate-y-0 opacity-100' : 'opacity-0'
							}`}
						>
							<button
								onClick={() => setOpenRemoveDialog(true)}
								className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md shadow-sm transition-colors"
								aria-label="Remover do carrinho"
							>
								<Trash2 size={12} />
								Remover
							</button>
						</div>
					)}
				</div>

				<div className={`p-4 ${isListView ? 'flex-1 flex flex-col' : ''}`}>
					<div
						className={`${
							isListView ? 'flex justify-between items-start' : ''
						}`}
					>
						<div className={`${isListView ? 'flex-1' : ''}`}>
							<h3 className="font-medium text-gray-900 text-lg mb-1 truncate text-brand-hover transition-colors">
								{product.name}
							</h3>

							<div className="flex items-center text-xs text-gray-500 mb-2">
								{product.codigo && (
									<>
										<span className="mr-1">Cód. {product.codigo}</span>
										<span className="mx-1">•</span>
									</>
								)}
								{productCategory.id ? (
									<button
										className="text-gray-500 hover:text-brand-magenta hover:underline transition-colors"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											const params = new URLSearchParams();
											params.set('category', productCategory.id);
											params.set('categoryName', productCategory.name);
											router.push(`/store?${params.toString()}`);
										}}
									>
										{getCategoryName()}
									</button>
								) : (
									<span>{getCategoryName()}</span>
								)}
							</div>
						</div>

						{isListView && (
							<div className="text-right">
								<div className="text-brand font-bold text-lg">
									{formatCurrency(product.price)}
								</div>
							</div>
						)}
					</div>

					{!isListView && (
						<div className="mb-3">
							<div className="text-brand font-bold text-lg">
								{formatCurrency(product.price)}
							</div>
						</div>
					)}

					<div className={`${isListView ? 'mt-auto' : ''}`}>
						{/* Cart buttons */}
						{showAddedFeedback ? (
							<Button
								variant="outline"
								className="w-full text-green-600 bg-green-50 border-green-100 hover:bg-green-100 hover:text-green-700 transition-colors cursor-default"
								disabled
							>
								<CheckCircle size={16} className="mr-1" />
								Adicionado
							</Button>
						) : itemInCart === 0 ? (
							<Button
								onClick={handleAddToCart}
								className="w-full bg-brand text-white hover:opacity-90"
								disabled={isAddingToCart}
							>
								{isAddingToCart ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Adicionando...
									</>
								) : (
									<>
										<Plus className="mr-2 h-4 w-4" />
										Adicionar ao carrinho
									</>
								)}
							</Button>
						) : (
							<div className="flex items-center justify-between gap-2 border rounded-md overflow-hidden">
								<button
									onClick={handleDecreaseQuantity}
									className="bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center h-10 w-10 transition-colors"
									aria-label="Diminuir quantidade"
								>
									<Minus size={14} />
								</button>
								<span className="font-medium text-gray-800">{itemInCart}</span>
								<button
									onClick={handleIncreaseQuantity}
									className="bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center h-10 w-10 transition-colors"
									aria-label="Aumentar quantidade"
								>
									<Plus size={14} />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
