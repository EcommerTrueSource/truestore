'use client';

import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Loader2,
	User,
	Mail,
	Calendar,
	Clock,
	Bell,
	ShieldAlert,
	Camera,
	Edit,
	Save,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Settings,
	UserCircle,
	Image as ImageIcon,
	ArrowLeft,
	Store,
	X,
	Upload,
	ShoppingCart,
	Heart,
	RefreshCcw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import StoreLayout from '@/components/layouts/store-layout';

// Lazy loading do componente CustomerCategoryInfo para melhorar performance
const LazyCustomerCategoryInfo = lazy(
	() => import('@/components/customer/customer-category-info')
);

// Definindo interface para o perfil de usuário
interface ProfileData {
	displayName: string;
	bio: string;
	lastUpdated: string;
	notifications: {
		enabled: boolean;
		emailUpdates: boolean;
	};
}

// Animações para Framer Motion
const fadeIn = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideUp = {
	hidden: { y: 30, opacity: 0 },
	visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const pulseAnimation = {
	scale: [1, 1.03, 1],
	transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
};

// Status Badge Component
function StatusBadge({ status }: { status: 'verified' | 'pending' | 'error' }) {
	const statusConfig = {
		verified: {
			color: 'bg-green-100 text-green-800 border-green-300',
			icon: CheckCircle2,
			text: 'Verificado',
		},
		pending: {
			color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
			icon: Loader2,
			text: 'Pendente',
		},
		error: {
			color: 'bg-red-100 text-red-800 border-red-300',
			icon: XCircle,
			text: 'Erro',
		},
	};

	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
			<Badge
				className={`gap-1 ${config.color} hover:${config.color} font-medium shadow-sm`}
				variant="outline"
			>
				<Icon className="h-3.5 w-3.5 mr-1" />
				{config.text}
			</Badge>
		</motion.div>
	);
}

