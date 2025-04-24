'use client';

import {
	createContext,
	useState,
	useEffect,
	useContext,
	ReactNode,
} from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { fetchCustomerByClerkId } from '@/lib/api';
import { Customer, CustomerOrderLimits } from '@/types/customer';
import { useToast } from '@/components/ui/use-toast';

interface CustomerContextProps {
	customer: Customer | null;
	isLoading: boolean;
	error: Error | null;
	refreshCustomer: () => Promise<Customer | null>;
	getAvailableBalance: () => number;
	orderLimits: CustomerOrderLimits | null;
	isLoadingLimits: boolean;
	limitsError: string | null;
	refetchOrderLimits: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextProps | undefined>(
	undefined
);

export function CustomerProvider({ children }: { children: ReactNode }) {
	const { user, isLoaded, isSignedIn } = useUser();
	const { userId } = useAuth();
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const { toast } = useToast();

	// Estado para os limites de pedidos
	const [orderLimits, setOrderLimits] = useState<CustomerOrderLimits | null>(
		null
	);
	const [isLoadingLimits, setIsLoadingLimits] = useState<boolean>(false);
	const [limitsError, setLimitsError] = useState<string | null>(null);

	useEffect(() => {
		async function loadCustomerData() {
			if (!isLoaded || !isSignedIn || !user?.id) {
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				setError(null);

				// Buscar os dados do cliente usando o ID do Clerk
				const customerData = await fetchCustomerByClerkId(user.id);
				setCustomer(customerData);
			} catch (err: any) {
				console.error('Erro ao carregar dados do cliente:', err);
				setError(
					err instanceof Error
						? err
						: new Error(err?.message || 'Erro desconhecido')
				);
			} finally {
				setIsLoading(false);
			}
		}

		loadCustomerData();
	}, [isLoaded, isSignedIn, user?.id]);

	/**
	 * Recarrega os dados do cliente sob demanda
	 */
	const refreshCustomer = async () => {
		if (!isSignedIn || !user?.id) {
			return null;
		}

		try {
			setIsLoading(true);
			setError(null);
			const customerData = await fetchCustomerByClerkId(user.id);
			setCustomer(customerData);
			return customerData;
		} catch (err: any) {
			console.error('Erro ao atualizar dados do cliente:', err);
			setError(
				err instanceof Error
					? err
					: new Error(err?.message || 'Erro desconhecido')
			);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Obtém o saldo disponível do cliente baseado no valor do ticket e frequência
	 */
	const getAvailableBalance = (): number => {
		if (!customer?.__category__) {
			return 0;
		}

		const { ticketValue } = customer.__category__;
		return parseFloat(ticketValue);
	};

	// Função para buscar limites de pedidos do cliente
	const fetchOrderLimits = async () => {
		if (!customer?.id) return;

		setIsLoadingLimits(true);
		setLimitsError(null);

		try {
			const response = await fetch(
				`/api/customers/${customer.id}/order-limits`
			);

			if (!response.ok) {
				throw new Error(
					`Erro ao buscar limites de pedidos: ${response.status}`
				);
			}

			const data = await response.json();
			setOrderLimits(data);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: 'Erro desconhecido ao buscar limites';
			setLimitsError(errorMessage);
			console.error('Erro ao buscar limites de pedidos:', errorMessage);
		} finally {
			setIsLoadingLimits(false);
		}
	};

	// Buscar limites de pedidos quando o cliente for carregado
	useEffect(() => {
		if (customer?.id) {
			fetchOrderLimits();
		}
	}, [customer?.id]);

	const value = {
		customer,
		isLoading,
		error,
		refreshCustomer,
		getAvailableBalance,
		orderLimits,
		isLoadingLimits,
		limitsError,
		refetchOrderLimits: fetchOrderLimits,
	};

	return (
		<CustomerContext.Provider value={value}>
			{children}
		</CustomerContext.Provider>
	);
}

export function useCustomerContext() {
	const context = useContext(CustomerContext);
	if (context === undefined) {
		throw new Error(
			'useCustomerContext deve ser usado dentro de um CustomerProvider'
		);
	}
	return context;
}
