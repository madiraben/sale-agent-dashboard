export const metadata = {
  title: "Data Deletion",
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Data Deletion</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-4 text-gray-800">
        <p>
          You can request deletion of your account data and connected page data at any time. Deletion includes
          your profile, connected integrations, conversation logs, and product data associated with your workspace,
          except where retention is required by law or for fraud prevention.
        </p>

        <h2 className="mt-6 text-lg font-semibold">How to Request Deletion</h2>
        <ul className="list-disc pl-6">
          <li>From within the app, disconnect integrations in Dashboard → Profile.</li>
          <li>Then contact the app owner using the account email to request full deletion.</li>
        </ul>

        <p className="text-sm text-gray-600">
          We will confirm your request and complete deletion within a reasonable time.
        </p>
      </div>
    </div>
  );
}


