'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StoreLayout from '@/components/layouts/store-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Grid3X3,
	List,
	SearchIcon,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
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
const MAX_API_PRODUCTS = 120;

/**
 * Componente para verificar token e controlar carregamento da página
 */
const TokenVerifier = ({ onReady }: { onReady: () => void }) => {
	const [verificationComplete, setVerificationComplete] = useState(false);
	const [categoriesReady, setCategoriesReady] = useState(false);
	const [loginBlocked, setLoginBlocked] = useState(false);
	const router = useRouter();

	// Verificar o estado inicial do bloqueio de login
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const loginAttempted = sessionStorage.getItem('login_attempted');
			setLoginBlocked(!!loginAttempted);
		}
	}, []);

	// Verificar token e decidir o fluxo de carregamento
	useEffect(() => {
		// Verificar apenas uma vez para evitar loops
		if (verificationComplete) return;

		const checkToken = async () => {
			try {
				console.log('[Store:TokenVerifier] Verificando token...');

				// Verificar se temos um token válido no TokenStore ou em cookies
				if (tokenStore.hasValidToken()) {
					console.log(
						'[Store:TokenVerifier] Token válido encontrado no TokenStore'
					);
					tokenStore.resetReloadTracker();
					setVerificationComplete(true);
					return true;
				}

				// Verificar se há token em cookies
				if (typeof document !== 'undefined') {
					const cookieTokenExists = document.cookie
						.split(';')
						.some((item) => item.trim().startsWith('true_core_token='));

					if (cookieTokenExists) {
						console.log('[Store:TokenVerifier] Token encontrado em cookies');
						tokenStore.resetReloadTracker();
						setVerificationComplete(true);
						return true;
					}
				}

				// Verificar se acabamos de fazer login
				const fromLogin = sessionStorage.getItem('from_login');
				if (fromLogin) {
					console.log('[Store:TokenVerifier] Acesso pós-login detectado');
					sessionStorage.removeItem('from_login');

					// Verificar token após um breve atraso (aguardar eventos auth:login-complete)
					await new Promise((resolve) => setTimeout(resolve, 800));

					if (tokenStore.hasValidToken()) {
						console.log(
							'[Store:TokenVerifier] Token válido encontrado após login'
						);
						tokenStore.resetReloadTracker();
						setVerificationComplete(true);
						return true;
					}
				}

				// Verificar se há parâmetros de URL que indicam navegação intencional
				const url = new URL(window.location.href);
				const hasCategory = url.searchParams.has('category');
				const hasSearch = url.searchParams.has('search');
				const hasSort = url.searchParams.has('sort');
				const hasIntentionalNavigation = hasCategory || hasSearch || hasSort;

				// Verificar bloqueio de login
				if (loginBlocked) {
					console.log(
						'[Store:TokenVerifier] Tentativa anterior de login detectada'
					);
					router.push('/login');
					return false;
				}

				// Adicionar um atraso para dar tempo ao token ser carregado
				await new Promise((resolve) => setTimeout(resolve, 1200));

				// Verificar token novamente após o atraso
				if (tokenStore.hasValidToken()) {
					console.log(
						'[Store:TokenVerifier] Token válido encontrado após atraso'
					);
					tokenStore.resetReloadTracker();
					setVerificationComplete(true);
					return true;
				}

				// Se não tem token e não tem parâmetros específicos
				if (!hasIntentionalNavigation) {
					if (tokenStore.trackReload(1)) {
						// Apenas 1 tentativa de recarga
						console.log(
							'[Store:TokenVerifier] Tentando recarregar para recuperar token...'
						);
						window.location.reload();
						return false;
					} else {
						console.log(
							'[Store:TokenVerifier] Limite de recargas atingido, redirecionando para login'
						);
						sessionStorage.setItem('login_attempted', 'true');
						setLoginBlocked(true);
						router.push('/login');
						return false;
					}
				} else {
					console.log(
						'[Store:TokenVerifier] Navegação com filtros detectada, sem recarga'
					);
					setVerificationComplete(true);
					return true;
				}
			} catch (error) {
				console.error('[Store:TokenVerifier] Erro ao verificar token:', error);
				setVerificationComplete(true);
				return false;
			}
		};

		checkToken();
	}, [verificationComplete, router, loginBlocked]);

	// Monitorar evento de carregamento de categorias completo
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleCategoriesLoaded = () => {
			console.log('[Store:TokenVerifier] Evento categories:loaded recebido');
			setCategoriesReady(true);
		};

		window.addEventListener('categories:loaded', handleCategoriesLoaded);

		// Verificar se categorias já estão carregadas
		const checkExistingCategories = () => {
			const categoriesData = localStorage.getItem(
				'true-store-categories-cache'
			);
			if (categoriesData) {
				try {
					const { data } = JSON.parse(categoriesData);
					if (Array.isArray(data) && data.length > 0) {
						console.log(
							'[Store:TokenVerifier] Categorias já disponíveis em cache'
						);
						setCategoriesReady(true);
					}
				} catch (e) {
					console.error(
						'[Store:TokenVerifier] Erro ao verificar cache de categorias:',
						e
					);
				}
			}
		};

		checkExistingCategories();

		return () => {
			window.removeEventListener('categories:loaded', handleCategoriesLoaded);
		};
	}, []);

	// Adicionar listeners para eventos de autenticação
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Handler para o evento de conclusão de login
		const handleLoginComplete = () => {
			console.log('[Store:TokenVerifier] Evento auth:login-complete recebido');
			sessionStorage.setItem('from_login', 'true');
			sessionStorage.removeItem('login_attempted');
			setLoginBlocked(false);
			setVerificationComplete(true);
		};

		// Handler para o evento de atualização de estado de autenticação
		const handleAuthStateUpdated = () => {
			console.log('[Store:TokenVerifier] Evento auth:state-updated recebido');
			tokenStore.resetReloadTracker();
			sessionStorage.removeItem('login_attempted');
			setLoginBlocked(false);
		};

		// Registrar os listeners
		window.addEventListener('auth:login-complete', handleLoginComplete);
		window.addEventListener('auth:state-updated', handleAuthStateUpdated);

		// Cleanup
		return () => {
			window.removeEventListener('auth:login-complete', handleLoginComplete);
			window.removeEventListener('auth:state-updated', handleAuthStateUpdated);
		};
	}, []);

	// Notificar o componente pai quando estiver pronto
	useEffect(() => {
		if (verificationComplete && categoriesReady) {
			console.log(
				'[Store:TokenVerifier] Verificação e carregamento concluídos, notificando'
			);
			onReady();
		}
	}, [verificationComplete, categoriesReady, onReady]);

	return null; // Este componente não renderiza nada
};

