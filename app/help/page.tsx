'use client';

import { useState } from 'react';
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

	// Função simulada para enviar mensagem
	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		// Simulando envio da mensagem
		setTimeout(() => {
			setMessageSent(true);
		}, 1000);
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
						className="flex items-center gap-2 text-gray-700 hover:text-brand-magenta hover:bg-brand-magenta/5 transition-colors"
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
							? 'bg-gradient-to-r from-brand-magenta/10 to-brand-blue/10 text-brand-magenta'
							: 'text-gray-600 hover:text-brand-magenta'
					}`}
				>
					Perguntas Frequentes
				</button>
				<button
					onClick={() => setActiveTab('contact')}
					className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
						activeTab === 'contact'
							? 'bg-gradient-to-r from-brand-magenta/10 to-brand-blue/10 text-brand-magenta'
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
									partnerships@truebrands.com.br com seu perfil e métricas de
									redes sociais. Nossa equipe analisará sua solicitação e
									entrará em contato para os próximos passos do processo de
									parceria.
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
								<CardTitle className="flex items-center text-xl font-semibold text-gray-800">
									<Phone className="w-5 h-5 mr-2 text-brand-magenta" />
									Entre em Contato
								</CardTitle>
								<CardDescription>
									Estamos prontos para te ajudar nos seguintes canais
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg shadow-sm">
									<Mail className="w-5 h-5 text-brand-magenta mt-1" />
									<div>
										<h3 className="font-medium">E-mail de Suporte</h3>
										<p className="text-sm text-gray-600">
											marketing@truebrands.com.br
										</p>
										<p className="text-xs text-gray-500 mt-1">
											Resposta em até 24 horas
										</p>
									</div>
								</div>

								<div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg shadow-sm">
									<MessageSquare className="w-5 h-5 text-brand-magenta mt-1" />
									<div>
										<h3 className="font-medium">Chat Online</h3>
										<p className="text-sm text-gray-600">
											Disponível em dias úteis das 9h às 18h
										</p>
										<Button
											size="sm"
											variant="outline"
											className="mt-2 text-brand-magenta border-brand-magenta hover:bg-brand-magenta/10"
										>
											Iniciar Chat
										</Button>
									</div>
								</div>

								<div className="flex items-start space-x-3 p-3 bg-white/70 rounded-lg shadow-sm">
									<Phone className="w-5 h-5 text-brand-magenta mt-1" />
									<div>
										<h3 className="font-medium">Telefone</h3>
										<p className="text-sm text-gray-600">(11) 4002-8922</p>
										<p className="text-xs text-gray-500 mt-1">
											Horário de atendimento: Seg-Sex, 9h às 18h
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
								<div className="flex flex-col items-center justify-center p-8 text-center h-full">
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="rounded-full bg-green-100 p-4 mb-4"
									>
										<svg
											className="w-8 h-8 text-green-600"
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
									</motion.div>
									<h3 className="text-xl font-semibold text-gray-800">
										Mensagem Enviada!
									</h3>
									<p className="text-gray-600 mt-2 max-w-xs">
										Agradecemos seu contato. Nossa equipe responderá o mais
										breve possível.
									</p>
									<Button
										onClick={() => setMessageSent(false)}
										className="mt-6 bg-gradient-to-r from-brand-magenta to-brand-blue text-white"
									>
										Enviar Nova Mensagem
									</Button>
								</div>
							) : (
								<>
									<CardHeader>
										<CardTitle className="flex items-center text-xl font-semibold">
											<MessageSquare className="w-5 h-5 mr-2 text-brand-magenta" />
											Fale Conosco
										</CardTitle>
										<CardDescription>
											Preencha o formulário abaixo para enviar sua mensagem
										</CardDescription>
									</CardHeader>
									<CardContent>
										<form onSubmit={handleSendMessage} className="space-y-4">
											<div>
												<Label htmlFor="name" className="text-gray-700">
													Nome
												</Label>
												<Input
													id="name"
													placeholder="Seu nome completo"
													className="mt-1"
													required
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
												/>
											</div>
											<Button
												type="submit"
												className="w-full bg-gradient-to-r from-brand-magenta to-brand-blue text-white"
											>
												Enviar Mensagem
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
