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
		const fetchBanner = async () => {
			try {
				setIsLoading(true);

				// Verificar se temos um token válido
				if (!tokenStore.hasValidToken()) {
					console.error(
						'[StoreBanner] Token inválido, não é possível obter o banner'
					);
					setError(true);
					setIsLoading(false);
					return;
				}

				// Obter o token para a chamada
				const token = tokenStore.getToken();

				const response = await fetch('/api/marketing/campaign/banner', {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${token}`,
					},
					credentials: 'include',
				});

				if (!response.ok) {
					console.error(
						`[StoreBanner] Erro ao buscar banner: ${response.status}`
					);
					setError(true);
					setIsLoading(false);
					return;
				}

				const data = await response.json();

				// Verificar se a resposta contém uma URL de banner válida
				if (data && data.imageUrl) {
					console.log(
						`[StoreBanner] Banner obtido com sucesso: ${data.imageUrl}`
					);
					setBannerUrl(data.imageUrl);
				} else {
					console.warn(
						'[StoreBanner] Resposta não contém URL de banner válida'
					);
					setError(true);
				}
			} catch (error) {
				console.error('[StoreBanner] Erro ao buscar banner:', error);
				setError(true);
			} finally {
				setIsLoading(false);
			}
		};

		fetchBanner();
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
