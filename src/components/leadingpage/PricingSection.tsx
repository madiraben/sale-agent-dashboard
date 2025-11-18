import Link from "next/link";

interface PricingSectionProps {
  isVisible: boolean;
}

export function PricingSection({ isVisible }: PricingSectionProps) {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "For small shops starting with automated messaging",
      features: [
        "Up to 5,000 messages/month",
        "1 connected bot (Facebook Page or Telegram)",
        "Index up to 10 pages/images for RAG",
        "Khmer & English support; email support",
      ],
      buttonText: "Get Started",
      buttonLink: "/auth/register",
      buttonStyle: "border-2 border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600",
      popular: false,
    },
    {
      name: "Growth",
      price: "$99",
      period: "/month",
      description: "For teams scaling automated conversations",
      features: [
        "Up to 50,000 messages/month",
        "Up to 5 connected bots (FB & Telegram)",
        "Index up to 200 pages/images; priority indexing",
        "A/B testing, analytics, and priority support",
      ],
      buttonText: "Start Free Trial",
      buttonLink: "/auth/register",
      buttonStyle: "bg-white text-purple-600 hover:bg-gray-50",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations and custom SLAs",
      features: [
        "Unlimited messages & bots (custom limits)",
        "Large-scale indexing & private datasets",
        "Dedicated account manager & 24/7 support",
        "On-prem or VPC deployment options available",
      ],
      buttonText: "Contact Sales",
      buttonLink: "/auth/login",
      buttonStyle: "border-2 border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600",
      popular: false,
    },
  ];

  return (
    <section
      id="pricing"
      data-animate
      className={`mt-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100">Simple, Transparent Pricing</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Choose the plan that fits your team — upgrade or downgrade anytime.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`relative rounded-2xl ${
              plan.popular
                ? "bg-gradient-to-br from-cyan-500 to-purple-600 p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 lg:scale-105 animate-pulse-glow"
                : "bg-gray-800 border-2 border-gray-700 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            <div className="text-center">
              <h3 className={`text-lg font-semibold ${plan.popular ? "text-white" : "text-gray-100"}`}>
                {plan.name}
              </h3>
              <div className="mt-6 flex items-baseline justify-center gap-x-2">
                <span
                  className={`text-5xl font-extrabold tracking-tight ${
                    plan.popular ? "text-white" : "text-gray-100"
                  }`}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={plan.popular ? "text-cyan-100" : "text-gray-400"}>{plan.period}</span>
                )}
              </div>
              <p className={`mt-4 text-sm ${plan.popular ? "text-cyan-50" : "text-gray-300"}`}>
                {plan.description}
              </p>
            </div>

            <ul className="mt-8 space-y-3">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start gap-3">
                  <svg
                    className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      plan.popular ? "text-white" : index === 0 ? "text-cyan-500" : "text-purple-500"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={`text-sm ${plan.popular ? "text-white" : "text-gray-300"}`}>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href={plan.buttonLink}
                className={`block w-full rounded-lg px-4 py-3 text-center font-semibold transition-colors duration-200 ${
                  plan.popular 
                    ? plan.buttonStyle 
                    : "border-2 border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600"
                }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

