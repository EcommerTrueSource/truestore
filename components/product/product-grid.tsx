'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { fetchProducts, fetchCategories } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { ProductSkeleton } from '@/components/product/product-skeleton';
import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRODUCTS_PER_PAGE = 8; // Número de produtos exibidos inicialmente

export default function ProductGrid() {
	const searchParams = useSearchParams();
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [visibleProducts, setVisibleProducts] = useState(PRODUCTS_PER_PAGE);

	const categoryId = searchParams.get('category');
	const sortBy = searchParams.get('sort') || 'name-asc';
	const searchQuery = searchParams.get('search') || '';

	useEffect(() => {
		const getProducts = async () => {
			setIsLoading(true);
			try {
				const [productsData, categoriesData] = await Promise.all([
					fetchProducts({ categoryId, sortBy }),
					fetchCategories(),
				]);
				setProducts(productsData);
				setCategories(categoriesData);
			} catch (error) {
				console.error('Failed to fetch products:', error);
			} finally {
				setIsLoading(false);
			}
		};

		getProducts();
	}, [categoryId, sortBy]);

	// Filtrar produtos com base na pesquisa
	const filteredProducts = searchQuery
		? products.filter(
				(product) =>
					product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					product.description.toLowerCase().includes(searchQuery.toLowerCase())
		  )
		: products;

	const loadMoreProducts = () => {
		setVisibleProducts((prev) => prev + PRODUCTS_PER_PAGE);
	};

	const hasMoreProducts = filteredProducts.length > visibleProducts;

	if (isLoading) {
		return <ProductSkeleton />;
	}

	if (filteredProducts.length === 0) {
		return (
			<div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
				<div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
					<Search className="h-8 w-8 text-gray-400" />
				</div>
				<h3 className="text-lg font-medium text-gray-900 mb-1">
					Nenhum produto encontrado
				</h3>
				<p className="text-gray-500 max-w-md mx-auto">
					Tente ajustar seus filtros ou termos de busca para encontrar o que
					procura.
				</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => (window.location.href = '/store')}
				>
					Ver todos os produtos
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{filteredProducts.slice(0, visibleProducts).map((product) => (
					<ProductCard
						key={product.id}
						product={product}
						categories={categories}
					/>
				))}
			</div>

			{hasMoreProducts && (
				<div className="flex justify-center pt-4">
					<Button
						onClick={loadMoreProducts}
						variant="outline"
						className="border-brand-magenta text-brand-magenta hover:bg-brand-magenta/10"
					>
						Carregar mais produtos
						<ChevronDown size={16} className="ml-1" />
					</Button>
				</div>
			)}

			<div className="flex justify-center">
				<p className="text-gray-500 text-sm">
					Exibindo {Math.min(visibleProducts, filteredProducts.length)} de{' '}
					{filteredProducts.length} produto(s)
				</p>
			</div>
		</div>
	);
}
