'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	Search,
	ArrowDownAZ,
	ArrowDownZA,
	ArrowUpDown,
	X,
	Star,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/lib/contexts/categories-context';

export function ProductFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState('');
	const { categories } = useCategories();

	// Inicializar o estado searchQuery com o valor da URL quando o componente for montado
	useEffect(() => {
		const currentSearchQuery = searchParams.get('search') || '';
		setSearchQuery(currentSearchQuery);
	}, [searchParams]);

	const currentSort = searchParams.get('sort') || 'featured';
	const currentCategoryId = searchParams.get('category');

	// Encontrar o nome da categoria atual a partir do ID
	const getCurrentCategoryName = () => {
		if (!currentCategoryId) return null;

		const category = categories.find((cat) => cat.id === currentCategoryId);
		return category ? category.name : 'Categoria';
	};

	const handleSortChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('sort', value);
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const params = new URLSearchParams(searchParams);
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
		} else {
			params.delete('search');
		}
		router.push(`${pathname}?${params.toString()}`);
	};

	const clearFilters = () => {
		setSearchQuery('');
		router.push(pathname);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
		const params = new URLSearchParams(searchParams);
		params.delete('search');
		router.push(`${pathname}?${params.toString()}`);
	};

	const handleClearCategory = () => {
		const params = new URLSearchParams(searchParams);
		params.delete('category');
		params.delete('categoryName');
		router.push(`${pathname}?${params.toString()}`);
	};

	const hasActiveFilters =
		searchParams.has('search') ||
		currentSort !== 'featured' ||
		currentCategoryId;

	return (
		<div className="space-y-4">
			<div className="flex flex-col md:flex-row gap-4">
				<div className="relative flex-1">
					<form onSubmit={handleSearch}>
						<Search
							className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<Input
							placeholder="Buscar produtos..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 focus-visible:ring-brand-magenta border-gray-200"
						/>
						<Button
							variant="ghost"
							size="sm"
							type="submit"
							className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-brand text-white hover:opacity-90"
						>
							<Search size={16} className="text-white" />
						</Button>
					</form>
				</div>

				<div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:overflow-x-auto sm:pb-1.5 sm:scrollbar-hide">
					<Button
						variant={currentSort === 'featured' ? 'default' : 'outline'}
						size="sm"
						onClick={() => handleSortChange('featured')}
						className={`flex-shrink-0 ${
							currentSort === 'featured'
								? 'bg-brand hover:opacity-90'
								: 'border-gray-200 hover:border-brand-solid hover:text-brand-solid'
						}`}
					>
						<ArrowUpDown size={14} className="mr-1" /> Destaque
					</Button>
					<Button
						variant={currentSort === 'price-asc' ? 'default' : 'outline'}
						size="sm"
						onClick={() => handleSortChange('price-asc')}
						className={`flex-shrink-0 ${
							currentSort === 'price-asc'
								? 'bg-brand hover:opacity-90'
								: 'border-gray-200 hover:border-brand-solid hover:text-brand-solid'
						}`}
					>
						<ArrowUpDown size={14} className="mr-1" /> Menor Preço
					</Button>
					<Button
						variant={currentSort === 'price-desc' ? 'default' : 'outline'}
						size="sm"
						onClick={() => handleSortChange('price-desc')}
						className={`flex-shrink-0 ${
							currentSort === 'price-desc'
								? 'bg-brand hover:opacity-90'
								: 'border-gray-200 hover:border-brand-solid hover:text-brand-solid'
						}`}
					>
						<ArrowUpDown size={14} className="mr-1" /> Maior Preço
					</Button>
					<Button
						variant={currentSort === 'name-asc' ? 'default' : 'outline'}
						size="sm"
						onClick={() => handleSortChange('name-asc')}
						className={`flex-shrink-0 ${
							currentSort === 'name-asc'
								? 'bg-brand hover:opacity-90'
								: 'border-gray-200 hover:border-brand-solid hover:text-brand-solid'
						}`}
					>
						<ArrowDownAZ size={14} className="mr-1" /> A-Z
					</Button>

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="text-gray-500 hover:text-brand-magenta col-span-2"
						>
							<X size={16} className="mr-1" />
							Limpar filtros
						</Button>
					)}
				</div>
			</div>

			{/* Badges de filtros ativos */}
			{(searchParams.has('search') || currentCategoryId) && (
				<div className="mt-3 flex items-center gap-2 flex-wrap">
					<span className="text-sm text-gray-500">Filtros ativos:</span>

					{searchParams.has('search') && (
						<Badge variant="secondary" className="bg-gray-100">
							Busca: {searchParams.get('search')}
							<X
								size={14}
								className="ml-1 cursor-pointer"
								onClick={handleClearSearch}
							/>
						</Badge>
					)}

					{currentCategoryId && (
						<Badge
							variant="secondary"
							className="bg-gray-100 border-brand-light text-brand-solid"
						>
							Categoria: {getCurrentCategoryName()}
							<X
								size={14}
								className="ml-1 cursor-pointer"
								onClick={handleClearCategory}
							/>
						</Badge>
					)}
				</div>
			)}
		</div>
	);
}
