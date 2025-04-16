'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!isAuthenticated && pathname !== '/login') {
			router.push('/login');
		}
	}, [isAuthenticated, router, pathname]);

	if (!isAuthenticated) {
		return null; // Não renderiza nada enquanto redireciona
	}

	return <>{children}</>;
}
