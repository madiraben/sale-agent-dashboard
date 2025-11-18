"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
// import AiAnimated from "./AiAnimated";

interface HeroSectionProps {
  isVisible: boolean;
}

// Product images data - clothing and products that can be sold online
// You can replace these URLs with your actual product images from your store
const productImages = [
  // Clothing items
  { id: 1, src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop&q=80", delay: 0, position: "top-10 left-10", duration: 8 },
  { id: 2, src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop&q=80", delay: 0.5, position: "top-20 right-20", duration: 9 },
  { id: 3, src: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop&q=80", delay: 1, position: "top-1/3 left-1/4", duration: 10 },
  { id: 4, src: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=300&fit=crop&q=80", delay: 1.5, position: "top-1/2 right-1/4", duration: 11 },
  { id: 5, src: "https://images.unsplash.com/photo-1506629905607-3c0b0a0c0a0a?w=300&h=300&fit=crop&q=80", delay: 2, position: "bottom-20 left-20", duration: 8.5 },
  { id: 6, src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=300&fit=crop&q=80", delay: 2.5, position: "bottom-10 right-10", duration: 9.5 },
  { id: 7, src: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&h=300&fit=crop&q=80", delay: 3, position: "top-1/4 right-1/3", duration: 10.5 },
  { id: 8, src: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop&q=80", delay: 3.5, position: "bottom-1/3 left-1/3", duration: 11.5 },
  { id: 9, src: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=300&h=300&fit=crop&q=80", delay: 4, position: "top-1/2 left-1/2", duration: 8 },
  { id: 10, src: "https://images.unsplash.com/photo-1558769132-4c0a0a0a0a0a?w=300&h=300&fit=crop&q=80", delay: 4.5, position: "bottom-1/4 right-1/2", duration: 9 },
  { id: 11, src: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop&q=80", delay: 5, position: "top-1/3 right-1/5", duration: 10 },
  { id: 12, src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop&q=80", delay: 5.5, position: "bottom-1/5 left-1/5", duration: 11 },
  { id: 13, src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop&q=80", delay: 6, position: "top-1/5 left-1/6", duration: 8.5 },
  { id: 14, src: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=300&h=300&fit=crop&q=80", delay: 6.5, position: "bottom-1/6 right-1/6", duration: 9.5 },
  { id: 15, src: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=300&fit=crop&q=80", delay: 7, position: "top-2/3 right-1/5", duration: 10.5 },
];

export function HeroSection({ isVisible }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      id="hero"
      data-animate
      className={`relative min-h-[90vh] flex items-center justify-center overflow-hidden py-12 lg:py-20 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      {/* Animated Product Images Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-gray-900 to-purple-900/20 backdrop-blur-sm"></div>
        
        {mounted && productImages.map((product) => (
          <div
            key={product.id}
            className={`absolute ${product.position} w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-1000 hover:scale-110 hover:z-20 animate-float-product`}
            style={{
              animationDuration: `${product.duration}s`,
              animationDelay: `${product.delay}s`,
              opacity: 0.7,
            }}
          >
            <div className="relative w-full h-full bg-gradient-to-br from-white to-gray-100 p-2">
              <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-inner">
                <Image
                  src={product.src}
                  alt={`Product ${product.id}`}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 ">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-1 ">
          {/* Left Content */}
          <div className="w-full lg:w-1/2 text-center lg:text-left bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-2xl p-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight mb-6">
              <span className="block bg-gradient-to-r from-cyan-500 via-teal-500 to-purple-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                SALE AGENT
              </span>
              <span className="block mt-2 text-gray-100 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold">
                Your AI Sales Representative
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
              Connect Messenger and Telegram chatbots to your Facebook Page or BotFather token and automate customer
              conversations that sell. Our agent retrieves (RAG) product info from your website — images and text — and
              replies in Khmer and English so your customers always get accurate, localized responses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link
                href="/auth/login"
                className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-10 py-5 text-lg font-bold text-white shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Free
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-2xl border-2 border-purple-400 bg-gray-800/90 backdrop-blur-md px-10 py-5 text-lg font-bold text-purple-300 hover:bg-gray-700 hover:border-purple-300 hover:shadow-xl transition-all duration-300"
              >
                Create Account
              </Link>
            </div>          
          </div>

          {/* Right Content - Logo/Visual */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            {/* <AiAnimated /> */}
          </div>
        </div>
      </div>

    </header>
  );
}

