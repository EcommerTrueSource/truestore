'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { tokenStore } from '@/lib/token-store';

interface StoreBannerProps {
	className?: string;
}

export function StoreBanner({ className = '' }: StoreBannerProps) {
	const [bannerUrl, setBannerUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<boolean>(false);

	useEffect(() => {
		let mounted = true;
		
		const fetchBanner = async () => {
			if (!mounted) return;
			
			try {
				setIsLoading(true);
				setError(false);
				
				// Verificar se temos um token válido
				if (!tokenStore.hasValidToken()) {
					console.warn('[StoreBanner] Token não encontrado ou inválido');
					throw new Error('Token inválido');
				}

				// Obter o token para a chamada
				const token = tokenStore.getToken();
				console.log('[StoreBanner] Token obtido, buscando banner...');

				// Fazer requisição REST com opções apropriadas
				const response = await fetch('/api/marketing/campaign/banner', {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
					next: { revalidate: 60 }, // Cache por 1 minuto
				});

				if (!response.ok) {
					console.error(`[StoreBanner] Erro HTTP: ${response.status}`);
					throw new Error(`Erro ${response.status} ao buscar banner`);
				}

				// Obter dados JSON da resposta com tratamento de erro apropriado
				const contentType = response.headers.get('content-type');
				if (!contentType || !contentType.includes('application/json')) {
					console.error('[StoreBanner] Resposta não é JSON:', contentType);
					throw new Error('Resposta não é do tipo JSON');
				}

				const data = await response.json();
				
				// Verificar se a resposta contém uma URL de banner válida
				if (data && data.imageUrl) {
					console.log(`[StoreBanner] Banner obtido com sucesso: ${data.imageUrl}`);
					if (mounted) {
						setBannerUrl(data.imageUrl);
						setError(false);
					}
				} else {
					console.warn('[StoreBanner] Resposta não contém URL de banner válida');
					if (mounted) {
						setError(true);
					}
				}
			} catch (error) {
				console.error('[StoreBanner] Erro ao buscar banner:', error);
				if (mounted) {
					setError(true);
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		};

		// Iniciar o processo de busca do banner
		fetchBanner();
		
		// Cleanup function
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<div className={`w-full overflow-hidden rounded-lg ${className}`}>
			{isLoading ? (
				// Esqueleto de carregamento
				<div className="w-full h-40 sm:h-60 md:h-80 bg-gray-200 animate-pulse rounded-lg" />
			) : error || !bannerUrl ? (
				// Imagem de placeholder caso ocorra erro ou não tenha URL
				<Image
					src="/placeholder-banner-true.png"
					alt="Banner promocional True Source"
					width={1200}
					height={400}
					className="w-full h-auto object-cover rounded-lg"
					priority
				/>
			) : (
				// Banner real obtido da API
				<Image
					src={bannerUrl}
					alt="Banner promocional True Source"
					width={1200}
					height={400}
					className="w-full h-auto object-cover rounded-lg"
					priority
				/>
			)}
		</div>
	);
}
