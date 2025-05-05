'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { tokenStore } from '@/lib/token-store';
import { useRouter, usePathname } from 'next/navigation';

interface StoreBannerProps {
	className?: string;
	forceRefresh?: boolean;
}

// Chave para armazenar o banner no localStorage
const BANNER_STORAGE_KEY = 'true_source_banner_url';
const BANNER_TIMESTAMP_KEY = 'true_source_banner_timestamp';

export function StoreBanner({
	className = '',
	forceRefresh,
}: StoreBannerProps) {
	// Inicializar com valor do localStorage, se disponível
	const getInitialBannerUrl = () => {
		if (typeof window === 'undefined') return null;
		return localStorage.getItem(BANNER_STORAGE_KEY);
	};

	const getInitialTimestamp = () => {
		if (typeof window === 'undefined') return 0;
		const stored = localStorage.getItem(BANNER_TIMESTAMP_KEY);
		return stored ? parseInt(stored, 10) : 0;
	};

	const [bannerUrl, setBannerUrl] = useState<string | null>(
		getInitialBannerUrl()
	);
	const [isLoading, setIsLoading] = useState(!bannerUrl); // Não mostrar loading se já temos banner
	const [error, setError] = useState<boolean>(false);
	const [lastFetchTime, setLastFetchTime] = useState<number>(
		getInitialTimestamp()
	);
	// Mantemos o pathname disponível para uso, mas não como dependência do useEffect
	const pathname = usePathname();

	// Atualizar localStorage quando bannerUrl mudar
	useEffect(() => {
		if (bannerUrl) {
			localStorage.setItem(BANNER_STORAGE_KEY, bannerUrl);
		}
	}, [bannerUrl]);

	// Atualizar localStorage quando lastFetchTime mudar
	useEffect(() => {
		if (lastFetchTime > 0) {
			localStorage.setItem(BANNER_TIMESTAMP_KEY, lastFetchTime.toString());
		}
	}, [lastFetchTime]);

	useEffect(() => {
		let mounted = true;

		const fetchBanner = async () => {
			if (!mounted) return;

			// Verificar se já buscamos recentemente (menos de 30 segundos atrás)
			const now = Date.now();
			const timeSinceLastFetch = now - lastFetchTime;
			const CACHE_DURATION = 30 * 1000; // 30 segundos

			if (
				lastFetchTime > 0 &&
				timeSinceLastFetch < CACHE_DURATION &&
				bannerUrl
			) {
				console.log(
					`[StoreBanner] Banner carregado recentemente (${Math.round(
						timeSinceLastFetch / 1000
					)}s atrás), mantendo existente`
				);
				setIsLoading(false); // Garantir que não mostre loading
				return;
			}

			try {
				// Se já temos um banner anterior, não mostrar o skeleton de loading
				if (!bannerUrl) {
					setIsLoading(true);
				}
				setError(false);

				// Verificar se há um token disponível
				const token = tokenStore.getToken();
				console.log(
					`[StoreBanner] Token disponível: ${!!token}, buscando banner atualizado...`
				);

				// Adicionar parâmetro de timestamp para evitar cache
				const timestamp = Date.now();

				// Configurar headers com ou sem token de autenticação
				const headers: HeadersInit = {
					Accept: 'application/json',
				};

				if (token) {
					headers['Authorization'] = `Bearer ${token}`;
				}

				// Fazer requisição REST para obter o banner
				console.log(
					'[StoreBanner] Enviando requisição para /api/marketing/campaign/banner'
				);
				const response = await fetch(
					`/api/marketing/campaign/banner?_t=${timestamp}`,
					{
						method: 'GET',
						headers,
						cache: 'no-store', // Evita cache para sempre obter o banner mais recente
					}
				);

				console.log(`[StoreBanner] Status da resposta: ${response.status}`);

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
					console.log(
						`[StoreBanner] Banner obtido com sucesso: ${data.imageUrl}`
					);
					if (mounted) {
						setBannerUrl(data.imageUrl);
						setError(false);
						setLastFetchTime(now);
					}
				} else {
					console.warn(
						'[StoreBanner] Resposta não contém URL de banner válida:',
						data
					);
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

		// Registrar ouvinte para eventos de autenticação
		const handleAuthChange = () => {
			console.log(
				'[StoreBanner] Evento de autenticação detectado, recarregando banner'
			);
			fetchBanner();
		};

		// Adicionar listener para evento de autenticação concluída
		window.addEventListener('auth:ready', handleAuthChange);
		window.addEventListener('auth:login', handleAuthChange);
		window.addEventListener('auth:logout', handleAuthChange);

		// Cleanup function
		return () => {
			mounted = false;
			window.removeEventListener('auth:ready', handleAuthChange);
			window.removeEventListener('auth:login', handleAuthChange);
			window.removeEventListener('auth:logout', handleAuthChange);
		};
	}, [forceRefresh, bannerUrl, lastFetchTime]);

	// Gerar uma URL única para evitar cache da imagem
	const imageUrl = bannerUrl
		? `${bannerUrl}${bannerUrl.includes('?') ? '&' : '?'}_t=${lastFetchTime}`
		: '/placeholder-banner-true.png';

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
					src={imageUrl}
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
