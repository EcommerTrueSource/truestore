'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreLayout from '../../components/layouts/store-layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Checkbox } from '../../components/ui/checkbox';
import {
	ShoppingBag,
	ArrowLeft,
	User,
	Phone,
	MapPin,
	FileText,
	Home,
	Building,
	Map,
	Landmark,
	Flag,
	Globe,
	ChevronDown,
	ChevronUp,
	AlertCircle,
	Trash,
	AlertTriangle,
	Calendar,
	DollarSign,
	ShieldAlert,
	Store,
} from 'lucide-react';
import { useCart } from '../../lib/contexts/cart-context';
import { CartItem } from '../../components/checkout/cart-item';
import { OrderSummary } from '../../components/checkout/order-summary';
import { useToast } from '../../components/ui/use-toast';
import { formatCurrency } from '../../lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import Image from 'next/image';
import { CepAutocomplete } from '../../components/checkout/cep-autocomplete';
import { useCustomer } from '../../hooks/use-customer';

export default function CheckoutPage() {
	const router = useRouter();
	const { cartItems, totalItems, clearCart, totalPrice } = useCart();
	const { customer, getAvailableBalance } = useCustomer();
	const { toast } = useToast();
	const [openAlertDialog, setOpenAlertDialog] = useState(false);
	const [openExitDialog, setOpenExitDialog] = useState(false);
	const [openErrorDialog, setOpenErrorDialog] = useState(false);
	const [errorDetails, setErrorDetails] = useState<{
		title: string;
		message: string;
		type: 'limit' | 'balance' | 'general';
		details?: any;
	} | null>(null);

	// Dados do formulário
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [zipCode, setZipCode] = useState('');
	const [street, setStreet] = useState('');
	const [number, setNumber] = useState('');
	const [complement, setComplement] = useState('');
	const [neighborhood, setNeighborhood] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [country, setCountry] = useState('Brasil');
	const [observations, setObservations] = useState('');
	const [showObservations, setShowObservations] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Erros de validação
	const [nameError, setNameError] = useState('');
	const [phoneError, setPhoneError] = useState('');
	const [zipCodeError, setZipCodeError] = useState('');
	const [streetError, setStreetError] = useState('');
	const [numberError, setNumberError] = useState('');
	const [neighborhoodError, setNeighborhoodError] = useState('');
	const [cityError, setCityError] = useState('');
	const [stateError, setStateError] = useState('');

	// Adicionar estado para controlar o diálogo
	const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

	// Adicionar um novo estado para controlar se o usuário concordou com os termos
	const [agreedToTerms, setAgreedToTerms] = useState(false);

	// Formatação e validação de telefone
	const formatPhone = (value: string) => {
		const numericPhone = value.replace(/\D/g, '');

		if (numericPhone.length <= 2) {
			return numericPhone;
		} else if (numericPhone.length <= 6) {
			return `(${numericPhone.slice(0, 2)}) ${numericPhone.slice(2)}`;
		} else if (numericPhone.length <= 10) {
			return `(${numericPhone.slice(0, 2)}) ${numericPhone.slice(
				2,
				6
			)}-${numericPhone.slice(6)}`;
		} else {
			return `(${numericPhone.slice(0, 2)}) ${numericPhone.slice(
				2,
				7
			)}-${numericPhone.slice(7, 11)}`;
		}
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formattedPhone = formatPhone(e.target.value);
		setPhone(formattedPhone);

		const numericPhone = formattedPhone.replace(/\D/g, '');
		if (numericPhone.length > 0 && numericPhone.length < 10) {
			setPhoneError('Telefone inválido. Digite DDD + número.');
		} else {
			setPhoneError('');
		}
	};

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setName(newName);

		if (newName.trim().length > 0 && newName.trim().length < 3) {
			setNameError('Nome muito curto.');
		} else if (newName.trim().length > 0 && !newName.includes(' ')) {
			setNameError('Informe nome e sobrenome.');
		} else {
			setNameError('');
		}
	};

	const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newStreet = e.target.value;
		setStreet(newStreet);

		if (newStreet.trim().length > 0 && newStreet.trim().length < 3) {
			setStreetError('Endereço muito curto.');
		} else {
			setStreetError('');
		}
	};

	const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newNumber = e.target.value;
		setNumber(newNumber);

		if (newNumber.trim().length > 0 && !/^[0-9]+$/.test(newNumber.trim())) {
			setNumberError('Informe apenas números.');
		} else {
			setNumberError('');
		}
	};

	const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newNeighborhood = e.target.value;
		setNeighborhood(newNeighborhood);

		if (
			newNeighborhood.trim().length > 0 &&
			newNeighborhood.trim().length < 2
		) {
			setNeighborhoodError('Bairro muito curto.');
		} else {
			setNeighborhoodError('');
		}
	};

	const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newCity = e.target.value;
		setCity(newCity);

		if (newCity.trim().length > 0 && newCity.trim().length < 2) {
			setCityError('Cidade muito curta.');
		} else {
			setCityError('');
		}
	};

	const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newState = e.target.value;
		setState(newState);

		if (newState.trim().length > 0 && newState.trim().length < 2) {
			setStateError('Estado muito curto.');
		} else {
			setStateError('');
		}
	};

	// Verifica se o formulário é válido
	const isFormValid = () => {
		// Validar campos obrigatórios
		let isValid = true;

		if (!name.trim()) {
			setNameError('Nome é obrigatório');
			isValid = false;
		}

		if (!phone.trim()) {
			setPhoneError('Telefone é obrigatório');
			isValid = false;
		}

		if (!street.trim()) {
			setStreetError('Endereço é obrigatório');
			isValid = false;
		}

		if (!number.trim()) {
			setNumberError('Número é obrigatório');
			isValid = false;
		}

		if (!zipCode.trim()) {
			setZipCodeError('CEP é obrigatório');
			isValid = false;
		}

		if (!neighborhood.trim()) {
			setNeighborhoodError('Bairro é obrigatório');
			isValid = false;
		}

		if (!city.trim()) {
			setCityError('Cidade é obrigatória');
			isValid = false;
		}

		if (!state.trim()) {
			setStateError('Estado é obrigatório');
			isValid = false;
		}

		// Verificar se há erros de validação
		return (
			isValid &&
			!nameError &&
			!phoneError &&
			!zipCodeError &&
			!streetError &&
			!numberError &&
			!neighborhoodError &&
			!cityError &&
			!stateError
		);
	};

	// Modificar a função handleSubmit para separar a validação da finalização
	const handleValidateOrder = (e: React.FormEvent) => {
		e.preventDefault();

		// Realizar validação completa dos campos
		if (!isFormValid()) {
			toast({
				title: 'Campos obrigatórios não preenchidos',
				description:
					'Por favor, preencha todos os campos obrigatórios para continuar.',
				variant: 'destructive',
			});
			return;
		}

		// Se os campos são válidos, abrir o diálogo de confirmação
		setIsConfirmationOpen(true);
	};

	const handleSubmitOrder = async () => {
		setIsSubmitting(true);

		try {
			// Obter o saldo do voucher e calcular quanto vai ser usado
			const voucherBalance = getAvailableBalance();
			const voucherUsed = Math.min(voucherBalance, totalPrice);
			const finalTotal = Math.max(0, totalPrice - voucherUsed);

			// Preparar dados do pedido para enviar à API
			const orderData = {
				clerkId: customer?.externalId, // ID do Clerk para buscar dados completos do cliente
				name,
				phone,
				delivery: {
					zipCode,
					street,
					number,
					complement: complement || 'Não informado',
					neighborhood,
					city,
					state,
					country: country || 'Brasil',
				},
				observations: observations || 'Nenhuma observação',
				items: cartItems,
				payment: {
					subtotal: totalPrice,
					voucherUsed,
					finalTotal,
					remainingVoucher: Math.max(0, voucherBalance - voucherUsed),
				},
				timestamp: new Date().toISOString(),
			};

			console.log('Enviando pedido para processamento...');

			// Enviar pedido para a API interna
			const response = await fetch('/api/orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Para enviar cookies (token)
				body: JSON.stringify(orderData),
			});

			let responseData;
			try {
				responseData = await response.json();
			} catch (e) {
				console.error('Erro ao processar resposta:', e);
				throw new Error('Falha ao processar resposta do servidor');
			}

			if (!response.ok) {
				console.error('Erro no processamento do pedido:', responseData);

				// Identificar o tipo de erro para exibir a mensagem apropriada
				if (responseData.error === 'Limite de pedidos atingido') {
					setErrorDetails({
						title: 'Limite de Pedidos Atingido',
						message:
							responseData.details?.message ||
							'Você atingiu o limite de pedidos para o período atual.',
						type: 'limit',
						details: responseData.details,
					});
					setOpenErrorDialog(true);
				} else if (responseData.error === 'Saldo insuficiente') {
					setErrorDetails({
						title: 'Saldo Insuficiente',
						message:
							responseData.details?.message ||
							'Você não possui saldo suficiente para realizar este pedido.',
						type: 'balance',
						details: responseData.details,
					});
					setOpenErrorDialog(true);
				} else {
					// Para outros tipos de erro
					let errorMessage = 'Ocorreu um erro ao processar seu pedido.';
					if (responseData.details?.friendlyMessage) {
						errorMessage = responseData.details.friendlyMessage;
					} else if (responseData.details?.message) {
						errorMessage = responseData.details.message;
					}

					setErrorDetails({
						title: 'Erro ao Processar Pedido',
						message: errorMessage,
						type: 'general',
						details: responseData.details,
					});
					setOpenErrorDialog(true);
				}

				return;
			}

			// Pedido processado com sucesso
			console.log('Pedido criado com sucesso:', responseData);

			// Armazenar dados para a página de confirmação
			sessionStorage.setItem(
				'orderData',
				JSON.stringify({
					...orderData,
					id: responseData.id,
					createdAt: responseData.createdAt,
					status: responseData.status,
					__items__: responseData.__items__,
				})
			);

			clearCart();
			router.push('/confirmation');
		} catch (error) {
			console.error('Erro ao processar pedido:', error);

			setErrorDetails({
				title: 'Erro ao Processar Pedido',
				message:
					error instanceof Error
						? error.message
						: 'Ocorreu um erro ao finalizar seu pedido. Tente novamente.',
				type: 'general',
			});
			setOpenErrorDialog(true);
		} finally {
			setIsSubmitting(false);
			setIsConfirmationOpen(false);
		}
	};

	const handleClearCart = () => {
		setOpenAlertDialog(false);
		clearCart();
	};

	const handleExitPage = () => {
		setOpenExitDialog(false);
		router.back();
	};

	// Em seu lugar, adicionar o seguinte handler para quando o endereço for encontrado
	const handleAddressFound = (addressData: {
		street: string;
		neighborhood: string;
		city: string;
		state: string;
	}) => {
		// Preencher os campos com os dados encontrados
		setStreet(addressData.street);
		setNeighborhood(addressData.neighborhood);
		setCity(addressData.city);
		setState(addressData.state);

		// Limpar possíveis erros
		setStreetError('');
		setNeighborhoodError('');
		setCityError('');
		setStateError('');
	};

	if (totalItems === 0) {
		return (
			<StoreLayout>
				<div className="max-w-4xl mx-auto py-12">
					<div className="text-center py-16 bg-white rounded-xl shadow-sm">
						<div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
							<ShoppingBag className="h-10 w-10 text-gray-400" />
						</div>
						<h2 className="mt-4 text-2xl font-medium text-gray-900">
							Seu carrinho está vazio
						</h2>
						<p className="mt-2 text-gray-500">
							Parece que você ainda não adicionou nenhum produto ao seu pedido.
						</p>
						<Button
							onClick={() => router.push('/store')}
							className="mt-6 bg-brand-magenta hover:bg-brand-magenta/90"
						>
							Continuar Comprando
						</Button>
					</div>
				</div>
			</StoreLayout>
		);
	}

	return (
		<StoreLayout hideSidebar={true}>
			<div className="max-w-6xl mx-auto py-8">
				<AlertDialog open={openExitDialog} onOpenChange={setOpenExitDialog}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Sair da página de checkout?</AlertDialogTitle>
							<AlertDialogDescription>
								Você tem itens no carrinho. Se sair agora, seus dados de pedido
								não serão salvos.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Continuar comprando</AlertDialogCancel>
							<AlertDialogAction onClick={handleExitPage}>
								Sim, sair da página
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<button
					onClick={() =>
						totalItems > 0 ? setOpenExitDialog(true) : router.back()
					}
					className="flex items-center text-gray-600 hover:text-gray-900 mb-6 group"
				>
					<ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
					Voltar
				</button>

				<h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
					<ShoppingBag className="text-brand-magenta" size={24} />
					Finalizar Pedido
				</h1>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<Card className="mb-6">
							<CardHeader className="pb-3 flex flex-row items-center justify-between">
								<CardTitle className="text-lg font-medium text-gray-900">
									Itens do Pedido
								</CardTitle>
								<AlertDialog
									open={openAlertDialog}
									onOpenChange={setOpenAlertDialog}
								>
									<AlertDialogTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
										>
											<Trash className="h-4 w-4 mr-1" />
											Limpar Carrinho
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle className="text-xl bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
												Limpar carrinho de compras?
											</AlertDialogTitle>
											<AlertDialogDescription>
												Essa ação irá remover todos os produtos do seu carrinho.
												Deseja continuar?
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
												Cancelar
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleClearCart}
												className="bg-gradient-to-r from-brand-magenta to-brand-orange text-white hover:opacity-90"
											>
												<Trash className="mr-2 h-4 w-4" />
												Sim, limpar carrinho
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</CardHeader>
							<CardContent>
								{cartItems.length > 0 ? (
									<div className="divide-y divide-gray-100">
										{cartItems.map((item) => (
											<CartItem
												key={item.id}
												id={item.id}
												name={item.name}
												price={item.price}
												quantity={item.quantity}
												imageUrl={item.imageUrl}
											/>
										))}
									</div>
								) : (
									<p className="text-gray-500">Nenhum item no pedido.</p>
								)}
							</CardContent>
						</Card>

						<Card className="mb-6">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
									<User size={18} className="text-brand-magenta" />
									Seus Dados
								</CardTitle>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleValidateOrder} className="space-y-4">
									<div>
										<Label
											htmlFor="name"
											className="font-medium text-gray-700 flex items-center gap-2"
										>
											Nome Completo{' '}
											<span className="text-brand-magenta">*</span>
										</Label>
										<div className="relative mt-1 group">
											<Input
												id="name"
												value={name}
												onChange={handleNameChange}
												placeholder="Seu nome completo"
												required
												className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
													nameError
														? 'border-red-300 focus-visible:ring-red-300'
														: 'border-gray-200 focus-visible:ring-brand-magenta'
												}`}
											/>
											{nameError && (
												<span className="text-xs text-red-500 mt-1 block">
													{nameError}
												</span>
											)}
										</div>
									</div>

									<div>
										<Label
											htmlFor="phone"
											className="font-medium text-gray-700 flex items-center gap-2"
										>
											Telefone <span className="text-brand-magenta">*</span>
										</Label>
										<div className="relative mt-1">
											<Input
												id="phone"
												value={phone}
												onChange={handlePhoneChange}
												placeholder="(00) 00000-0000"
												required
												className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
													phoneError
														? 'border-red-300 focus-visible:ring-red-300'
														: 'border-gray-200 focus-visible:ring-brand-magenta'
												}`}
											/>
											{phoneError && (
												<span className="text-xs text-red-500 mt-1 block">
													{phoneError}
												</span>
											)}
										</div>
									</div>
								</form>
							</CardContent>
						</Card>

						<Card className="mb-6">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
									<MapPin size={18} className="text-brand-magenta" />
									Informações de Entrega
								</CardTitle>
								<p className="text-xs text-gray-500">
									Os campos marcados com{' '}
									<span className="text-brand-magenta">*</span> são obrigatórios
								</p>
							</CardHeader>
							<CardContent>
								<div className="space-y-6">
									{/* CEP e País */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<CepAutocomplete
												value={zipCode}
												onChange={setZipCode}
												onAddressFound={handleAddressFound}
												error={zipCodeError}
												setError={setZipCodeError}
												required
											/>
										</div>

										<div>
											<Label
												htmlFor="country"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<Globe size={14} className="text-gray-500" />
												País
											</Label>
											<div className="relative mt-1">
												<Input
													id="country"
													value={country}
													onChange={(e) => setCountry(e.target.value)}
													placeholder="País"
													className="pl-3 pr-3 py-2 h-11 rounded-lg border border-gray-200 focus-visible:ring-brand-magenta transition-all bg-gray-50/50"
												/>
											</div>
										</div>
									</div>

									{/* Rua/Avenida */}
									<div>
										<Label
											htmlFor="street"
											className="font-medium text-gray-700 flex items-center gap-2"
										>
											<Home size={14} className="text-gray-500" />
											Av/Rua <span className="text-brand-magenta">*</span>
										</Label>
										<div className="relative mt-1">
											<Input
												id="street"
												value={street}
												onChange={handleStreetChange}
												placeholder="Nome da rua ou avenida"
												className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
													streetError
														? 'border-red-300 focus-visible:ring-red-300'
														: 'border-gray-200 focus-visible:ring-brand-magenta'
												}`}
											/>
											{streetError && (
												<span className="text-xs text-red-500 mt-1 block">
													{streetError}
												</span>
											)}
										</div>
									</div>

									{/* Número e Complemento */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<Label
												htmlFor="number"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<Map size={14} className="text-gray-500" />
												Número <span className="text-brand-magenta">*</span>
											</Label>
											<div className="relative mt-1">
												<Input
													id="number"
													value={number}
													onChange={handleNumberChange}
													placeholder="Número"
													className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
														numberError
															? 'border-red-300 focus-visible:ring-red-300'
															: 'border-gray-200 focus-visible:ring-brand-magenta'
													}`}
												/>
												{numberError && (
													<span className="text-xs text-red-500 mt-1 block">
														{numberError}
													</span>
												)}
											</div>
										</div>

										<div>
											<Label
												htmlFor="complement"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<FileText size={14} className="text-gray-500" />
												Complemento
											</Label>
											<div className="relative mt-1">
												<Input
													id="complement"
													value={complement}
													onChange={(e) => setComplement(e.target.value)}
													placeholder="Casa, Apto, Bloco"
													className="pl-3 pr-3 py-2 h-11 rounded-lg border border-gray-200 focus-visible:ring-brand-magenta transition-all"
												/>
											</div>
										</div>
									</div>

									{/* Bairro, Cidade e Estado em layout responsivo */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<Label
												htmlFor="neighborhood"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<Building size={14} className="text-gray-500" />
												Bairro <span className="text-brand-magenta">*</span>
											</Label>
											<div className="relative mt-1">
												<Input
													id="neighborhood"
													value={neighborhood}
													onChange={handleNeighborhoodChange}
													placeholder="Bairro"
													className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
														neighborhoodError
															? 'border-red-300 focus-visible:ring-red-300'
															: 'border-gray-200 focus-visible:ring-brand-magenta'
													}`}
												/>
												{neighborhoodError && (
													<span className="text-xs text-red-500 mt-1 block">
														{neighborhoodError}
													</span>
												)}
											</div>
										</div>

										<div>
											<Label
												htmlFor="city"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<Landmark size={14} className="text-gray-500" />
												Cidade <span className="text-brand-magenta">*</span>
											</Label>
											<div className="relative mt-1">
												<Input
													id="city"
													value={city}
													onChange={handleCityChange}
													placeholder="Cidade"
													className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
														cityError
															? 'border-red-300 focus-visible:ring-red-300'
															: 'border-gray-200 focus-visible:ring-brand-magenta'
													}`}
												/>
												{cityError && (
													<span className="text-xs text-red-500 mt-1 block">
														{cityError}
													</span>
												)}
											</div>
										</div>

										<div>
											<Label
												htmlFor="state"
												className="font-medium text-gray-700 flex items-center gap-2"
											>
												<Flag size={14} className="text-gray-500" />
												Estado <span className="text-brand-magenta">*</span>
											</Label>
											<div className="relative mt-1">
												<Input
													id="state"
													value={state}
													onChange={handleStateChange}
													placeholder="Estado"
													className={`pl-3 pr-3 py-2 h-11 rounded-lg border transition-all ${
														stateError
															? 'border-red-300 focus-visible:ring-red-300'
															: 'border-gray-200 focus-visible:ring-brand-magenta'
													}`}
												/>
												{stateError && (
													<span className="text-xs text-red-500 mt-1 block">
														{stateError}
													</span>
												)}
											</div>
										</div>
									</div>

									<div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
										<AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
										<p className="text-sm">
											Os itens selecionados estão sujeitos à confirmação de
											estoque e serão reservados em um momento posterior à
											conclusão da compra.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
									<FileText size={18} className="text-brand-magenta" />
									Observações
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Collapsible
									open={showObservations}
									onOpenChange={setShowObservations}
									className="space-y-2"
								>
									<div className="flex items-center space-x-4">
										<div className="flex-1 flex items-center space-x-2">
											<Checkbox
												id="hasObservations"
												checked={showObservations}
												onCheckedChange={() =>
													setShowObservations(!showObservations)
												}
											/>
											<Label
												htmlFor="hasObservations"
												className="text-sm font-medium cursor-pointer"
											>
												Deseja adicionar observações ao seu pedido?
											</Label>
										</div>
										<CollapsibleTrigger asChild>
											<Button variant="ghost" size="sm" className="w-9 p-0">
												{showObservations ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
												<span className="sr-only">Toggle</span>
											</Button>
										</CollapsibleTrigger>
									</div>
									<CollapsibleContent className="space-y-2">
										<Label
											htmlFor="observations"
											className="font-medium text-gray-700"
										>
											Informações adicionais para seu pedido
										</Label>
										<Textarea
											id="observations"
											value={observations}
											onChange={(e) => setObservations(e.target.value)}
											placeholder="Informações adicionais para entrega ou sobre os produtos"
											className="min-h-[80px] border-gray-200 focus-visible:ring-brand-magenta transition-all resize-none"
										/>
									</CollapsibleContent>
								</Collapsible>
							</CardContent>
						</Card>
					</div>

					<div>
						<div className="sticky top-24 space-y-6">
							<OrderSummary />

							<Button
								onClick={handleValidateOrder}
								className="w-full bg-brand-magenta hover:bg-brand-magenta/90 py-6 h-auto text-base font-medium group relative overflow-hidden"
								disabled={isSubmitting}
								type="button"
							>
								{isSubmitting ? (
									<span className="flex items-center justify-center">
										<svg
											className="animate-spin inline h-5 w-5 text-white mr-2"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processando...
									</span>
								) : (
									<>
										<span>Revisar e Confirmar Pedido</span>
										<span className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-70 group-hover:translate-x-1 transition-transform">
											→
										</span>
									</>
								)}
							</Button>

							<AlertDialog
								open={isConfirmationOpen}
								onOpenChange={setIsConfirmationOpen}
							>
								<AlertDialogContent className="max-w-2xl">
									<AlertDialogHeader>
										<AlertDialogTitle className="text-xl text-center bg-gradient-to-r from-brand-magenta to-brand-orange bg-clip-text text-transparent">
											Confirmar Pedido
										</AlertDialogTitle>
										<AlertDialogDescription className="text-center">
											Por favor, verifique todos os detalhes do seu pedido
											abaixo antes de finalizar a compra.
										</AlertDialogDescription>
									</AlertDialogHeader>

									<div className="my-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
										{/* Dados Pessoais */}
										<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
											<h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
												<User size={16} className="text-brand-magenta" />
												Seus Dados
											</h4>
											<div className="grid grid-cols-2 gap-2 text-sm">
												<div>
													<p className="text-gray-500">Nome:</p>
													<p className="font-medium">{name || '—'}</p>
												</div>
												<div>
													<p className="text-gray-500">Telefone:</p>
													<p className="font-medium">{phone || '—'}</p>
												</div>
											</div>
										</div>

										{/* Endereço de Entrega */}
										<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
											<h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
												<MapPin size={16} className="text-brand-magenta" />
												Endereço de Entrega
											</h4>
											<div className="space-y-1 text-sm">
												<p>
													<span className="text-gray-500">Endereço: </span>
													<span className="font-medium">
														{street && number ? `${street}, ${number}` : '—'}
														{complement ? `, ${complement}` : ''}
													</span>
												</p>
												<p>
													<span className="text-gray-500">Bairro: </span>
													<span className="font-medium">
														{neighborhood || '—'}
													</span>
												</p>
												<p>
													<span className="text-gray-500">Cidade/Estado: </span>
													<span className="font-medium">
														{city || '—'}
														{state ? ` - ${state}` : ''}
													</span>
												</p>
												<p>
													<span className="text-gray-500">CEP: </span>
													<span className="font-medium">{zipCode || '—'}</span>
												</p>
											</div>
										</div>

										{/* Itens do Pedido */}
										<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
											<h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
												<ShoppingBag size={16} className="text-brand-magenta" />
												Resumo do Pedido ({cartItems.length}{' '}
												{cartItems.length === 1 ? 'item' : 'itens'})
											</h4>
											<div className="space-y-3">
												{cartItems.map((item) => (
													<div
														key={item.id}
														className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
													>
														<div className="h-12 w-12 rounded-md bg-gray-50 relative overflow-hidden flex-shrink-0">
															{item.imageUrl && (
																<Image
																	src={item.imageUrl}
																	alt={item.name}
																	fill
																	className="object-cover"
																/>
															)}
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-medium text-sm truncate">
																{item.name}
															</p>
															<p className="text-xs text-gray-500">
																Quantidade: {item.quantity} x{' '}
																{formatCurrency(item.price)}
															</p>
														</div>
														<div className="font-medium text-sm">
															{formatCurrency(item.price * item.quantity)}
														</div>
													</div>
												))}
											</div>

											{observations && (
												<div className="mt-3 pt-3 border-t border-gray-100">
													<p className="text-xs text-gray-500">Observações:</p>
													<p className="text-sm mt-1 bg-gray-50 p-2 rounded">
														{observations}
													</p>
												</div>
											)}

											<div className="mt-4 pt-3 border-t border-gray-100">
												<div className="flex justify-between items-center text-sm">
													<span className="text-gray-500">Subtotal:</span>
													<span>{formatCurrency(totalPrice)}</span>
												</div>

												{getAvailableBalance() > 0 && (
													<div className="flex justify-between items-center text-sm mt-1">
														<span className="text-green-600">
															Voucher aplicado:
														</span>
														<span className="text-green-600">
															-{' '}
															{formatCurrency(
																Math.min(getAvailableBalance(), totalPrice)
															)}
														</span>
													</div>
												)}

												<div className="flex justify-between items-center text-sm mt-1">
													<span className="text-gray-500">Frete:</span>
													<span className="text-green-600 font-medium">
														Grátis
													</span>
												</div>
												<div className="flex justify-between font-medium text-base mt-3">
													<span>Total</span>
													<span className="text-brand-magenta">
														{formatCurrency(
															Math.max(
																0,
																totalPrice -
																	Math.min(getAvailableBalance(), totalPrice)
															)
														)}
													</span>
												</div>

												<div className="flex justify-between items-center text-sm mt-2">
													<span className="text-gray-700">
														Valor a pagar na entrega:
													</span>
													<span className="font-semibold">R$ 0,00</span>
												</div>
											</div>
										</div>

										{/* Termo de confirmação */}
										<div className="flex items-start gap-2 mt-4">
											<Checkbox
												id="confirmOrder"
												className="mt-1"
												checked={agreedToTerms}
												onCheckedChange={(checked) =>
													setAgreedToTerms(checked === true)
												}
											/>
											<Label htmlFor="confirmOrder" className="text-sm">
												Confirmo que os dados acima estão corretos e estou
												ciente que após a confirmação, não será possível alterar
												este pedido.
											</Label>
										</div>
									</div>

									<AlertDialogFooter className="flex-col sm:flex-row gap-3">
										<AlertDialogCancel
											className="sm:mt-0"
											onClick={() => setAgreedToTerms(false)}
										>
											Voltar e revisar
										</AlertDialogCancel>
										<Button
											onClick={agreedToTerms ? handleSubmitOrder : undefined}
											className={`sm:w-auto w-full relative transition-all duration-200 ${
												agreedToTerms
													? 'bg-gradient-to-r from-brand-magenta to-brand-orange text-white hover:opacity-90'
													: 'bg-gray-200 text-gray-500'
											}`}
											disabled={!agreedToTerms || isSubmitting}
										>
											{isSubmitting ? (
												<span className="flex items-center justify-center">
													<svg
														className="animate-spin inline h-5 w-5 text-white mr-2"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
													>
														<circle
															className="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															strokeWidth="4"
														></circle>
														<path
															className="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
														></path>
													</svg>
													Processando...
												</span>
											) : agreedToTerms ? (
												<>
													<ShoppingBag className="mr-2 h-4 w-4" />
													Finalizar Compra
												</>
											) : (
												<>
													<span className="absolute -top-9 w-max bg-gray-800 text-white text-xs py-1 px-2 rounded animate-bounce opacity-90">
														↓ Marque a caixa de confirmação ↓
													</span>
													<span className="flex items-center">
														<AlertCircle className="mr-2 h-4 w-4" />
														Confirme os termos acima
													</span>
												</>
											)}
										</Button>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<div className="flex items-center justify-center text-gray-500 text-sm mt-4">
								<span className="flex items-center">
									<span className="inline-flex -space-x-2 overflow-hidden">
										{[1, 2, 3].map((i) => (
											<div
												key={i}
												className={`inline-block h-6 w-6 rounded-full ring-2 ring-white ${
													i % 3 === 0
														? 'bg-brand-magenta/20'
														: i % 3 === 1
														? 'bg-brand-orange/20'
														: 'bg-purple-200'
												}`}
											>
												<span className="sr-only">User {i}</span>
											</div>
										))}
									</span>
									<span className="ml-3">+120 pedidos hoje</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Diálogo de Erro */}
			<AlertDialog open={openErrorDialog} onOpenChange={setOpenErrorDialog}>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle
							className={`text-xl flex items-center gap-2 ${
								errorDetails?.type === 'limit'
									? 'text-amber-600'
									: errorDetails?.type === 'balance'
									? 'text-red-600'
									: 'text-gray-900'
							}`}
						>
							{errorDetails?.type === 'limit' && (
								<Calendar className="h-5 w-5" />
							)}
							{errorDetails?.type === 'balance' && (
								<DollarSign className="h-5 w-5" />
							)}
							{errorDetails?.type === 'general' && (
								<ShieldAlert className="h-5 w-5" />
							)}
							{errorDetails?.title}
						</AlertDialogTitle>
						<AlertDialogDescription className="text-base mt-2 text-gray-700">
							{errorDetails?.message}
						</AlertDialogDescription>
					</AlertDialogHeader>

					{errorDetails?.type === 'limit' && errorDetails.details && (
						<div className="my-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
							<h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Informações de Limite
							</h4>
							<div className="space-y-2 text-sm text-amber-700">
								<p>
									Você já realizou <strong>{errorDetails.details.used}</strong>{' '}
									de <strong>{errorDetails.details.limit}</strong> pedidos
									permitidos.
								</p>
								<p>
									Período atual:{' '}
									<strong>
										{new Date(
											errorDetails.details.period?.start
										).toLocaleDateString()}
									</strong>{' '}
									até{' '}
									<strong>
										{new Date(
											errorDetails.details.period?.end
										).toLocaleDateString()}
									</strong>
								</p>
								<p className="text-amber-900 font-medium mt-3">
									Seu limite será renovado após o término deste período.
								</p>
							</div>
						</div>
					)}

					{errorDetails?.type === 'balance' && errorDetails.details && (
						<div className="my-4 p-4 bg-red-50 rounded-lg border border-red-200">
							<h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
								<DollarSign className="h-4 w-4" />
								Informações de Saldo
							</h4>
							<div className="space-y-2 text-sm text-red-700">
								<p>
									Valor do pedido:{' '}
									<strong>{formatCurrency(Number(totalPrice))}</strong>
								</p>
								<p>
									Saldo disponível:{' '}
									<strong>
										{formatCurrency(Number(errorDetails.details.remaining))}
									</strong>
								</p>
								{errorDetails.details.period && (
									<p>
										Período:{' '}
										<strong>
											{new Date(
												errorDetails.details.period?.start
											).toLocaleDateString()}
										</strong>{' '}
										até{' '}
										<strong>
											{new Date(
												errorDetails.details.period?.end
											).toLocaleDateString()}
										</strong>
									</p>
								)}
							</div>

							<div className="mt-4 pt-3 border-t border-red-200">
								<p className="text-sm text-red-800 flex items-center gap-2">
									<Store className="h-4 w-4" />
									<span>
										Para realizar este pedido, considere remover itens do
										carrinho para reduzir o valor total.
									</span>
								</p>
							</div>
						</div>
					)}

					<AlertDialogFooter className="mt-4">
						<Button
							onClick={() => setOpenErrorDialog(false)}
							className="w-full bg-gradient-to-r from-brand-magenta to-brand-orange text-white"
						>
							Entendi, vou revisar meu pedido
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</StoreLayout>
	);
}
