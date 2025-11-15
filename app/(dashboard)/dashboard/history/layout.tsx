// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
