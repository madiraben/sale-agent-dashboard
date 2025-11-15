"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function Page() {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll("[data-animate]");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);
  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HERO */}
        <header id="hero" data-animate className={`py-8 lg:py-12 transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="w-full lg:max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-gray-900">
                <span className="flex items-center gap-3 bg-gradient-to-r from-cyan-400 via-teal-400 to-purple-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  <Image
                    src="/images/logo/logo.png"
                    alt="logo"
                    width={48}
                    height={48}
                    className="block lg:hidden w-10 h-10 sm:w-12 sm:h-12"
                  />
                  SALE AGENT
                </span>
                <span className="block sm:inline sm:ml-3 mt-2 sm:mt-0 font-semibold text-gray-800 text-2xl sm:text-3xl lg:text-5xl">
                  — Your AI Sales Representative
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
                Connect Messenger and Telegram chatbots to your Facebook Page or
                BotFather token and automate customer conversations that sell.
                Our agent retrieves (RAG) product info from your website — images
                and text — and replies in Khmer and English so your customers
                always get accurate, localized responses.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-purple-300 px-6 py-3 text-base font-semibold text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300"
                >
                  Create account
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 sm:gap-6 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-500" />
                  <span>24/7 automated outreach</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
                  <span>CRM integrations</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block w-full lg:max-w-lg">
              <div className="rounded-2xl overflow-hidden from-cyan-50 to-purple-50 p-6 hover:scale-105 transition-transform duration-500">
                <Image
                  src="/images/logo/logo3.png"
                  alt="brand mark"
                  width={720}
                  height={540}
                  className="block w-full h-auto animate-float"
                  priority
                />
              </div>
            </div>
          </div>
        </header>

        {/* FEATURES */}
        <section id="features" data-animate className={`mt-20 transition-all duration-1000 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Powerful Features for Sales Teams
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to scale outbound sales without growing headcount.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Smart Conversations */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-cyan-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-cyan-200 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi‑channel Chatbots</h3>
              <p className="text-gray-600 leading-relaxed">Messenger & Telegram bots that handle customer questions, follow-ups, and order conversations automatically.</p>
            </div>

            {/* Lead Scoring */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-purple-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-purple-200 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Product Recommendations (RAG)</h3>
              <p className="text-gray-600 leading-relaxed">Retrieve and rank product data from your website (text & images) to recommend items and answer product questions accurately.</p>
            </div>

            {/* Integrations */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-teal-200 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Connect to Facebook & Telegram</h3>
              <p className="text-gray-600 leading-relaxed">Connect your Facebook Page or BotFather token and route messages into this dashboard for automated replies and analytics.</p>
            </div>

            {/* Scripting & A/B */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-cyan-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-cyan-200 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Templates & Multilingual</h3>
              <p className="text-gray-600 leading-relaxed">Create reply templates, run A/B experiments, and support Khmer + English so messages feel native to each customer.</p>
            </div>

            {/* Analytics */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-purple-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-purple-200 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Conversation Analytics</h3>
              <p className="text-gray-600 leading-relaxed">Measure conversation volume, conversion rates, and which responses drive sales across channels.</p>
            </div>

            {/* Security */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-teal-200 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Controls & Privacy</h3>
              <p className="text-gray-600 leading-relaxed">You control what data is indexed for RAG, and we provide tools to restrict, export, or delete customer data.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" data-animate className={`mt-24 transition-all duration-1000 ${isVisible['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Get your Messenger & Telegram bots live in three steps — connect, index, deploy.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
            {/* Connection lines between steps (hidden on mobile) */}
            <div className="hidden md:block absolute top-14 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-cyan-300 via-teal-300 to-purple-300"></div>

            {/* Step 1: Connect */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-cyan-100">
                <div className="flex justify-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-2xl font-bold shadow-lg">
                    1
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 text-center">Connect</h3>
                <p className="mt-3 text-gray-600 text-center leading-relaxed">
                  Link your Facebook Page (Page token) or paste your Telegram BotFather token to authorize messaging. Permissions are requested securely — no code needed.
                </p>
              </div>
            </div>

            {/* Step 2: Index (RAG) */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-teal-100">
                <div className="flex justify-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white text-2xl font-bold shadow-lg">
                    2
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 text-center">Index (RAG)</h3>
                <p className="mt-3 text-gray-600 text-center leading-relaxed">
                  Crawl and index your website content (text + images) or upload assets manually — we build a retrieval-augmented knowledge base so responses are accurate and grounded in your product data.
                </p>
              </div>
            </div>

            {/* Step 3: Deploy */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-purple-100">
                <div className="flex justify-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white text-2xl font-bold shadow-lg">
                    3
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 text-center">Deploy</h3>
                <p className="mt-3 text-gray-600 text-center leading-relaxed">
                  Publish your bot to Messenger and Telegram, enable Khmer & English responses, test conversations, and monitor performance from the dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" data-animate className={`mt-24 transition-all duration-1000 ${isVisible.pricing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your team — upgrade or downgrade anytime.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Starter Plan */}
            <div className="relative rounded-2xl bg-white border-2 border-gray-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
                <div className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-extrabold tracking-tight text-gray-900">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="mt-4 text-sm text-gray-600">For small shops starting with automated messaging</p>
              </div>

              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Up to 5,000 messages/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">1 connected bot (Facebook Page or Telegram)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Index up to 10 pages/images for RAG</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Khmer & English support; email support</span>
                </li>
              </ul>

              <div className="mt-8">
                <Link href="/auth/register" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-center font-semibold text-gray-900 hover:bg-gray-50 transition-colors duration-200">
                  Get Started
                </Link>
              </div>
            </div>

            {/* Growth Plan - Popular */}
            <div className="relative rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 lg:scale-105">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">Growth</h3>
                <div className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white">$99</span>
                  <span className="text-cyan-100">/month</span>
                </div>
                <p className="mt-4 text-sm text-cyan-50">For teams scaling automated conversations</p>
              </div>

              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-white">Up to 50,000 messages/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-white">Up to 5 connected bots (FB & Telegram)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-white">Index up to 200 pages/images; priority indexing</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-white">A/B testing, analytics, and priority support</span>
                </li>
              </ul>

              <div className="mt-8">
                <Link href="/auth/register" className="block w-full rounded-lg bg-white px-4 py-3 text-center font-semibold text-purple-600 hover:bg-gray-50 transition-colors duration-200">
                  Start Free Trial
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-2xl bg-white border-2 border-gray-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Enterprise</h3>
                <div className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-extrabold tracking-tight text-gray-900">Custom</span>
                </div>
                <p className="mt-4 text-sm text-gray-600">For large organizations and custom SLAs</p>
              </div>

              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Unlimited messages & bots (custom limits)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Large-scale indexing & private datasets</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">Dedicated account manager & 24/7 support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm text-gray-700">On-prem or VPC deployment options available</span>
                </li>
              </ul>

              <div className="mt-8">
                <Link href="/auth/login" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-center font-semibold text-gray-900 hover:bg-gray-50 transition-colors duration-200">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" data-animate className={`mt-24 transition-all duration-1000 ${isVisible.testimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Loved by Sales Teams</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              See what our customers are saying about their experience.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <blockquote className="relative rounded-2xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic">
                  "Our Messenger bot started answering customers instantly — response time dropped to seconds and conversions increased across campaigns."
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold">
                    SP
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Sophea Chum</div>
                    <div className="text-xs text-gray-500">Head of Growth, eCommerce</div>
                  </div>
                </footer>
              </blockquote>
            </div>

            {/* Testimonial 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <blockquote className="relative rounded-2xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic">
                  "We connected our Telegram bot and it answers order questions in Khmer and English — customers love the instant, localized replies."
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                    VC
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Vichea Dara</div>
                    <div className="text-xs text-gray-500">Head of Sales, Retail</div>
                  </div>
                </footer>
              </blockquote>
            </div>

            {/* Testimonial 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <blockquote className="relative rounded-2xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic">
                  "RAG image support helped customers find exact products from a photo — our average resolution time dropped dramatically."
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                    LJ
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Linda Jung</div>
                    <div className="text-xs text-gray-500">CEO, Marketplace</div>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" data-animate className={`mt-24 transition-all duration-1000 ${isVisible.faq ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about our AI sales agent.
            </p>
          </div>

          <div className="mt-16 max-w-3xl mx-auto space-y-4">
            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-cyan-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </span>
                  How do I get started (overview)?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                Quick start: 1) Connect your Facebook Page or Telegram Bot via BotFather token; 2) Index your website or upload images/text for RAG; 3) Publish the bot and monitor conversations in the dashboard. Each step includes guided prompts and helpful validation.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                    </svg>
                  </span>
                  How do I connect my Facebook Page?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                In the dashboard go to Connectors → Facebook. Follow the OAuth flow to grant Page access and paste the generated Page token. We only request messaging permissions; tokens are stored encrypted. After connecting, test by sending a message to your Page.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-teal-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </span>
                  How do I connect Telegram (BotFather)?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                Create a bot with BotFather on Telegram, copy the API token, then go to Connectors → Telegram and paste the token. We'll validate the token and show a test chat option. Tokens are encrypted at rest.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-cyan-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </span>
                  How does RAG indexing work (images & text)?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                We extract text and image embeddings from the pages or uploads you select, then store them in a vector index. During chats we retrieve relevant passages/images and use them to ground responses, improving accuracy for product details and visual queries.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                    </svg>
                  </span>
                  Does the bot support Khmer and English?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                Yes — responses and templates support Khmer and English. You can author templates in either language and the agent will reply in the language detected from the user or per-channel settings.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-teal-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </span>
                  Is my data secure?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                Absolutely. We follow industry best practices including SOC 2 Type II compliance, end-to-end encryption, and regular security audits. You maintain full control with options to restrict, export, or delete your data at any time. We never share your data with third parties.
              </div>
            </details>

            <details className="group rounded-2xl bg-white border-2 border-gray-200 p-6 hover:border-cyan-300 hover:shadow-lg transition-all duration-300">
              <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 text-white text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </span>
                  Can I cancel anytime?
                </span>
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="mt-4 pl-11 text-gray-600 leading-relaxed">
                Yes, you can cancel your subscription at any time with no penalties or hidden fees. Your account will remain active until the end of your current billing period. We also offer a 14-day money-back guarantee if you're not satisfied.
              </div>
            </details>
          </div>
        </section>

        {/* CTA BANNER */}
        <section id="cta" data-animate className={`mt-16 rounded-lg bg-gradient-to-r from-cyan-50 to-purple-50 p-8 transition-all duration-1000 ${isVisible.cta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Ready to scale your sales?</h3>
              <p className="mt-1 text-sm text-gray-600">Start a free trial and see the difference an AI sales agent makes.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/auth/register" className="inline-flex items-center rounded-md bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-3 text-white hover:shadow-xl hover:scale-105 transition-all duration-300">Start free trial</Link>
              <Link href="/auth/login" className="inline-flex items-center rounded-md border px-4 py-3 text-purple-700 hover:bg-purple-50 transition-all duration-300">Sign in</Link>
            </div>
          </div>
        </section>

        <footer className="mt-20 border-t pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Image src="/images/logo/logo2.png" alt="brand" width={40} height={40} />
              <div>
                <div className="font-semibold">SALE AGENCY</div>
                <div>AI agent that can act as a sales representative</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <Link href="/auth/login" className="underline">Sign in</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
