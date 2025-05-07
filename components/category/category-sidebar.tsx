'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	ShoppingBag,
	RefreshCw,
	Tag,
	Leaf,
	Heart,
	Zap,
	Sparkles,
	CircleDollarSign,
	Trophy,
	Dumbbell,
	Pill,
	Droplet,
	Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories } from '@/lib/contexts/categories-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category } from '@/types/category';

// Interface para representar uma categoria agrupada
interface GroupedCategory extends Category {
	isGrouped: boolean;
	relatedCategories: string[]; // IDs das categorias relacionadas
	totalItems: number; // Soma de items de todas as categorias do grupo
	displayName?: string; // Nome para exibição (sem a palavra "unidade")
}

// Função para obter ícone personalizado baseado no nome da categoria
// Agora usando apenas Tag para todas as categorias (exceto Todos os produtos)
const getCategoryIcon = (categoryName: string) => {
	const size = 18;

	// Apenas "Todos os produtos" tem ícone diferente
	if (categoryName.toLowerCase() === 'todos os produtos') {
		return <ShoppingBag size={size} />;
	}

	// Todas as outras categorias usam Tag
	return <Tag size={size} />;
};

export function CategorySidebar() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { categories, isLoading, error, reload } = useCategories();
	const [displayedCategories, setDisplayedCategories] = useState<
		GroupedCategory[]
	>([]);
	const initialLoadComplete = useRef(false);

	const currentCategory = searchParams.get('category');

	// Função auxiliar para verificar se um nome contém a palavra "unidade"
	const hasUnidadeWord = (name: string) =>
		name.toLowerCase().includes('unidade');

	// Função para agrupar categorias com nomes similares
	const groupCategories = (
		originalCategories: Category[]
	): GroupedCategory[] => {
		// Mapa para rastrear categorias já processadas
		const processedCategoryIds = new Set<string>();
		const result: GroupedCategory[] = [];

		// Sempre adicionar "Todos os produtos" como primeira categoria, se existir
		const allCategory = originalCategories.find((cat) => cat.id === 'all');
		if (allCategory) {
			processedCategoryIds.add(allCategory.id);
			result.push({
				...allCategory,
				isGrouped: false,
				relatedCategories: [],
				totalItems: allCategory.itemQuantity || 0,
			});
		}

		// Primeiro, filtrar as categorias que contêm a palavra "unidade" (em qualquer capitalização)
		// para que possamos dar prioridade às versões sem "unidade"
		const categoriesWithoutUnidade = originalCategories.filter(
			(cat) => cat.id !== 'all' && !hasUnidadeWord(cat.name)
		);
		const categoriesWithUnidade = originalCategories.filter(
			(cat) => cat.id !== 'all' && hasUnidadeWord(cat.name)
		);

		// Primeiro processar categorias sem "unidade"
		categoriesWithoutUnidade.forEach((category) => {
			// Pular se já foi processada
			if (processedCategoryIds.has(category.id)) {
				return;
			}

			const baseName = category.name.trim();
			const baseNameLower = baseName.toLowerCase();
			const relatedCategories: Category[] = [];

			// Encontrar categorias relacionadas com "unidade" no nome
			categoriesWithUnidade.forEach((unidadeCat) => {
				if (!processedCategoryIds.has(unidadeCat.id)) {
					// Remover a palavra "unidade" para comparação
					const unidadeCatWithoutUnidade = unidadeCat.name
						.replace(/\s*[Uu]nidade\s*/g, '')
						.trim();

					// Verificar se após remover "unidade", corresponde à categoria base
					// ou é uma versão singular/plural
					if (
						unidadeCatWithoutUnidade.toLowerCase() === baseNameLower ||
						// Plural check
						unidadeCatWithoutUnidade.toLowerCase() + 's' === baseNameLower ||
						baseNameLower + 's' === unidadeCatWithoutUnidade.toLowerCase() ||
						// Removing trailing 's'
						(baseNameLower.endsWith('s') &&
							baseNameLower.substring(0, baseNameLower.length - 1) ===
								unidadeCatWithoutUnidade.toLowerCase()) ||
						(unidadeCatWithoutUnidade.toLowerCase().endsWith('s') &&
							unidadeCatWithoutUnidade
								.toLowerCase()
								.substring(
									0,
									unidadeCatWithoutUnidade.toLowerCase().length - 1
								) === baseNameLower)
					) {
						relatedCategories.push(unidadeCat);
						processedCategoryIds.add(unidadeCat.id);
						console.log(
							`[Sidebar] Oculta categoria com unidade: "${unidadeCat.name}" agrupada com "${category.name}"`
						);
					}
				}
			});

			// Verificar outras categorias sem "unidade" para agrupamento normal
			originalCategories.forEach((otherCat) => {
				if (
					otherCat.id !== category.id &&
					!processedCategoryIds.has(otherCat.id) &&
					otherCat.id !== 'all' &&
					!hasUnidadeWord(otherCat.name) // Ignorar categorias com "unidade"
				) {
					const otherNameLower = otherCat.name.toLowerCase();

					// Verificar se uma categoria é o plural/singular da outra (case-insensitive)
					const isSingularPluralMatch =
						// Base com 's' no final = otherName (ex: Nootrópicos = Nootrópico)
						(baseNameLower.endsWith('s') &&
							baseNameLower.substring(0, baseNameLower.length - 1) ===
								otherNameLower) ||
						// OtherName com 's' no final = baseName (ex: Nootrópico = Nootrópicos)
						(otherNameLower.endsWith('s') &&
							otherNameLower.substring(0, otherNameLower.length - 1) ===
								baseNameLower) ||
						// Comparação clássica de adicionar 's'
						baseNameLower + 's' === otherNameLower ||
						otherNameLower + 's' === baseNameLower;

					// Verificar se uma categoria é prefixo da outra
					const isPrefixMatch =
						otherNameLower.startsWith(baseNameLower) &&
						otherNameLower !== baseNameLower &&
						// Verificar se tem um espaço após o nome base
						(otherCat.name.substring(baseName.length, baseName.length + 1) ===
							' ' ||
							// Ou se tem um caractere especial como hífen, underline, etc.
							otherCat.name.substring(baseName.length, baseName.length + 1) ===
								'-' ||
							otherCat.name.substring(baseName.length, baseName.length + 1) ===
								'_');

					// Se qualquer uma das condições for atendida, agrupar as categorias
					if (isPrefixMatch || isSingularPluralMatch) {
						relatedCategories.push(otherCat);
						processedCategoryIds.add(otherCat.id);
						console.log(
							`[Sidebar] Agrupada: "${otherCat.name}" com "${
								category.name
							}" | Motivo: ${isPrefixMatch ? 'prefixo' : 'singular/plural'}`
						);
					}
				}
			});

			// Marcar esta categoria como processada
			processedCategoryIds.add(category.id);

			// Adicionar a categoria ao resultado final (mesmo sem relacionadas)
			if (relatedCategories.length > 0) {
				// Calcular o total de itens
				const totalItems =
					(category.itemQuantity || 0) +
					relatedCategories.reduce(
						(sum, cat) => sum + (cat.itemQuantity || 0),
						0
					);

				// Adicionar a categoria principal como um grupo
				result.push({
					...category,
					isGrouped: true,
					relatedCategories: relatedCategories.map((cat) => cat.id),
					totalItems,
				});
			} else {
				// Adicionar como categoria individual
				result.push({
					...category,
					isGrouped: false,
					relatedCategories: [],
					totalItems: category.itemQuantity || 0,
				});
			}
		});

		// Processar as categorias com "unidade" restantes (que não foram agrupadas)
		categoriesWithUnidade.forEach((unidadeCat) => {
			// Pular se já foi processada
			if (processedCategoryIds.has(unidadeCat.id)) {
				return;
			}

			// Remover a palavra "unidade" do nome para exibição
			const nameWithoutUnidade = unidadeCat.name
				.replace(/\s*[Uu]nidade\s*/g, '')
				.trim();

			// Adicionar à lista com o nome modificado
			result.push({
				...unidadeCat,
				name: nameWithoutUnidade, // Nome sem a palavra "unidade"
				isGrouped: false,
				relatedCategories: [],
				totalItems: unidadeCat.itemQuantity || 0,
			});

			processedCategoryIds.add(unidadeCat.id);
			console.log(
				`[Sidebar] Categoria com unidade exibida com nome modificado: "${unidadeCat.name}" -> "${nameWithoutUnidade}"`
			);
		});

		return result;
	};

	// Usar useMemo para calcular categorias agrupadas apenas quando as categorias mudarem
	const groupedCategories = useMemo(() => {
		return groupCategories(categories);
	}, [categories]);

	// Atualizar categorias exibidas apenas quando houver mudanças significativas
	useEffect(() => {
		// Se não temos categorias ainda e está carregando, manter estado atual
		if (categories.length === 0 && isLoading && !initialLoadComplete.current) {
			return;
		}

		// Se recebemos novas categorias e não há erro
		if (categories.length > 0 && !error) {
			setDisplayedCategories(groupedCategories);
			initialLoadComplete.current = true;
		}
	}, [categories, isLoading, error, groupedCategories]);

	// Log para debug e carregar categorias se necessário - com verificação para evitar loops
	useEffect(() => {
		// Apenas logar e verificar se precisamos forçar o carregamento se o estado mudou
		if (
			!initialLoadComplete.current &&
			pathname.includes('/store') &&
			categories.length === 0 &&
			!isLoading &&
			!error
		) {
			console.log(
				'[Sidebar] Forçando carregamento de categorias na página da loja'
			);
			reload();
		}
	}, [pathname, categories.length, isLoading, error, reload]);

	const handleCategoryClick = (category: GroupedCategory) => {
		const params = new URLSearchParams(searchParams);

		if (category.id === 'all') {
			params.delete('category');
			params.delete('categoryName');
			params.delete('categoryIds');
			console.log('[Sidebar] Selecionada categoria: Todos os produtos');
		} else {
			// Se é uma categoria agrupada, passar os IDs de todas as categorias relacionadas
			if (category.isGrouped && category.relatedCategories.length > 0) {
				// Incluir o ID da categoria principal e das relacionadas
				const allCategoryIds = [category.id, ...category.relatedCategories];

				// Definir o ID principal como o parâmetro 'category'
				params.set('category', category.id);

				// Adicionar o array completo de IDs como parâmetro separado
				params.set('categoryIds', JSON.stringify(allCategoryIds));

				console.log(
					`[Sidebar] Selecionada categoria agrupada: ${category.name} com ${
						category.relatedCategories.length + 1
					} categorias relacionadas`
				);
			} else {
				// Categoria normal, sem agrupamento
				params.set('category', category.id);
				params.delete('categoryIds');
			}

			if (category.name) {
				params.set('categoryName', category.name);
			}
		}

		router.push(`${pathname}?${params.toString()}`);
	};

	// Ordenar categorias por nome (exceto "Todos os produtos" que fica sempre no topo)
	const sortedCategories = [...displayedCategories].sort((a, b) => {
		// "Todos os produtos" sempre primeiro
		if (a.id === 'all') return -1;
		if (b.id === 'all') return 1;

		// As demais categorias em ordem alfabética
		return a.name.localeCompare(b.name, 'pt-BR');
	});

	// Renderizar skeletons somente no carregamento inicial
	if (isLoading && !initialLoadComplete.current) {
		return (
			<div className="p-4 space-y-4">
				<Skeleton className="h-6 w-3/4" />
				<div className="space-y-2">
					{Array.from({ length: 12 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</div>
		);
	}

	// Se houver erro, exibir mensagem para o usuário com opção de recarregar
	if (error && displayedCategories.length === 0) {
		return (
			<div className="p-4 space-y-4">
				<div className="flex items-center gap-2 mb-4">
					<div className="h-9 w-9 rounded-full icon-brand-container flex items-center justify-center">
						<ShoppingBag size={18} className="icon-brand" />
					</div>
					<h2 className="text-lg font-bold text-brand">Categorias</h2>
				</div>
				<div className="p-3 rounded-md bg-red-50 border border-red-100 text-red-800 text-sm">
					<p className="mb-2">
						Não foi possível carregar as categorias. Por favor, tente novamente.
					</p>
					<details className="mb-3 text-xs">
						<summary>Detalhes do erro</summary>
						<p className="mt-1 text-red-700">{error}</p>
					</details>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => reload()}
						className="w-full mt-1 flex items-center justify-center gap-2"
					>
						<RefreshCw size={14} />
						Tentar novamente
					</Button>
				</div>
			</div>
		);
	}

	// Se não houver categorias e não estiver carregando, exibir mensagem
	if (displayedCategories.length === 0 && !isLoading) {
		return (
			<div className="p-4 space-y-4">
				<div className="flex items-center gap-2 mb-4">
					<div className="h-9 w-9 rounded-full icon-brand-container flex items-center justify-center">
						<ShoppingBag size={18} className="icon-brand" />
					</div>
					<h2 className="text-lg font-bold text-brand">Categorias</h2>
				</div>
				<div className="p-3 rounded-md bg-gray-50 border border-gray-100 text-gray-600 text-sm">
					<p className="mb-2">Nenhuma categoria disponível no momento.</p>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => reload()}
						className="w-full mt-1 flex items-center justify-center gap-2"
					>
						<RefreshCw size={14} />
						Tentar novamente
					</Button>
				</div>
			</div>
		);
	}

	return (
		<aside className="h-full bg-white p-6 overflow-hidden flex flex-col">
			<div className="flex items-center gap-2 mb-4">
				<div className="h-9 w-9 rounded-full icon-brand-container flex items-center justify-center">
					<ShoppingBag size={18} className="icon-brand" />
				</div>
				<h2 className="text-lg font-bold text-brand">Categorias</h2>

				{/* Indicador de carregamento sutil para atualizações */}
				{isLoading && initialLoadComplete.current && (
					<div className="ml-auto">
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							className="w-5 h-5 rounded-full relative"
						>
							<RefreshCw size={16} className="text-brand animate-spin" />
						</motion.div>
					</div>
				)}
			</div>

			<ScrollArea className="flex-1 pr-4">
				<nav className="space-y-1 mb-4">
					<AnimatePresence mode="sync">
						{sortedCategories.map((category) => {
							const isSelected =
								currentCategory === category.id ||
								(!currentCategory && category.id === 'all');

							// Nome da categoria para exibição (sem "unidade")
							const displayName = hasUnidadeWord(category.name)
								? category.name.replace(/\s*[Uu]nidade\s*/g, '').trim()
								: category.name;

							return (
								<motion.div
									key={category.id}
									initial={{ opacity: 0, y: 5 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -5 }}
									transition={{ duration: 0.15 }}
								>
									<button
										onClick={() => handleCategoryClick(category)}
										className={cn(
											'w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-start gap-3 group min-h-[48px]',
											isSelected
												? 'bg-gradient-to-r from-brand-light to-brand-light/40 text-brand-solid font-medium shadow-sm'
												: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
										)}
									>
										<div
											className={cn(
												'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 mt-0.5',
												isSelected
													? 'bg-gradient-to-br from-brand-magenta to-brand-orange text-white shadow-sm'
													: 'bg-gray-50 text-gray-400 group-hover:text-brand-magenta group-hover:bg-gray-100'
											)}
										>
											{getCategoryIcon(displayName)}
										</div>
										<div className="flex-1 flex flex-col min-w-0">
											<span
												className={cn(
													'transition-all leading-tight line-clamp-2 text-sm',
													isSelected && 'translate-x-1'
												)}
												title={displayName} // Tooltip para nomes longos
											>
												{displayName}
											</span>
										</div>
										{category.id !== 'all' && (
											<Badge
												variant="outline"
												className={cn(
													'flex-shrink-0 text-xs self-start mt-1',
													isSelected
														? 'bg-brand-light border-brand'
														: 'bg-gray-50 border-gray-200 text-gray-500'
												)}
											>
												{category.isGrouped
													? category.totalItems
													: category.itemQuantity}
											</Badge>
										)}
									</button>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</nav>

				{/* Elemento decorativo */}
				<div className="rounded-lg bg-gradient-to-br from-brand-light to-brand-light/50 p-4 border border-gray-100 mb-6">
					<div className="text-sm text-brand">
						<p className="font-medium mb-1">Descubra produtos exclusivos</p>
						<p className="text-xs opacity-80">
							Navegue por nossas categorias para encontrar produtos exclusivos
							selecionados para você.
						</p>
					</div>
				</div>
			</ScrollArea>
		</aside>
	);
}
