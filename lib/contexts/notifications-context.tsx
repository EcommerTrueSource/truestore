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
	fetchNotifications?: () => Promise<void>; // Função para buscar notificações do endpoint no futuro
}

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);

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
				// Em caso de erro, inicializa com array vazio
				setNotifications([]);
			}
		} else {
			// Inicializa com array vazio ao invés de dados mockados
			setNotifications([]);
		}
	}, []);

	// Atualizar localStorage quando as notificações mudarem
	useEffect(() => {
		localStorage.setItem('notifications', JSON.stringify(notifications));

		// Atualizar contador de não lidas
		const unread = notifications.filter((notif) => !notif.read).length;
		setUnreadCount(unread);
	}, [notifications]);

	// Preparar função para buscar notificações do endpoint
	// Será implementada quando o endpoint estiver pronto
	const fetchNotifications = async () => {
		try {
			setIsLoading(true);
			// TODO: Implementar chamada para o endpoint de notificações quando estiver pronto
			// const response = await fetch('/api/notifications');
			// const data = await response.json();
			// setNotifications(data.map((notif: any) => ({
			//   ...notif,
			//   date: new Date(notif.date)
			// })));

			// Por enquanto, apenas log
			console.log('Função preparada para buscar notificações do endpoint');
		} catch (error) {
			console.error('Erro ao buscar notificações:', error);
		} finally {
			setIsLoading(false);
		}
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
				fetchNotifications,
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
