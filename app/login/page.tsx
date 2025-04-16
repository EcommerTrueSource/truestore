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
import { useToast } from '@/components/ui/use-toast';
import { OAuthStrategy } from '@clerk/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { authService } from '@/lib/services/auth-service';

export default function LoginPage() {
	const router = useRouter();
	const { isLoaded, signIn, setActive } = useSignIn();
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
			router.push('/store');
		}
	}, [mounted, isAuthenticated, authLoading, router]);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Não renderizar o conteúdo da página se o usuário já estiver autenticado
	if (isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-white">
				<div className="text-center">
					<div className="w-16 h-16 border-t-4 border-brand-magenta rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600">Redirecionando para a loja...</p>
				</div>
			</div>
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

		try {
			// Autenticar com Clerk usando email/senha
			const result = await signIn.create({
				identifier: email,
				password,
			});

			if (result.status === 'complete') {
				// Ativar a sessão
				await setActive({ session: result.createdSessionId });

				try {
					// Obter token JWT do Clerk e trocá-lo por um token de API
					const clerkToken = await result.createdSessionId;

					if (clerkToken) {
						// Iniciar o processo de troca de token em segundo plano
						// Não esperamos a conclusão para não atrasar o login
						authService
							.exchangeToken(clerkToken)
							.catch((err) =>
								console.error('Erro ao obter token de API:', err)
							);
					}
				} catch (tokenError) {
					console.error('Erro ao processar token:', tokenError);
					// Continuar com o login mesmo que haja erro na obtenção do token
				}

				// Redirecionar para a loja após login bem-sucedido
				router.push('/store');

				// Exibir toast de sucesso
				toast({
					title: 'Login realizado com sucesso',
					description: 'Bem-vindo à True Store!',
					variant: 'default',
				});
			} else {
				// O Clerk pode exigir uma verificação adicional
				setError(
					'Verificação adicional necessária. Verifique seu email para continuar.'
				);
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
		} finally {
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
							<Checkbox
								id="remember"
								checked={rememberMe}
								onCheckedChange={(checked) => setRememberMe(checked as boolean)}
								className="text-brand-magenta focus:ring-brand-magenta"
							/>
							<Label
								htmlFor="remember"
								className="text-sm text-gray-600 cursor-pointer ml-2"
							>
								Lembrar-me
							</Label>
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
							className="grid grid-cols-2 gap-3"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9 }}
						>
							<Button
								variant="outline"
								className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 h-12 transition-all duration-200"
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
							<Button
								variant="outline"
								className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 h-12 transition-all duration-200"
								onClick={() => handleOAuthSignIn('oauth_facebook')}
								disabled={isLoading || !isLoaded}
							>
								<Image
									src="/icons/facebook.svg"
									alt="Facebook"
									width={20}
									height={20}
									className="mr-2"
								/>
								Facebook
							</Button>
						</motion.div>

						<motion.div
							className="text-center text-sm text-gray-600 mt-6"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1 }}
						>
							Não tem uma conta?{' '}
							<Link
								href="#"
								className="text-brand-magenta hover:text-brand-magenta/90 font-medium transition-colors duration-200"
								onClick={(e) => {
									e.preventDefault();
									router.push('/cadastro');
								}}
							>
								Solicitar acesso
							</Link>
						</motion.div>
					</form>
				</motion.div>
			</div>
		</div>
	);
}
