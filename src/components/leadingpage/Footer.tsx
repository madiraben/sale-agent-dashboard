import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-800 pt-12 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Image src="/images/logo/logo2.png" alt="brand" width={40} height={40} />
            <div className="font-bold text-gray-100">SALE AGENT</div>
          </div>
          <p className="text-sm text-gray-400">AI agent that can act as a sales representative</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-100 mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link href="#features" className="hover:text-purple-400 transition-colors">
                Features
              </Link>
            </li>
            <li>
              <Link href="#pricing" className="hover:text-purple-400 transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="#how-it-works" className="hover:text-purple-400 transition-colors">
                How It Works
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-100 mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-purple-400 transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/data-deletion" className="hover:text-purple-400 transition-colors">
                Data Deletion
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-100 mb-4">Account</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link href="/auth/login" className="hover:text-purple-400 transition-colors">
                Sign In
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-purple-400 transition-colors">
                Create Account
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Sale Agent. All rights reserved.</p>
      </div>
    </footer>
  );
}

