'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
	Mail,
	ArrowRight,
	KeyRound,
	Check,
	Lock,
	ArrowLeft,
	Eye,
	EyeOff,
} from 'lucide-react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

type PasswordRecoveryDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialEmail?: string;
};

export function PasswordRecoveryDialog({
	open,
	onOpenChange,
	initialEmail = '',
}: PasswordRecoveryDialogProps) {
	const { toast } = useToast();
	const { isLoaded, signIn } = useSignIn();
	const { signOut } = useClerk();

	const [email, setEmail] = useState(initialEmail);
	const [code, setCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [step, setStep] = useState<'email' | 'code' | 'password' | 'success'>(
		'email'
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	// Validação das senhas
	const passwordsMatch = newPassword === confirmPassword;
	const passwordLongEnough = newPassword.length >= 8;

	const resetForm = () => {
		setEmail(initialEmail);
		setCode('');
		setNewPassword('');
		setConfirmPassword('');
		setShowNewPassword(false);
		setShowConfirmPassword(false);
		setError('');
		setStep('email');
		setIsLoading(false);
	};

	const handleRequestCode = async () => {
		if (!email || !email.includes('@')) {
			setError('Por favor, insira um endereço de email válido');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			if (!isLoaded) {
				throw new Error('Sistema de autenticação não está pronto');
			}

			await signIn?.create({
				strategy: 'reset_password_email_code',
				identifier: email,
			});

			setStep('code');
			toast({
				title: 'Código enviado',
				description:
					'Verifique sua caixa de entrada e insira o código que enviamos',
				variant: 'default',
			});
		} catch (err) {
			const error = err as Error;
			setError(error.message || 'Não foi possível enviar o código');
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyCode = async () => {
		if (!code || code.length < 6) {
			setError('Por favor, insira o código de verificação completo');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			if (!isLoaded) {
				throw new Error('Sistema de autenticação não está pronto');
			}

			await signIn?.attemptFirstFactor({
				strategy: 'reset_password_email_code',
				code,
			});

			setStep('password');
		} catch (err) {
			const error = err as Error;
			setError(error.message || 'Código inválido ou expirado');
		} finally {
			setIsLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!newPassword || newPassword.length < 8) {
			setError('A senha deve ter pelo menos 8 caracteres');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('As senhas não coincidem');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			if (!isLoaded) {
				throw new Error('Sistema de autenticação não está pronto');
			}

			try {
				await signIn?.resetPassword({
					password: newPassword,
				});

				setStep('success');
				toast({
					title: 'Senha redefinida com sucesso',
					description: 'Agora você já pode fazer login com sua nova senha',
					variant: 'default',
				});
			} catch (resetError: any) {
				// Verifica se o erro é do tipo "sessão já existe"
				if (
					resetError.errors &&
					resetError.errors[0]?.code === 'session_exists'
				) {
					// Opção 1: Apenas mostra mensagem de sucesso sem tentar login automático
					setStep('success');
					toast({
						title: 'Senha redefinida com sucesso',
						description: 'Agora você já pode fazer login com sua nova senha',
						variant: 'default',
					});
				} else {
					// Se for outro tipo de erro, lançamos para ser capturado pelo catch externo
					throw resetError;
				}
			}
		} catch (err) {
			const error = err as Error;
			setError(error.message || 'Não foi possível redefinir sua senha');
			console.error('Erro na redefinição de senha:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignOutAndClose = async () => {
		setIsLoading(true);
		try {
			await signOut();
			toast({
				title: 'Logout realizado',
				description: 'Agora você pode fazer login com sua nova senha',
				variant: 'default',
			});
		} catch (error) {
			console.error('Erro ao fazer logout:', error);
		} finally {
			setIsLoading(false);
			onOpenChange(false);
		}
	};

	// Configurar animação para transição entre etapas
	const slideVariants = {
		hidden: (direction: number) => ({
			x: direction > 0 ? 50 : -50,
			opacity: 0,
		}),
		visible: {
			x: 0,
			opacity: 1,
			transition: {
				type: 'spring',
				stiffness: 300,
				damping: 24,
			},
		},
		exit: (direction: number) => ({
			x: direction > 0 ? -50 : 50,
			opacity: 0,
			transition: { duration: 0.2 },
		}),
	};

	// Determinar direção da animação baseado na mudança de etapa
	const getStepIndex = (stepName: string) => {
		const steps = ['email', 'code', 'password', 'success'];
		return steps.indexOf(stepName);
	};

	// Renderizar o título baseado na etapa atual
	const renderTitle = () => {
		switch (step) {
			case 'email':
				return 'Recuperar Senha';
			case 'code':
				return 'Verificar Código';
			case 'password':
				return 'Nova Senha';
			case 'success':
				return 'Senha Redefinida';
		}
	};

	// Determinar direção da animação
	const getDirection = (currentStep: string, previousStep: string) => {
		return getStepIndex(currentStep) > getStepIndex(previousStep) ? 1 : -1;
	};

	const [previousStep, setPreviousStep] = useState(step);
	const direction = getDirection(step, previousStep);

	const handleStepChange = (newStep: typeof step) => {
		setPreviousStep(step);
		setStep(newStep);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					// Reset ao fechar o diálogo
					setTimeout(resetForm, 300);
				}
				onOpenChange(isOpen);
			}}
		>
			<DialogContent className="sm:max-w-md p-0 overflow-hidden">
				<div className="bg-gradient-to-r from-brand-magenta to-brand-orange p-1">
					<div className="bg-white p-5">
						<DialogHeader className="pb-4">
							<DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
								{renderTitle()}
							</DialogTitle>
						</DialogHeader>

						{error && (
							<motion.div
								className="mb-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100"
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
							>
								{error}
							</motion.div>
						)}

						<AnimatePresence mode="wait" custom={direction}>
							{step === 'email' && (
								<motion.div
									key="email-step"
									custom={direction}
									variants={slideVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<div className="space-y-4 py-2">
										<p className="text-gray-600 text-center mb-4">
											Informe seu email para receber um código de verificação
										</p>

										<div className="space-y-2">
											<Label htmlFor="recovery-email">Email</Label>
											<div className="relative">
												<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
													<Mail className="h-5 w-5 text-gray-400" />
												</div>
												<Input
													id="recovery-email"
													type="email"
													placeholder="seu.email@exemplo.com"
													className="pl-10 py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoFocus
												/>
											</div>
										</div>
									</div>

									<div className="mt-6">
										<Button
											onClick={handleRequestCode}
											disabled={isLoading}
											className="w-full bg-gradient-to-r from-brand-magenta to-brand-orange hover:from-brand-magenta/90 hover:to-brand-orange/90 text-white py-2 h-12 shadow-md hover:shadow-lg transition-all duration-300"
										>
											{isLoading ? (
												<div className="flex items-center justify-center">
													<div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
													<span>Enviando...</span>
												</div>
											) : (
												<div className="flex items-center justify-center">
													<span>Solicitar código</span>
													<ArrowRight className="ml-2 h-4 w-4" />
												</div>
											)}
										</Button>
									</div>
								</motion.div>
							)}

							{step === 'code' && (
								<motion.div
									key="code-step"
									custom={direction}
									variants={slideVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<div className="space-y-4 py-2">
										<p className="text-gray-600 text-center mb-4">
											Enviamos um código para{' '}
											<span className="font-medium">{email}</span>
										</p>

										<div className="space-y-2">
											<Label htmlFor="verification-code">
												Código de verificação
											</Label>
											<Input
												id="verification-code"
												type="text"
												placeholder="000000"
												className="text-center py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta text-lg tracking-widest"
												value={code}
												onChange={(e) =>
													setCode(e.target.value.replace(/[^0-9]/g, ''))
												}
												maxLength={6}
												autoFocus
											/>
											<p className="text-xs text-gray-500 text-center">
												O código expira em 10 minutos
											</p>
										</div>
									</div>

									<div className="flex space-x-3 mt-6">
										<Button
											variant="outline"
											onClick={() => handleStepChange('email')}
											disabled={isLoading}
											className="flex-1 border-gray-200"
										>
											<ArrowLeft className="mr-2 h-4 w-4" />
											Voltar
										</Button>
										<Button
											onClick={handleVerifyCode}
											disabled={isLoading}
											className="flex-1 bg-gradient-to-r from-brand-magenta to-brand-orange hover:from-brand-magenta/90 hover:to-brand-orange/90 text-white shadow-md hover:shadow-lg transition-all duration-300"
										>
											{isLoading ? (
												<div className="flex items-center justify-center">
													<div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
													<span>Verificando...</span>
												</div>
											) : (
												<div className="flex items-center justify-center">
													<span>Verificar</span>
													<ArrowRight className="ml-2 h-4 w-4" />
												</div>
											)}
										</Button>
									</div>
								</motion.div>
							)}

							{step === 'password' && (
								<motion.div
									key="password-step"
									custom={direction}
									variants={slideVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<div className="space-y-4 py-2">
										<p className="text-gray-600 text-center mb-4">
											Defina sua nova senha
										</p>

										<div className="space-y-2">
											<Label htmlFor="new-password">Nova senha</Label>
											<div className="relative">
												<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
													<Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-magenta transition-colors duration-200" />
												</div>
												<Input
													id="new-password"
													type={showNewPassword ? 'text' : 'password'}
													placeholder="********"
													className="pl-10 pr-10 py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta"
													value={newPassword}
													onChange={(e) => setNewPassword(e.target.value)}
													autoFocus
												/>
												<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
													<button
														type="button"
														onClick={() => setShowNewPassword(!showNewPassword)}
														className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
													>
														{showNewPassword ? (
															<EyeOff className="h-5 w-5" />
														) : (
															<Eye className="h-5 w-5" />
														)}
													</button>
												</div>
											</div>
											{!passwordLongEnough && newPassword.length > 0 && (
												<p className="text-xs text-amber-600 mt-1">
													A senha deve ter pelo menos 8 caracteres
												</p>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="confirm-password">Confirme a senha</Label>
											<div className="relative">
												<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
													<Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-magenta transition-colors duration-200" />
												</div>
												<Input
													id="confirm-password"
													type={showConfirmPassword ? 'text' : 'password'}
													placeholder="********"
													className={cn(
														'pl-10 pr-10 py-2 h-12 focus-visible:ring-brand-magenta border-gray-200 transition-all duration-200 focus:border-brand-magenta',
														!passwordsMatch && confirmPassword.length > 0
															? 'border-red-300 focus-visible:ring-red-400'
															: ''
													)}
													value={confirmPassword}
													onChange={(e) => setConfirmPassword(e.target.value)}
												/>
												<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
													<button
														type="button"
														onClick={() =>
															setShowConfirmPassword(!showConfirmPassword)
														}
														className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
													>
														{showConfirmPassword ? (
															<EyeOff className="h-5 w-5" />
														) : (
															<Eye className="h-5 w-5" />
														)}
													</button>
												</div>
											</div>
											{!passwordsMatch && confirmPassword.length > 0 && (
												<p className="text-xs text-red-600 mt-1">
													As senhas não coincidem
												</p>
											)}
										</div>
									</div>

									<div className="flex space-x-3 mt-6">
										<Button
											variant="outline"
											onClick={() => handleStepChange('code')}
											disabled={isLoading}
											className="flex-1 border-gray-200"
										>
											<ArrowLeft className="mr-2 h-4 w-4" />
											Voltar
										</Button>
										<Button
											onClick={handleResetPassword}
											disabled={
												isLoading ||
												!passwordsMatch ||
												!passwordLongEnough ||
												confirmPassword.length === 0
											}
											className="flex-1 bg-gradient-to-r from-brand-magenta to-brand-orange hover:from-brand-magenta/90 hover:to-brand-orange/90 text-white shadow-md hover:shadow-lg transition-all duration-300"
										>
											{isLoading ? (
												<div className="flex items-center justify-center">
													<div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
													<span>Salvando...</span>
												</div>
											) : (
												<div className="flex items-center justify-center">
													<span>Redefinir senha</span>
													<ArrowRight className="ml-2 h-4 w-4" />
												</div>
											)}
										</Button>
									</div>
								</motion.div>
							)}

							{step === 'success' && (
								<motion.div
									key="success-step"
									custom={direction}
									variants={slideVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<div className="space-y-4 py-6 flex flex-col items-center">
										<div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
											<Check className="h-10 w-10 text-green-600" />
										</div>

										<h3 className="text-xl font-medium text-gray-900 text-center">
											Senha redefinida com sucesso
										</h3>

										<p className="text-gray-600 text-center max-w-xs mx-auto mb-4">
											Sua senha foi atualizada. Agora você pode entrar com sua
											nova senha.
										</p>
									</div>

									<div className="flex flex-col space-y-3 mt-4">
										<DialogClose asChild>
											<Button className="w-full bg-gradient-to-r from-brand-magenta to-brand-orange hover:from-brand-magenta/90 hover:to-brand-orange/90 text-white py-2 h-12 shadow-md hover:shadow-lg transition-all duration-300">
												<div className="flex items-center justify-center">
													<span>Fechar</span>
												</div>
											</Button>
										</DialogClose>

										<Button
											variant="outline"
											onClick={handleSignOutAndClose}
											className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-brand-magenta"
										>
											<div className="flex items-center justify-center">
												<span>Sair e fazer login novamente</span>
											</div>
										</Button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
