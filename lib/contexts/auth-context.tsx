'use client';

import React, {
	createContext,
	useContext,
	ReactNode,
	useEffect,
	useState,
	useCallback,
} from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs';
import { authService, User } from '@/lib/services/auth-service';
import { tokenStore } from '@/lib/token-store';
import { setAuth } from '@/lib/api-helpers';
import { LogOut } from 'lucide-react';

export interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	isReady: boolean;
	error: string | null;
	logout: () => Promise<void>;
	getJwtToken: () => Promise<string | null>;
	getApiToken: () => Promise<string | null>;
	forceRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isLoading: true,
	isAuthenticated: false,
	isReady: false,
	error: null,
	logout: async () => {},
	getJwtToken: async () => null,
	getApiToken: async () => null,
	forceRefresh: async () => {},
});

/**
 * Provider de autenticação para o aplicativo
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const { user: clerkUser, isLoaded, isSignedIn } = useUser();
	const { signOut } = useClerk();
	const { isLoaded: isAuthLoaded, getToken } = useClerkAuth();
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [tokenRenewalJob, setTokenRenewalJob] = useState<NodeJS.Timeout | null>(
		null
	);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	/**
	 * Obter token JWT do Clerk
	 */
	const getJwtToken = useCallback(async (): Promise<string | null> => {
		try {
			return await getToken();
		} catch (error) {
			console.error('Erro ao obter token JWT:', error);
			return null;
		}
	}, [getToken]);

	/**
	 * Obter token de API True Core
	 */
	const getApiToken = useCallback(async (): Promise<string | null> => {
		try {
			// Primeiro, verificar se já temos um token válido no TokenStore global
			if (tokenStore.hasValidToken()) {
				const token = tokenStore.getToken();
				console.log('[AUTH] Usando token True Core do TokenStore global');
				return token;
			}

			// Depois, verificar no localStorage (para compatibilidade)
			if (authService.hasValidToken()) {
				const localToken = await authService.getApiToken();
				if (localToken) {
					// Migrar para o TokenStore global
					tokenStore.setToken(localToken, 86400); // Convertido para número
					console.log(
						'[AUTH] Token migrado do localStorage para TokenStore global'
					);
					return localToken;
				}
			}

			// Se não temos token válido, trocar o token Clerk por um novo token True Core
			console.log('[AUTH] Obtendo novo token True Core via troca com Clerk');
			const clerkToken = await getToken();
			if (!clerkToken) {
				console.warn('[AUTH] Não foi possível obter o token Clerk');
				return null;
			}

			// Log para depuração
			console.log(
				`[AUTH] Token Clerk obtido: ${clerkToken.substring(0, 20)}...`
			);

			// Chamar a API para trocar o token
			const response = await fetch('/api/auth/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token: clerkToken }),
				credentials: 'include', // Importante para permitir o cookie ser definido
			});

			if (!response.ok) {
				const error = await response.text();
				console.error('[AUTH] Erro ao trocar token:', error);
				return null;
			}

			const data = await response.json();

			if (!data.access_token) {
				console.error('[AUTH] Token não retornado pela API');
				return null;
			}

			// Analisar o token para verificar a data de expiração
			let expiresIn = 24 * 60 * 60; // 24 horas por padrão
			try {
				const tokenParts = data.access_token.split('.');
				if (tokenParts.length === 3) {
					const payload = JSON.parse(
						Buffer.from(tokenParts[1], 'base64').toString()
					);
					if (payload.exp) {
						const expTimestamp = payload.exp * 1000; // Converter para milissegundos
						const now = Date.now();
						const calculatedExpiresIn = Math.floor((expTimestamp - now) / 1000);

						if (calculatedExpiresIn > 0) {
							console.log(
								`[AUTH] Token JWT contém exp, ajustando expiração para ${calculatedExpiresIn}s`
							);
							expiresIn = calculatedExpiresIn;
						} else {
							console.warn(
								`[AUTH] Token JWT já expirado! exp=${new Date(
									expTimestamp
								).toISOString()}`
							);
						}
					}
				}
			} catch (e) {
				console.warn(`[AUTH] Não foi possível analisar o token JWT:`, e);
			}

			// Armazenar o token no TokenStore global com tempo de expiração extraído do token
			tokenStore.setToken(data.access_token, expiresIn);

			// Para compatibilidade, também atualizar no AuthService
			authService.storeTokenDirectly(data.access_token);

			console.log(
				`[AUTH] Novo token True Core obtido com sucesso (expira em ${expiresIn}s)`
			);
			return data.access_token;
		} catch (error) {
			console.error('[AUTH] Erro ao obter token API:', error);
			return null;
		}
	}, [getToken]);

	/**
	 * Inicia um job periódico para renovar o token
	 */
	const startTokenRenewalJob = useCallback(() => {
		// Já existe um job em execução? Não crie outro
		if (tokenRenewalJob) return;

		// Renovar o token apenas quando estiver próximo da expiração
		// Para reduzir o número de requisições desnecessárias
		const job = setInterval(async () => {
			console.log('[AUTH] Verificando token de API...');

			try {
				// Verificar se o token atual ainda é válido
				if (tokenStore.hasValidToken()) {
					// Verificar quanto tempo falta para expirar
					const remainingTime = tokenStore.getTokenExpiryTimeRemaining();

					// Se ainda tiver mais de 1 hora, não renovar
					if (remainingTime && remainingTime > 60 * 60) {
						console.log(
							`[AUTH] Token ainda é válido por ${remainingTime}s, não é necessário renovar`
						);
						return;
					}

					console.log(
						`[AUTH] Token expira em menos de 1 hora (${remainingTime}s), renovando...`
					);
				} else {
					console.log(
						'[AUTH] Token expirado ou não encontrado, obtendo novo token...'
					);
				}

				// Obter novo token Clerk
				const clerkToken = await getToken();
				if (!clerkToken) {
					console.warn('[AUTH] Não foi possível obter o token Clerk');
					return;
				}

				// Forçar a renovação do token
				console.log('[AUTH] Renovando token True Core...');
				await getApiToken();
				console.log('[AUTH] Token renovado com sucesso');
			} catch (error) {
				console.error('[AUTH] Erro ao renovar token:', error);
			}
		}, 30 * 60 * 1000); // Verificar a cada 30 minutos

		setTokenRenewalJob(job);
		console.log(
			'[AUTH] Job de verificação de token iniciado (a cada 30 minutos)'
		);
	}, [tokenRenewalJob, getToken, getApiToken]);

	/**
	 * Para o job de renovação de token
	 */
	const stopTokenRenewalJob = useCallback(() => {
		if (tokenRenewalJob) {
			clearInterval(tokenRenewalJob);
			setTokenRenewalJob(null);
			console.log('[AUTH] Job de renovação de token parado');
		}
	}, [tokenRenewalJob]);

	/**
	 * Função para fazer logout do usuário
	 */
	const logout = useCallback(async (): Promise<void> => {
		try {
			// Limpar tokens de todos os lugares
			tokenStore.clearToken();
			authService.clearApiToken();
			stopTokenRenewalJob();

			// Importante: primeiro definir o estado como não autenticado e limpar o usuário
			setIsAuthenticated(false);
			setUser(null);

			// Mostrar toast de sucesso
			toast.success('Logout realizado', {
				description: 'Você foi desconectado com sucesso.',
				duration: 3000,
			});

			// Aguardar um pequeno tempo para garantir que os estados sejam atualizados
			await new Promise((resolve) => setTimeout(resolve, 100));

			// NOTA: O redirecionamento será feito pelo componente que chama esta função
			// para garantir que não haja conflito de navegação

			// Chamar signOut do Clerk por último, pois pode limpar a sessão
			await signOut();
		} catch (error) {
			console.error('[AUTH] Erro ao fazer logout:', error);

			// Mesmo com erro, garantir que o usuário não fique preso
			setIsAuthenticated(false);
			setUser(null);

			toast.error('Erro ao fazer logout', {
				description: 'Ocorreu um erro, mas você foi desconectado.',
			});
		}
	}, [signOut, stopTokenRenewalJob]);

	/**
	 * Efeito para inicializar o estado de autenticação
	 */
	useEffect(() => {
		const initAuth = async () => {
			setIsLoading(true);

			try {
				// Usuário está autenticado no Clerk?
				if (isSignedIn) {
					// Obtém token JWT do Clerk
					const jwtToken = await getToken();

					if (jwtToken) {
						// Obter token True Core usando nossa função atualizada
						const trueToken = await getApiToken();

						if (!trueToken) {
							console.warn(
								'[AUTH] Não foi possível obter um token True Core válido'
							);
						} else {
							console.log('[AUTH] Token True Core obtido com sucesso');
						}

						// Extrair os dados necessários do usuário Clerk para o nosso formato
						const primaryEmail =
							clerkUser.primaryEmailAddress?.emailAddress || '';
						const fullName = `${clerkUser.firstName || ''} ${
							clerkUser.lastName || ''
						}`.trim();

						setUser({
							id: clerkUser.id,
							name: fullName || 'Usuário',
							email: primaryEmail,
							imageUrl: clerkUser.imageUrl,
							// Você pode adicionar campos personalizados aqui
							role: (clerkUser.publicMetadata?.role as string) || 'user',
						});

						// Inicia o job de renovação periódica do token
						startTokenRenewalJob();
					}
				} else {
					// Usuário não está autenticado
					setUser(null);
					tokenStore.clearToken();
					authService.clearApiToken();
					stopTokenRenewalJob();
				}
			} catch (error) {
				console.error('[AUTH] Erro ao inicializar autenticação:', error);
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		initAuth();

		// Cleanup ao desmontar
		return () => {
			stopTokenRenewalJob();
		};
	}, [
		isSignedIn,
		getToken,
		getApiToken,
		startTokenRenewalJob,
		stopTokenRenewalJob,
		clerkUser,
	]);

	// Inicializar e definir eventos do Clerk
	useEffect(() => {
		if (typeof window === 'undefined') return;

		try {
			// Simular o processo de carregamento do Clerk
			setIsLoading(true);

			// Dispara evento para informar que a autenticação está sendo inicializada
			window.dispatchEvent(new CustomEvent('auth:initializing'));

			// Verificar se estamos na página de login - não simular autenticação nessa página
			const isLoginPage = window.location.pathname === '/login';

			// Simulação de carga do Clerk para desenvolvimento
			setTimeout(() => {
				console.log('[AUTH] Simulando autenticação...');

				// Simular usuário logado apenas se não estivermos na página de login
				if (!isLoginPage) {
					setIsAuthenticated(true);
					setUser({
						id: 'user_2vmUHur9fIF1hSYQuipohb1eeGz',
						name: 'Demo User',
						email: 'user_user_2vmUHur9fIF1hSYQuipohb1eeGz@example.com',
						role: 'user',
						imageUrl: undefined,
					});

					// Obter token do True Core como parte da inicialização
					getApiToken()
						.then((token) => {
							console.log(
								token
									? '[AUTH] Token True Core obtido com sucesso'
									: '[AUTH] Nenhum token True Core obtido durante inicialização'
							);

							// Sinalizar que a autenticação está completa
							setIsLoading(false);
							setIsReady(true);

							// Disparar evento para que outros contextos saibam que a autenticação está pronta
							window.dispatchEvent(
								new CustomEvent('auth:ready', {
									detail: { isAuthenticated: true },
								})
							);
						})
						.catch((err) => {
							console.error('[AUTH] Erro ao obter token:', err);
							setIsLoading(false);
							setIsReady(true);

							// Disparar evento mesmo em caso de falha
							window.dispatchEvent(
								new CustomEvent('auth:ready', {
									detail: { isAuthenticated: true, hasError: true },
								})
							);
						});
				} else {
					// Na página de login, configurar como não autenticado
					setIsAuthenticated(false);
					setUser(null);
					setIsLoading(false);
					setIsReady(true);

					// Disparar evento de autenticação pronta com isAuthenticated: false
					window.dispatchEvent(
						new CustomEvent('auth:ready', {
							detail: { isAuthenticated: false },
						})
					);
				}
			}, 250);

			// Job para verificação periódica de token
			const intervalId = setInterval(() => {
				getApiToken()
					.then((token) => {
						if (!token) {
							console.log(
								'[AUTH] Nenhum token disponível durante verificação periódica'
							);
						}
					})
					.catch(() => {
						console.log('[AUTH] Erro ao verificar token');
					});
			}, 30 * 60 * 1000); // Verificar a cada 30 minutos

			console.log(
				'[AUTH] Job de verificação de token iniciado (a cada 30 minutos)'
			);

			return () => {
				clearInterval(intervalId);
			};
		} catch (e) {
			console.error('[AUTH] Erro ao inicializar auth:', e);
			setError('Erro ao inicializar autenticação');
			setIsLoading(false);
			setIsReady(true);

			// Disparar evento em caso de erro
			window.dispatchEvent(
				new CustomEvent('auth:ready', {
					detail: { isAuthenticated: false, hasError: true },
				})
			);
		}
	}, []);

	/**
	 * Forçar a atualização do estado de autenticação
	 * Isso é útil quando sabemos que o token foi atualizado, mas o estado ainda não reflete isso
	 */
	const forceRefresh = useCallback(async (): Promise<void> => {
		try {
			console.log('[AUTH] Forçando atualização do estado de autenticação...');
			setIsLoading(true);

			// Verificar se há um token válido
			const token = await getApiToken();

			if (token) {
				console.log('[AUTH] Token encontrado durante atualização forçada');
				// Se há um token válido, considerar o usuário como autenticado
				setIsAuthenticated(true);

				// Se não temos dados do usuário, criar um usuário simulado
				if (!user) {
					setUser({
						id: 'refresh_user',
						name: 'Usuário Autenticado',
						email: 'auth@example.com',
						role: 'user',
						imageUrl: undefined,
					});
				}
			} else {
				console.log(
					'[AUTH] Nenhum token válido encontrado durante atualização forçada'
				);
				setIsAuthenticated(false);
				setUser(null);
			}
		} catch (error) {
			console.error('[AUTH] Erro ao forçar atualização:', error);
		} finally {
			setIsLoading(false);
		}
	}, [getApiToken, user]);

	// Contexto de autenticação exposto
	const authContextValue: AuthContextType = {
		user,
		isLoading,
		isAuthenticated,
		isReady,
		error,
		logout,
		getJwtToken,
		getApiToken,
		forceRefresh,
	};

	// Registrar métodos para uso global sem dependência circular
	useEffect(() => {
		setAuth({
			getJwtToken,
			getApiToken,
			isAuthenticated: !!user,
		});
	}, [getJwtToken, getApiToken, user]);

	// Adicionar um listener para o evento auth:login-complete
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Handler para o evento de conclusão de login
		const handleLoginComplete = async (event: Event) => {
			const customEvent = event as CustomEvent;
			console.log(
				'[AUTH] Evento auth:login-complete recebido:',
				customEvent.detail
			);

			// Aguardar um pequeno período e então forçar a atualização do estado
			await new Promise((resolve) => setTimeout(resolve, 300));
			await forceRefresh();

			console.log(
				'[AUTH] Estado de autenticação atualizado após evento de login'
			);
		};

		// Registrar o listener
		window.addEventListener('auth:login-complete', handleLoginComplete);

		// Cleanup
		return () => {
			window.removeEventListener('auth:login-complete', handleLoginComplete);
		};
	}, [forceRefresh]);

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading,
				isReady,
				error,
				user,
				logout,
				getJwtToken,
				getApiToken,
				forceRefresh,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);

	if (context === undefined) {
		throw new Error('useAuth deve ser usado dentro de um AuthProvider');
	}

	return context;
};
