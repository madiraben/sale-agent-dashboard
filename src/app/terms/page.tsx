export const metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Terms of Service</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-4 text-gray-800">
        <p>
          These Terms govern your access to and use of this application and related services. By using the
          service, you agree to be bound by these Terms.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Use of Service</h2>
        <ul className="list-disc pl-6">
          <li>You must comply with applicable laws and platform policies (e.g., Facebook, Telegram).</li>
          <li>You are responsible for content you submit and actions taken under your account.</li>
          <li>Do not attempt to disrupt, reverse engineer, or abuse the service.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">Accounts & Access</h2>
        <ul className="list-disc pl-6">
          <li>You must provide accurate registration information and keep credentials secure.</li>
          <li>We may suspend or terminate access for violations or risks to the service.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">Data & Privacy</h2>
        <p>
          Our handling of personal data is described in the <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Third-Party Services</h2>
        <p>
          Integrations (e.g., AI providers, databases, messaging platforms) are provided by third parties and
          subject to their terms. We are not responsible for their availability or behavior.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Disclaimers</h2>
        <p>
          The service is provided “as is” without warranties of any kind. To the maximum extent permitted by law,
          we disclaim all implied warranties and are not liable for indirect or consequential damages.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Changes</h2>
        <p>
          We may update these Terms from time to time. Continued use after updates constitutes acceptance of the
          new Terms.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Contact</h2>
        <p>
          For questions about these Terms, please reach out via the contact email shown in the dashboard.
        </p>
      </div>
    </div>
  );
}


