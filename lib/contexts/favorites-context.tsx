'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { Product } from '@/types/product';
import { useAuth } from '@/lib/contexts/auth-context';

interface FavoritesContextType {
	favorites: Product[];
	addToFavorites: (product: Product) => void;
	removeFromFavorites: (productId: string) => void;
	isFavorite: (productId: string) => boolean;
	clearFavorites: () => void;
	totalFavorites: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
	undefined
);

const FAVORITES_STORAGE_KEY = 'estilo-influencer-favorites';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [favorites, setFavorites] = useState<Product[]>([]);
	const [isInitialized, setIsInitialized] = useState(false);
	const { user, isAuthenticated } = useAuth();

	// Gerar chave única com base no usuário autenticado
	const getStorageKey = () => {
		return isAuthenticated && user?.id
			? `${FAVORITES_STORAGE_KEY}-${user.id}`
			: FAVORITES_STORAGE_KEY;
	};

	// Carregar favoritos do localStorage
	useEffect(() => {
		try {
			const storageKey = getStorageKey();
			const storedFavorites = localStorage.getItem(storageKey);
			if (storedFavorites) {
				const parsedFavorites = JSON.parse(storedFavorites);
				if (Array.isArray(parsedFavorites)) {
					setFavorites(parsedFavorites);
				}
			}
		} catch (error) {
			console.error('Falha ao carregar favoritos:', error);
		} finally {
			setIsInitialized(true);
		}
	}, [user?.id, isAuthenticated]); // Recarrega quando o usuário muda

	// Salvar favoritos no localStorage
	useEffect(() => {
		if (isInitialized) {
			const storageKey = getStorageKey();
			localStorage.setItem(storageKey, JSON.stringify(favorites));
		}
	}, [favorites, isInitialized, user?.id, isAuthenticated]);

	const addToFavorites = (product: Product) => {
		if (!isFavorite(product.id)) {
			setFavorites((prev) => [...prev, product]);
			toast.success('Produto adicionado aos favoritos', {
				description: `${product.name} foi adicionado à sua lista de favoritos.`,
			});
		}
	};

	const removeFromFavorites = (productId: string) => {
		if (isFavorite(productId)) {
			const product = favorites.find((fav) => fav.id === productId);
			setFavorites((prev) => prev.filter((item) => item.id !== productId));

			if (product) {
				toast.info('Produto removido dos favoritos', {
					description: `${product.name} foi removido da sua lista de favoritos.`,
				});
			}
		}
	};

	const isFavorite = (productId: string) => {
		return favorites.some((product) => product.id === productId);
	};

	const clearFavorites = () => {
		setFavorites([]);
		toast.info('Lista de favoritos limpa');
	};

	const totalFavorites = favorites.length;

	return (
		<FavoritesContext.Provider
			value={{
				favorites,
				addToFavorites,
				removeFromFavorites,
				isFavorite,
				clearFavorites,
				totalFavorites,
			}}
		>
			{children}
		</FavoritesContext.Provider>
	);
};

export const useFavorites = (): FavoritesContextType => {
	const context = useContext(FavoritesContext);
	if (context === undefined) {
		throw new Error(
			'useFavorites deve ser usado dentro de um FavoritesProvider'
		);
	}
	return context;
};
