'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Grid3X3, List, SearchIcon, ChevronDown } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { ProductFilters } from '@/components/product/product-filters';
import { fetchProducts, searchProducts } from '@/lib/api';
import type { Product } from '@/types/product';
import { useCategories } from '@/lib/contexts/categories-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { authService } from '@/lib/services/auth-service';
import { tokenStore } from '@/lib/token-store';
import { motion } from 'framer-motion';
import { CategorySidebar } from '@/components/category/category-sidebar';

// Número de produtos por página
const PRODUCTS_PER_PAGE = 12;
// Limite máximo de produtos que a API pode retornar por requisição
const MAX_API_PRODUCTS = 100;

/**
 * Componente para verificar token e controlar recarregamento
 */
const TokenVerifier = () => {
	useEffect(() => {
		try {
			// Verificar se temos um token válido na store
			if (tokenStore.hasValidToken()) {
				console.log('[Store] Token válido encontrado');
				// Resetar o contador de recargas quando temos um token válido
				tokenStore.resetReloadTracker();
				return;
			}

			// Verificar se há parâmetros de URL que indicam navegação intencional
			// (filtros, busca, ordenação, etc)
			const url = new URL(window.location.href);
			const hasCategory = url.searchParams.has('category');
			const hasSearch = url.searchParams.has('search');
			const hasSort = url.searchParams.has('sort');

			// Se não tem token e não tem parâmetros específicos, tentar recarregar
			// para dar outra chance de obter o token (talvez de um armazenamento persistente)
			if (!hasCategory && !hasSearch && !hasSort) {
				// Usar o controle de recargas para evitar loops infinitos
				if (tokenStore.trackReload(2)) {
					console.log(
						'[Store] Recarregando página para tentar recuperar token...'
					);
					window.location.reload();
				} else {
					console.log(
						'[Store] Limite de recargas atingido, redirecionando para login...'
					);
					window.location.href = '/login';
				}
			} else {
				console.log('[Store] Usuário navegando com filtros, não recarregando');
			}
		} catch (error) {
			console.error('[Store] Erro ao verificar token:', error);
		}
	}, []);

	return null; // Este componente não renderiza nada
};