export default function PerfilPage() {
	const { user, isLoading } = useAuth();
	const { user: clerkUser, isLoaded } = useUser();
	const clerk = useClerk();
	const { toast } = useToast();
	const [isSaving, setIsSaving] = useState(false);
	const [isEditingPhoto, setIsEditingPhoto] = useState(false);
	const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('perfil');
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [emailUpdates, setEmailUpdates] = useState(true);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	// Estado para controlar a renderização no cliente
	const [isMounted, setIsMounted] = useState(false);
	// Estado para controlar possíveis erros de carregamento
	const [loadError, setLoadError] = useState<string | null>(null);

	// Efeito para garantir que o componente só seja totalmente renderizado no cliente
	useEffect(() => {
		try {
			setIsMounted(true);
		} catch (error) {
			console.error('Erro ao montar componente:', error);
			setLoadError('Ocorreu um erro ao carregar o perfil');
		}
	}, []);

	// Formatação da data com tratamento de erro
	const formatDate = (dateString: string) => {
		if (!dateString) return '';

		try {
			// Usando um formato fixo para garantir consistência entre servidor e cliente
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');

			return `${day}/${month}/${year}, ${hours}:${minutes}`;
		} catch (error) {
			console.error('Erro ao formatar data:', error);
			return '';
		}
	};

	// Salvar dados do perfil
	const handleSaveProfile = useCallback(async () => {
		try {
			setIsSaving(true);
			// Simulando uma chamada API
			await new Promise((resolve) => setTimeout(resolve, 1500));

			toast({
				title: 'Perfil atualizado',
				description: 'Suas informações foram salvas com sucesso.',
			});
		} catch (error) {
			console.error('Erro ao salvar perfil:', error);
			toast({
				variant: 'destructive',
				title: 'Erro ao salvar',
				description: 'Não foi possível atualizar seu perfil. Tente novamente.',
			});
		} finally {
			setIsSaving(false);
		}
	}, [toast]);

	// Manipulador para o upload de foto
	const handlePhotoUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			try {
				const file = event.target.files?.[0];
				if (!file) return;

				// Cria uma URL temporária para a imagem
				const imageUrl = URL.createObjectURL(file);
				setProfilePhoto(imageUrl);

				// Em uma implementação real, aqui você faria o upload para um servidor
				console.log('Arquivo selecionado:', file);
			} catch (error) {
				console.error('Erro ao processar imagem:', error);
				toast({
					variant: 'destructive',
					title: 'Erro ao processar imagem',
					description: 'Não foi possível processar a imagem selecionada.',
				});
			}
		},
		[toast]
	);

	// Fechamento do modal de edição de foto
	const closePhotoModal = useCallback(() => {
		setIsEditingPhoto(false);
	}, []);

	// Salvar alteração de foto
	const savePhotoChange = useCallback(async () => {
		if (!profilePhoto || !clerk.user) {
			toast({
				variant: 'destructive',
				title: 'Erro',
				description: 'Nenhuma imagem selecionada ou usuário não identificado.',
			});
			return;
		}

		try {
			setIsSaving(true);

			// Convertendo a URL para um blob/arquivo
			const response = await fetch(profilePhoto);
			const blob = await response.blob();

			// Upload para o Clerk usando a API oficial
			await clerk.user.setProfileImage({ file: blob });

			toast({
				title: 'Foto atualizada',
				description: 'Sua foto de perfil foi alterada com sucesso.',
			});

			closePhotoModal();
		} catch (error) {
			console.error('Erro ao atualizar foto no Clerk:', error);
			toast({
				variant: 'destructive',
				title: 'Erro ao salvar',
				description: 'Não foi possível atualizar sua foto. Tente novamente.',
			});
		} finally {
			setIsSaving(false);
		}
	}, [profilePhoto, clerk.user, toast, closePhotoModal]);

	// Manipulador para alteração de senha
	const handlePasswordChange = useCallback(async () => {
		if (!clerk.user) return;

		if (newPassword !== confirmPassword) {
			setPasswordError('As senhas não coincidem');
			return;
		}

		if (newPassword.length < 8) {
			setPasswordError('A senha deve ter pelo menos 8 caracteres');
			return;
		}

		setPasswordError(null);
		setIsChangingPassword(true);

		try {
			// Método padrão para atualização de senha
			await clerk.user.updatePassword({
				currentPassword,
				newPassword,
			});

			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');

			toast({
				title: 'Senha alterada',
				description: 'Sua senha foi atualizada com sucesso.',
			});
		} catch (error: any) {
			console.error('Erro ao alterar senha:', error);

			// Tratamento de erros específicos
			if (error.errors && error.errors.length > 0) {
				if (error.errors[0].code === 'form_password_incorrect') {
					setPasswordError('Senha atual incorreta');
				} else if (error.errors[0].code === 'form_password_pwned') {
					setPasswordError(
						'Esta senha é muito fraca ou foi comprometida. Por favor, escolha uma senha mais segura.'
					);
				} else if (error.errors[0].code === 'session_reverification_required') {
					// Redirecionar para a página de login com retorno
					setPasswordError(
						'Sessão expirada. Por favor, faça login novamente para alterar sua senha.'
					);
					setTimeout(() => {
						window.location.href = `/login?redirect=${encodeURIComponent(
							window.location.pathname
						)}`;
					}, 2000);
					return;
				} else {
					setPasswordError(
						error.errors[0].message || 'Ocorreu um erro ao alterar a senha'
					);
				}
			} else {
				setPasswordError('Ocorreu um erro ao alterar a senha');
			}

			toast({
				variant: 'destructive',
				title: 'Erro ao alterar senha',
				description: 'Não foi possível alterar sua senha. Tente novamente.',
			});
		} finally {
			setIsChangingPassword(false);
		}
	}, [clerk.user, currentPassword, newPassword, confirmPassword, toast]);

	// Retorno de loading enquanto não está carregado ou não está montado no cliente
	if (!isLoaded || isLoading || !isMounted) {
		return (
			<div className="flex justify-center items-center min-h-[50vh]">
				<div className="relative">
					<div className="absolute -inset-4 rounded-full bg-gradient-to-r from-brand-magenta/20 to-brand-blue/20 blur-xl animate-pulse"></div>
					<Loader2 className="h-10 w-10 text-brand-magenta animate-spin relative" />
				</div>
			</div>
		);
	}

	if (loadError) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center justify-center min-h-[50vh] p-8"
			>
				<AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
				<h1 className="text-2xl font-semibold mb-4 text-gray-800">
					Erro ao carregar perfil
				</h1>
				<p className="text-gray-600 text-center max-w-md mb-6">
					{loadError}. Por favor, recarregue a página ou tente novamente mais
					tarde.
				</p>
				<Button
					variant="outline"
					className="flex items-center gap-2"
					onClick={() => window.location.reload()}
				>
					<RefreshCcw className="h-4 w-4" />
					Tentar novamente
				</Button>
			</motion.div>
		);
	}

	if (!user) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center justify-center min-h-[50vh] p-8"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-brand-magenta/5 to-brand-blue/5 rounded-3xl -z-10"></div>
				<AlertTriangle className="h-12 w-12 text-brand-magenta mb-4" />
				<h1 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent">
					Acesso Restrito
				</h1>
				<p className="text-gray-600 text-center max-w-md">
					Você precisa estar logado para acessar esta página.
				</p>
				<Link href="/store" className="mt-6">
					<Button variant="outline" className="flex items-center gap-2">
						<ArrowLeft className="h-4 w-4" />
						Voltar para a loja
					</Button>
				</Link>
			</motion.div>
		);
	}

	return (
		<StoreLayout hideSidebar={true}>
			<div className="max-w-5xl mx-auto py-8">
				{/* Botão para retornar à loja */}
				<Link href="/store">
					<Button
						variant="ghost"
						className="mb-6 flex items-center text-gray-600 hover:text-gray-900 group"
					>
						<ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
						Voltar para a loja
					</Button>
				</Link>

				<motion.div
					initial="hidden"
					animate="visible"
					variants={fadeIn}
					className="container max-w-4xl px-4 py-8 mx-auto relative"
				>
					{/* Background decorativo */}
					<div className="absolute top-0 right-0 -z-10 w-72 h-72 bg-gradient-to-bl from-brand-magenta/10 to-brand-blue/10 rounded-full blur-3xl opacity-60"></div>
					<div className="absolute bottom-20 left-0 -z-10 w-64 h-64 bg-gradient-to-tr from-brand-blue/10 to-brand-magenta/10 rounded-full blur-3xl opacity-60"></div>

					<motion.div variants={slideUp} className="mb-8 relative">
						<div className="absolute -top-6 -left-6 w-20 h-20 bg-gradient-to-br from-brand-magenta/20 to-brand-blue/20 rounded-full blur-2xl" />
						<h1 className="text-3xl font-bold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent relative">
							Meu Perfil
						</h1>
						<p className="text-gray-600 mt-2">
							Gerencie suas informações pessoais e preferências
						</p>
					</motion.div>

					<Tabs
						defaultValue="perfil"
						value={activeTab}
						onValueChange={setActiveTab}
						className="relative z-10"
					>
						<TabsList className="grid grid-cols-3 mb-8 p-1 shadow-md bg-white/90 backdrop-blur-md rounded-full">
							<TabsTrigger
								value="perfil"
								className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-magenta/10 data-[state=active]:to-brand-blue/10 rounded-full"
							>
								<User className="h-4 w-4" />
								Informações
							</TabsTrigger>
							<TabsTrigger
								value="notificacoes"
								className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-magenta/10 data-[state=active]:to-brand-blue/10 rounded-full"
							>
								<Bell className="h-4 w-4" />
								Notificações
							</TabsTrigger>
							<TabsTrigger
								value="preferencias"
								className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-magenta/10 data-[state=active]:to-brand-blue/10 rounded-full"
							>
								<Settings className="h-4 w-4" />
								Preferências
							</TabsTrigger>
						</TabsList>

						<AnimatePresence mode="wait" initial={false}>
							{activeTab === 'perfil' && (
								<TabsContent key="perfil" value="perfil" forceMount>
									<motion.div
										variants={staggerContainer}
										initial="hidden"
										animate="visible"
										exit={{ opacity: 0 }}
										className="grid md:grid-cols-[1fr_1fr] gap-8"
									>
										{/* Card com foto e informações básicas */}
										<motion.div
											variants={slideUp}
											className="flex flex-col items-center justify-center bg-white/70 backdrop-blur-md p-6 rounded-xl border border-gray-100/60 shadow-lg"
										>
											<div className="relative mb-4 group flex justify-center">
												<motion.div
													className="absolute -inset-1.5 bg-gradient-to-r from-brand-magenta to-brand-blue rounded-full opacity-60 blur-sm group-hover:opacity-100 transition duration-500"
													animate={pulseAnimation}
												/>
												<Avatar className="h-40 w-40 border-4 border-white shadow-xl relative">
													<AvatarImage
														src={profilePhoto || clerkUser?.imageUrl || ''}
														alt={clerkUser?.fullName || 'Usuário'}
														className="object-cover"
														onError={(e) => {
															console.error(
																'Erro ao carregar imagem de perfil'
															);
															e.currentTarget.style.display = 'none';
														}}
													/>
													<AvatarFallback className="bg-gradient-to-br from-brand-magenta to-brand-blue text-white text-2xl">
														{clerkUser?.fullName
															? clerkUser.fullName.slice(0, 2).toUpperCase()
															: 'U'}
													</AvatarFallback>
												</Avatar>
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => setIsEditingPhoto(true)}
													type="button"
													className="absolute bottom-0 right-0 rounded-full bg-brand-magenta text-white p-2.5 shadow-lg group-hover:shadow-xl transition-all"
													title="Alterar foto de perfil"
												>
													<Camera className="h-4 w-4" />
												</motion.button>
											</div>

											<div className="flex justify-center">
												<StatusBadge status="verified" />
											</div>

											{/* Nome destacado e centralizado */}
											<h2 className="mt-4 text-xl font-semibold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent text-center">
												{clerkUser?.fullName || 'Usuário'}
											</h2>

											<p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
												<Clock className="h-3 w-3" />
												Atualizado em: {formatDate(new Date().toISOString())}
											</p>

											{/* Adiciona botões de atalho modernos e harmoniosos */}
											<div className="w-full mt-6 pt-2">
												<motion.div
													className="grid grid-cols-2 gap-4"
													variants={{
														hidden: { opacity: 0, y: 10 },
														visible: {
															opacity: 1,
															y: 0,
															transition: { staggerChildren: 0.1 },
														},
													}}
													initial="hidden"
													animate="visible"
												>
													<motion.div
														variants={{
															hidden: { opacity: 0, scale: 0.95 },
															visible: {
																opacity: 1,
																scale: 1,
																transition: { duration: 0.3 },
															},
														}}
														whileHover={{
															scale: 1.03,
															boxShadow:
																'0 10px 25px -5px rgba(242, 87, 151, 0.2)',
														}}
														whileTap={{ scale: 0.98 }}
													>
														<Link href="/purchase-history">
															<div className="bg-gradient-to-br from-white via-white to-brand-magenta/5 hover:to-brand-magenta/10 rounded-xl p-3 h-full border border-gray-100/80 shadow-sm transition-all flex flex-col items-center justify-center gap-2">
																<div className="w-12 h-12 rounded-full bg-brand-magenta flex items-center justify-center">
																	<ShoppingCart className="h-6 w-6 text-white" />
																</div>
																<span className="text-sm font-medium text-gray-800">
																	Compras
																</span>
															</div>
														</Link>
													</motion.div>

													<motion.div
														variants={{
															hidden: { opacity: 0, scale: 0.95 },
															visible: {
																opacity: 1,
																scale: 1,
																transition: { duration: 0.3, delay: 0.1 },
															},
														}}
														whileHover={{
															scale: 1.03,
															boxShadow:
																'0 10px 25px -5px rgba(242, 87, 151, 0.2)',
														}}
														whileTap={{ scale: 0.98 }}
													>
														<Link href="/favorites">
															<div className="bg-gradient-to-br from-white via-white to-brand-blue/5 hover:to-brand-blue/10 rounded-xl p-3 h-full border border-gray-100/80 shadow-sm transition-all flex flex-col items-center justify-center gap-2">
																<div className="w-12 h-12 rounded-full bg-brand-magenta flex items-center justify-center">
																	<Heart className="h-6 w-6 text-white" />
																</div>
																<span className="text-sm font-medium text-gray-800">
																	Favoritos
																</span>
															</div>
														</Link>
													</motion.div>
												</motion.div>
											</div>
										</motion.div>

										{/* Card de categoria e saldo */}
										<motion.div
											variants={slideUp}
											className="flex flex-col bg-white/70 backdrop-blur-md p-6 rounded-xl border border-gray-100/60 shadow-lg items-center"
										>
											<div className="mb-4 flex flex-col items-center">
												<h3 className="text-lg font-semibold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent flex items-center justify-center gap-2">
													<Store className="w-6 h-5 text-brand-magenta" />
													Informações de Cliente
												</h3>
												<p className="text-sm bg-gradient-to-r from-brand-magenta/70 to-brand-blue/70 bg-clip-text text-transparent flex justify-center pl-8">
													Seu plano e limite de compras
												</p>
											</div>

											<div className="flex-1 w-full flex justify-center">
												<Suspense
													fallback={
														<div className="w-full flex flex-col items-center justify-center p-8 space-y-4">
															<div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
															<div className="h-4 w-36 bg-gray-200 rounded-full animate-pulse"></div>
															<div className="h-16 w-full max-w-xs bg-gray-200 rounded-xl animate-pulse mt-4"></div>
															<div className="h-12 w-full max-w-xs bg-gray-200 rounded-lg animate-pulse mt-2"></div>
														</div>
													}
												>
													<LazyCustomerCategoryInfo />
												</Suspense>
											</div>
										</motion.div>
									</motion.div>
								</TabsContent>
							)}

							{activeTab === 'notificacoes' && (
								<TabsContent key="notificacoes" value="notificacoes" forceMount>
									<motion.div
										variants={slideUp}
										initial="hidden"
										animate="visible"
										exit={{ opacity: 0 }}
									>
										<Card className="backdrop-blur-xl bg-white/80 border border-gray-100/60 shadow-lg overflow-hidden relative">
											<div className="absolute top-0 left-0 h-32 w-32 bg-gradient-to-br from-brand-magenta/10 to-brand-blue/10 rounded-br-full" />
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Bell className="h-5 w-5 text-brand-magenta" />
													Configurações de Notificações
												</CardTitle>
												<CardDescription className="text-brand-blue/70">
													Gerencie como e quando você deseja receber
													notificações
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-6 relative z-10">
												<motion.div
													className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
													whileHover={{
														y: -2,
														boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
													}}
												>
													<div>
														<h3 className="text-lg font-medium text-brand-magenta/90">
															Notificações no aplicativo
														</h3>
														<p className="text-sm text-brand-blue/70">
															Receba atualizações sobre pedidos, promoções
															exclusivas e novidades
														</p>
													</div>
													<Switch
														checked={notificationsEnabled}
														onCheckedChange={setNotificationsEnabled}
														className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-brand-magenta data-[state=checked]:to-brand-blue"
													/>
												</motion.div>

												<motion.div
													className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
													whileHover={{
														y: -2,
														boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
													}}
												>
													<div>
														<h3 className="text-lg font-medium text-brand-magenta/90">
															Notificações por e-mail
														</h3>
														<p className="text-sm text-brand-blue/70">
															Receba um resumo semanal de novidades e promoções
														</p>
													</div>
													<Switch
														checked={emailUpdates}
														onCheckedChange={setEmailUpdates}
														disabled={!notificationsEnabled}
														className={cn(
															'data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-brand-magenta data-[state=checked]:to-brand-blue',
															!notificationsEnabled && 'opacity-50'
														)}
													/>
												</motion.div>

												<motion.div className="flex justify-end mt-6">
													<motion.div
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
													>
														<Button
															onClick={handleSaveProfile}
															disabled={isSaving}
															type="button"
															className="bg-gradient-to-r from-brand-magenta to-brand-blue hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all"
														>
															{isSaving ? (
																<>
																	<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																	Salvando...
																</>
															) : (
																<>
																	<Save className="mr-2 h-4 w-4" />
																	Salvar configurações
																</>
															)}
														</Button>
													</motion.div>
												</motion.div>
											</CardContent>
										</Card>
									</motion.div>
								</TabsContent>
							)}

							{activeTab === 'preferencias' && (
								<TabsContent key="preferencias" value="preferencias" forceMount>
									<motion.div
										variants={slideUp}
										initial="hidden"
										animate="visible"
										exit={{ opacity: 0 }}
										className="grid gap-8"
									>
										{/* Card de Informações Pessoais movido para cá */}
										<Card className="backdrop-blur-xl bg-white/80 border border-gray-100/60 shadow-lg overflow-hidden relative">
											<div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-brand-magenta/10 to-brand-blue/10 rounded-bl-full" />
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Edit className="h-5 w-5 text-brand-magenta" />
													Informações Pessoais
												</CardTitle>
												<CardDescription className="text-brand-blue/70">
													Atualize seus dados e como outros usuários veem seu
													perfil
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												<div>
													<Label
														htmlFor="name"
														className="font-medium text-brand-magenta/80"
													>
														Nome completo
													</Label>
													<Input
														id="name"
														defaultValue={clerkUser?.fullName || ''}
														className="mt-1 transition-all focus:ring-2 focus:ring-brand-magenta/20"
														placeholder="Seu nome completo"
													/>
												</div>

												<div>
													<Label
														htmlFor="email"
														className="font-medium text-brand-magenta/80"
													>
														Email
													</Label>
													<Input
														id="email"
														defaultValue={
															clerkUser?.emailAddresses?.[0]?.emailAddress || ''
														}
														className="mt-1 bg-gray-50"
														disabled
													/>
													<p className="text-xs text-brand-blue/70 mt-1 flex items-center gap-1">
														<AlertTriangle className="h-3 w-3 text-brand-blue/70" />
														O email não pode ser alterado diretamente
													</p>
												</div>

												<div className="border-t border-gray-200 pt-4 mt-4">
													<Label
														htmlFor="current-password"
														className="font-medium text-brand-magenta/80"
													>
														Alterar senha
													</Label>
													<div className="space-y-4 mt-2">
														<div>
															<Label
																htmlFor="current-password"
																className="text-sm text-brand-blue/80"
															>
																Senha atual
															</Label>
															<Input
																id="current-password"
																type="password"
																className="mt-1 transition-all focus:ring-2 focus:ring-brand-magenta/20"
																placeholder="Digite sua senha atual"
																value={currentPassword}
																onChange={(e) =>
																	setCurrentPassword(e.target.value)
																}
															/>
														</div>
														<div>
															<Label
																htmlFor="new-password"
																className="text-sm text-brand-blue/80"
															>
																Nova senha
															</Label>
															<Input
																id="new-password"
																type="password"
																className="mt-1 transition-all focus:ring-2 focus:ring-brand-magenta/20"
																placeholder="Digite a nova senha"
																value={newPassword}
																onChange={(e) => setNewPassword(e.target.value)}
															/>
														</div>
														<div>
															<Label
																htmlFor="confirm-password"
																className="text-sm text-brand-blue/80"
															>
																Confirmar nova senha
															</Label>
															<Input
																id="confirm-password"
																type="password"
																className="mt-1 transition-all focus:ring-2 focus:ring-brand-magenta/20"
																placeholder="Confirme a nova senha"
																value={confirmPassword}
																onChange={(e) =>
																	setConfirmPassword(e.target.value)
																}
															/>
															{passwordError && (
																<p className="text-xs text-red-500 mt-1">
																	{passwordError}
																</p>
															)}
														</div>
														<motion.div
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
														>
															<Button
																onClick={handlePasswordChange}
																disabled={
																	isChangingPassword ||
																	!currentPassword ||
																	!newPassword ||
																	!confirmPassword
																}
																type="button"
																className="mt-2 bg-gradient-to-r from-brand-magenta to-brand-blue hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all"
															>
																{isChangingPassword ? (
																	<>
																		<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																		Alterando senha...
																	</>
																) : (
																	<>
																		<Save className="mr-2 h-4 w-4" />
																		Alterar senha
																	</>
																)}
															</Button>
														</motion.div>
													</div>
												</div>
											</CardContent>
										</Card>

										{/* Card de Preferências existente */}
										<Card className="backdrop-blur-xl bg-white/80 border border-gray-100/60 shadow-lg overflow-hidden relative">
											<div className="absolute bottom-0 right-0 h-40 w-40 bg-gradient-to-tl from-brand-magenta/10 to-brand-blue/10 rounded-tl-full" />
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Settings className="h-5 w-5 text-brand-magenta" />
													Preferências de Conta
												</CardTitle>
												<CardDescription className="text-brand-blue/70">
													Configure suas preferências de uso da plataforma
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-6 relative z-10">
												<motion.div
													className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
													whileHover={{
														y: -2,
														boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
													}}
												>
													<div>
														<h3 className="text-lg font-medium text-brand-magenta/90">
															Idioma
														</h3>
														<p className="text-sm text-brand-blue/70">
															Selecione o idioma de exibição
														</p>
													</div>
													<span className="text-sm font-medium px-3 py-1 bg-brand-magenta/10 text-brand-blue/90 rounded-full">
														Português (Brasil)
													</span>
												</motion.div>

												<motion.div
													className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
													whileHover={{
														y: -2,
														boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
													}}
												>
													<div>
														<h3 className="text-lg font-medium text-brand-magenta/90">
															E-mail de contato
														</h3>
														<p className="text-sm text-brand-blue/70">
															Email para receber comunicações importantes
														</p>
													</div>
													<div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
														<Mail className="h-4 w-4 text-brand-magenta" />
														<span className="text-sm text-brand-blue/90">
															{clerkUser?.emailAddresses?.[0]?.emailAddress ||
																'Email não disponível'}
														</span>
													</div>
												</motion.div>

												<div className="border-t border-gray-200 pt-6">
													<motion.div
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.98 }}
													>
														<Button
															variant="outline"
															type="button"
															className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 bg-white/90"
														>
															Excluir minha conta
														</Button>
													</motion.div>
													<p className="text-xs text-brand-blue/70 mt-2 flex items-center gap-1">
														<AlertTriangle className="h-3 w-3 text-brand-blue/70" />
														A exclusão de conta é permanente e removerá todos os
														seus dados de nossos servidores.
													</p>
												</div>

												<motion.div className="flex justify-end mt-6">
													<motion.div
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
													>
														<Button
															onClick={handleSaveProfile}
															disabled={isSaving}
															type="button"
															className="bg-gradient-to-r from-brand-magenta to-brand-blue hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all"
														>
															{isSaving ? (
																<>
																	<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																	Salvando...
																</>
															) : (
																<>
																	<Save className="mr-2 h-4 w-4" />
																	Salvar alterações
																</>
															)}
														</Button>
													</motion.div>
												</motion.div>
											</CardContent>
										</Card>
									</motion.div>
								</TabsContent>
							)}
						</AnimatePresence>
					</Tabs>
				</motion.div>

				{/* Modal de troca de foto de perfil */}
				<Dialog open={isEditingPhoto} onOpenChange={setIsEditingPhoto}>
					<DialogContent className="bg-white/95 backdrop-blur-xl max-w-md mx-auto rounded-xl shadow-xl">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-xl font-semibold">
								<Camera className="h-5 w-5 text-brand-magenta" />
								Alterar foto de perfil
							</DialogTitle>
							<DialogDescription>
								Escolha uma nova imagem para seu perfil
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col items-center p-4">
							<Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-6">
								<AvatarImage
									src={profilePhoto || clerkUser?.imageUrl || ''}
									alt={clerkUser?.fullName || 'Usuário'}
									className="object-cover"
									onError={(e) => {
										console.error('Erro ao carregar imagem de perfil no modal');
										e.currentTarget.style.display = 'none';
									}}
								/>
								<AvatarFallback className="bg-gradient-to-br from-brand-magenta to-brand-blue text-white text-3xl">
									{clerkUser?.fullName
										? clerkUser.fullName.slice(0, 2).toUpperCase()
										: 'U'}
								</AvatarFallback>
							</Avatar>

							<Label
								htmlFor="photo-upload"
								className="flex items-center justify-center gap-2 py-2 px-4 w-full bg-gradient-to-r from-brand-magenta/90 to-brand-blue/90 text-white rounded-lg shadow-md hover:shadow-lg hover:opacity-90 cursor-pointer transition-all"
							>
								<Upload className="h-4 w-4" />
								Selecionar nova foto
							</Label>
							<Input
								id="photo-upload"
								type="file"
								accept="image/*"
								onChange={handlePhotoUpload}
								className="hidden"
							/>
							<p className="text-xs text-gray-500 mt-2">
								Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
							</p>
						</div>

						<DialogFooter className="flex items-center justify-between mt-4">
							<Button
								variant="outline"
								type="button"
								onClick={closePhotoModal}
								className="flex items-center gap-2"
							>
								<X className="h-4 w-4" />
								Cancelar
							</Button>
							<Button
								type="button"
								onClick={savePhotoChange}
								className="bg-gradient-to-r from-brand-magenta to-brand-blue text-white flex items-center gap-2"
								disabled={!profilePhoto || isSaving}
							>
								{isSaving ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Salvando...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Salvar foto
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</StoreLayout>
	);
}
