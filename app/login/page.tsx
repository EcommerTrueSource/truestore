'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useSignIn } from '@clerk/nextjs';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';
import { OAuthStrategy } from '@clerk/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { authService } from '@/lib/services/auth-service';

export default function LoginPage() {
	const router = useRouter();
	const { isLoaded, signIn, setActive } = useSignIn();
	const { getToken } = useClerkAuth();
	const { toast } = useToast();
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [mounted, setMounted] = useState(false);

	// Redirecionar para a loja se o usuário já estiver autenticado
	useEffect(() => {
		if (mounted && !authLoading && isAuthenticated) {
			console.log('[LOGIN] Usuário autenticado, redirecionando para a loja');
			router.push('/store');
		}
	}, [mounted, isAuthenticated, authLoading, router]);

	useEffect(() => {
		// Definir o componente como montado apenas quando estiver pronto no lado do cliente
		setMounted(true);

		// Verificar se há email salvo no localStorage (funcionalidade "Lembrar-me")
		if (typeof window !== 'undefined') {
			// Limpar indicador de tentativa de login para evitar loops
			sessionStorage.removeItem('login_attempted');

			const savedEmail = localStorage.getItem('true-store-remembered-email');
			if (savedEmail) {
				console.log('[LOGIN] Carregando email salvo:', savedEmail);
				setEmail(savedEmail);
				setRememberMe(true);
			}
		}
	}, []);

	// Mostrar animação de carregamento apenas quando estiver autenticado e montado
	// Isso evita mostrar a animação durante o logout por padrão
	const showRedirectAnimation = mounted && isAuthenticated && !authLoading;

	// Não renderizar o conteúdo da página se o usuário já estiver autenticado
	if (showRedirectAnimation) {
		return (
			<motion.div
				className="min-h-screen flex items-center justify-center bg-white"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.5 }}
			>
				<div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md">
					<div className="relative w-16 h-16 mx-auto mb-4">
						<motion.div
							className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange opacity-20"
							animate={{ scale: [1, 1.2, 1] }}
							transition={{ duration: 2, repeat: Infinity }}
						/>
						<div className="w-16 h-16 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange p-[3px]">
							<div className="h-full w-full rounded-full bg-white flex items-center justify-center">
								<motion.div
									className="h-8 w-8 border-3 border-t-brand-magenta border-r-transparent border-b-brand-orange border-l-transparent rounded-full"
									animate={{ rotate: 360 }}
									transition={{
										duration: 1.5,
										repeat: Infinity,
										ease: 'linear',
									}}
								/>
							</div>
						</div>
					</div>
					<motion.h3
						className="text-xl font-medium text-gray-900 mb-2"
						initial={{ y: 10, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.2 }}
					>
						Autenticado com sucesso
					</motion.h3>
					<motion.p
						className="text-gray-600"
						initial={{ y: 10, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.3 }}
					>
						Redirecionando para a loja...
					</motion.p>
				</div>
			</motion.div>
		);
	}

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
		if (!isLoaded) return;

		try {
			setIsLoading(true);
			await signIn.authenticateWithRedirect({
				strategy,
				redirectUrl: '/sso-callback',
				redirectUrlComplete: '/store',
			});
		} catch (err) {
			const error = err as Error;
			setError(
				error.message || 'Ocorreu um erro durante o login com provedor externo'
			);
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		if (!isLoaded) {
			setError(
				'Sistema de autenticação não está pronto. Tente novamente em instantes.'
			);
			setIsLoading(false);
			return;
		}

		// Gerenciar a opção "Lembrar-me"
		if (rememberMe) {
			// Salvar o email no localStorage para ser recuperado nas próximas visitas
			localStorage.setItem('true-store-remembered-email', email);
			console.log('[LOGIN] Email salvo para "Lembrar-me"');
		} else {
			// Se a opção não estiver marcada, remover email do localStorage
			localStorage.removeItem('true-store-remembered-email');
			console.log('[LOGIN] Email removido do "Lembrar-me"');
		}

		try {
			// Autenticar com Clerk usando email/senha
			// Este fluxo é o mesmo tanto para autenticação normal quanto social
			console.log('Iniciando autenticação com Clerk...');
			const result = await signIn.create({
				identifier: email,
				password,
			});

			if (result.status === 'complete') {
				// Ativar a sessão
				await setActive({ session: result.createdSessionId });
				console.log('Autenticação com Clerk bem-sucedida');

				try {
					// Obter token JWT do Clerk e trocá-lo por um token True Core
					const clerkToken = await getToken();

					if (clerkToken) {
						// Trocar o token por um token True Core
						console.log('Trocando token Clerk por token True Core...');

						// Garantir que o token seja armazenado corretamente
						const trueToken = await authService.exchangeToken(
							clerkToken,
							rememberMe
						);

						if (trueToken) {
							console.log('Token True Core obtido com sucesso');

							// Importante: aguardar um tempo mais longo para garantir que
							// todos os sistemas tenham tempo de detectar o novo token e atualizar seus estados
							console.log(
								'Aguardando para garantir que o token seja reconhecido pelo sistema...'
							);
							await new Promise((resolve) => setTimeout(resolve, 2500));

							// Limpar qualquer contador de recarga para evitar recargas desnecessárias
							if (typeof window !== 'undefined' && 'tokenStore' in window) {
								// @ts-ignore
								window.tokenStore?.resetReloadTracker?.();
							}

							// Disparar um evento personalizado para indicar que o login foi concluído
							// Isso permitirá que outros componentes reajam a este evento
							window.dispatchEvent(
								new CustomEvent('auth:login-complete', {
									detail: { success: true, method: 'email' },
								})
							);

							// Aguardar mais um pouco para garantir que o evento seja processado
							await new Promise((resolve) => setTimeout(resolve, 500));

							// Exibir toast de sucesso
							toast({
								title: 'Login realizado com sucesso',
								description: 'Bem-vindo à True Store!',
								variant: 'default',
							});

							// Verificar o estado de autenticação atual antes de redirecionar
							// Se já tivermos sido redirecionados pelo efeito de autenticação, não faça nada
							if (!isAuthenticated) {
								console.log(
									'Redirecionando para a loja após login bem-sucedido'
								);
								// Adicionar um pequeno atraso antes de redirecionar para garantir
								// que todos os contextos foram atualizados
								setTimeout(() => {
									router.push('/store');
								}, 500);
							} else {
								console.log(
									'Usuário já autenticado, não é necessário redirecionar'
								);
							}
						} else {
							throw new Error('Não foi possível obter token True Core');
						}
					} else {
						throw new Error('Token Clerk não disponível');
					}
				} catch (tokenError) {
					console.error('Erro ao processar token:', tokenError);
					setError('Erro ao processar autenticação. Tente novamente.');
					setIsLoading(false);
				}
			} else if (result.status === 'needs_second_factor') {
				setError('Autenticação de dois fatores necessária.');
				setIsLoading(false);
			} else if (result.status === 'needs_new_password') {
				setError('Redefinição de senha necessária.');
				setIsLoading(false);
			} else {
				setError('Erro ao fazer login. Verifique suas credenciais.');
				setIsLoading(false);
			}
		} catch (err: any) {
			const clerkError = err as Error;
			// Traduzir mensagens de erro comuns do Clerk para português
			let errorMsg = 'Ocorreu um erro durante o login';

			if (clerkError.message.includes('Identifier')) {
				errorMsg = 'Email não encontrado';
			} else if (clerkError.message.includes('password')) {
				errorMsg = 'Senha incorreta';
			}

			setError(errorMsg);
			setIsLoading(false);
		}
	};

	// Variantes de animação
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
				delayChildren: 0.3,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 20, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { type: 'spring', stiffness: 100 },
		},
	};

	const logoVariants = {
		hidden: { scale: 0.8, opacity: 0 },
		visible: {
			scale: 1,
			opacity: 1,
			transition: {
				type: 'spring',
				stiffness: 200,
				delay: 0.2,
			},
		},
	};

	return (
		<div className="min-h-screen flex flex-col md:flex-row">
			{/* Seção decorativa (metade esquerda) - visível apenas em telas médias ou maiores */}
			<div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-brand-magenta to-brand-orange text-white relative overflow-hidden">
				<div className="absolute inset-0 bg-[url('/pattern-bg.png')] opacity-10"></div>

				{/* Elementos decorativos de fundo */}
				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute top-[10%] left-[15%] w-64 h-64 rounded-full bg-white/5 blur-2xl"></div>
					<div className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full bg-black/5 blur-3xl"></div>
					<div className="absolute top-[40%] right-[20%] w-40 h-40 rounded-full bg-white/5 blur-xl"></div>
				</div>

				<motion.div
					className="absolute inset-0 flex flex-col justify-center items-center p-8"
					initial="hidden"
					animate="visible"
					variants={containerVariants}
				>
					<div className="w-full max-w-md flex flex-col items-center justify-center">
						<motion.div
							className="flex flex-col items-center mb-12"
							variants={logoVariants}
						>
							<div className="bg-white p-3 rounded-2xl mb-5 shadow-lg transform hover:scale-105 transition-transform duration-300">
								<Image
									src="/logotrue.png"
									alt="True Logo"
									width={70}
									height={70}
									className="rounded-xl"
								/>
							</div>
							<h1 className="text-4xl font-bold text-white drop-shadow-md">
								True Store
							</h1>
						</motion.div>

						<motion.div
							className="text-center mb-12 backdrop-blur-sm bg-white/5 p-6 rounded-2xl border border-white/10"
							variants={itemVariants}
						>
							<h2 className="text-3xl md:text-4xl font-bold mb-6">
								Bem-vindo(a) à plataforma exclusiva para parceiros
								influenciadores
							</h2>
							<p className="text-white/90 text-lg leading-relaxed">
								Acesse sua loja personalizada e descubra produtos selecionados
								especialmente para você.
							</p>
						</motion.div>
					</div>

					<motion.div
						className="absolute bottom-8 w-full text-center border-t border-white/10 pt-6"
						variants={itemVariants}
					>
						<p className="text-white/70 text-sm">
							© {new Date().getFullYear()} True Store. Todos os direitos
							reservados.
						</p>
					</motion.div>
				</motion.div>
			</div>

			{/* Formulário de login (metade direita) */}
			<div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
				<motion.div
					className="w-full max-w-md"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					{/* Logo - apenas visível em mobile */}
					<div className="flex justify-center mb-8 md:hidden">
						<motion.div
							className="bg-white p-3 rounded-full shadow-lg"
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
						>
							<Image
								src="/logotrue.png"
								alt="Logo"
								width={64}
								height={64}
								className="rounded-full"
							/>
						</motion.div>
					</div>

					<motion.div
						className="text-center mb-8 md:text-left"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Acesse sua conta
						</h1>
						<p className="text-gray-600">
							Faça login na plataforma para acessar sua loja
						</p>
					</motion.div>

					{error && (
						<motion.div
							className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
						>
							<div className="bg-red-100 p-1 rounded-full mr-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<line x1="12" y1="8" x2="12" y2="12"></line>
									<line x1="12" y1="16" x2="12.01" y2="16"></line>
								</svg>
							</div>
							{error}
						</motion.div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<motion.div
							className="space-y-2"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
						>
							<Label htmlFor="email" className="text-gray-700">
								Email
							</Label>
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Mail className="h-5 w-5 text-gray-400 group-focus-within:text-brand-magenta transition-colors duration-200" />
								</div>
								<Input
									id="email"
									type="email"
									placeholder="seu.email@exemplo.com"
									className="pl-10 py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
						</motion.div>

						<motion.div
							className="space-y-2"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
						>
							<div className="flex justify-between">
								<Label htmlFor="password" className="text-gray-700">
									Senha
								</Label>
								<Link
									href="#"
									className="text-sm text-brand-magenta hover:text-brand-magenta/90 font-medium transition-colors duration-200"
									onClick={(e) => {
										e.preventDefault();
										if (isLoaded && email) {
											signIn.create({
												strategy: 'reset_password_email_code',
												identifier: email,
											});
											toast({
												title: 'Email enviado',
												description:
													'Verifique sua caixa de entrada para redefinir sua senha',
												variant: 'default',
											});
										} else {
											setError('Informe seu email para redefinir a senha');
										}
									}}
								>
									Esqueceu?
								</Link>
							</div>
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-magenta transition-colors duration-200" />
								</div>
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="********"
									className="pl-10 pr-10 py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
								<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
									<button
										type="button"
										onClick={togglePasswordVisibility}
										className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
									>
										{showPassword ? (
											<EyeOff className="h-5 w-5" />
										) : (
											<Eye className="h-5 w-5" />
										)}
									</button>
								</div>
							</div>
						</motion.div>

						<motion.div
							className="flex items-center"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 }}
						>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="remember"
									checked={rememberMe}
									onCheckedChange={(checked) => {
										const isChecked = checked === true;
										setRememberMe(isChecked);
										console.log(
											`[LOGIN] Lembrar-me ${
												isChecked ? 'ativado' : 'desativado'
											}`
										);

										// Salvar ou remover o email imediatamente se já tivermos um
										if (email) {
											if (isChecked) {
												localStorage.setItem(
													'true-store-remembered-email',
													email
												);
												console.log('[LOGIN] Email salvo para "Lembrar-me"');
											} else {
												localStorage.removeItem('true-store-remembered-email');
												console.log('[LOGIN] Email removido do "Lembrar-me"');
											}
										}
									}}
									className="text-brand-magenta focus:ring-brand-magenta data-[state=checked]:bg-brand-magenta data-[state=checked]:text-white"
								/>
								<Label
									htmlFor="remember"
									className="text-sm text-gray-600 cursor-pointer ml-2"
								>
									Lembrar-me
								</Label>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.7 }}
						>
							<Button
								type="submit"
								className="w-full bg-gradient-to-r from-brand-magenta to-brand-orange hover:from-brand-magenta/90 hover:to-brand-orange/90 text-white py-2 h-12 shadow-md hover:shadow-lg transition-all duration-300"
								disabled={isLoading || !isLoaded}
							>
								{isLoading ? (
									<div className="flex items-center justify-center">
										<div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
										<span>Entrando...</span>
									</div>
								) : (
									<div className="flex items-center justify-center">
										<span>Entrar</span>
										<motion.div
											whileHover={{ x: 5 }}
											transition={{ type: 'spring', stiffness: 400 }}
										>
											<ArrowRight className="ml-2 h-4 w-4" />
										</motion.div>
									</div>
								)}
							</Button>
						</motion.div>

						<motion.div
							className="relative flex items-center justify-center my-6"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8 }}
						>
							<div className="border-t border-gray-200 w-full absolute"></div>
							<span className="bg-white px-2 text-xs text-gray-500 relative">
								Ou continue com
							</span>
						</motion.div>

						<motion.div
							className="flex justify-center"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9 }}
						>
							<Button
								variant="outline"
								className="w-full md:w-2/3 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 h-12 transition-all duration-200"
								onClick={() => handleOAuthSignIn('oauth_google')}
								disabled={isLoading || !isLoaded}
							>
								<Image
									src="/icons/google.svg"
									alt="Google"
									width={20}
									height={20}
									className="mr-2"
								/>
								Google
							</Button>
						</motion.div>
					</form>
				</motion.div>
			</div>
		</div>
	);
}
