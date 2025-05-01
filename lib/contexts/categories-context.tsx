'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	useRef,
} from 'react';
import type { Category } from '@/types/category';
import { fetchCategories, fetchCategoryCounts } from '@/lib/api';
import { useAuth } from './auth-context';
import { tokenStore } from '@/lib/token-store';

export interface CategoriesContextType {
	categories: Category[];
	isLoading: boolean;
	error: string | null;
	reload: () => void;
	updateCategoryCounts: (warehouseName: string) => void;
}

// Tempo mínimo (em ms) entre carregamentos de categorias
const LOAD_COOLDOWN = 2000;

const CategoriesContext = createContext<CategoriesContextType>({
	categories: [],
	isLoading: true,
	error: null,
	reload: () => {},
	updateCategoryCounts: () => {},
});

// Chave para armazenar categorias no localStorage
const CATEGORIES_CACHE_KEY = 'true-store-categories-cache';
// Tempo de expiração do cache (24 horas em milissegundos)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

export const CategoriesProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const { getJwtToken, isAuthenticated, getApiToken } = useAuth();
	const [retryCount, setRetryCount] = useState(0);

	// Referências para controle de carregamento
	const isLoadingRef = useRef(false);
	const lastLoadTimeRef = useRef(0);
	const pendingLoadRef = useRef<NodeJS.Timeout | null>(null);
	
	// Referência para o warehouseName atual
	const warehouseNameRef = useRef<string>('MKT-Creator');

	// Função para carregar categorias que pode ser chamada explicitamente
	const loadCategories = async (force = false) => {
		// Verificar se estamos na página de login - não carregar categorias nessa página
		if (
			typeof window !== 'undefined' &&
			window.location.pathname === '/login'
		) {
			console.log(
				'[CATEGORIES] Na página de login, evitando carregamento de categorias'
			);
			setIsLoading(false);
			return;
		}

		// Verificar a autenticação de forma mais completa, incluindo TokenStore
		const hasValidToken = tokenStore.hasValidToken();
		const isUserAuthenticated = isAuthenticated || hasValidToken;

		// Se não estiver autenticado e não tiver token válido, não tentar carregar categorias
		if (!isUserAuthenticated) {
			console.log(
				'[CATEGORIES] Usuário não autenticado e sem token válido, abortando carregamento de categorias'
			);
			setIsLoading(false);
			return;
		}

		// Controle de tempo entre carregamentos para evitar chamadas repetidas
		const now = Date.now();
		const timeSinceLastLoad = now - lastLoadTimeRef.current;

		// Se já estiver carregando, não iniciar outro carregamento
		if (isLoadingRef.current) {
			console.log(
				'[CATEGORIES] Carregamento já em andamento, ignorando nova solicitação'
			);
			return;
		}

		// Se houve carregamento recente e não é forçado, agendar para depois
		if (!force && timeSinceLastLoad < LOAD_COOLDOWN && categories.length > 0) {
			console.log(
				`[CATEGORIES] Carregamento muito recente (${timeSinceLastLoad}ms), agendando para mais tarde`
			);

			// Limpar agendamento anterior se existir
			if (pendingLoadRef.current) {
				clearTimeout(pendingLoadRef.current);
			}

			// Agendar novo carregamento
			pendingLoadRef.current = setTimeout(() => {
				pendingLoadRef.current = null;
				loadCategories(force);
			}, LOAD_COOLDOWN - timeSinceLastLoad);

			return;
		}

		// Se não for forçado e já foi inicializado, retornar
		if (!force && isInitialized) return;

		if (force) {
			console.log('[CATEGORIES] Forçando recarregamento de categorias...');
		} else {
			setIsInitialized(true);
		}

		// Marcar início do carregamento
		isLoadingRef.current = true;
		lastLoadTimeRef.current = now;
		setIsLoading(true);
		setError(null);

		try {
			console.log('[CATEGORIES] Iniciando carregamento de categorias...');

			// Não limpar o cache a menos que seja forçado
			if (force) {
				localStorage.removeItem(CATEGORIES_CACHE_KEY);
				console.log(
					'[CATEGORIES] Cache de categorias removido do localStorage'
				);
			}

			// Verificar cache antes de fazer nova requisição (se não for forçado)
			if (!force) {
				try {
					const cachedData = localStorage.getItem(CATEGORIES_CACHE_KEY);
					if (cachedData) {
						const { data, timestamp } = JSON.parse(cachedData);
						const isExpired = Date.now() - timestamp > CACHE_EXPIRATION;

						if (!isExpired && Array.isArray(data) && data.length > 0) {
							console.log('[CATEGORIES] Usando dados do cache local');
							setCategories(data);
							setIsLoading(false);
							isLoadingRef.current = false;
							return;
						} else {
							console.log(
								'[CATEGORIES] Cache expirado ou inválido, buscando novos dados'
							);
						}
					}
				} catch (e) {
					console.error('[CATEGORIES] Erro ao verificar cache:', e);
				}
			}

			// IMPORTANTE: Aguardar 1 segundo antes de tentar obter o token
			// Isso garante que o sistema de autenticação tenha tempo de inicializar
			if (!tokenStore.getToken() && isAuthenticated) {
				console.log(
					'[CATEGORIES] Aguardando inicialização do sistema de autenticação antes de obter token...'
				);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			console.log(
				'[CATEGORIES] Obtendo token para requisição de categorias...'
			);

			// Tentar obter token seguindo a mesma estratégia que a API de produtos
			let token = tokenStore.getToken();

			// Se não tiver token mas estiver autenticado, buscá-lo da API
			if (!token && isAuthenticated) {
				try {
					console.log('[CATEGORIES] Buscando token via API True Core...');
					token = await getApiToken();

					if (!token) {
						console.log('[CATEGORIES] Token API indisponível, tentando JWT...');
						const jwtToken = await getJwtToken();

						if (jwtToken) {
							console.log(
								'[CATEGORIES] Trocando token JWT por token True Core...'
							);

							const response = await fetch('/api/auth/token', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ token: jwtToken }),
								credentials: 'include',
							});

							if (response.ok) {
								const data = await response.json();
								if (data.access_token) {
									token = data.access_token;

									// Validar que não é null nem undefined antes de salvar
									if (token) {
										tokenStore.setToken(token, 86400);
										console.log(
											'[CATEGORIES] Token True Core obtido via troca'
										);
									}
								}
							}
						}
					} else {
						console.log('[CATEGORIES] Token API obtido com sucesso');
					}
				} catch (e) {
					console.error('[CATEGORIES] Erro ao obter token via API:', e);
				}
			}

			// Verificar cookies como último recurso
			if (!token) {
				try {
					const cookies = document.cookie.split(';');
					const tokenCookie = cookies.find((c) =>
						c.trim().startsWith('true_core_token=')
					);
					if (tokenCookie) {
						token = tokenCookie.split('=')[1].trim();
						console.log('[CATEGORIES] Token extraído do cookie');

						// Armazenar para uso futuro
						if (token) tokenStore.setToken(token, 86400);
					}
				} catch (e) {
					console.error('[CATEGORIES] Erro ao extrair token do cookie:', e);
				}
			}

			// Se ainda não temos token e não atingimos o limite de tentativas
			if (!token) {
				// Importante: limitar o número de tentativas para evitar loop infinito
				if (retryCount < 5) {
					// Espera crescente entre tentativas: 1s, 2s, 3s, 4s, 5s
					const delayTime = (retryCount + 1) * 1000;
					console.log(
						`[CATEGORIES] Token não disponível, nova tentativa em ${
							delayTime / 1000
						}s (tentativa ${retryCount + 1}/5)`
					);

					setRetryCount((prev) => prev + 1);
					setTimeout(() => {
						isLoadingRef.current = false;
						loadCategories(true);
					}, delayTime);

					return;
				}

				console.warn('[CATEGORIES] Nenhum token disponível após 5 tentativas');
				setError('Token de autenticação não disponível');
				setIsLoading(false);
				isLoadingRef.current = false;
				return;
			}

			// Definir o token como cookie para requisições futuras
			document.cookie = `true_core_token=${token}; path=/; max-age=3600`;
			console.log('[CATEGORIES] Token definido como cookie para API');

			// Buscar categorias da API
			console.log('[CATEGORIES] Buscando categorias da API...');
			try {
				// IMPORTANTE: Definir o token no cookie antes da chamada
				const data = await fetchCategories(token);

				if (Array.isArray(data) && data.length > 0) {
					console.log(
						`[CATEGORIES] ${data.length} categorias obtidas com sucesso da API`
					);
					setCategories(data);

					// Armazenar em cache
					localStorage.setItem(
						CATEGORIES_CACHE_KEY,
						JSON.stringify({ data, timestamp: Date.now() })
					);
					console.log('[CATEGORIES] Categorias armazenadas no cache local');

					// Resetar contador de tentativas após sucesso
					setRetryCount(0);
				} else {
					console.error('[CATEGORIES] Resposta vazia ou inválida da API');
					throw new Error('Resposta inválida da API de categorias');
				}
			} catch (apiError: unknown) {
				console.error('[CATEGORIES] Erro na chamada à API:', apiError);
				const errorMessage =
					apiError instanceof Error
						? apiError.message
						: 'Erro desconhecido ao buscar categorias';
				throw new Error(`Erro ao buscar categorias da API: ${errorMessage}`);
			}
		} catch (err) {
			const error = err as Error;
			console.error('[CATEGORIES] Falha ao carregar categorias:', err);
			setError(error.message || 'Erro ao carregar categorias');

			// Em caso de erro, tenta usar cache mesmo expirado como última opção
			const cachedData = localStorage.getItem(CATEGORIES_CACHE_KEY);
			if (cachedData) {
				try {
					const { data } = JSON.parse(cachedData);
					console.log('[CATEGORIES] Usando cache expirado como fallback');
					setCategories(data);
				} catch (e) {
					// Ignora erros de parse
					console.error('[CATEGORIES] Erro ao usar cache expirado:', e);
				}
			}
		} finally {
			setIsLoading(false);
			isLoadingRef.current = false;
		}
	};

	/**
	 * Atualiza as contagens de produtos por categoria com base no depósito especificado
	 * @param warehouseName Nome do depósito para buscar as contagens
	 */
	const updateCategoryCounts = async (warehouseName: string) => {
		if (!warehouseName) {
			console.warn('[Categories] Nome do depósito não fornecido para atualizar contagens');
			return;
		}

		console.log(`[Categories] Atualizando contagens de produtos para depósito: ${warehouseName}`);
		setIsLoading(true);

		try {
			// Buscar contagens de categorias usando o novo endpoint
			const result = await fetchCategoryCounts(warehouseName, true);
			
			if (result && result.categories && Array.isArray(result.categories)) {
				console.log(`[Categories] Recebidas ${result.categories.length} categorias com contagens para o depósito ${warehouseName}`);
				
				// Atualizar o estado com as categorias e suas contagens
				setCategories(result.categories);
			} else {
				console.warn('[Categories] Resposta inválida ao buscar contagens de categorias:', result);
			}
		} catch (error: unknown) {
			console.error('[Categories] Erro ao atualizar contagens de produtos por categoria:', error);
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			setError(`Erro ao atualizar contagens: ${errorMessage}`);
		} finally {
			setIsLoading(false);
		}
	};
	
	// Efeito para detectar mudanças no warehouse salvo no localStorage
	useEffect(() => {
		// Evitar execução no SSR
		if (typeof window === 'undefined') return;
		
		// Verificar inicialmente e carregar contagens
		const checkWarehouse = () => {
			const savedWarehouse = localStorage.getItem('warehouse_name');
			if (savedWarehouse && savedWarehouse !== warehouseNameRef.current) {
				console.log(`[CATEGORIES] Warehouse alterado para ${savedWarehouse}, atualizando contagens`);
				updateCategoryCounts(savedWarehouse);
			}
		};
		
		// Executar verificação inicial
		checkWarehouse();
		
		// Configurar o listener para as mudanças de warehouse
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === 'warehouse_name' && event.newValue) {
				if (event.newValue !== warehouseNameRef.current) {
					console.log(`[CATEGORIES] Warehouse alterado para ${event.newValue} via localStorage`);
					updateCategoryCounts(event.newValue);
				}
			}
		};
		
		// Adicionar listener para mudanças no localStorage
		window.addEventListener('storage', handleStorageChange);
		
		// Remover listener ao desmontar
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	}, [categories]);

	// Função de recarga exposta no contexto
	const reload = () => {
		console.log('[CATEGORIES] Recarregando categorias...');
		loadCategories(true);
		
		// Também atualizar as contagens se tivermos um warehouse definido
		if (typeof window !== 'undefined') {
			const savedWarehouse = localStorage.getItem('warehouse_name');
			if (savedWarehouse) {
				console.log(`[CATEGORIES] Também atualizando contagens para ${savedWarehouse}`);
				updateCategoryCounts(savedWarehouse);
			}
		}
	};

	// Função de debounce para eventos que disparam carregamento de categorias
	const debouncedLoadCategories = (force = false) => {
		// Limpar qualquer agendamento pendente
		if (pendingLoadRef.current) {
			clearTimeout(pendingLoadRef.current);
			pendingLoadRef.current = null;
		}

		// Se já estiver carregando, não iniciar outro
		if (isLoadingRef.current) return;

		// Verificar tempo desde último carregamento
		const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;

		// Se for muito recente, agendar para depois
		if (timeSinceLastLoad < LOAD_COOLDOWN && categories.length > 0) {
			console.log(
				`[CATEGORIES] Debouncing carregamento (${timeSinceLastLoad}ms desde o último)`
			);
			pendingLoadRef.current = setTimeout(() => {
				pendingLoadRef.current = null;
				loadCategories(force);
			}, LOAD_COOLDOWN - timeSinceLastLoad);
			return;
		}

		// Caso contrário, carregar imediatamente
		loadCategories(force);
	};

	// Listener para evento de autenticação pronta
	useEffect(() => {
		// Evento de autenticação pronta
		const handleAuthReady = (event: Event) => {
			const customEvent = event as CustomEvent<{
				isAuthenticated: boolean;
				hasError?: boolean;
			}>;
			console.log(
				'[CATEGORIES] Evento auth:ready recebido:',
				customEvent.detail
			);

			// Verificar se estamos na página de login - não carregar categorias nessa página
			if (
				typeof window !== 'undefined' &&
				window.location.pathname === '/login'
			) {
				console.log(
					'[CATEGORIES] Na página de login, ignorando carregamento de categorias após evento auth:ready'
				);
				setIsLoading(false);
				return;
			}

			if (customEvent.detail.isAuthenticated) {
				console.log(
					'[CATEGORIES] Autenticação pronta, iniciando carregamento de categorias'
				);
				// Pequeno delay para garantir que tudo está pronto
				setTimeout(() => {
					debouncedLoadCategories();
				}, 100);
			} else {
				// Não carregar categorias se o usuário não estiver autenticado
				console.log(
					'[CATEGORIES] Usuário não autenticado, ignorando carregamento de categorias'
				);
				setIsLoading(false);
			}
		};

		// Registrar o listener
		window.addEventListener('auth:ready', handleAuthReady);

		// Limpeza ao desmontar
		return () => {
			window.removeEventListener('auth:ready', handleAuthReady);
		};
	}, []);

	// Efeito para inicializar o carregamento de categorias quando auth estiver pronto
	useEffect(() => {
		// Não carregar imediatamente; esperar pelo evento auth:ready
		// Porém, se auth já estiver pronto e auth:ready não for disparado, tentar carregar
		if (!isAuthenticated) return;

		const hasToken = !!tokenStore.getToken();
		const isStorePage =
			typeof window !== 'undefined' &&
			window.location.pathname.includes('/store');

		// Verificar se estamos na página da loja e temos token mas sem categorias
		if (
			(hasToken && categories.length === 0 && !isLoading && !error) ||
			(isStorePage && hasToken && !isLoading)
		) {
			console.log(
				'[CATEGORIES] Token disponível e estamos na página da loja, carregando categorias...'
			);
			// Delay menor para evitar problemas de concorrência, mas garantir carregamento rápido
			const timer = setTimeout(() => {
				debouncedLoadCategories();
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [isAuthenticated, retryCount, categories.length, isLoading, error]);

	// Adicionar um listener para o evento auth:login-complete
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Handler para o evento de conclusão de login
		const handleLoginComplete = async (event: Event) => {
			const customEvent = event as CustomEvent;
			console.log(
				'[CATEGORIES] Evento auth:login-complete recebido:',
				customEvent.detail
			);

			// Verificar se o login foi por email (necessita mais tempo)
			const isEmailLogin = customEvent.detail?.method === 'email';
			const waitTime = isEmailLogin ? 1500 : 500;

			console.log(
				`[CATEGORIES] Aguardando ${waitTime}ms antes de carregar categorias...`
			);

			// Aguardar um momento para garantir que o estado de autenticação esteja atualizado
			await new Promise((resolve) => setTimeout(resolve, waitTime));

			// Verificar token antes de tentar carregar
			const hasToken = !!tokenStore.getToken();

			if (!hasToken) {
				console.log('[CATEGORIES] Nenhum token disponível, esperando mais...');
				// Tentar novamente após um tempo adicional
				setTimeout(() => {
					const hasTokenRetry = !!tokenStore.getToken();
					if (hasTokenRetry) {
						console.log(
							'[CATEGORIES] Token encontrado na segunda tentativa, carregando categorias...'
						);
						setIsLoading(true);
						debouncedLoadCategories(true); // usar versão debounced
					} else {
						// Se ainda não tiver token, esperar pelo evento auth:state-updated
						console.log('[CATEGORIES] Aguardando evento auth:state-updated...');
					}
				}, 1000);
				return;
			}

			// Forçar o carregamento das categorias
			console.log('[CATEGORIES] Token disponível, carregando categorias...');
			setIsLoading(true);
			debouncedLoadCategories(true); // usar versão debounced
		};

		// Adicionar um listener para o evento auth:state-updated
		const handleAuthStateUpdated = async (event: Event) => {
			const customEvent = event as CustomEvent;
			console.log(
				'[CATEGORIES] Evento auth:state-updated recebido:',
				customEvent.detail
			);

			if (customEvent.detail?.isAuthenticated) {
				// Aguardar um momento para garantir que o token esteja disponível
				await new Promise((resolve) => setTimeout(resolve, 500));

				// Verificar se há um token disponível
				const hasToken = !!tokenStore.getToken();
				if (hasToken) {
					console.log(
						'[CATEGORIES] Estado de autenticação atualizado com token disponível, carregando categorias...'
					);
					setIsLoading(true);
					debouncedLoadCategories(true); // usar versão debounced
				}
			}
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

	return (
		<CategoriesContext.Provider
			value={{
				categories,
				isLoading,
				error,
				reload,
				updateCategoryCounts,
			}}
		>
			{children}
		</CategoriesContext.Provider>
	);
};

export const useCategories = (): CategoriesContextType => {
	const context = useContext(CategoriesContext);
	if (context === undefined) {
		throw new Error(
			'useCategories deve ser usado dentro de um CategoriesProvider'
		);
	}
	return context;
};
