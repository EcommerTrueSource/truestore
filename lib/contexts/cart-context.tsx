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

interface CartItem extends Product {
	quantity: number;
}

interface CartContextType {
	cartItems: CartItem[];
	addToCart: (product: Product) => void;
	removeFromCart: (productId: string) => void;
	updateQuantity: (productId: string, quantity: number) => void;
	clearCart: () => void;
	totalItems: number;
	totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'estilo-influencer-cart';

export const CartProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [cartItems, setCartItems] = useState<CartItem[]>([]);
	const [isInitialized, setIsInitialized] = useState(false);
	const { user, isAuthenticated } = useAuth();

	// Gerar chave única com base no usuário autenticado
	const getStorageKey = () => {
		return isAuthenticated && user?.id
			? `${CART_STORAGE_KEY}-${user.id}`
			: CART_STORAGE_KEY;
	};

	// Carregar carrinho do localStorage
	useEffect(() => {
		try {
			const storageKey = getStorageKey();
			const storedCart = localStorage.getItem(storageKey);
			if (storedCart) {
				const parsedCart = JSON.parse(storedCart);
				if (Array.isArray(parsedCart)) {
					setCartItems(parsedCart);
				}
			}
		} catch (error) {
			console.error('Falha ao carregar carrinho:', error);
		} finally {
			setIsInitialized(true);
		}
	}, [user?.id, isAuthenticated]); // Recarrega quando o usuário muda

	// Salvar carrinho no localStorage
	useEffect(() => {
		if (isInitialized) {
			const storageKey = getStorageKey();
			localStorage.setItem(storageKey, JSON.stringify(cartItems));
		}
	}, [cartItems, isInitialized, user?.id, isAuthenticated]);

	const addToCart = (product: Product) => {
		setCartItems((prevItems) => {
			const existingItem = prevItems.find((item) => item.id === product.id);

			if (existingItem) {
				toast.success('Produto atualizado', {
					description: `${product.name} foi atualizado no seu pedido.`,
					duration: 3000,
				});

				return prevItems.map((item) =>
					item.id === product.id
						? { ...item, quantity: item.quantity + 1 }
						: item
				);
			} else {
				toast.success('Produto adicionado', {
					description: `${product.name} foi adicionado ao seu pedido.`,
					duration: 3000,
				});

				return [...prevItems, { ...product, quantity: 1 }];
			}
		});
	};

	const removeFromCart = (productId: string) => {
		setCartItems((prevItems) => {
			const item = prevItems.find((item) => item.id === productId);
			if (item) {
				toast.info('Produto removido', {
					description: `${item.name} foi removido do seu pedido.`,
					duration: 3000,
				});
			}
			return prevItems.filter((item) => item.id !== productId);
		});
	};

	const updateQuantity = (productId: string, quantity: number) => {
		if (quantity <= 0) {
			removeFromCart(productId);
			return;
		}

		setCartItems((prevItems) => {
			const prevItem = prevItems.find((item) => item.id === productId);
			const newItems = prevItems.map((item) =>
				item.id === productId ? { ...item, quantity } : item
			);

			// Se a quantidade mudou significativamente, mostrar toast
			if (prevItem && Math.abs(prevItem.quantity - quantity) > 0) {
				const action = prevItem.quantity < quantity ? 'aumentada' : 'reduzida';
				toast.info('Quantidade atualizada', {
					description: `Quantidade de ${prevItem.name} foi ${action} para ${quantity}.`,
					duration: 2000,
				});
			}

			return newItems;
		});
	};

	const clearCart = () => {
		if (cartItems.length === 0) return;

		setCartItems([]);
		toast.info('Carrinho limpo', {
			description: 'Todos os itens foram removidos do seu pedido.',
			duration: 3000,
		});
	};

	const totalItems = cartItems.reduce(
		(total, item) => total + item.quantity,
		0
	);

	const totalPrice = cartItems.reduce(
		(total, item) => total + item.price * item.quantity,
		0
	);

	return (
		<CartContext.Provider
			value={{
				cartItems,
				addToCart,
				removeFromCart,
				updateQuantity,
				clearCart,
				totalItems,
				totalPrice,
			}}
		>
			{children}
		</CartContext.Provider>
	);
};

export const useCart = (): CartContextType => {
	const context = useContext(CartContext);
	if (context === undefined) {
		throw new Error('useCart deve ser usado dentro de um CartProvider');
	}
	return context;
};
