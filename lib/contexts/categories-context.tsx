'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import type { Category } from '@/types/category';
import { fetchCategories } from '@/lib/api';
import { useAuth } from './auth-context';
import { tokenStore } from '@/lib/token-store';

export interface CategoriesContextType {
	categories: Category[];
	isLoading: boolean;
	error: string | null;
	reload: () => void;
}

const CategoriesContext = createContext<CategoriesContextType>({
	categories: [],
	isLoading: true,
	error: null,
	reload: () => {},
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

		// Se não estiver autenticado, não tentar carregar categorias
		if (!isAuthenticated) {
			console.log(
				'[CATEGORIES] Usuário não autenticado, abortando carregamento de categorias'
			);
			setIsLoading(false);
			return;
		}

		// Se não for forçado e já foi inicializado, retornar
		if (!force && isInitialized) return;

		if (force) {
			console.log('[CATEGORIES] Forçando recarregamento de categorias...');
		} else {
			setIsInitialized(true);
		}

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
						loadCategories(true);
					}, delayTime);

					return;
				}

				console.warn('[CATEGORIES] Nenhum token disponível após 5 tentativas');
				setError('Token de autenticação não disponível');
				setIsLoading(false);
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
		}
	};

	// Função de recarga exposta no contexto
	const reload = () => {
		console.log('[CategoriesProvider] Recarregando categorias...');
		setRetryCount(0); // Resetar contagem de tentativas
		loadCategories(true);
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
					loadCategories();
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
				loadCategories();
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [isAuthenticated, retryCount, categories.length, isLoading, error]);

	// Adicionar um listener para o evento auth:login-complete
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Handler para o evento de conclusão de login
		const handleLoginComplete = async () => {
			console.log(
				'[CATEGORIES] Evento auth:login-complete recebido, recarregando categorias...'
			);

			// Aguardar um momento para garantir que o estado de autenticação esteja atualizado
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Forçar o carregamento das categorias
			setIsLoading(true);
			loadCategories(true); // true = forçar o recarregamento
		};

		// Registrar o listener
		window.addEventListener('auth:login-complete', handleLoginComplete);

		// Cleanup
		return () => {
			window.removeEventListener('auth:login-complete', handleLoginComplete);
		};
	}, [loadCategories]);

	return (
		<CategoriesContext.Provider
			value={{
				categories,
				isLoading,
				error,
				reload,
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
