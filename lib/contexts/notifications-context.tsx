'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { toast } from 'sonner';

// Tipos de notificações que nosso sistema suporta
export enum NotificationType {
	STOCK_UPDATE = 'STOCK_UPDATE',
	ORDER_STATUS = 'ORDER_STATUS',
	NEW_PRODUCT = 'NEW_PRODUCT',
}

// Interface para definir a estrutura de uma notificação
export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	date: Date;
	read: boolean;
	productId?: string;
	orderId?: string;
	imageUrl?: string;
}

interface NotificationsContextType {
	notifications: Notification[];
	unreadCount: number;
	addNotification: (
		notification: Omit<Notification, 'id' | 'date' | 'read'>
	) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	clearNotifications: () => void;
}

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState<number>(0);

	// Carregar notificações do localStorage
	useEffect(() => {
		const storedNotifications = localStorage.getItem('notifications');
		if (storedNotifications) {
			try {
				const parsedNotifications = JSON.parse(storedNotifications);
				// Converte as strings de data para objetos Date
				const notificationsWithDates = parsedNotifications.map(
					(notif: any) => ({
						...notif,
						date: new Date(notif.date),
					})
				);

				setNotifications(notificationsWithDates);
			} catch (error) {
				console.error('Falha ao analisar notificações:', error);
			}
		} else {
			// Gerar alguns dados de exemplo se não houver nada no localStorage
			generateSampleNotifications();
		}
	}, []);

	// Atualizar localStorage quando as notificações mudarem
	useEffect(() => {
		localStorage.setItem('notifications', JSON.stringify(notifications));

		// Atualizar contador de não lidas
		const unread = notifications.filter((notif) => !notif.read).length;
		setUnreadCount(unread);
	}, [notifications]);

	// Gerar algumas notificações de exemplo para demonstração
	const generateSampleNotifications = () => {
		const sampleNotifications: Notification[] = [
			{
				id: '1',
				type: NotificationType.STOCK_UPDATE,
				title: 'Produto de volta ao estoque',
				message:
					'O produto que você estava interessado está disponível novamente!',
				date: new Date(Date.now() - 3600000), // 1 hora atrás
				read: false,
				productId: '1',
				imageUrl: '/logo-true.svg',
			},
			{
				id: '2',
				type: NotificationType.ORDER_STATUS,
				title: 'Atualização de pedido',
				message: 'Seu pedido #12345 foi enviado e chegará em breve.',
				date: new Date(Date.now() - 86400000), // 1 dia atrás
				read: false,
				orderId: '12345',
			},
			{
				id: '3',
				type: NotificationType.NEW_PRODUCT,
				title: 'Novo produto disponível',
				message: 'Confira o novo produto lançado em nossa loja!',
				date: new Date(Date.now() - 172800000), // 2 dias atrás
				read: true,
				productId: '2',
				imageUrl: '/logo-true.svg',
			},
		];

		setNotifications(sampleNotifications);
	};

	// Adicionar uma nova notificação
	const addNotification = (
		notification: Omit<Notification, 'id' | 'date' | 'read'>
	) => {
		const newNotification: Notification = {
			...notification,
			id: `notif_${Date.now()}`,
			date: new Date(),
			read: false,
		};

		setNotifications((prev) => [newNotification, ...prev]);

		toast.info(notification.title, {
			description: notification.message,
		});
	};

	// Marcar uma notificação como lida
	const markAsRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
		);
	};

	// Marcar todas as notificações como lidas
	const markAllAsRead = () => {
		setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
	};

	// Limpar todas as notificações
	const clearNotifications = () => {
		setNotifications([]);
		toast.info('Todas as notificações foram removidas');
	};

	return (
		<NotificationsContext.Provider
			value={{
				notifications,
				unreadCount,
				addNotification,
				markAsRead,
				markAllAsRead,
				clearNotifications,
			}}
		>
			{children}
		</NotificationsContext.Provider>
	);
};

export const useNotifications = (): NotificationsContextType => {
	const context = useContext(NotificationsContext);
	if (context === undefined) {
		throw new Error(
			'useNotifications deve ser usado dentro de um NotificationsProvider'
		);
	}
	return context;
};
