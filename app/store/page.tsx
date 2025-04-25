'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
import { searchProducts, searchWarehouseProducts } from '@/lib/api';
import type { Product } from '@/types/product';
import { useCategories } from '@/lib/contexts/categories-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { tokenStore } from '@/lib/token-store';
import { motion, AnimatePresence } from 'framer-motion';
import { CategorySidebar } from '@/components/category/category-sidebar';

// Constantes de configuração
const PRODUCTS_PER_PAGE = 12;

/**
 * Componente para verificar token e controlar carregamento da página
 */
const TokenVerifier = ({ onReady }: { onReady: () => void }) => {
	const [verificationComplete, setVerificationComplete] = useState(false);
	const router = useRouter();

	// Verificar token e decidir o fluxo de carregamento
	useEffect(() => {
		if (verificationComplete) return;

		const checkToken = async () => {
			try {
				// Verificar se temos um token válido
				if (tokenStore.hasValidToken()) {
					console.log('[Store:TokenVerifier] Token válido encontrado');
					setVerificationComplete(true);
					onReady();
					return true;
				}

				// Verificar se há token em cookies
				if (typeof document !== 'undefined') {
					const cookies = document.cookie.split(';');
					const tokenCookie = cookies.find((c) =>
						c.trim().startsWith('true_core_token=')
					);

					if (tokenCookie) {
						const extractedToken = tokenCookie.split('=')[1].trim();
						if (extractedToken) {
							tokenStore.setToken(extractedToken, 86400);
							setVerificationComplete(true);
							onReady();
							return true;
						}
					}
				}

				// Se não temos token, aguardar um momento e tentar novamente
				console.log(
					'[Store:TokenVerifier] Token não encontrado, tentando novamente em 1.5s...'
				);
				setTimeout(async () => {
					// Verificar novamente após o atraso
					if (tokenStore.hasValidToken()) {
						console.log(
							'[Store:TokenVerifier] Token válido encontrado após tentativa adicional'
						);
						setVerificationComplete(true);
						onReady();
						return true;
					}

					// Se ainda não temos token, redirecionar para login
					console.log(
						'[Store:TokenVerifier] Token não encontrado mesmo após tentativas adicionais'
					);
					router.push('/login');
					return false;
				}, 1500);

				return false;
			} catch (error) {
				console.error('[Store:TokenVerifier] Erro:', error);
				setVerificationComplete(true);
				onReady();
				return false;
			}
		};

		checkToken();
	}, [verificationComplete, router, onReady]);

	return null;
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
			setIsVisible(window.scrollY > 300);
		};

		window.addEventListener('scroll', toggleVisibility);
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
	const pathname = usePathname();
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingCategory, setIsLoadingCategory] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const { categories } = useCategories();
	const { isAuthenticated } = useAuth();
	const router = useRouter();
	const loaderRef = useRef<HTMLDivElement>(null);
	const [pageReady, setPageReady] = useState(false);
	const [warehouseName, setWarehouseName] = useState<string>('MKT-Creator');
	const isGridView = viewMode === 'grid';
	const [loadAttempts, setLoadAttempts] = useState(0);
	const maxLoadAttempts = 3;
	const observerRef = useRef<IntersectionObserver | null>(null);
	const scrollPositionRef = useRef<number>(0);

	const categoryId = searchParams.get('category');
	const searchQuery = searchParams.get('search');
	const sortOrder = searchParams.get('sort') || 'featured';

	// Restaurar o estado da sessão anterior ao montar o componente
	useEffect(() => {
		// Evitar operações com sessionStorage durante renderização no servidor
		if (typeof window === 'undefined') return;

		// Flag para controlar se devemos restaurar os dados
		const shouldRestore =
			sessionStorage.getItem('should_restore_store_state') === 'true';

		if (shouldRestore) {
			// Restaurar produtos da sessão anterior
			const savedProducts = sessionStorage.getItem('store_products');
			const savedPage = sessionStorage.getItem('store_page');
			const savedViewMode = sessionStorage.getItem('store_view_mode');
			const savedScrollPosition = sessionStorage.getItem(
				'store_scroll_position'
			);

			// Se temos produtos salvos, restaurar o estado
			if (savedProducts) {
				try {
					const parsedProducts = JSON.parse(savedProducts);
					console.log(
						`[StorePage] Restaurando ${parsedProducts.length} produtos da sessão anterior`
					);
					setProducts(parsedProducts);

					// Restaurar a página atual
					if (savedPage) {
						setPage(parseInt(savedPage, 10));
					}

					// Restaurar o modo de visualização
					if (
						savedViewMode &&
						(savedViewMode === 'grid' || savedViewMode === 'list')
					) {
						setViewMode(savedViewMode as 'grid' | 'list');
					}

					// Indicar que temos mais produtos para carregar
					setHasMore(true);

					// Restauração de dados concluída, não precisa carregar no início
					setIsLoading(false);
				} catch (error) {
					console.error(
						'[StorePage] Erro ao restaurar produtos da sessão:',
						error
					);
					// Em caso de erro, carregue normalmente
				}
			}

			// Restaurar a posição de rolagem após um pequeno atraso
			if (savedScrollPosition) {
				const scrollY = parseInt(savedScrollPosition, 10);
				scrollPositionRef.current = scrollY;

				// Aguardar a página renderizar completamente antes de restaurar a posição
				const timer = setTimeout(() => {
					window.scrollTo({ top: scrollY });
					console.log(
						`[StorePage] Restaurada posição de rolagem: ${scrollY}px`
					);
				}, 500);

				return () => clearTimeout(timer);
			}
		} else {
			// Marcar que o próximo acesso deve restaurar o estado
			sessionStorage.setItem('should_restore_store_state', 'true');
		}
	}, []); // Executar apenas uma vez na montagem

	// Efeito separado para salvar o estado antes de desmontar
	useEffect(() => {
		// Evitar operações com sessionStorage durante renderização no servidor
		if (typeof window === 'undefined') return;

		// Função para salvar o estado
		const saveState = () => {
			// Não salvar se não temos produtos ainda
			if (products.length === 0) return;

			// Salvar a posição de rolagem atual
			const scrollY = window.scrollY;
			sessionStorage.setItem('store_scroll_position', scrollY.toString());

			// Salvar os produtos atuais
			sessionStorage.setItem('store_products', JSON.stringify(products));

			// Salvar a página atual
			sessionStorage.setItem('store_page', page.toString());

			// Salvar o modo de visualização
			sessionStorage.setItem('store_view_mode', viewMode);

			console.log(
				`[StorePage] Estado salvo: ${products.length} produtos, página ${page}, posição ${scrollY}px`
			);
		};

		// Registrar evento de beforeunload
		window.addEventListener('beforeunload', saveState);

		// Limpar event listener ao desmontar
		return () => {
			window.removeEventListener('beforeunload', saveState);
			saveState(); // Também salvar ao desmontar o componente
		};
	}, [products, page, viewMode]); // Dependências para saber quando salvar o estado

	// Detectar a categoria do cliente a partir dos logs ou localStorage
	useEffect(() => {
		// Verificar se já temos um warehouse definido
		const savedWarehouse = localStorage.getItem('warehouse_name');
		if (savedWarehouse) {
			setWarehouseName(savedWarehouse);
			console.log(`[StorePage] Usando warehouse salvo: ${savedWarehouse}`);
		} else {
			// Tenta detectar a categoria do usuário a partir do registro de logs
			const categoryExtract = localStorage.getItem('category_extract');
			if (categoryExtract) {
				// Identificar explicitamente cada tipo de categoria
				if (
					categoryExtract.includes('Top Master') ||
					categoryExtract.includes('Clinica Top Master')
				) {
					// Cliente é Top Master
					setWarehouseName('MKT-Top Master');
					localStorage.setItem('warehouse_name', 'MKT-Top Master');
					console.log(
						'[StorePage] Cliente identificado como Top Master, usando warehouse MKT-Top Master'
					);
				} else if (
					categoryExtract.includes('Creator') ||
					categoryExtract.includes('Médico') ||
					categoryExtract.includes('Nutricionista') ||
					categoryExtract.includes('Influenciador') ||
					categoryExtract.includes('Atleta')
				) {
					// Cliente é Creator
					setWarehouseName('MKT-Creator');
					localStorage.setItem('warehouse_name', 'MKT-Creator');
					console.log(
						'[StorePage] Cliente identificado como Creator, usando warehouse MKT-Creator'
					);
				} else {
					// Categoria não identificada, usar Creator como padrão
					setWarehouseName('MKT-Creator');
					localStorage.setItem('warehouse_name', 'MKT-Creator');
					console.log(
						'[StorePage] Categoria não identificada, usando warehouse padrão MKT-Creator'
					);
				}
			} else {
				// Se não temos informação de categoria, verificar se temos informações do cliente
				// e fazer uma chamada para obter as informações
				checkCustomerCategory();
			}
		}
	}, []);

	// Função para verificar a categoria do cliente através de uma chamada à API
	const checkCustomerCategory = async () => {
		try {
			// Verificar se temos um token válido
			if (!tokenStore.hasValidToken()) {
				console.log(
					'[StorePage] Token inválido, não é possível verificar categoria do cliente'
				);
				return;
			}

			// Verificar se temos ID do cliente em algum local
			const clerkIdFromStorage = localStorage.getItem('clerk_user_id');
			if (!clerkIdFromStorage) {
				console.log('[StorePage] ID do cliente não encontrado');
				return;
			}

			console.log(
				`[StorePage] Buscando informações do cliente: ${clerkIdFromStorage}`
			);

			// Obter o token para a chamada
			const token = tokenStore.getToken();

			// Fazer chamada à API para obter informações do cliente
			const response = await fetch(
				`/api/customers/clerk/${clerkIdFromStorage}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${token}`,
					},
					credentials: 'include',
				}
			);

			if (!response.ok) {
				console.error(
					`[StorePage] Erro ao buscar informações do cliente: ${response.status}`
				);
				return;
			}

			const customerData = await response.json();

			// Verificar se temos informação de categoria
			if (customerData && customerData.__category__) {
				const categoryName = customerData.__category__.name;
				console.log(`[StorePage] Categoria do cliente obtida: ${categoryName}`);

				// Salvar a informação da categoria para futuras referências
				localStorage.setItem(
					'category_extract',
					`Cliente identificado como ${categoryName}`
				);

				// Definir o warehouse com base na categoria
				if (
					categoryName.includes('Top Master') ||
					categoryName === 'Clinica Top Master'
				) {
					setWarehouseName('MKT-Top Master');
					localStorage.setItem('warehouse_name', 'MKT-Top Master');
					console.log(
						'[StorePage] Cliente é Top Master, definindo warehouse para MKT-Top Master'
					);
				} else if (
					categoryName.includes('Creator') ||
					categoryName.includes('Médico') ||
					categoryName.includes('Nutricionista') ||
					categoryName.includes('Influenciador') ||
					categoryName.includes('Atleta')
				) {
					setWarehouseName('MKT-Creator');
					localStorage.setItem('warehouse_name', 'MKT-Creator');
					console.log(
						'[StorePage] Cliente é Creator, definindo warehouse para MKT-Creator'
					);
				} else {
					// Categoria não identificada, usar Creator como padrão
					setWarehouseName('MKT-Creator');
					localStorage.setItem('warehouse_name', 'MKT-Creator');
					console.log(
						'[StorePage] Categoria não identificada, usando warehouse padrão MKT-Creator'
					);
				}

				// Recarregar os produtos com o warehouse correto
				loadProducts(1, false);
			} else {
				console.log(
					'[StorePage] Cliente sem categoria definida, usando warehouse padrão'
				);
				setWarehouseName('MKT-Creator');
				localStorage.setItem('warehouse_name', 'MKT-Creator');
			}
		} catch (error) {
			console.error(
				'[StorePage] Erro ao verificar categoria do cliente:',
				error
			);
			// Em caso de erro, usar Creator como padrão
			setWarehouseName('MKT-Creator');
			localStorage.setItem('warehouse_name', 'MKT-Creator');
		}
	};

	const setIsGridView = (isGrid: boolean) =>
		setViewMode(isGrid ? 'grid' : 'list');

	// Função para marcar a página como pronta após verificação do token
	const handleVerificationReady = useCallback(() => {
		setPageReady(true);
	}, []);

	const loadProducts = async (
		currentPage: number,
		append: boolean = false,
		extraParams: Record<string, any> = {}
	) => {
		try {
			setError(null);
			setIsLoadingMore(append);
			// Só mostrar loading geral se não for carregamento de página adicional
		if (!append) {
			setIsLoading(true);
			}

			// Obter parâmetros de pesquisa e filtros
			const search = searchQuery || '';
			const category = categoryId || '';

			console.log(
				`[Store] Carregando produtos: página ${currentPage}, categoria: ${category}, busca: "${search}"${
					append ? ' (anexando resultados)' : ''
				}`
			);

			// Usar warehouse específico com base nas configurações
			let response;
			try {
				// Usar a nova função searchWarehouseProducts para busca específica em warehouse
				response = await searchWarehouseProducts({
					warehouseName: warehouseName,
					page: currentPage - 1, // API usa base 0 para páginas
					limit: PRODUCTS_PER_PAGE,
					inStock: true,
					active: true,
					term: search, // Usar o termo de busca como parâmetro term
					...extraParams, // Adicionar parâmetros extras
				});
			} catch (apiError) {
				console.error('[Store] Erro ao buscar produtos:', apiError);

				// Tentar novamente com a API genérica como fallback
				console.log('[Store] Tentando API alternativa após falha');
				response = await searchProducts({
					searchQuery: search,
					categoryId: category,
					page: currentPage - 1,
				limit: PRODUCTS_PER_PAGE,
					sortBy: sortOrder,
				});
			}

			// Verificar se temos a estrutura de dados esperada
			if (!response || !response.data || !Array.isArray(response.data)) {
				console.error('[Store] Resposta da API inválida:', response);
				throw new Error('Formato de resposta inválido da API');
			}

			console.log(
				`[Store] ${response.data.length} produtos obtidos com sucesso`
			);

			// Processar resultados e atualizar estado
			const productsData = response.data.map((item: any) => ({
				id: item.sku || item.tinyId || item.id,
				name: item.name,
				description: item.description || '',
				price: item.price || 0,
				originalPrice: item.originalPrice || item.price || 0,
				imageUrl:
					Array.isArray(item.images) && item.images.length > 0
						? item.images[0]
						: item.imageUrl || '/placeholder-product.png',
				categoryId: item.categoryId || '',
				category: item.category || undefined,
				codigo: item.sku || '',
				unidade: item.unit || 'UN',
				active: item.active || true,
			}));

			// Filtrar produtos pela categoria selecionada (se houver)
			let filteredProducts = productsData;
			if (category && category !== 'all') {
				console.log(
					`[Store] Filtrando ${productsData.length} produtos pelo categoryId: ${category}`
				);

				// Verificar produtos que correspondem à categoria selecionada
				filteredProducts = productsData.filter((product: Product) => {
					// Verificar no categoryId do produto
					if (product.categoryId === category) {
						return true;
					}

					// Verificar no objeto category aninhado (se existir)
					if (product.category && product.category.id === category) {
						return true;
					}

					// Caso especial: categoria Proteínas tem dois IDs possíveis
					if (
						category === '8bb26b67-a7ce-4001-ae51-ceec0082fb89' &&
						(product.categoryId === '8fade785-4ad2-4f53-b715-c4a662dd6be6' ||
							(product.category &&
								product.category.id === '8fade785-4ad2-4f53-b715-c4a662dd6be6'))
					) {
						return true;
					}

					return false;
				});

				console.log(
					`[Store] Filtrados ${filteredProducts.length} produtos da categoria ${category}`
			);

				// Se estamos na primeira página e temos poucos produtos após filtragem,
				// carregar mais páginas para tentar encontrar mais produtos da categoria
				if (
					!append &&
					filteredProducts.length < 4 &&
					productsData.length === PRODUCTS_PER_PAGE
				) {
					console.log(
						'[Store] Poucos produtos da categoria encontrados, carregando mais...'
					);
					setIsLoadingCategory(true);

					// Carregar mais páginas de forma assíncrona
					const loadMoreForCategory = async () => {
						let allProducts = [...productsData];
						let currentPage = 2; // Começar na página 2 (já carregamos a 1)
						let hasMorePages = true;
						const maxPages = 10; // Limite para evitar loops infinitos

						while (hasMorePages && currentPage <= maxPages) {
							try {
								// Carregar a próxima página
								console.log(
									`[Store] Carregando página ${currentPage} para buscar mais produtos da categoria`
								);

								const nextPageResponse = await searchWarehouseProducts({
									warehouseName: warehouseName,
									page: currentPage - 1, // API usa base 0
									limit: PRODUCTS_PER_PAGE,
									inStock: true,
									active: true,
									term: search,
								});

								// Verificar se temos resultados
								if (
									nextPageResponse &&
									nextPageResponse.data &&
									Array.isArray(nextPageResponse.data)
								) {
									// Processar os produtos
									const nextPageProducts = nextPageResponse.data.map(
										(item: any) => ({
											id: item.sku || item.tinyId || item.id,
											name: item.name,
											description: item.description || '',
											price: item.price || 0,
											originalPrice: item.originalPrice || item.price || 0,
											imageUrl:
												Array.isArray(item.images) && item.images.length > 0
													? item.images[0]
													: item.imageUrl || '/placeholder-product.png',
											categoryId: item.categoryId || '',
											category: item.category || undefined,
											codigo: item.sku || '',
											unidade: item.unit || 'UN',
											active: item.active || true,
										})
									);

									// Adicionar à lista total
									allProducts = [...allProducts, ...nextPageProducts];

									// Verificar se temos mais páginas
									hasMorePages = nextPageProducts.length === PRODUCTS_PER_PAGE;

									// Filtrar novamente com todos os produtos acumulados
									const newFilteredProducts = allProducts.filter(
										(product: Product) => {
											if (product.categoryId === category) return true;
											if (product.category && product.category.id === category)
												return true;
											if (
												category === '8bb26b67-a7ce-4001-ae51-ceec0082fb89' &&
												(product.categoryId ===
													'8fade785-4ad2-4f53-b715-c4a662dd6be6' ||
													(product.category &&
														product.category.id ===
															'8fade785-4ad2-4f53-b715-c4a662dd6be6'))
											) {
												return true;
											}
											return false;
										}
									);

									// Se já temos produtos suficientes, parar a busca
									if (newFilteredProducts.length >= 8) {
										console.log(
											`[Store] Encontrados ${newFilteredProducts.length} produtos da categoria após busca adicional`
										);
										setProducts(newFilteredProducts);
										setIsLoadingCategory(false);
										break;
									}

									// Se não encontramos produtos suficientes, continuar buscando
									currentPage++;
								} else {
									// Não há mais páginas
									hasMorePages = false;
								}
							} catch (error) {
								console.error(
									`[Store] Erro ao carregar página adicional ${currentPage}:`,
									error
								);
								hasMorePages = false;
							}
						}

						// Após todas as tentativas, atualizar a lista com o que encontramos
						const finalFilteredProducts = allProducts.filter(
							(product: Product) => {
								if (product.categoryId === category) return true;
								if (product.category && product.category.id === category)
									return true;
								if (
									category === '8bb26b67-a7ce-4001-ae51-ceec0082fb89' &&
									(product.categoryId ===
										'8fade785-4ad2-4f53-b715-c4a662dd6be6' ||
										(product.category &&
											product.category.id ===
												'8fade785-4ad2-4f53-b715-c4a662dd6be6'))
								) {
									return true;
								}
								return false;
							}
						);

						console.log(
							`[Store] Finalizada busca adicional, encontrados ${finalFilteredProducts.length} produtos da categoria`
						);
						setProducts(finalFilteredProducts);
						setIsLoading(false);
						setIsLoadingCategory(false);
					};

					// Iniciar o carregamento adicional, permitindo que a UI atualize com os resultados iniciais
					loadMoreForCategory();
				}
			}

			// Se estamos anexando a uma lista existente, mesclar resultados
			// Caso contrário, substituir a lista atual
			setProducts((prev) => {
				if (append) {
					// Verificar por duplicatas antes de anexar
					const existingIds = new Set(
						prev.map((product: Product) => product.id)
					);
					const newProducts = filteredProducts.filter(
						(product: Product) => !existingIds.has(product.id)
						);

					if (newProducts.length === 0) {
						console.log('[Store] Nenhum produto novo para adicionar');
						// Mesmo que não tenha produtos novos, manter página correta para próxima tentativa
						return prev;
					}

					console.log(
						`[Store] Adicionando ${newProducts.length} novos produtos aos ${prev.length} existentes`
					);
					return [...prev, ...newProducts];
				} else {
					console.log(
						`[Store] Substituindo produtos existentes por ${filteredProducts.length} novos produtos`
					);
					return filteredProducts;
				}
			});

			// Definir a flag hasMore com base no número de produtos recebidos
			const receivedCount = filteredProducts.length;
			// Se recebemos menos produtos que o esperado, provavelmente não há mais páginas
			setHasMore(receivedCount >= PRODUCTS_PER_PAGE);
			console.log(
				`[Store] ${
					receivedCount >= PRODUCTS_PER_PAGE ? 'Há' : 'Não há'
				} mais produtos para carregar`
			);

			// Atualizar o número da página apenas se o append for bem-sucedido
			if (!append || filteredProducts.length > 0) {
				setPage(currentPage);
			}

			// Limpar estado de carregamento
			setIsLoading(false);
			setIsLoadingMore(false);
			setLoadAttempts(0);

			// Remover o código que salvava no sessionStorage a cada carregamento
			// Isso será feito apenas no efeito de desmontagem
		} catch (error) {
			console.error('[Store] Erro ao carregar produtos:', error);
			setIsLoading(false);
			setIsLoadingMore(false);
			setError(
				error instanceof Error
					? error.message
					: 'Ocorreu um erro ao carregar os produtos'
			);

			// Gerenciar tentativas de carregamento
			const nextAttempt = loadAttempts + 1;
			setLoadAttempts(nextAttempt);

			// Se estamos abaixo do limite de tentativas, tentar novamente após um atraso
			if (nextAttempt <= maxLoadAttempts) {
				console.log(
					`[Store] Tentativa ${nextAttempt}/${maxLoadAttempts} de carregar produtos`
				);
				setTimeout(() => {
					loadProducts(currentPage, append);
				}, 2000); // Esperar 2 segundos antes de tentar novamente
			}
		}
	};

	// Handler para carregar mais produtos
	const loadMoreProducts = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			const nextPage = page + 1;
			console.log(`[StorePage] Carregando mais produtos (página ${nextPage})`);
			setIsLoadingMore(true);

			// Modificando para usar um parâmetro de requisição único a cada vez para evitar cache
			setTimeout(() => {
				loadProducts(nextPage, true, { _t: Date.now() });
			}, 500);
		}
	}, [isLoadingMore, hasMore, page, loadProducts]);

	// Configurar o observador de interseção para o carregamento infinito
	useEffect(() => {
		// Desconectar o observador anterior, se existir
		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		// Se não temos mais para carregar ou já estamos carregando, não configure o observador
		if (!hasMore || isLoadingMore || !loaderRef.current || !pageReady) return;

		// Criar um novo observador com margem maior para carregar antes do usuário chegar ao fim
		observerRef.current = new IntersectionObserver(
			(entries) => {
				// Se o elemento loader estiver visível e temos mais para carregar
				if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
					console.log(
						'[StorePage] Área de carregamento visível, carregando mais produtos...'
					);
					loadMoreProducts();
				}
			},
			{
				root: null, // viewport
				rootMargin: '500px', // Aumentar a margem para carregar mais cedo, antes do usuário chegar no final
				threshold: 0.1, // 10% do elemento visível é suficiente para disparar
			}
		);

		// Observar o elemento loader
		if (loaderRef.current) {
			observerRef.current.observe(loaderRef.current);
		}

		// Limpar o observador ao desmontar
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [hasMore, isLoadingMore, loadMoreProducts, pageReady]);

	// Carregar produtos quando a página estiver pronta
	useEffect(() => {
		if (!pageReady) return;

		// Verificar se já temos token antes de tentar carregar
		const hasToken = tokenStore.hasValidToken();

		if (hasToken) {
			console.log('[StorePage] Token encontrado, carregando produtos...');
			loadProducts(1, false);
		} else if (loadAttempts < maxLoadAttempts) {
			// Se não temos token e ainda não tentamos muitas vezes, aguardar e tentar novamente
			console.log(
				`[StorePage] Token não encontrado, tentativa ${
					loadAttempts + 1
				}/${maxLoadAttempts} em 1s...`
			);
			const timer = setTimeout(() => {
				setLoadAttempts((prev) => prev + 1);
				loadProducts(1, false);
			}, 1000);

			return () => clearTimeout(timer);
		} else {
			console.log(
				'[StorePage] Número máximo de tentativas atingido, exibindo erro'
			);
			setError(
				'Erro de autenticação: Token não encontrado após múltiplas tentativas'
			);
			setIsLoading(false);
		}
	}, [pageReady, searchQuery, sortOrder, categoryId, loadAttempts]);

	// Redirecionamento para login se não estiver autenticado
	useEffect(() => {
		if (!isAuthenticated && !tokenStore.hasValidToken() && !isLoading) {
			router.push('/login');
		}
	}, [router, isAuthenticated, isLoading]);

	// Efeito para recarregar os produtos quando o warehouse mudar
	useEffect(() => {
		// Verificar se a página está pronta e se temos um warehouse definido
		if (pageReady && warehouseName) {
			console.log(
				`[StorePage] Warehouse alterado para: ${warehouseName}, recarregando produtos...`
			);
			loadProducts(1, false);
		}
	}, [warehouseName, pageReady]);

	return (
		<StoreLayout hideSidebar={!pageReady}>
			{/* Componente para verificar token */}
			<TokenVerifier onReady={handleVerificationReady} />

			{/* Botão de voltar ao topo */}
			<ScrollToTopButton />

			{!pageReady ? (
				<LoadingScreen />
			) : (
				<motion.div
					className="max-w-6xl mx-auto py-8 space-y-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5 }}
				>
					{/* Cabeçalho da loja */}
					<motion.div
						className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"
						initial={{ y: -20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ duration: 0.5 }}
					>
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
					</motion.div>

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
							<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
								<button
									onClick={() => loadProducts(1, false)}
									className="px-4 py-2 bg-brand-magenta text-white rounded-md hover:bg-brand-magenta/90 transition-colors"
								>
									Tentar novamente
								</button>
								<button
									onClick={() => {
										window.location.reload();
									}}
									className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
								>
									Recarregar página
								</button>
							</div>
						</div>
					) : (
						<>
							{products.length > 0 ? (
								<div className="space-y-6">
									{/* Indicador de carregamento da categoria */}
									{isLoadingCategory && (
										<div className="mb-4 py-3 px-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-md flex items-center gap-2">
											<div className="animate-spin">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="18"
													height="18"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M21 12a9 9 0 1 1-6.219-8.56" />
												</svg>
											</div>
											<span>Buscando mais produtos desta categoria...</span>
										</div>
									)}

									{/* Grid de produtos com animação */}
									<div
										className={`grid ${
											isGridView
												? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
												: 'grid-cols-1'
										} gap-6`}
									>
										<AnimatePresence mode="popLayout">
											{products.map((product, index) => (
												<motion.div
												key={product.id}
													initial={{ opacity: 0, y: 20 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{
														duration: 0.3,
														delay: Math.min(0.05 * (index % 12), 0.3), // Escalonar a animação, mas limitar o delay máximo
													}}
												>
													<ProductCard
												product={product}
												categories={categories}
												viewMode={viewMode}
											/>
												</motion.div>
										))}
										</AnimatePresence>
									</div>

									{/* Indicador de carregamento infinito */}
									<div
										ref={loaderRef}
										className="flex justify-center h-20 mt-4"
										data-testid="infinite-loader"
									>
											{isLoadingMore && (
											<motion.div
												className="flex items-center gap-2 text-gray-500"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.3 }}
											>
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
											</motion.div>
											)}
										</div>

									{/* Contador de produtos */}
									<motion.div
										className="flex justify-center"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 0.5, delay: 0.3 }}
									>
										<p className="text-gray-500 text-sm">
											Exibindo {products.length} produtos
										</p>
									</motion.div>
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
										{categoryId && categoryId !== 'all' ? (
											<>
												Não encontramos produtos na categoria selecionada.{' '}
												<button
													className="text-brand-magenta hover:underline"
													onClick={() => {
														const params = new URLSearchParams(searchParams);
														params.delete('category');
														params.delete('categoryName');
														router.push(`${pathname}?${params.toString()}`);
													}}
												>
													Ver todos os produtos
												</button>
											</>
										) : (
											'Tente ajustar os filtros ou buscar por termos diferentes.'
										)}
									</p>
								</div>
							)}
						</>
					)}
				</motion.div>
			)}
		</StoreLayout>
	);
}
