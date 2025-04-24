import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FavoritesProvider } from '@/lib/contexts/favorites-context';
import { CartProvider } from '@/lib/contexts/cart-context';
import { NotificationsProvider } from '@/lib/contexts/notifications-context';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { CategoriesProvider } from '@/lib/contexts/categories-context';
import { CustomerProvider } from '@/lib/contexts/customer-context';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export const metadata: Metadata = {
	title: 'True Store | Plataforma para Influenciadores',
	description:
		'Acesse sua loja personalizada True Store e descubra produtos exclusivos para você.',
	generator: 'True Source',
	robots: {
		index: false,
		follow: false,
		nocache: true,
		googleBot: {
			index: false,
			follow: false,
			noimageindex: true,
		},
	},
	icons: {
		icon: '/logo-true.svg',
		shortcut: '/logo-true.svg',
		apple: '/logo-true.svg',
	},
	appleWebApp: {
		title: 'True Store',
		statusBarStyle: 'default',
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<html lang="pt-BR" suppressHydrationWarning>
				<head>
					<link rel="icon" href="/logo-true.svg" />
					<meta name="robots" content="noindex, nofollow" />
					<meta name="googlebot" content="noindex, nofollow, noarchive" />
				</head>
				<body className={inter.className}>
					<Toaster />
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						enableSystem={false}
						disableTransitionOnChange
					>
						<AuthProvider>
							<NotificationsProvider>
								<CartProvider>
									<FavoritesProvider>
										<CategoriesProvider>
											<CustomerProvider>{children}</CustomerProvider>
										</CategoriesProvider>
									</FavoritesProvider>
								</CartProvider>
							</NotificationsProvider>
						</AuthProvider>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
