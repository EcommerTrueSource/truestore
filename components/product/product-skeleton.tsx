import { Skeleton } from '@/components/ui/skeleton';

export function ProductSkeleton() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse"
				>
					<div className="h-48 bg-gray-200"></div>
					<div className="p-4 space-y-3">
						<div className="h-4 bg-gray-200 rounded"></div>
						<div className="h-4 bg-gray-200 rounded w-2/3"></div>
						<div className="flex justify-between items-center pt-2">
							<div className="h-6 bg-gray-200 rounded w-1/4"></div>
							<div className="h-8 bg-gray-200 rounded w-1/4"></div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
