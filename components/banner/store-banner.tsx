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
			// Se não estiver mais montado, não fazer nada
			if (!mounted) return;
			
			try {
				setIsLoading(true);
				setError(false);
				
				// Esperar um pouco para dar tempo de inicializar a autenticação
				if (retryCount > 0) {
					console.log(`[StoreBanner] Tentativa #${retryCount+1} de obter o banner em 1 segundo...`);
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				// Verificar se temos um token válido
				if (!tokenStore.hasValidToken()) {
					console.warn(
						'[StoreBanner] Token não encontrado, verificando novamente...'
					);
					
					// Retry logic
					if (retryCount < maxRetries) {
						retryCount++;
						setTimeout(fetchBanner, 1500); // Tentar novamente em 1.5 segundos
						return;
					} else {
						console.error(
							'[StoreBanner] Não foi possível obter um token válido após várias tentativas'
						);
						if (mounted) {
							setError(true);
							setIsLoading(false);
						}
						return;
					}
				}

				// Obter o token para a chamada
				const token = tokenStore.getToken();
				console.log('[StoreBanner] Token obtido, buscando banner...');

				const response = await fetch('/api/marketing/campaign/banner', {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
					credentials: 'include',
				});

				if (!response.ok) {
					console.error(
						`[StoreBanner] Erro ao buscar banner: ${response.status}`
					);
					
					// Tentar novamente se for erro de autenticação
					if (response.status === 401 && retryCount < maxRetries) {
						console.warn('[StoreBanner] Erro 401, tentando novamente após token refresh...');
						retryCount++;
						setTimeout(fetchBanner, 1500);
						return;
					}
					
					if (mounted) {
						setError(true);
						setIsLoading(false);
					}
					return;
				}

				const data = await response.json();

				// Verificar se a resposta contém uma URL de banner válida
				if (data && data.imageUrl) {
					console.log(
						`[StoreBanner] Banner obtido com sucesso: ${data.imageUrl}`
					);
					if (mounted) {
						setBannerUrl(data.imageUrl);
					}
				} else {
					console.warn(
						'[StoreBanner] Resposta não contém URL de banner válida'
					);
					if (mounted) {
						setError(true);
					}
				}
			} catch (error) {
				console.error('[StoreBanner] Erro ao buscar banner:', error);
				
				// Tentar novamente em caso de erro de rede
				if (retryCount < maxRetries) {
					console.warn('[StoreBanner] Tentando novamente após erro...');
					retryCount++;
					setTimeout(fetchBanner, 1500);
					return;
				}
				
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
