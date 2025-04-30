'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategorySidebar } from '@/components/category/category-sidebar';
import { default as NotificationsDropdown } from '../ui/notifications-dropdown';
import { default as UserDropdown } from '../ui/user-dropdown';
import { useFavorites } from '@/lib/contexts/favorites-context';
import { useCart } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { tokenStore } from '@/lib/token-store';

interface StoreLayoutProps {
	children: React.ReactNode;
	hideSidebar?: boolean;
}

export default function StoreLayout({
	children,
	hideSidebar = false,
}: StoreLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { totalFavorites } = useFavorites();
	const { totalItems, totalPrice } = useCart();
	const { isAuthenticated, isLoading } = useAuth();

	// Verificar autenticação e redirecionar para login se necessário
	useEffect(() => {
		// Verificação mais completa da autenticação incluindo o TokenStore
		const hasValidToken = tokenStore.hasValidToken();

		// Aguardar carregamento inicial da autenticação e verificar também o token
		if (!isLoading && !isAuthenticated && !hasValidToken) {
			console.log(
				'[StoreLayout] Usuário não autenticado e sem token válido, redirecionando para login'
			);
			router.push('/login');
		}
	}, [isAuthenticated, isLoading, router]);

	// Fechar sidebar em mudanças de rota em dispositivos móveis
	useEffect(() => {
		setSidebarOpen(false);
	}, [pathname]);

	const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

	const formattedTotal = new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	}).format(totalPrice);

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-gray-50">
			{/* Header */}
			<header className="bg-white border-b border-gray-100 py-3 px-0 md:px-0 shadow-sm sticky top-0 z-50">
				<div className="flex items-center justify-between w-full">
					<Link
						href="/store"
						className="flex items-center space-x-3 pl-4 lg:pl-6"
					>
						<div className="relative flex items-center justify-center">
							<Image
								src="/logotrue.png"
								alt="Logo True"
								height={44}
								width={44}
								className="h-11 w-11 object-contain"
								priority
							/>
						</div>
						<span className="font-semibold text-xl text-brand hidden sm:inline-block">
							True Store
						</span>
					</Link>

					<div className="flex items-center space-x-1 sm:space-x-3 pr-4 lg:pr-6">
						<Link href="/favorites">
							<Button
								variant="ghost"
								size="icon"
								className={`relative ${
									totalFavorites > 0 ? 'text-brand-solid' : 'text-gray-600'
								}`}
								aria-label="Favoritos"
							>
								<Heart className="h-5 w-5" />
								{totalFavorites > 0 && (
									<span className="absolute -top-2 -right-2 badge-brand h-5 w-5 flex items-center justify-center">
										{totalFavorites}
									</span>
								)}
							</Button>
						</Link>

						<NotificationsDropdown />

						<Link href="/checkout" className="relative">
							<Button
								variant="ghost"
								size="icon"
								className={`relative ${
									totalItems > 0 ? 'text-brand-solid' : 'text-gray-600'
								}`}
								aria-label="Carrinho"
							>
								<ShoppingCart className="h-5 w-5" />
								{totalItems > 0 && (
									<span className="absolute -top-2 -right-2 badge-brand h-5 w-5 flex items-center justify-center">
										{totalItems}
									</span>
								)}
							</Button>

							{/* Cart price preview */}
							{totalItems > 0 && (
								<div className="hidden sm:block absolute top-full right-0 mt-1 bg-white rounded-md py-1 px-2 text-xs font-medium text-brand border border-gray-100 shadow-sm">
									{formattedTotal}
								</div>
							)}
						</Link>

						<UserDropdown />
					</div>
				</div>
			</header>

			<div className="flex flex-1">
				{/* Mobile sidebar toggle - apenas se a sidebar não estiver oculta */}
				{!hideSidebar && (
					<button
						onClick={toggleSidebar}
						className="lg:hidden fixed z-50 bottom-4 right-4 bg-brand text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
						aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
					>
						{sidebarOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				)}

				{/* Sidebar - apenas se não estiver oculta */}
				{!hideSidebar && (
					<>
						<div
							className={`
								lg:w-64 lg:flex-shrink-0 transition-all duration-300
								fixed lg:relative z-40 h-[calc(100vh-56px)] top-[56px] lg:top-0 lg:h-auto
								bg-white border-r border-gray-100 shadow-sm
								${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
							`}
						>
							{/* <CategorySidebar /> */}
						</div>

						{/* Overlay para mobile - apenas se a sidebar estiver aberta */}
						{sidebarOpen && (
							<div
								className="lg:hidden fixed inset-0 top-[56px] bg-black bg-opacity-50 z-30 backdrop-blur-sm"
								onClick={toggleSidebar}
							></div>
						)}
					</>
				)}

				{/* Main content - ajusta a largura com base na presença da sidebar */}
				<main
					className={`flex-1 px-4 py-6 md:px-6 overflow-y-auto ${
						hideSidebar ? 'w-full' : ''
					}`}
				>
					<div className="max-w-7xl mx-auto w-full">
						<AnimatePresence mode="wait">
							<motion.div
								key={pathname}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{
									duration: 0.3,
									ease: 'easeInOut',
									staggerChildren: 0.1,
								}}
							>
								{children}
							</motion.div>
						</AnimatePresence>
					</div>
				</main>
			</div>

			{/* Subtle background pattern */}
			<div className="fixed inset-0 -z-10 bg-grid-white pointer-events-none opacity-30" />
		</div>
	);
}
