'use client';

import { useCustomerContext } from '@/lib/contexts/customer-context';

/**
 * Hook para acessar os dados do cliente
 * Utiliza o CustomerContext para compartilhar os dados entre componentes
 */
export function useCustomer() {
	return useCustomerContext();
}
