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

export interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	isReady: boolean;
	error: string | null;
	logout: () => Promise<void>;
	getJwtToken: () => Promise<string | null>;
	getApiToken: () => Promise<string | null>;
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
					tokenStore.setToken(localToken);
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
			await signOut();
			setUser(null);
			router.push('/login');
			toast.info('Logout realizado', {
				description: 'Você foi desconectado com sucesso.',
			});
		} catch (error) {
			console.error('[AUTH] Erro ao fazer logout:', error);
			toast.error('Erro ao fazer logout', {
				description: 'Ocorreu um erro ao desconectar. Tente novamente.',
			});
		}
	}, [router, signOut, stopTokenRenewalJob]);

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

			// Simulação de carga do Clerk para desenvolvimento
			setTimeout(() => {
				console.log('[AUTH] Simulando autenticação...');

				// Simular usuário logado
				setIsAuthenticated(true);
				setUser({
					id: 'user_2vmUHur9fIF1hSYQuipohb1eeGz',
					firstName: 'Demo',
					lastName: 'User',
					username: 'demo',
					emailAddresses: [
						{
							emailAddress: 'user_user_2vmUHur9fIF1hSYQuipohb1eeGz@example.com',
						},
					],
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
	};

	// Registrar métodos para uso global sem dependência circular
	useEffect(() => {
		setAuth({
			getJwtToken,
			getApiToken,
			isAuthenticated: !!user,
		});
	}, [getJwtToken, getApiToken, user]);

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
