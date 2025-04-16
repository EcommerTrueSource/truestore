'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Heart,
	ShoppingBag,
	Trash2,
	ShoppingCart,
	Tag,
	AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { formatCurrency } from '@/lib/utils';
import { useFavorites } from '@/lib/contexts/favorites-context';
import { useCart } from '@/lib/contexts/cart-context';
import { toast } from 'sonner';
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
import { fetchCategories } from '@/lib/api';
import type { Category } from '@/types/category';

export default function FavoritesPage() {
	const router = useRouter();
	const {
		favorites,
		isLoading: isFavoritesLoading,
		removeFromFavorites,
		clearFavorites,
	} = useFavorites();
	const { addToCart } = useCart();
	const [isAlertOpen, setIsAlertOpen] = useState(false);
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				// Buscar categorias
				const categoriesData = await fetchCategories();
				setCategories(categoriesData);
			} catch (error) {
				console.error('Erro ao carregar categorias:', error);
			} finally {
				// Simulação de carregamento para manter consistência com comportamento anterior
				setTimeout(() => {
					setIsLoading(false);
				}, 800);
			}
		};

		loadData();
	}, []);

	const handleRemoveFavorite = (productId: string) => {
		removeFromFavorites(productId);
		toast({
			title: 'Produto removido',
			description: 'Produto removido dos favoritos com sucesso',
			variant: 'default',
		});
	};

	const handleAddToCart = (product: Product) => {
		addToCart(product);
		toast({
			title: 'Produto adicionado',
			description: 'Produto adicionado ao carrinho com sucesso',
			variant: 'default',
		});
	};

	const handleClearAll = () => {
		setIsAlertOpen(true);
	};

	const confirmClearAll = () => {
		clearFavorites();
		toast({
			title: 'Favoritos limpos',
			description: 'Todos os itens foram removidos dos favoritos',
			variant: 'default',
		});
	};

	return (
		<StoreLayout hideSidebar={false}>
			<AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-xl bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
							Limpar favoritos
						</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja remover todos os itens dos favoritos? Esta
							ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmClearAll}
							className="bg-gradient-to-r from-brand-magenta to-brand-orange text-white hover:opacity-90"
						>
							<Trash2 size={16} className="mr-2" />
							Sim, limpar todos
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="max-w-6xl mx-auto py-8">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="h-10 w-10 rounded-full bg-brand-magenta/10 flex items-center justify-center">
							<Heart size={20} className="text-brand-magenta" />
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
								Meus Favoritos
							</h1>
							<p className="text-gray-500 text-sm">
								Produtos que você marcou como favoritos
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-gray-100">
						<div className="flex items-center gap-2">
							<Tag size={16} className="text-brand-magenta" />
							<span className="text-sm font-medium text-gray-700">
								Total de itens:
							</span>
							<Badge className="bg-brand-magenta">{favorites.length}</Badge>
						</div>

						{favorites.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="text-gray-500 hover:text-red-500 border-gray-200 hover:border-red-200"
								onClick={handleClearAll}
							>
								<Trash2 size={14} className="mr-1" />
								Limpar todos
							</Button>
						)}
					</div>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{Array.from({ length: 4 }).map((_, index) => (
							<Card key={index} className="overflow-hidden border-gray-200">
								<div className="h-48 bg-gray-100 animate-pulse"></div>
								<CardContent className="p-4 space-y-3">
									<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
									<div className="h-8 bg-gray-200 rounded animate-pulse"></div>
								</CardContent>
							</Card>
						))}
					</div>
				) : favorites.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{favorites.map((product) => (
							<div key={product.id} className="relative group">
								<ProductCard
									product={product}
									categories={categories}
									hideFavoriteShare={true}
								/>
								<div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onClick={() => handleRemoveFavorite(product.id)}
										className="h-9 w-9 rounded-full bg-white text-red-500 flex items-center justify-center hover:bg-red-50 transition-all shadow-sm"
										aria-label="Remover dos favoritos"
									>
										<Trash2 size={16} />
									</button>
									<button
										onClick={() => handleAddToCart(product)}
										className="h-9 w-9 rounded-full bg-white text-brand-magenta flex items-center justify-center hover:bg-brand-magenta/10 transition-all shadow-sm"
										aria-label="Adicionar ao carrinho"
									>
										<ShoppingCart size={16} />
									</button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-16 bg-white rounded-xl shadow-sm">
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
							<AlertCircle className="h-10 w-10 text-gray-400" />
						</div>
						<h2 className="mt-4 text-2xl font-medium text-gray-900">
							Você não tem favoritos
						</h2>
						<p className="mt-2 text-gray-500 max-w-md mx-auto">
							Adicione produtos à sua lista de favoritos para acompanhar preços
							e disponibilidade.
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
			</div>
		</StoreLayout>
	);
}
