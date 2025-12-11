import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-md border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Authentication Error</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong during sign-in. Please try again, or choose a different account.
        </p>
        <div className="space-y-2 text-sm">
          <p>Common causes:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Consent screen denied or closed</li>
            <li>Expired session, please retry</li>
            <li>OAuth permissions not granted</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
          >
            Back to login
          </Link>
          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