// Componente de carregamento para exibir enquanto verifica autenticação e carrega dados
const LoadingScreen = () => (
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
				Preparando sua loja
			</h3>
			<p className="text-gray-600 mb-4">
				Aguarde enquanto carregamos todos os produtos...
			</p>
		</div>
	</div>
);

// Componente para o botão de voltar ao topo
const ScrollToTopButton = () => {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const toggleVisibility = () => {
			// Mostrar o botão quando rolar além de 300px
			if (window.scrollY > 300) {
				setIsVisible(true);
			} else {
				setIsVisible(false);
			}
		};

		window.addEventListener('scroll', toggleVisibility);

		// Limpar o event listener
		return () => window.removeEventListener('scroll', toggleVisibility);
	}, []);

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	};

	return (
		<motion.button
			onClick={scrollToTop}
			className={`fixed bottom-6 p-3 rounded-full bg-brand-magenta text-white shadow-lg hover:bg-brand-magenta/90 transition-colors z-50 left-6 lg:left-auto lg:right-6 ${
				isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
			}`}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{
				opacity: isVisible ? 1 : 0,
				scale: isVisible ? 1 : 0.8,
			}}
			transition={{ duration: 0.2 }}
			aria-label="Voltar ao topo"
		>
			<ChevronUp className="h-6 w-6" />
		</motion.button>
	);
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
	const { categories, isLoading: categoriesLoading } = useCategories();
	const { getJwtToken, isAuthenticated, isLoading: authLoading } = useAuth();
	const router = useRouter();
	const loaderRef = useRef<HTMLDivElement>(null);
	const [dataLoadAttempts, setDataLoadAttempts] = useState(0);
	const maxLoadAttempts = 3;
	const [pageReady, setPageReady] = useState(false);
	const [initialDataLoaded, setInitialDataLoaded] = useState(false);
	const [isAuthorizationChecked, setIsAuthorizationChecked] = useState(false);

	const categoryId = searchParams.get('category');
	const searchQuery = searchParams.get('search');
	const sortBy = searchParams.get('sort') || 'featured';
	const isGridView = viewMode === 'grid';

	const setIsGridView = (isGrid: boolean) =>
		setViewMode(isGrid ? 'grid' : 'list');

	// Função para marcar a página como pronta após verificação do token
	const handleVerificationReady = useCallback(() => {
		console.log(
			'[StorePage] TokenVerifier concluiu a verificação, carregando dados'
		);
		setPageReady(true);
	}, []);

	const loadProducts = async (currentPage: number, append: boolean = false) => {
		if (append) {
			setIsLoadingMore(true);
		} else {
			setIsLoading(true);
			setError(null);
		}

		try {
			// Verificar se o usuário está autenticado
			if (!isAuthenticated && isAuthorizationChecked) {
				setError(
					'Usuário não autenticado. Faça login para visualizar os produtos.'
				);
				setIsLoading(false);
				return;
			}

			// Obter o token JWT para autenticação
			const jwtToken = await getJwtToken();

			if (!jwtToken && isAuthorizationChecked) {
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
			// @ts-ignore - Ignorando problemas de tipagem na conversão de null para undefined
			const productsData = await searchProducts({
				query: searchQuery ? searchQuery : undefined,
				categoryId,
				categoryName,
				categoryItemCount,
				sortBy,
				jwtToken: jwtToken || undefined,
				page: currentPage,
				limit: PRODUCTS_PER_PAGE,
				searchQuery: searchQuery ? searchQuery : undefined,
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

			// Marcar dados iniciais como carregados
			if (!append && !initialDataLoaded) {
				setInitialDataLoaded(true);
			}
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

	// Carregar produtos quando a página estiver pronta para processamento
	useEffect(() => {
		if (pageReady && !initialDataLoaded) {
			setPage(1);
			loadProducts(1, false);
		}
	}, [
		pageReady,
		categoryId,
		sortBy,
		searchQuery,
		getJwtToken,
		isAuthenticated,
		initialDataLoaded,
	]);

	// Redirecionamento para login se não estiver autenticado
	useEffect(() => {
		const checkAuth = async () => {
			if (typeof window === 'undefined' || pageReady) return;

			// Verificar se temos um token válido (True Core)
			const apiToken = await authService.getApiToken();
			console.log('[Store] Token válido encontrado:', !!apiToken);

			// Aguardar um tempo para garantir que o contexto de autenticação seja atualizado
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Marcar que a verificação de autorização foi concluída
			setIsAuthorizationChecked(true);

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
	}, [router, authLoading, pageReady]);

	// Determinar se deve mostrar a tela de carregamento
	const showLoadingScreen =
		!pageReady || authLoading || (!isAuthenticated && !isAuthorizationChecked);

	return (
		<StoreLayout hideSidebar={showLoadingScreen}>
			{/* Componente para verificar token */}
			<TokenVerifier onReady={handleVerificationReady} />
			{/* Botão de voltar ao topo */}
			<ScrollToTopButton />

			{showLoadingScreen ? (
				<LoadingScreen />
			) : (
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
											!isGridView
												? 'bg-gray-100 text-gray-900'
												: 'text-gray-500'
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
			)}
		</StoreLayout>
	);
}
