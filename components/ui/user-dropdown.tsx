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

interface UserDropdownProps {
	className?: string;
}

export default function UserDropdown({ className }: UserDropdownProps) {
	const { user, isAuthenticated, logout, isLoading } = useAuth();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
	};

	const handleLogin = () => {
		router.push('/login');
	};

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
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full bg-gray-50 p-0 h-11 w-11 overflow-hidden"
				>
					<Avatar className="h-full w-full border-2 border-white shadow-sm">
						<AvatarImage
							src={user.imageUrl || ''}
							alt={user.name}
							className="object-cover w-full h-full !rounded-full"
							style={{
								transform: 'translateZ(0)',
							}}
						/>
						<AvatarFallback className="bg-brand text-white text-sm font-semibold">
							{initials}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-64 p-2">
				<div className="flex items-center p-3 gap-3 bg-gray-50/50 rounded-md">
					<Avatar className="h-12 w-12 border-2 border-white shadow-sm flex-shrink-0">
						<AvatarImage
							src={user.imageUrl || ''}
							alt={user.name}
							className="object-cover w-full h-full !rounded-full"
							style={{
								transform: 'translateZ(0)',
							}}
						/>
						<AvatarFallback className="bg-brand text-white text-sm font-semibold">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col min-w-0">
						<p className="font-medium text-base truncate">{user.name}</p>
						<p className="text-sm text-muted-foreground truncate">
							{user.email}
						</p>
					</div>
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						asChild
						className="flex items-center cursor-pointer p-2"
					>
						<Link href="/favorites">
							<Heart className="mr-2 h-4 w-4 icon-brand" />
							<span>Meus Favoritos</span>
						</Link>
					</DropdownMenuItem>

					<DropdownMenuItem
						asChild
						className="flex items-center cursor-pointer p-2"
					>
						<Link href="/purchase-history">
							<History className="mr-2 h-4 w-4 icon-brand" />
							<span>Histórico de Compras</span>
						</Link>
					</DropdownMenuItem>

					<DropdownMenuItem
						asChild
						className="flex items-center cursor-pointer p-2"
					>
						<Link href="/perfil">
							<User className="mr-2 h-4 w-4 icon-brand" />
							<span>Minha Conta</span>
						</Link>
					</DropdownMenuItem>

					<DropdownMenuItem
						asChild
						className="flex items-center cursor-pointer p-2"
					>
						<Link href="/help">
							<HelpCircle className="mr-2 h-4 w-4" />
							<span>Ajuda</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={handleLogout}
					className="text-red-500 cursor-pointer p-2"
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Sair</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
