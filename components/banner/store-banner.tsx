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
		const maxRetries = 3;
		let retryCount = 0;
		
		const fetchBanner = async () => {
			if (!mounted) return;
			
			try {
				setIsLoading(true);
				setError(false);
				
				// Retry com delay se não for a primeira tentativa
				if (retryCount > 0) {
					console.log(`[StoreBanner] Tentativa #${retryCount+1} de obter o banner em ${retryCount * 1000}ms...`);
					await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
				}

				// Verificar se temos um token válido
				if (!tokenStore.hasValidToken()) {
					console.warn('[StoreBanner] Token não encontrado ou inválido');
					
					if (retryCount < maxRetries) {
						retryCount++;
						setTimeout(fetchBanner, 1500);
						return;
					}
					
					throw new Error('Token inválido após várias tentativas');
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
					
					// Tentar novamente se for erro de autenticação
					if ((response.status === 401 || response.status === 403) && retryCount < maxRetries) {
						console.warn('[StoreBanner] Erro de autenticação, tentando novamente...');
						retryCount++;
						setTimeout(fetchBanner, 1500);
						return;
					}
					
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
				
				// Tentar novamente em caso de erro de rede ou parse se ainda temos tentativas
				if (retryCount < maxRetries) {
					retryCount++;
					setTimeout(fetchBanner, retryCount * 1500);
					return;
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
