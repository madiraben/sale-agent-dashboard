import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#EEF2F7]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-700">
          <span className="text-xl font-semibold">404</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Go to Login
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-[#0F317A] px-4 py-2 text-sm text-white hover:bg-[#0c2865]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}