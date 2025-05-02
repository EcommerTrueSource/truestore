'use client';

import Link from 'next/link';
import {
	User,
	LogOut,
	History,
	Heart,
	Settings,
	HelpCircle,
	UserPlus,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Componente de Animação do Logout que permanece visível e cobre toda a tela
function LogoutAnimation({
	phase,
}: {
	phase: number;
}) {
	// useEffect para atualizar a mensagem em vez de acionar o redirecionamento
	useEffect(() => {
		// Não acionar mais o redirecionamento, pois já é feito no handleConfirmLogout
		// Apenas mostrar a animação de conclusão
	}, [phase]);

	return (
		<div className="fixed inset-0 bg-white z-[99999] flex items-center justify-center">
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999] flex items-center justify-center"
			>
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{
						duration: 0.5,
						ease: 'easeOut',
					}}
					className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md flex flex-col items-center"
				>
					<div className="relative w-24 h-24 mx-auto mb-8">
						{phase < 2 ? (
							<>
								<div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange opacity-20 animate-ping"></div>
								<div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-brand-magenta to-brand-orange p-[3px]">
									<div className="w-full h-full rounded-full bg-white flex items-center justify-center">
										<div className="w-14 h-14 border-4 border-t-brand-magenta border-r-transparent border-b-brand-orange border-l-transparent rounded-full animate-spin"></div>
									</div>
								</div>
							</>
						) : (
							<motion.div
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ duration: 0.5, type: 'spring' }}
								className="relative w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-14 w-14 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<motion.path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={3}
										d="M5 13l4 4L19 7"
										initial={{ pathLength: 0 }}
										animate={{ pathLength: 1 }}
										transition={{ duration: 0.6, delay: 0.2 }}
									/>
								</svg>
							</motion.div>
						)}
					</div>
					<motion.h3
						initial={{ y: 10, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="text-2xl font-medium text-gray-900 mb-3"
					>
						{phase < 2 ? 'Fazendo logout' : 'Logout concluído'}
					</motion.h3>
					<motion.p
						initial={{ y: 10, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.3 }}
						className="text-lg text-gray-600"
					>
						{phase < 2
							? 'Encerrando sua sessão...'
							: 'Redirecionando para a página de login...'}
					</motion.p>
				</motion.div>
			</motion.div>
		</div>
	);
}

interface UserDropdownProps {
	className?: string;
}

export default function UserDropdown({ className }: UserDropdownProps) {
	const { user, isAuthenticated, logout, isLoading } = useAuth();
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [phase, setPhase] = useState(1);

	const handleLogoutClick = () => {
		// Mostrar diálogo de confirmação
		setShowLogoutConfirm(true);
	};

	// Abordagem mais confiável para o logout com frame oculto
	const handleConfirmLogout = () => {
		try {
			// Fechar o diálogo de confirmação
			setShowLogoutConfirm(false);

			// Mostrar animação de logout
			setIsLoggingOut(true);

			// Mudar para fase de processamento
			setTimeout(async () => {
				try {
					// Limpar o estado do usuário no lado do cliente
					await logout();

					// Avançar para fase de conclusão
					setPhase(2);

					// Redirecionar para página de login imediatamente após a conclusão do logout
					router.push('/login');
					
					// Fallback caso o router falhe
					setTimeout(() => {
						if (window.location.pathname !== '/login') {
							window.location.href = '/login';
						}
					}, 500);
				} catch (error) {
					console.error('Erro ao limpar estado do logout:', error);
					// Mesmo com erro, mostramos a conclusão e redirecionamos
					setPhase(2);
					// Redirecionar para login mesmo em caso de erro
					window.location.href = '/login';
				}
			}, 1500);
		} catch (error) {
			console.error('Erro geral no logout:', error);
			// Em caso de erro no processo, tentar o redirecionamento direto
			window.location.href = '/login';
		}
	};

	const handleCancelLogout = () => {
		// Fechar o diálogo de confirmação
		setShowLogoutConfirm(false);
	};

	const handleLogin = () => {
		router.push('/login');
	};

	// Função que realiza o redirecionamento final
	// Mantida para compatibilidade, mas não é mais necessária para o fluxo principal
	const performLogout = useCallback(() => {
		try {
			// Verificar se já não estamos na página de login
			if (window.location.pathname !== '/login') {
				// Redirecionar para a página de login
				router.push('/login');
				
				// Fallback caso o router falhe
				setTimeout(() => {
					if (window.location.pathname !== '/login') {
						window.location.href = '/login';
					}
				}, 500);
			}
		} catch (error) {
			console.error('Erro durante redirecionamento de logout:', error);
			// Fallback direto para o caso de qualquer erro
			window.location.href = '/login';
		}
	}, [router]);

	// Mostrar estado de carregamento até que a autenticação seja verificada
	if (isLoading) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="rounded-full bg-gray-100 opacity-70"
				disabled
			>
				<div className="h-5 w-5 rounded-full border-2 border-t-transparent border-brand-solid animate-spin"></div>
			</Button>
		);
	}

	if (!isAuthenticated || !user) {
		return (
			<Button
				variant="outline"
				size="sm"
				className="rounded-full py-5 px-4 border-brand text-brand hover:bg-brand-light"
				onClick={handleLogin}
			>
				<UserPlus className="mr-2 h-4 w-4" />
				Entrar
			</Button>
		);
	}

	// Extrair iniciais do nome para o fallback do avatar
	const initials =
		user.name
			?.split(' ')
			.map((n) => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'U';

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={`rounded-full p-0 ${className || ''}`}
					>
						<Avatar className="h-8 w-8 border border-gray-200">
							<AvatarImage src={user.imageUrl} alt={user.name} />
							<AvatarFallback className="bg-brand text-white text-xs font-medium">
								{initials}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<div className="flex items-center justify-start gap-2 p-2">
						<Avatar className="h-8 w-8">
							<AvatarImage src={user.imageUrl} alt={user.name} />
							<AvatarFallback className="bg-brand text-white text-xs">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col space-y-0.5">
							<p className="text-sm font-medium leading-none">{user.name}</p>
							<p className="text-xs leading-none text-muted-foreground">
								{user.email}
							</p>
						</div>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem asChild>
							<Link href="/perfil" className="cursor-pointer">
								<User className="mr-2 h-4 w-4" />
								Minha Conta
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href="/purchase-history" className="cursor-pointer">
								<History className="mr-2 h-4 w-4" />
								Meus Pedidos
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href="/favorites" className="cursor-pointer">
								<Heart className="mr-2 h-4 w-4" />
								Favoritos
							</Link>
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem asChild>
							<Link href="/settings" className="cursor-pointer">
								<Settings className="mr-2 h-4 w-4" />
								Configurações
							</Link>
						</DropdownMenuItem>
						{/* <DropdownMenuItem asChild>
							<Link href="/ajuda" className="cursor-pointer">
								<HelpCircle className="mr-2 h-4 w-4" />
								Ajuda e Suporte
							</Link>
						</DropdownMenuItem> */}
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-red-600 focus:text-red-600 focus:bg-red-100"
						onClick={handleLogoutClick}
					>
						<LogOut className="mr-2 h-4 w-4" />
						Sair
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Diálogo de confirmação de logout */}
			<AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar Logout</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja sair? Você precisará fazer login novamente
							para acessar sua conta.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={handleCancelLogout}
							className="border-gray-300"
						>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmLogout}
							className="bg-brand hover:bg-brand/90"
						>
							Sair
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Tela de animação de logout */}
			{isLoggingOut && (
				<LogoutAnimation phase={phase} />
			)}
		</>
	);
}
