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
import { StoreBanner } from '@/components/banner/store-banner';

// Constantes de configuração
const PRODUCTS_PER_PAGE = 12;

/**
 * Componente para verificar token e controlar carregamento da página
 */
const TokenVerifier = ({ onReady }: { onReady: () => void }) => {
	const [verificationComplete, setVerificationComplete] = useState(false);
	const router = useRouter();

	useEffect(() => {
		if (verificationComplete) return;

		const checkToken = async () => {
			try {
				console.log('[Store:TokenVerifier] Verificando token...');

				// Primeiro, verificar se há token válido no TokenStore
				if (tokenStore.hasValidToken()) {
					console.log(
						'[Store:TokenVerifier] Token válido encontrado no TokenStore'
					);
					setVerificationComplete(true);
					onReady();
					return true;
				}

				// Verificar se temos um token no localStorage (compatibilidade)
				const localToken = localStorage.getItem('true_core_token');
				if (localToken) {
					try {
						// Verificar se o token do localStorage é válido
						const tokenParts = localToken.split('.');
						if (tokenParts.length === 3) {
							// Parece ser um JWT válido
							console.log(
								'[Store:TokenVerifier] Token encontrado no localStorage'
							);

							// Considerar pré-válido e permitir acesso inicial à loja
							setVerificationComplete(true);
							onReady();

							// Simultaneamente, importar o token para o TokenStore
							tokenStore.setToken(localToken, 86400); // 24 horas

							return true;
						}
					} catch (e) {
						console.warn(
							'[Store:TokenVerifier] Erro ao analisar token do localStorage:',
							e
						);
					}
				}

				// Se chegamos aqui, não temos token válido imediatamente
				// Verificar se há um novo token sendo obtido pelo AuthContext
				// (Pode demorar um pouco mais)
				console.log(
					'[Store:TokenVerifier] Token não encontrado imediatamente, aguardando...'
				);

				// Ouvir evento de autenticação pronta
				const readyListener = (event: CustomEvent) => {
					const detail = event.detail || {};
					console.log(
						'[Store:TokenVerifier] Evento auth:ready recebido:',
						detail
					);

					// Se autenticado ou temos token válido, proceder
					if (
						detail.isAuthenticated ||
						detail.fromToken ||
						tokenStore.hasValidToken()
					) {
						console.log(
							'[Store:TokenVerifier] Autenticação concluída, token disponível'
						);
						setVerificationComplete(true);
						onReady();
						window.removeEventListener(
							'auth:ready',
							readyListener as EventListener
						);
						return true;
					}

					// Se não autenticado e não temos erros de Clerk, aguardar um pouco mais
					if (detail.hasError || detail.clerkMissing) {
						// Verificar token mais uma vez
						if (tokenStore.hasValidToken()) {
							console.log(
								'[Store:TokenVerifier] Token válido encontrado após evento auth:ready'
							);
							setVerificationComplete(true);
							onReady();
							window.removeEventListener(
								'auth:ready',
								readyListener as EventListener
							);
							return true;
						}

						// Caso realmente não tenhamos token, redirecionar
						console.log(
							'[Store:TokenVerifier] Sem autenticação e sem token após evento auth:ready'
						);
						router.push('/login');
						window.removeEventListener(
							'auth:ready',
							readyListener as EventListener
						);
						return false;
					}
				};

				window.addEventListener('auth:ready', readyListener as EventListener);

				// Timeout de segurança para não ficar esperando indefinidamente
				setTimeout(() => {
					// Verificar token mais uma vez antes de desistir
					if (tokenStore.hasValidToken()) {
						console.log(
							'[Store:TokenVerifier] Token válido encontrado após timeout de segurança'
						);
						setVerificationComplete(true);
						onReady();
						window.removeEventListener(
							'auth:ready',
							readyListener as EventListener
						);
						return true;
					}

					console.log(
						'[Store:TokenVerifier] Timeout de espera por token expirado'
					);
					router.push('/login');
					window.removeEventListener(
						'auth:ready',
						readyListener as EventListener
					);
					return false;
				}, 3000); // Tempo máximo de espera

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
	const { categories, updateCategoryCounts } = useCategories();
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
		// Verificar se já temos um warehouse definido no localStorage
		const savedWarehouse = localStorage.getItem('warehouse_name');
		if (savedWarehouse && savedWarehouse.trim()) {
			setWarehouseName(savedWarehouse);
			console.log(
				`[StorePage] Usando warehouse do localStorage: ${savedWarehouse}`
			);
		} else {
			// Se não temos warehouse, verificar se há dados do cliente para obter o warehouse
			console.log(
				'[StorePage] Warehouse não encontrado no localStorage, buscando informações do cliente'
			);
			checkCustomerCategory();
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

			// Determinar o warehouse correto com base nos dados do cliente
			let warehouseToUse = 'MKT-Creator'; // Valor padrão (fallback)

			// Verificar se existe o campo __warehouse__ diretamente no cliente
			if (
				customerData.__warehouse__ &&
				typeof customerData.__warehouse__ === 'string' &&
				customerData.__warehouse__.trim()
			) {
				warehouseToUse = customerData.__warehouse__;
				console.log(
					`[StorePage] Usando warehouse do campo __warehouse__: ${warehouseToUse}`
				);
			}
			// Caso contrário, verificar se existe na categoria
			else if (
				customerData.__category__ &&
				customerData.__category__.depositoNome &&
				typeof customerData.__category__.depositoNome === 'string' &&
				customerData.__category__.depositoNome.trim()
			) {
				warehouseToUse = customerData.__category__.depositoNome;
				console.log(
					`[StorePage] Usando warehouse do campo __category__.depositoNome: ${warehouseToUse}`
				);
			}
			// Caso contrário, verificar depositoId
			else if (
				customerData.__category__ &&
				customerData.__category__.depositoId &&
				typeof customerData.__category__.depositoId === 'string' &&
				customerData.__category__.depositoId.trim()
			) {
				warehouseToUse = customerData.__category__.depositoId;
				console.log(
					`[StorePage] Usando warehouse do campo __category__.depositoId: ${warehouseToUse}`
				);
			}
			// Se não encontrou em nenhum campo específico, usar a lógica original com base no nome da categoria
			else if (customerData && customerData.__category__) {
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
					warehouseToUse = 'MKT-Top Master';
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
					warehouseToUse = 'MKT-Creator';
					console.log(
						'[StorePage] Cliente é Creator, definindo warehouse para MKT-Creator'
					);
				} else {
					console.log(
						'[StorePage] Categoria não identificada, usando warehouse padrão MKT-Creator'
					);
				}

				// Atualizar contagens de categorias para o novo warehouse
				updateCategoryCounts(warehouseName);

				// Recarregar os produtos com o warehouse correto
				loadProducts(1, false);
			} else {
				console.log(
					'[StorePage] Cliente sem categoria definida, usando warehouse padrão MKT-Creator'
				);
				setWarehouseName('MKT-Creator');
				localStorage.setItem('warehouse_name', 'MKT-Creator');
				
				// Atualizar contagens de categorias para o warehouse padrão
				updateCategoryCounts('MKT-Creator');
			}

			// Salvar o warehouse obtido para uso futuro
			setWarehouseName(warehouseToUse);
			localStorage.setItem('warehouse_name', warehouseToUse);
			console.log(
				`[StorePage] Warehouse definido como ${warehouseToUse} e salvo no localStorage`
			);

			// Recarregar os produtos com o warehouse correto
			loadProducts(1, false);
		} catch (error) {
			console.error(
				'[StorePage] Erro ao verificar categoria do cliente:',
				error
			);
			// Em caso de erro, usar Creator como padrão
			setWarehouseName('MKT-Creator');
			localStorage.setItem('warehouse_name', 'MKT-Creator');
			
			// Atualizar contagens de categorias mesmo em caso de erro
			updateCategoryCounts('MKT-Creator');
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
			const sort = sortOrder || 'featured';

			console.log(
				`[Store] Carregando produtos: página ${currentPage}, categoria: ${category}, busca: "${search}", ordenação: "${sort}"${
					append ? ' (anexando resultados)' : ''
				}`
			);

			// Determinar se devemos ignorar o cache
			const skipCache = append || currentPage > 1;

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
					category: category, // Passar o ID da categoria diretamente
					sort: sort, // Passar o parâmetro de ordenação
					skipCache: skipCache, // Ignorar cache apenas quando necessário
					...extraParams, // Adicionar parâmetros extras
				});
				
				console.log(`[Store] Resposta da API recebida com sucesso. Produtos totais: ${response?.data?.length || 0}`);
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
				// Preservar informações de estoque do warehouse se disponíveis
				warehouseStock: item.warehouseStock || undefined,
				// Adicionar flag para indicar se o produto está em estoque
				inStock: item.warehouseStock ? 
					(item.warehouseStock.available > 0) : 
					(item.stock > 0)
			}));

			// A filtragem de categoria é feita no backend, não precisamos filtrar novamente
			let filteredProducts = productsData;
			
			// Apenas para depuração, calcular quantos produtos correspondem à categoria selecionada
			if (category && category !== 'all') {
				const categoryMatchCount = productsData.filter((product: Product) => {
					// Verificar no categoryId do produto
					if (product.categoryId === category) {
						return true;
					}

					// Verificar no objeto category aninhado (se existir)
					if (product.category && product.category.id === category) {
						return true;
					}

					return false;
				}).length;
				
				console.log(`[Store] Correspondência de categoria (apenas log): ${categoryMatchCount} de ${productsData.length} produtos correspondem à categoria ${category}`);
				
				// Verificar informações de estoque para depuração
				const withStock = productsData.filter((product: Product) => product.inStock).length;
				console.log(`[Store] Produtos com estoque disponível: ${withStock} de ${productsData.length} (${withStock > 0 ? Math.round(withStock/productsData.length*100) : 0}%)`);
			}

			// Ordenar os produtos no lado do cliente, apenas se necessário (quando a API não suportar a ordenação solicitada)
			// Isso serve como backup no caso da API não processar o parâmetro de ordenação
			if (sort && sort !== 'featured') {
				console.log(`[Store] Verificando se é necessário ordenar produtos no cliente por: ${sort}`);
				filteredProducts = [...filteredProducts].sort((a, b) => {
					switch (sort) {
						case 'price-asc':
							return a.price - b.price;
						case 'price-desc':
							return b.price - a.price;
						case 'name-asc':
							return a.name.localeCompare(b.name);
						case 'name-desc':
							return b.name.localeCompare(a.name);
						default:
							return 0;
					}
				});
				console.log(`[Store] Produtos ordenados com sucesso`);
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

					// Combinar produtos existentes com novos produtos
					const combinedProducts = [...prev, ...newProducts];

					// Se temos uma ordenação ativa, aplicar novamente em toda a lista
					// Isso garante que todos os produtos, antigos e novos, sigam a mesma ordenação
					if (sort && sort !== 'featured') {
						console.log(`[Store] Reordenando lista combinada por: ${sort}`);
						return combinedProducts.sort((a, b) => {
							switch (sort) {
								case 'price-asc':
									return a.price - b.price;
								case 'price-desc':
									return b.price - a.price;
								case 'name-asc':
									return a.name.localeCompare(b.name);
								case 'name-desc':
									return b.name.localeCompare(a.name);
								default:
									return 0;
							}
						});
					}

					return combinedProducts;
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
	}, [isLoadingMore, hasMore, page, loadProducts, sortOrder]);

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

	// Efeito para carregar produtos quando parâmetros de consulta mudam
	useEffect(() => {
		if (!pageReady) return;

		// Verificar se já temos token antes de tentar carregar
		const hasToken = tokenStore.hasValidToken();

		if (hasToken) {
			// Evitar carregar quando já temos produtos e não houve mudança nos parâmetros relevantes
			const shouldReload = searchQuery || categoryId || loadAttempts === 0;
			
			if (shouldReload) {
				console.log('[StorePage] Parâmetros de consulta alterados, recarregando produtos...');
				loadProducts(1, false);
			} else {
				console.log('[StorePage] Parâmetros não mudaram, evitando recarga desnecessária');
			}
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
		// Remover sortOrder das dependências para evitar recargas desnecessárias
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageReady, searchQuery, categoryId, loadAttempts]);

	// Efeito para recarregar os produtos quando o warehouse mudar
	useEffect(() => {
		// Verificar se a página está pronta e se temos um warehouse definido
		if (pageReady && warehouseName) {
			console.log(
				`[StorePage] Warehouse alterado para: ${warehouseName}, recarregando produtos...`
			);
			loadProducts(1, false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [warehouseName, pageReady]);

	// Efeito para atualizar contagens de categorias quando a página está pronta ou o depósito muda
	useEffect(() => {
		if (warehouseName && pageReady) {
			console.log(`[StorePage] Atualizando contagens de categorias para o warehouse: ${warehouseName}`);
			// Usar o método do contexto para atualizar as contagens com o warehouse atual
			updateCategoryCounts(warehouseName);
		}
	}, [warehouseName, pageReady, updateCategoryCounts]);

	// Redirecionamento para login se não estiver autenticado
	useEffect(() => {
		if (!isAuthenticated && !tokenStore.hasValidToken() && !isLoading) {
			router.push('/login');
		}
	}, [router, isAuthenticated, isLoading]);

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
						<StoreBanner className="mb-2" />
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
