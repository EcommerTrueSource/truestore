'use client';

import { useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SSOCallback() {
	const { isLoaded, signIn, setActive } = useSignIn();
	const router = useRouter();

	useEffect(() => {
		if (!isLoaded || !signIn || !setActive) return;

		// Tentativa de processar o callback de OAuth
		async function processOAuthCallback() {
			try {
				// Verificar se estamos numa URL de callback
				if (!window.location.search.includes('__clerk_status=')) {
					throw new Error('URL de callback inválida');
				}

				const params = new URLSearchParams(window.location.search);

				// Verificar se o callback foi bem-sucedido
				if (params.get('__clerk_status') !== 'complete') {
					throw new Error('Callback OAuth incompleto');
				}

				// Redirecionar para a loja após autenticação bem-sucedida
				router.push('/store');
			} catch (err) {
				console.error('Erro no processamento do OAuth:', err);
				router.push('/login?error=auth_callback_failed');
			}
		}

		processOAuthCallback();
	}, [isLoaded, router, setActive, signIn]);

	// Animações
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.5,
			},
		},
	};

	return (
		<motion.div
			className="min-h-screen bg-white flex items-center justify-center"
			initial="hidden"
			animate="visible"
			variants={containerVariants}
		>
			<div className="text-center max-w-md px-6">
				<motion.div
					className="mb-8"
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ delay: 0.1, duration: 0.5 }}
				>
					<div className="bg-white p-3 rounded-2xl shadow-md mx-auto w-24 h-24 flex items-center justify-center">
						<Image
							src="/logo-true.svg"
							alt="True Logo"
							width={70}
							height={70}
							className="object-contain"
						/>
					</div>
				</motion.div>

				<motion.div
					className="w-16 h-16 mx-auto mb-6 relative"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
				>
					<div
						className="absolute inset-0 rounded-full bg-gradient-brand animate-spin [animation-duration:2s]"
						style={{ clipPath: 'polygon(50% 0%, 50% 50%, 100% 50%, 100% 0%)' }}
					/>
				</motion.div>

				<motion.h1
					className="text-2xl font-bold mb-3 text-gradient-brand"
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.4 }}
				>
					Processando autenticação
				</motion.h1>
				<motion.p
					className="text-gray-600"
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					Por favor, aguarde enquanto finalizamos seu login...
				</motion.p>
			</div>
		</motion.div>
	);
}
