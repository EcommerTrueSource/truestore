'use client';

import type React from 'react';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Truck, MapPin } from 'lucide-react';
import { CepAutocomplete } from '@/components/checkout/cep-autocomplete';

interface AddressData {
	street: string;
	neighborhood: string;
	city: string;
	state: string;
}

export default function CheckoutForm() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [address, setAddress] = useState<AddressData>({
		street: '',
		neighborhood: '',
		city: '',
		state: '',
	});
	const [userEditedFields, setUserEditedFields] = useState<{
		street: boolean;
		neighborhood: boolean;
	}>({
		street: false,
		neighborhood: false,
	});
	const [cep, setCep] = useState('');
	const [cepError, setCepError] = useState('');
	const [isPartialAddress, setIsPartialAddress] = useState(false);
	const lastProcessedCep = useRef('');
	const addressDataLocked = useRef(false);

	const handleCepChange = (value: string) => {
		if (value !== lastProcessedCep.current) {
			addressDataLocked.current = false;
		}
		setCep(value);
	};

	const handleAddressFound = (data: {
		street: string;
		neighborhood: string;
		city: string;
		state: string;
		isPartialAddress: boolean;
	}) => {
		if (addressDataLocked.current) {
			return;
		}

		lastProcessedCep.current = cep;
		addressDataLocked.current = true;

		setIsPartialAddress(data.isPartialAddress);

		setAddress((prevAddress) => ({
			street:
				data.isPartialAddress && userEditedFields.street
					? prevAddress.street
					: data.street || '',
			neighborhood:
				data.isPartialAddress && userEditedFields.neighborhood
					? prevAddress.neighborhood
					: data.neighborhood || '',
			city: data.city || '',
			state: data.state || '',
		}));
	};

	const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setAddress((prev) => ({ ...prev, street: value }));
		setUserEditedFields((prev) => ({ ...prev, street: true }));
	};

	const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setAddress((prev) => ({ ...prev, neighborhood: value }));
		setUserEditedFields((prev) => ({ ...prev, neighborhood: true }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		// Simulate form submission
		setTimeout(() => {
			setIsSubmitting(false);
			router.push('/confirmation');
		}, 1500);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					<Card>
						<CardHeader className="flex flex-row items-center gap-2">
							<MapPin className="h-5 w-5 text-pink-600" />
							<CardTitle className="text-lg">Endereço de Entrega</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Nome Completo</Label>
									<Input id="name" placeholder="Seu nome completo" required />
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">E-mail</Label>
									<Input
										id="email"
										type="email"
										placeholder="seu@email.com"
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<CepAutocomplete
										value={cep}
										onChange={handleCepChange}
										onAddressFound={handleAddressFound}
										error={cepError}
										setError={setCepError}
										required
									/>
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="address">Endereço</Label>
									<Input
										id="address"
										placeholder="Rua, Avenida, etc."
										value={address.street}
										onChange={handleStreetChange}
										required
										disabled={
											!isPartialAddress &&
											address.street !== '' &&
											!userEditedFields.street
										}
										className={
											isPartialAddress
												? 'border-amber-300 focus-visible:ring-amber-300'
												: ''
										}
									/>
									{!isPartialAddress && address.street !== '' ? (
										<p className="text-xs text-gray-500 mt-1">
											Endereço preenchido automaticamente pelo CEP
										</p>
									) : isPartialAddress ? (
										<p className="text-xs text-amber-600 mt-1">
											Por favor, preencha o endereço manualmente
										</p>
									) : null}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="number">Número</Label>
									<Input id="number" placeholder="123" required />
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="complement">Complemento</Label>
									<Input id="complement" placeholder="Apto, Bloco, etc." />
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="neighborhood">Bairro</Label>
									<Input
										id="neighborhood"
										placeholder="Seu bairro"
										value={address.neighborhood}
										onChange={handleNeighborhoodChange}
										required
										disabled={
											!isPartialAddress &&
											address.neighborhood !== '' &&
											!userEditedFields.neighborhood
										}
										className={
											isPartialAddress
												? 'border-amber-300 focus-visible:ring-amber-300'
												: ''
										}
									/>
									{!isPartialAddress && address.neighborhood !== '' ? (
										<p className="text-xs text-gray-500 mt-1">
											Bairro preenchido automaticamente pelo CEP
										</p>
									) : isPartialAddress ? (
										<p className="text-xs text-amber-600 mt-1">
											Por favor, preencha o bairro manualmente
										</p>
									) : null}
								</div>
								<div className="space-y-2">
									<Label htmlFor="city">Cidade</Label>
									<Input
										id="city"
										placeholder="Sua cidade"
										value={address.city}
										onChange={(e) =>
											setAddress({ ...address, city: e.target.value })
										}
										required
										disabled={address.city !== ''}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="state">Estado</Label>
									<Input
										id="state"
										placeholder="UF"
										value={address.state}
										onChange={(e) =>
											setAddress({ ...address, state: e.target.value })
										}
										required
										disabled={address.state !== ''}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phone">Telefone</Label>
								<Input id="phone" placeholder="(00) 00000-0000" required />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center gap-2">
							<Truck className="h-5 w-5 text-pink-600" />
							<CardTitle className="text-lg">Método de Envio</CardTitle>
						</CardHeader>
						<CardContent>
							<RadioGroup defaultValue="express" className="space-y-3">
								<div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
									<RadioGroupItem value="express" id="express" />
									<Label htmlFor="express" className="flex-1 cursor-pointer">
										<div className="font-medium">Entrega Expressa</div>
										<div className="text-sm text-gray-500">2-3 dias úteis</div>
									</Label>
									<div className="text-green-600 font-medium">Grátis</div>
								</div>

								<div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
									<RadioGroupItem value="standard" id="standard" />
									<Label htmlFor="standard" className="flex-1 cursor-pointer">
										<div className="font-medium">Entrega Padrão</div>
										<div className="text-sm text-gray-500">4-7 dias úteis</div>
									</Label>
									<div className="text-green-600 font-medium">Grátis</div>
								</div>
							</RadioGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center gap-2">
							<CreditCard className="h-5 w-5 text-pink-600" />
							<CardTitle className="text-lg">Método de Pagamento</CardTitle>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="credit-card">
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="credit-card">
										Cartão de Crédito
									</TabsTrigger>
									<TabsTrigger value="pix">PIX</TabsTrigger>
									<TabsTrigger value="boleto">Boleto</TabsTrigger>
								</TabsList>

								<TabsContent value="credit-card" className="space-y-4 mt-4">
									<div className="space-y-2">
										<Label htmlFor="card-number">Número do Cartão</Label>
										<Input id="card-number" placeholder="0000 0000 0000 0000" />
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="expiry">Validade</Label>
											<Input id="expiry" placeholder="MM/AA" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="cvv">CVV</Label>
											<Input id="cvv" placeholder="123" />
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="card-name">Nome no Cartão</Label>
										<Input
											id="card-name"
											placeholder="Nome como está no cartão"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="installments">Parcelas</Label>
										<select
											id="installments"
											aria-label="Parcelas"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="1">1x de R$ 299,90 sem juros</option>
											<option value="2">2x de R$ 149,95 sem juros</option>
											<option value="3">3x de R$ 99,97 sem juros</option>
											<option value="4">4x de R$ 74,98 sem juros</option>
											<option value="5">5x de R$ 59,98 sem juros</option>
											<option value="6">6x de R$ 49,98 sem juros</option>
										</select>
									</div>
								</TabsContent>

								<TabsContent value="pix" className="space-y-4 mt-4">
									<div className="bg-gray-50 p-4 rounded-lg text-center">
										<div className="mb-4">
											<div className="w-48 h-48 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
												<span className="text-gray-500">Código QR PIX</span>
											</div>
										</div>
										<p className="text-sm text-gray-600 mb-2">
											Escaneie o código QR com o aplicativo do seu banco ou
											copie o código abaixo:
										</p>
										<div className="flex">
											<Input
												value="00020126580014br.gov.bcb.pix0136a629532e-7693-4846-b028-f142082d7b0752040000530398654041.005802BR5909RECIPIENT6009SAO PAULO62070503***63041D3D"
												readOnly
											/>
											<Button variant="outline" className="ml-2">
												Copiar
											</Button>
										</div>
									</div>
								</TabsContent>

								<TabsContent value="boleto" className="space-y-4 mt-4">
									<div className="bg-gray-50 p-4 rounded-lg">
										<p className="text-sm text-gray-600 mb-4">
											Ao finalizar a compra, você receberá o boleto por e-mail.
											O prazo de validade do boleto é de 3 dias úteis.
										</p>
										<p className="text-sm text-gray-600">
											Importante: O pedido será processado somente após a
											confirmação do pagamento.
										</p>
									</div>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>

					<Separator />

					<div className="flex justify-end">
						<Button
							type="submit"
							className="bg-pink-600 hover:bg-pink-700"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Processando...' : 'Finalizar Compra'}
						</Button>
					</div>
				</div>
			</form>
		</motion.div>
	);
}
