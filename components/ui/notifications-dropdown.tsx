'use client';

import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Bell, Package, Truck, ShoppingBag, Check, Trash2 } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	useNotifications,
	NotificationType,
	Notification,
} from '@/lib/contexts/notifications-context';

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
	switch (type) {
		case NotificationType.STOCK_UPDATE:
			return <Package className="h-4 w-4 text-green-500" />;
		case NotificationType.ORDER_STATUS:
			return <Truck className="h-4 w-4 text-blue-500" />;
		case NotificationType.NEW_PRODUCT:
			return <ShoppingBag className="h-4 w-4 icon-brand" />;
		default:
			return <Bell className="h-4 w-4 text-gray-500" />;
	}
};

// Componente para uma única notificação
const NotificationItem: React.FC<{
	notification: Notification;
	onRead: (id: string) => void;
}> = ({ notification, onRead }) => {
	const handleClick = () => {
		if (!notification.read) {
			onRead(notification.id);
		}

		// Aqui poderia adicionar navegação para detalhes do produto ou pedido
		console.log(`Clicked notification: ${notification.id}`);
	};

	return (
		<DropdownMenuItem
			className={`p-3 cursor-pointer flex flex-col items-start gap-1 hover:bg-slate-50 transition-colors ${
				!notification.read ? 'bg-blue-50/50' : ''
			}`}
			onClick={handleClick}
		>
			<div className="flex items-center gap-2 w-full">
				<div className="flex-shrink-0">
					<NotificationIcon type={notification.type} />
				</div>
				<div className="flex-1">
					<p className="font-medium text-sm">{notification.title}</p>
				</div>
				{!notification.read && (
					<div className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
				)}
			</div>

			<p className="text-xs text-gray-600 line-clamp-2">
				{notification.message}
			</p>

			{notification.imageUrl && (
				<div className="mt-1 w-full">
					<div className="relative h-12 w-12">
						<Image
							src={notification.imageUrl}
							alt="Imagem do produto"
							fill
							className="object-cover rounded-md"
						/>
					</div>
				</div>
			)}

			<div className="w-full flex justify-between items-center mt-1">
				<p className="text-[10px] text-gray-400">
					{format(notification.date, "dd MMM 'às' HH:mm", { locale: ptBR })}
				</p>

				{notification.type === NotificationType.ORDER_STATUS &&
					notification.orderId && (
						<Badge variant="outline" className="text-[10px] h-4">
							Pedido #{notification.orderId}
						</Badge>
					)}
			</div>
		</DropdownMenuItem>
	);
};

export default function NotificationsDropdown() {
	const {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		clearNotifications,
	} = useNotifications();

	return (
		<DropdownMenu>
			{/* <DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5 text-gray-600" />
					{unreadCount > 0 && (
						<span className="absolute -top-2 -right-2 badge-brand h-5 w-5 flex items-center justify-center">
							{unreadCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger> */}

			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel className="flex justify-between items-center">
					<span>Notificações</span>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs flex gap-1"
							onClick={markAllAsRead}
						>
							<Check className="h-3.5 w-3.5" />
							<span>Marcar todas como lidas</span>
						</Button>
					)}
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<ScrollArea className="h-[320px]">
					<DropdownMenuGroup>
						{notifications.length > 0 ? (
							notifications.map((notification) => (
								<React.Fragment key={notification.id}>
									<NotificationItem
										notification={notification}
										onRead={markAsRead}
									/>
									<DropdownMenuSeparator />
								</React.Fragment>
							))
						) : (
							<div className="py-6 px-4 text-center text-gray-500 text-sm">
								<div className="flex justify-center mb-2">
									<Bell className="h-8 w-8 stroke-[1.25px] opacity-20" />
								</div>
								<p>Não há notificações para exibir</p>
							</div>
						)}
					</DropdownMenuGroup>
				</ScrollArea>

				{/* Footer */}
				{notifications.length > 0 && (
					<div className="flex justify-center p-2 border-t">
						<Button
							variant="ghost"
							size="sm"
							className="text-xs flex gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
							onClick={clearNotifications}
						>
							<Trash2 className="h-3.5 w-3.5" />
							<span>Limpar todas</span>
						</Button>
					</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
