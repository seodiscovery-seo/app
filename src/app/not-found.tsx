import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This address doesn&apos;t match any page in the CRM.</p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-brand underline">
        Go to dashboard
      </Link>
    </main>
  );
}
