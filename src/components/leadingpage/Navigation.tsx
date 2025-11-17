import Image from "next/image";
import Link from "next/link";

interface NavigationProps {
  scrolled: boolean;
}

export function Navigation({ scrolled }: NavigationProps) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-800" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo/logo2.png" alt="logo" width={40} height={40} />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
              SALE AGENT
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

