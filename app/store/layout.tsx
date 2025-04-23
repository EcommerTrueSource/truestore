export const dynamic = 'force-static';

export default function StoreLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
