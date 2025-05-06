'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
	ArrowLeft,
	ChevronDown,
	Mail,
	HelpCircle,
	Phone,
	MessageSquare,
	Store,
} from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import EmailService from '@/lib/services/email-service';

const fadeIn = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideUp = {
	hidden: { y: 30, opacity: 0 },
	visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

export default function HelpPage() {
	const [activeTab, setActiveTab] = useState('faq');
	const [messageSent, setMessageSent] = useState(false);
	const [sending, setSending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		subject: '',
		message: '',
	});

	const formRef = useRef<HTMLFormElement>(null);

	// Inicializa o EmailJS ao carregar o componente
	useEffect(() => {
		EmailService.init();
	}, []);

	// Função para atualizar campos do formulário
	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { id, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[id]: value,
		}));
	};

	// Função para enviar mensagem via EmailService
	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage(null);
		setSending(true);

		const result = await EmailService.sendContactEmail({
			from_name: formData.name,
			from_email: formData.email,
			subject: formData.subject,
			message: formData.message,
		});

		if (result.success) {
			setMessageSent(true);
			// Resetar formulário após envio bem-sucedido
			setFormData({
				name: '',
				email: '',
				subject: '',
				message: '',
			});
		} else {
			setErrorMessage(result.message);
		}

		setSending(false);
	};

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={fadeIn}
			className="container max-w-4xl px-4 py-8 mx-auto relative"
		>
			{/* Background decorativo */}
			<div className="absolute top-0 right-0 -z-10 w-72 h-72 bg-gradient-to-bl from-brand-magenta/10 to-brand-blue/10 rounded-full blur-3xl opacity-60"></div>
			<div className="absolute bottom-20 left-0 -z-10 w-64 h-64 bg-gradient-to-tr from-brand-blue/10 to-brand-magenta/10 rounded-full blur-3xl opacity-60"></div>

			{/* Botão Voltar para a Loja */}
			<motion.div
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				className="mb-6"
			>
				<Link href="/store">
					<Button
						variant="ghost"
						type="button"
						className="flex items-center gap-2 text-gray-700 hover:text-rose-600 hover:font-medium hover:bg-brand-magenta/5 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						<Store className="h-4 w-4" />
						Voltar para a Loja
					</Button>
				</Link>
			</motion.div>

			<motion.div variants={slideUp} className="mb-8 relative">
				<div className="absolute -top-6 -left-6 w-20 h-20 bg-gradient-to-br from-brand-magenta/20 to-brand-blue/20 rounded-full blur-2xl" />
				<h1 className="text-3xl font-bold bg-gradient-to-r from-brand-magenta to-brand-blue bg-clip-text text-transparent relative">
					Central de Ajuda
				</h1>
				<p className="text-gray-600 mt-2">
					Tire suas dúvidas e encontre assistência para suas compras
				</p>
			</motion.div>

			{/* Abas de Navegação */}
			<div className="bg-white/90 backdrop-blur-md rounded-full shadow-md mb-8 flex p-1 relative z-10">
				<button
					onClick={() => setActiveTab('faq')}
					className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
						activeTab === 'faq'
							? 'bg-gradient-to-r from-brand-magenta/10 to-brand-blue/10 text-rose-600 font-bold'
							: 'text-gray-600 hover:text-brand-magenta'
					}`}
				>
					Perguntas Frequentes
				</button>
				<button
					onClick={() => setActiveTab('contact')}
					className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
						activeTab === 'contact'
							? 'bg-gradient-to-r from-brand-magenta/10 to-brand-blue/10 text-rose-600 font-bold'
							: 'text-gray-600 hover:text-brand-magenta'
					}`}
				>
					Suporte & Contato
				</button>
			</div>

			{/* Conteúdo da Central de Ajuda */}
			{activeTab === 'faq' && (
				<motion.div
					variants={staggerContainer}
					initial="hidden"
					animate="visible"
					className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100/60 shadow-lg p-6"
				>
					<motion.div variants={slideUp} className="mb-6">
						<h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
							<HelpCircle className="w-5 h-5 mr-2 text-brand-magenta" />
							Perguntas Frequentes
						</h2>
					</motion.div>

					<motion.div variants={slideUp} className="space-y-2">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem
								value="item-1"
								className="border-b border-gray-100"
							>
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Como funciona o programa de parceria para influenciadores?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Nosso programa exclusivo para influenciadores oferece uma
									plataforma personalizada onde você pode divulgar produtos
									selecionados para sua audiência. Após o cadastro e aprovação,
									você terá acesso à sua loja personalizada e comissões por
									vendas.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem
								value="item-2"
								className="border-b border-gray-100"
							>
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Como acompanhar o status do meu pedido?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Você pode acompanhar o status do seu pedido acessando a seção
									"Histórico de Compras" no menu do seu perfil. Lá você
									encontrará informações detalhadas sobre cada compra, incluindo
									o código de rastreamento quando disponível.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem
								value="item-3"
								className="border-b border-gray-100"
							>
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Quais são as formas de pagamento aceitas?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Aceitamos diversas formas de pagamento, incluindo cartões de
									crédito, boleto bancário, PIX e carteiras digitais. Todas as
									transações são processadas com segurança através de gateways
									de pagamento confiáveis e criptografados.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem
								value="item-4"
								className="border-b border-gray-100"
							>
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Como funciona a política de trocas e devoluções?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Você tem até 7 dias após o recebimento do produto para
									solicitar a troca ou devolução. Os produtos devem estar em
									perfeito estado, com a embalagem original e acompanhados da
									nota fiscal. Para iniciar o processo, acesse a seção
									"Histórico de Compras" e selecione a opção "Solicitar
									Devolução".
								</AccordionContent>
							</AccordionItem>

							<AccordionItem
								value="item-5"
								className="border-b border-gray-100"
							>
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Como me tornar um parceiro da plataforma?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Para se tornar um parceiro, envie um e-mail para
									marketing@truebrands.com.br com seu perfil e métricas de redes
									sociais. Nossa equipe analisará sua solicitação e entrará em
									contato para os próximos passos do processo de parceria.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="item-6">
								<AccordionTrigger className="text-gray-800 hover:text-brand-magenta hover:no-underline py-4">
									Como garantir a segurança das minhas informações?
								</AccordionTrigger>
								<AccordionContent className="text-gray-600">
									Utilizamos tecnologia de criptografia avançada para proteger
									todas as suas informações pessoais e financeiras. Nunca
									compartilhamos seus dados com terceiros sem sua autorização.
									Além disso, recomendamos o uso de senhas fortes e exclusivas
									para sua conta.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</motion.div>
				</motion.div>
			)}

			{activeTab === 'contact' && (
				<motion.div
					variants={staggerContainer}
					initial="hidden"
					animate="visible"
					className="grid md:grid-cols-2 gap-6"
				>
					{/* Informações de Contato */}
					<motion.div variants={slideUp} className="order-2 md:order-1">
						<Card className="backdrop-blur-xl bg-white/80 border border-gray-100/60 shadow-lg h-full">
							<CardHeader>
								<div className="flex items-center mb-1">
									<Mail className="w-5 h-5 text-brand-magenta mr-2" />
									<CardTitle className="text-xl font-semibold text-gray-800">
										Entre em Contato
									</CardTitle>
								</div>
								<CardDescription className="pl-7">
									Estamos prontos para te ajudar.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
								<div className="bg-white/70 rounded-lg shadow-sm">
									<div className="p-4 border-b border-gray-100">
										<h3 className="font-medium mb-2 text-gray-800">
											E-mail de Suporte
										</h3>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="text-sm text-gray-600 font-medium break-all">
												marketing@truebrands.com.br
											</p>
											<Button
												size="sm"
												variant="outline"
												className="h-7 px-3 text-brand-magenta border-brand-magenta hover:bg-brand-magenta/10"
												onClick={() => {
													navigator.clipboard.writeText(
														'marketing@truebrands.com.br'
													);
													alert('Email copiado para a área de transferência!');
												}}
											>
												Copiar
											</Button>
										</div>
										<p className="text-xs text-gray-500 mt-2">
											Resposta em até 24 horas úteis.
										</p>
									</div>

									<div className="p-4 bg-blue-50/30">
										<div className="flex items-start mb-2">
											<HelpCircle className="w-4 h-4 text-brand-blue mt-0.5 mr-2 flex-shrink-0" />
											<h3 className="font-medium text-brand-blue">
												Dica de Contato
											</h3>
										</div>
										<p className="text-sm text-gray-600 ml-6">
											Forneça o máximo de detalhes possível em sua mensagem para
											que possamos atendê-lo com mais rapidez. Inclua
											informações como número do pedido, data da compra ou
											detalhes do produto quando aplicável.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* Formulário de Contato */}
					<motion.div variants={slideUp} className="order-1 md:order-2">
						<Card className="backdrop-blur-xl bg-white/80 border border-gray-100/60 shadow-lg overflow-hidden">
							<div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-brand-magenta/10 to-brand-blue/10 rounded-bl-full" />

							{messageSent ? (
								<div className="p-8">
									<div className="bg-white/80 rounded-lg p-6 shadow-sm border border-gray-100/60">
										<div className="flex items-center mb-4">
											<div className="bg-green-100 rounded-full p-2 mr-3">
												<svg
													className="w-6 h-6 text-green-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
											</div>
											<h3 className="text-xl font-semibold text-gray-800">
												Mensagem Enviada com Sucesso!
											</h3>
										</div>
										<p className="text-gray-600 mb-6 ml-11">
											Agradecemos seu contato. Nossa equipe responderá para o
											email
											<span className="font-medium"> {formData.email}</span> o
											mais breve possível.
										</p>
										<div className="flex justify-end">
											<Button
												onClick={() => setMessageSent(false)}
												className="bg-gradient-to-r from-brand-magenta to-brand-blue text-white hover:from-brand-magenta/90 hover:to-brand-blue/90"
											>
												Enviar Nova Mensagem
											</Button>
										</div>
									</div>
								</div>
							) : (
								<>
									<CardHeader>
										<div className="flex items-center mb-1">
											<MessageSquare className="w-5 h-5 text-brand-magenta mr-2" />
											<CardTitle className="text-xl font-semibold">
												Fale Conosco
											</CardTitle>
										</div>
										<CardDescription className="pl-7">
											Preencha o formulário abaixo para enviar sua mensagem
										</CardDescription>
									</CardHeader>
									<CardContent>
										<form
											ref={formRef}
											onSubmit={handleSendMessage}
											className="space-y-4"
										>
											{errorMessage && (
												<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
													<p className="font-medium">Erro ao enviar mensagem</p>
													<p>{errorMessage}</p>
												</div>
											)}
											<div>
												<Label htmlFor="name" className="text-gray-700">
													Nome
												</Label>
												<Input
													id="name"
													placeholder="Seu nome completo"
													className="mt-1"
													required
													value={formData.name}
													onChange={handleInputChange}
												/>
											</div>
											<div>
												<Label htmlFor="email" className="text-gray-700">
													E-mail
												</Label>
												<Input
													id="email"
													type="email"
													placeholder="seu-email@exemplo.com"
													className="mt-1"
													required
													value={formData.email}
													onChange={handleInputChange}
												/>
											</div>
											<div>
												<Label htmlFor="subject" className="text-gray-700">
													Assunto
												</Label>
												<Input
													id="subject"
													placeholder="Assunto da mensagem"
													className="mt-1"
													required
													value={formData.subject}
													onChange={handleInputChange}
												/>
											</div>
											<div>
												<Label htmlFor="message" className="text-gray-700">
													Mensagem
												</Label>
												<Textarea
													id="message"
													placeholder="Digite sua mensagem aqui..."
													className="mt-1 resize-none"
													rows={4}
													required
													value={formData.message}
													onChange={handleInputChange}
												/>
											</div>
											<Button
												type="submit"
												className="w-full bg-gradient-to-r from-brand-magenta to-brand-blue text-white"
												disabled={sending}
											>
												{sending ? 'Enviando...' : 'Enviar Mensagem'}
											</Button>
										</form>
									</CardContent>
								</>
							)}
						</Card>
					</motion.div>
				</motion.div>
			)}
		</motion.div>
	);
}
