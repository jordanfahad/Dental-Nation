import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <LoginForm from={from ?? '/'} />
    </main>
  );
}
