export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Privacy Policy</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-4 text-gray-800">
        <p>
          This application helps you manage customer conversations and product information across integrated
          channels. We respect your privacy and only collect information necessary to operate the service.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Information We Collect</h2>
        <ul className="list-disc pl-6">
          <li>Account information provided by you (e.g., email).</li>
          <li>Connected page/profile identifiers and access tokens from platforms you authorize (e.g., Facebook/Telegram).</li>
          <li>Conversation content you or your customers send to the bot.</li>
          <li>Product data you upload to the dashboard.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">How We Use Information</h2>
        <ul className="list-disc pl-6">
          <li>To authenticate you and provide access to your workspace.</li>
          <li>To deliver bot features (respond to messages, search products, create orders).</li>
          <li>To improve reliability and security (logs, abuse prevention).</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">Sharing</h2>
        <p>
          We do not sell your data. We share data only with processors essential to provide the service (e.g., cloud
          hosting, database, AI providers) under appropriate safeguards.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Data Retention</h2>
        <p>
          We retain data for as long as necessary to operate the service or as required by law. You may request
          deletion at any time.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Your Controls</h2>
        <ul className="list-disc pl-6">
          <li>You can disconnect integrations at any time in the dashboard settings.</li>
          <li>You may request export or deletion of your data by contacting us.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">Contact</h2>
        <p>
          For privacy requests, please contact the app owner at the email shown in your account or via the dashboard
          support channels.
        </p>
      </div>
    </div>
  );
}


