"use client";

import { BackgroundDecorations } from "./BackgroundDecorations";
import { FAQSection } from "./FAQSection";
import { FeaturesSection } from "./FeaturesSection";
import { Footer } from "./Footer";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { Navigation } from "./Navigation";
import { PricingSection } from "./PricingSection";
import SampleDemo from "./SampleDemo";
import { ScrollToTop } from "./ScrollToTop";
import { TestimonialsSection } from "./TestimonialsSection";
import { useLandingPage } from "./useLandingPage";

export function LandingPage() {
  const { isVisible, showScrollTop, scrolled, scrollToTop } = useLandingPage();

  return (
    <main className="min-h-dvh bg-gray-900 relative overflow-hidden">
      <Navigation scrolled={scrolled} />
      <BackgroundDecorations />

      <div className="relative mx-auto max-w-7xl px-6 py-12 pt-24">
        <HeroSection isVisible={isVisible.hero || false} />
        <FeaturesSection isVisible={isVisible.features || false} />
        <HowItWorksSection isVisible={isVisible["how-it-works"] || false} />
        <PricingSection isVisible={isVisible.pricing || false} />
        <SampleDemo />
        <TestimonialsSection isVisible={isVisible.testimonials || false} />
        <FAQSection isVisible={isVisible.faq || false} />
        <Footer />
      </div>

      <ScrollToTop show={showScrollTop} onClick={scrollToTop} />
    </main>
  );
}

