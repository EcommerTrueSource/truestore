'use client';

import { motion } from 'framer-motion';
import { useCustomer } from '@/hooks/use-customer';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Banknote,
	CreditCard,
	RefreshCcw,
	Award,
	Calendar,
	Clock,
} from 'lucide-react';

export default function CustomerCategoryInfo() {
	const { customer, isLoading, getAvailableBalance, orderLimits } =
		useCustomer();

	if (isLoading) {
		return (
			<Card className="w-full bg-white/70 backdrop-blur-md shadow-md">
				<CardHeader className="pb-2">
					<Skeleton className="h-5 w-1/2" />
					<Skeleton className="h-4 w-3/4" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	// Se não há categoria definida
	if (!customer?.__category__) {
		return (
			<Card className="w-full bg-white/70 backdrop-blur-md shadow-md">
				<CardHeader>
					<CardTitle className="text-brand-magenta">
						Informações de Cliente
					</CardTitle>
					<CardDescription className="text-brand-blue/70">
						Detalhes sobre seu plano e saldo
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center h-32 text-brand-magenta/50">
						Nenhuma categoria ou plano atribuído
					</div>
				</CardContent>
			</Card>
		);
	}

	const { name, description, ticketValue, frequencyPerMonth } =
		customer.__category__;
	const availableBalance = getAvailableBalance();

	// Extrair apenas a parte "Atleta" do nome da categoria para o badge
	const simplifiedCategoryName = name.includes('Atleta')
		? 'Atleta'
		: name.replace(/Creator -|\[.*\]|\(\$.*\)/g, '').trim();

	// Extrair a parte principal da categoria (antes do hífen)
	const extractMainCategory = (categoryName: string) => {
		// Caso especial para "Top Master" ou "Clinica Top Master"
		if (categoryName.includes('Top Master')) {
			return 'Top Master';
		}

		// Se tiver hífen, pega apenas a parte antes do hífen
		if (categoryName.includes('-')) {
			return categoryName.split('-')[0].trim();
		}

		// Se não tiver hífen, retorna o nome completo
		return categoryName;
	};

	// Obter a categoria principal
	const mainCategory = extractMainCategory(name);

	// Formatação de números
	const formatter = new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});

	// Formatação de data para DD/MM/YYYY
	const formatDate = (dateString: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	// Obter a data da próxima renovação
	const nextRenewalDate = orderLimits?.limits?.ticketValue?.period?.end
		? formatDate(orderLimits.limits.ticketValue.period.end)
		: '';

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="w-full max-w-md"
		>
			<Card className="w-full bg-white/70 backdrop-blur-md shadow-md border border-gray-100/60 relative overflow-hidden">
				<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-magenta/10 to-brand-blue/10 rounded-bl-full" />

				<CardHeader className="text-center pb-3">
					<div className="flex flex-col items-center gap-3 mb-2">
						<Badge className="bg-gradient-to-r from-brand-magenta to-brand-blue text-lg py-1.5 px-5 font-semibold text-white">
							{simplifiedCategoryName}
						</Badge>
					</div>
					<CardDescription className="text-center mx-auto text-sm text-brand-blue/70 max-w-[280px]">
						{mainCategory}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6 px-5">
					{/* Saldo disponível */}
					<div className="bg-gradient-to-r from-brand-magenta/10 to-brand-blue/10 rounded-xl p-4">
						<div className="flex justify-between items-center mb-2">
							<div className="text-sm text-brand-magenta/80 font-medium">
								Saldo disponível
							</div>
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="p-1 rounded-full bg-white shadow-sm cursor-pointer"
								title="Atualizar saldo"
							>
								<RefreshCcw className="h-4 w-4 text-brand-magenta" />
							</motion.div>
						</div>

						<div className="text-3xl font-bold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent">
							{formatter.format(availableBalance)}
						</div>

						<div className="mt-2 text-xs text-brand-blue/70 flex flex-col gap-1">
							<div className="flex items-center gap-1">
							<Calendar className="h-3 w-3 text-brand-blue/70" />
							Renovação a cada{' '}
							{frequencyPerMonth === 1 ? 'mês' : `${frequencyPerMonth} meses`}
							</div>
							{nextRenewalDate && (
								<div className="flex items-center gap-1">
									<Clock className="h-3 w-3 text-brand-blue/70" />
									Próxima renovação: {nextRenewalDate}
								</div>
							)}
						</div>
					</div>

					{/* Detalhes do plano em grid layout */}
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
							<Banknote className="h-5 w-5 text-brand-magenta mb-2" />
							<div className="text-sm font-medium text-brand-magenta/70 mb-1 text-center">
								Valor do Voucher
							</div>
							<div className="font-semibold text-brand-blue/90 text-center">
								{formatter.format(parseFloat(ticketValue))}
							</div>
						</div>

						<div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
							<CreditCard className="h-5 w-5 text-brand-magenta mb-2" />
							<div className="text-sm font-medium text-brand-magenta/70 mb-1 text-center">
								Limite de uso
							</div>
							<div className="font-semibold text-brand-blue/90 text-center">
								{customer.creditLimit
									? formatter.format(customer.creditLimit)
									: 'Sem limite definido'}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