export default function StorePage() {
	const searchParams = useSearchParams();
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [totalProducts, setTotalProducts] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const { categories } = useCategories();
	const { getJwtToken, isAuthenticated, isLoading: authLoading } = useAuth();
	const router = useRouter();
	const loaderRef = useRef<HTMLDivElement>(null);
	const [dataLoadAttempts, setDataLoadAttempts] = useState(0);
	const maxLoadAttempts = 3;

	const categoryId = searchParams.get('category');
	const searchQuery = searchParams.get('search');
	const sortBy = searchParams.get('sort') || 'featured';
	const isGridView = viewMode === 'grid';

	const setIsGridView = (isGrid: boolean) =>
		setViewMode(isGrid ? 'grid' : 'list');

	const loadProducts = async (currentPage: number, append: boolean = false) => {
		if (append) {
			setIsLoadingMore(true);
		} else {
			setIsLoading(true);
			setError(null);
		}

		try {
			// Verificar se o usuário está autenticado
			if (!isAuthenticated) {
				setError(
					'Usuário não autenticado. Faça login para visualizar os produtos.'
				);
				setIsLoading(false);
				return;
			}

			// Obter o token JWT para autenticação
			const jwtToken = await getJwtToken();

			if (!jwtToken) {
				setError(
					'Não foi possível obter o token de autenticação. Tente fazer login novamente.'
				);
				setIsLoading(false);

				// Se ainda não excedemos o número máximo de tentativas, tentar novamente após um atraso
				if (dataLoadAttempts < maxLoadAttempts) {
					console.log(
						`[StorePage] Tentativa ${
							dataLoadAttempts + 1
						} de ${maxLoadAttempts} para carregar produtos`
					);
					setDataLoadAttempts((prev) => prev + 1);
					setTimeout(() => {
						loadProducts(currentPage, append);
					}, 1000);
				}

				return;
			}

			console.log(
				`[StorePage] Iniciando busca de produtos - página ${currentPage}...`
			);

			// Encontrar a categoria atual e seus dados
			let categoryName = searchParams.get('categoryName');
			let categoryItemCount: number | undefined = undefined;

			if (categoryId && categoryId !== 'all') {
				const selectedCategory = categories.find(
					(cat) => cat.id === categoryId
				);

				if (selectedCategory) {
					// Usar o nome da categoria da URL se disponível, caso contrário usar da lista de categorias
					if (!categoryName) {
						categoryName = selectedCategory.name;
					}

					// Obter o número de itens na categoria para ajustar o limite
					if (selectedCategory.itemQuantity) {
						categoryItemCount = Number(selectedCategory.itemQuantity);
						console.log(
							`[StorePage] Categoria ${categoryName} tem ${categoryItemCount} itens`
						);
					}

					console.log(
						`[StorePage] Buscando produtos da categoria: ${categoryName} (ID: ${categoryId})`
					);
				}
			}

			// Usar a nova função de busca avançada com o número de itens da categoria
			const productsData = await searchProducts({
				query: searchQuery || undefined,
				categoryId,
				categoryName,
				categoryItemCount,
				sortBy,
				jwtToken,
				page: currentPage,
				limit: PRODUCTS_PER_PAGE,
				searchQuery: searchQuery || undefined,
			});

			if (append) {
				// Adicionar os novos produtos à lista existente
				setProducts((prev) => [...prev, ...productsData]);
			} else {
				// Substituir completamente a lista de produtos
				setProducts(productsData);
			}

			// Verificar se há mais produtos para carregar
			if (productsData.length === MAX_API_PRODUCTS) {
				// Quando retorna 100 produtos (o máximo), assumimos que pode haver mais
				setHasMore(true);
				console.log(
					'[StorePage] Limite máximo de produtos atingido (100), habilitando carregamento de mais'
				);
			} else if (
				categoryItemCount &&
				(append ? totalProducts + productsData.length : productsData.length) <
					categoryItemCount
			) {
				// Se sabemos o total da categoria e ainda não carregamos todos
				setHasMore(true);
				console.log(
					`[StorePage] Carregados ${
						append ? totalProducts + productsData.length : productsData.length
					} de ${categoryItemCount} produtos`
				);
			} else {
				// Se retornou menos produtos que o limite, assumimos que não há mais
				setHasMore(productsData.length === PRODUCTS_PER_PAGE);
				console.log(
					`[StorePage] ${productsData.length} produtos carregados, ${
						hasMore ? 'há' : 'não há'
					} mais para carregar`
				);
			}

			setTotalProducts((prev) =>
				append ? prev + productsData.length : productsData.length
			);

			console.log(
				`[StorePage] ${productsData.length} produtos carregados com sucesso`
			);
		} catch (error) {
			console.error('[StorePage] Falha ao carregar produtos:', error);
			setError(
				'Não foi possível carregar os produtos. Por favor, tente novamente mais tarde.'
			);
			if (!append) {
				setProducts([]);
			}
		} finally {
			if (append) {
				setIsLoadingMore(false);
			} else {
				setIsLoading(false);
			}
		}
	};

	// Handler para carregar mais produtos
	const loadMoreProducts = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			const nextPage = page + 1;
			setPage(nextPage);
			loadProducts(nextPage, true);
		}
	}, [isLoadingMore, hasMore, page]);

	// Configurar o observador de interseção para o carregamento infinito
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting && !isLoadingMore && hasMore) {
					loadMoreProducts();
				}
			},
			{ threshold: 0.1 }
		);

		const currentLoader = loaderRef.current;
		if (currentLoader) {
			observer.observe(currentLoader);
		}

		return () => {
			if (currentLoader) {
				observer.unobserve(currentLoader);
			}
		};
	}, [loadMoreProducts, isLoadingMore, hasMore]);

	useEffect(() => {
		// Reiniciar a página ao mudar filtros
		setPage(1);
		loadProducts(1, false);
	}, [categoryId, sortBy, searchQuery, getJwtToken, isAuthenticated]);

	// Redirecionamento para login se não estiver autenticado
	useEffect(() => {
		const checkAuth = async () => {
			// Verificar se temos um token válido (True Core)
			const apiToken = await authService.getApiToken();
			console.log('[Store] Token válido encontrado:', !!apiToken);

			// Aguardar um tempo para garantir que o contexto de autenticação seja atualizado
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Se não há token e não estamos carregando, redirecionar para login
			if (!apiToken && !authLoading) {
				console.log(
					'[StorePage] Usuário não autenticado, redirecionando para login'
				);
				router.push('/login');
			}
		};

		// Verificar autenticação ao montar, mas apenas se o componente estiver montado no cliente
		if (typeof window !== 'undefined') {
			checkAuth();
		}
	}, [router, authLoading]);

	// Adicionar um listener para o evento auth:login-complete
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Flag para controlar se estamos no meio de um processo de login
		let isLoggingIn = false;

		// Handler para o evento de conclusão de login
		const handleLoginComplete = () => {
			console.log('[StorePage] Evento auth:login-complete recebido');
			// Marcar que estamos no meio de um processo de login
			isLoggingIn = true;

			// Limpar a flag após algum tempo
			setTimeout(() => {
				isLoggingIn = false;
			}, 5000); // 5 segundos deve ser suficiente
		};

		// Registrar o listener
		window.addEventListener('auth:login-complete', handleLoginComplete);

		// Criar uma função para verificar o redirecionamento
		// Este efeito será para checar autenticação em intervalos regulares
		const checkRedirect = () => {
			// Se estivermos no meio de um login, não redirecionar
			if (isLoggingIn) {
				console.log(
					'[StorePage] Aguardando conclusão do login, não redirecionando'
				);
				return;
			}

			// Verificar se ainda estamos autenticados
			authService.getApiToken().then((token) => {
				if (!token && !isLoggingIn) {
					console.log('[StorePage] Token expirado, redirecionando para login');
					router.push('/login');
				}
			});
		};

		// Verificar a cada 5 segundos
		const interval = setInterval(checkRedirect, 5000);

		// Cleanup
		return () => {
			window.removeEventListener('auth:login-complete', handleLoginComplete);
			clearInterval(interval);
		};
	}, [router]);

	// Mostrar tela de carregamento enquanto verifica a autenticação
	if (authLoading || (!isAuthenticated && !error)) {
		return (
			<StoreLayout hideSidebar={true}>
				<div className="min-h-[80vh] flex flex-col items-center justify-center">
					<div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md mx-auto">
						<div className="relative w-16 h-16 mx-auto mb-6">
							<div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange opacity-20 animate-ping"></div>
							<div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange p-[3px]">
								<div className="w-full h-full rounded-full bg-white flex items-center justify-center">
									<div className="w-10 h-10 border-4 border-t-brand-magenta border-r-transparent border-b-brand-orange border-l-transparent rounded-full animate-spin"></div>
								</div>
							</div>
						</div>

						<h3 className="text-xl font-medium text-gray-900 mb-2">
							Verificando acesso
						</h3>
						<p className="text-gray-600 mb-4">
							Preparando sua experiência na loja...
						</p>
					</div>
				</div>
			</StoreLayout>
		);
	}

	return (
		<StoreLayout hideSidebar={false}>
			{/* Componente para verificar token */}
			<TokenVerifier />

			<div className="max-w-6xl mx-auto py-8 space-y-6">
				{/* Cabeçalho da loja */}
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="h-10 w-10 rounded-full bg-brand-magenta/10 flex items-center justify-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 text-brand-magenta"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
								<line x1="3" y1="6" x2="21" y2="6"></line>
								<path d="M16 10a4 4 0 0 1-8 0"></path>
							</svg>
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
								Nossa Loja
							</h1>
							<p className="text-gray-500 text-sm">
								Encontre os produtos exclusivos selecionados para você
							</p>
						</div>
					</div>
				</div>

				{/* Search and filter area */}
				<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
					<div className="flex flex-col space-y-4">
						<ProductFilters />

						<div className="flex justify-end items-center border-t pt-3 mt-2">
							<div className="flex border rounded-md overflow-hidden">
								<Button
									variant="ghost"
									size="sm"
									className={`px-3 py-1.5 rounded-none ${
										isGridView ? 'bg-gray-100 text-gray-900' : 'text-gray-500'
									}`}
									onClick={() => setIsGridView(true)}
								>
									<Grid3X3 className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className={`px-3 py-1.5 rounded-none ${
										!isGridView ? 'bg-gray-100 text-gray-900' : 'text-gray-500'
									}`}
									onClick={() => setIsGridView(false)}
								>
									<List className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Products grid or list */}
				{isLoading ? (
					<div
						className={`grid ${
							isGridView
								? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
								: 'grid-cols-1'
						} gap-6`}
					>
						{Array.from({ length: 8 }).map((_, index) => (
							<Card key={index} className="overflow-hidden border-gray-200">
								<div
									className={`${
										isGridView ? 'h-48' : 'h-24'
									} bg-gray-100 animate-pulse`}
								></div>
								<CardContent className="p-4 space-y-3">
									<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
									<div className="h-8 bg-gray-200 rounded animate-pulse"></div>
								</CardContent>
							</Card>
						))}
					</div>
				) : error ? (
					<div className="text-center py-16 bg-white rounded-xl shadow-sm">
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-10 w-10 text-red-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<h2 className="mt-4 text-2xl font-medium text-gray-900">
							Erro ao carregar produtos
						</h2>
						<p className="mt-2 text-gray-500 max-w-md mx-auto">{error}</p>
						<button
							onClick={() => loadProducts(1, false)}
							className="mt-6 px-4 py-2 bg-brand-magenta text-white rounded-md hover:bg-brand-magenta/90 transition-colors"
						>
							Tentar novamente
						</button>
					</div>
				) : (
					<>
						{products.length > 0 ? (
							<div className="space-y-6">
								{/* Grid de produtos */}
								<div
									className={`grid ${
										isGridView
											? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
											: 'grid-cols-1'
									} gap-6`}
								>
									{products.map((product) => (
										<ProductCard
											key={product.id}
											product={product}
											categories={categories}
											viewMode={viewMode}
										/>
									))}
								</div>

								{/* Indicador de carregamento infinito */}
								{hasMore && (
									<div ref={loaderRef} className="flex justify-center py-8">
										{isLoadingMore && (
											<div className="flex items-center gap-2 text-gray-500">
												<span className="animate-spin">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
														className="rotate-0"
													>
														<path d="M21 12a9 9 0 1 1-6.219-8.56" />
													</svg>
												</span>
												<span>Carregando mais produtos...</span>
											</div>
										)}
									</div>
								)}

								{/* Contador de produtos */}
								<div className="flex justify-center">
									<p className="text-gray-500 text-sm">
										Exibindo {products.length} produtos
									</p>
								</div>
							</div>
						) : (
							<div className="text-center py-16 bg-white rounded-xl shadow-sm">
								<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
									<SearchIcon className="h-10 w-10 text-gray-400" />
								</div>
								<h2 className="mt-4 text-2xl font-medium text-gray-900">
									Nenhum produto encontrado
								</h2>
								<p className="mt-2 text-gray-500 max-w-md mx-auto">
									Tente ajustar os filtros ou buscar por termos diferentes.
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</StoreLayout>
	);
}
