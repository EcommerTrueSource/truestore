'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { useCep } from '@/hooks/use-cep';

interface CepAutocompleteProps {
	value: string;
	onChange: (value: string) => void;
	onAddressFound: (data: {
		street: string;
		neighborhood: string;
		city: string;
		state: string;
	}) => void;
	error?: string;
	setError?: (error: string) => void;
	required?: boolean;
}

export function CepAutocomplete({
	value,
	onChange,
	onAddressFound,
	error,
	setError,
	required = false,
}: CepAutocompleteProps) {
	const { isLoading, error: cepError, fetchAddress, resetError } = useCep();
	const [debouncedValue, setDebouncedValue] = useState(value);
	const [wasSuccessful, setWasSuccessful] = useState(false);

	// Formatar o CEP para exibição
	const formatDisplayCEP = (value: string) => {
		const numericCep = value.replace(/\D/g, '');
		if (numericCep.length <= 5) {
			return numericCep;
		} else {
			return `${numericCep.slice(0, 5)}-${numericCep.slice(5, 8)}`;
		}
	};

	// Lida com mudanças no input
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value;
		// Limitar a 9 caracteres (considerando o hífen)
		if (rawValue.length > 9) return;

		// Formatar o valor para exibição
		const formattedValue = formatDisplayCEP(rawValue);
		onChange(formattedValue);

		// Reinicia o status de sucesso quando o usuário digita
		if (wasSuccessful) {
			setWasSuccessful(false);
		}

		// Limpa erros
		if (error && setError) {
			setError('');
		}
		resetError();
	};

	// Debounce para não fazer muitas requisições
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, 800);

		return () => {
			clearTimeout(timer);
		};
	}, [value]);

	// Busca endereço quando o valor debounced mudar e tiver 8 dígitos numéricos
	useEffect(() => {
		const numericCep = debouncedValue.replace(/\D/g, '');

		if (numericCep.length === 8) {
			(async () => {
				const addressData = await fetchAddress(numericCep);

				if (addressData) {
					onAddressFound({
						street: addressData.logradouro,
						neighborhood: addressData.bairro,
						city: addressData.localidade,
						state: addressData.uf,
					});

					setWasSuccessful(true);
				}
			})();
		}
	}, [debouncedValue, fetchAddress, onAddressFound]);

	// Propaga erros para o componente pai, se houver
	useEffect(() => {
		if (cepError && setError) {
			setError(cepError);
		}
	}, [cepError, setError]);

	return (
		<div>
			<Label
				htmlFor="zipCode"
				className="font-medium text-gray-700 flex items-center gap-2"
			>
				<MapPin size={14} className="text-gray-500" />
				CEP {required && <span className="text-brand-magenta">*</span>}
			</Label>
			<div className="relative mt-1 group">
				<Input
					id="zipCode"
					value={value}
					onChange={handleChange}
					placeholder="00000-000"
					className={`pl-3 pr-10 py-2 h-11 rounded-lg border transition-all ${
						error
							? 'border-red-300 focus-visible:ring-red-300'
							: wasSuccessful
							? 'border-green-300 focus-visible:ring-green-300'
							: 'border-gray-200 focus-visible:ring-brand-magenta'
					}`}
					maxLength={9}
					required={required}
				/>

				{/* Ícones de status */}
				<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
					) : error ? (
						<AlertCircle className="h-4 w-4 text-red-500" />
					) : wasSuccessful ? (
						<CheckCircle className="h-4 w-4 text-green-500" />
					) : null}
				</div>

				{error && <p className="text-red-500 text-xs mt-1">{error}</p>}

				{wasSuccessful && !error && (
					<p className="text-green-600 text-xs mt-1">
						Endereço encontrado com sucesso
					</p>
				)}
			</div>
		</div>
	);
}
