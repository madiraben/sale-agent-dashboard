interface FeaturesSectionProps {
  isVisible: boolean;
}

export function FeaturesSection({ isVisible }: FeaturesSectionProps) {
  const features = [
    {
      icon: (
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      ),
      title: "Multi‑channel Chatbots",
      description:
        "Messenger & Telegram bots that handle customer questions, follow-ups, and order conversations automatically.",
      gradient: "from-cyan-50 to-white",
      border: "border-cyan-200",
      iconBg: "from-cyan-400 to-cyan-600",
      delay: "0.1s",
    },
    {
      icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      title: "Product Recommendations (RAG)",
      description:
        "Retrieve and rank product data from your website (text & images) to recommend items and answer product questions accurately.",
      gradient: "from-purple-50 to-white",
      border: "border-purple-200",
      iconBg: "from-purple-400 to-purple-600",
      delay: "0.2s",
    },
    {
      icon: (
        <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      ),
      title: "Connect to Facebook & Telegram",
      description:
        "Connect your Facebook Page or BotFather token and route messages into this dashboard for automated replies and analytics.",
      gradient: "from-teal-50 to-white",
      border: "border-teal-200",
      iconBg: "from-teal-400 to-teal-600",
      delay: "0.3s",
    },
    {
      icon: (
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      ),
      title: "Templates & Multilingual",
      description:
        "Create reply templates, run A/B experiments, and support Khmer + English so messages feel native to each customer.",
      gradient: "from-cyan-50 to-white",
      border: "border-cyan-200",
      iconBg: "from-cyan-400 to-cyan-600",
      delay: "0.4s",
    },
    {
      icon: (
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      title: "Conversation Analytics",
      description:
        "Measure conversation volume, conversion rates, and which responses drive sales across channels.",
      gradient: "from-purple-50 to-white",
      border: "border-purple-200",
      iconBg: "from-purple-400 to-purple-600",
      delay: "0.5s",
    },
    {
      icon: (
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      ),
      title: "Data Controls & Privacy",
      description:
        "You control what data is indexed for RAG, and we provide tools to restrict, export, or delete customer data.",
      gradient: "from-teal-50 to-white",
      border: "border-teal-200",
      iconBg: "from-teal-400 to-teal-600",
      delay: "0.6s",
    },
  ];

  return (
    <section
      id="features"
      data-animate
      className={`mt-20 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100">Powerful Features for Sales Teams</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Everything you need to scale outbound sales without growing headcount.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const darkGradient = 
            feature.gradient === "from-cyan-50 to-white" ? "from-cyan-900/30 to-gray-800" :
            feature.gradient === "from-purple-50 to-white" ? "from-purple-900/30 to-gray-800" :
            "from-teal-900/30 to-gray-800";
          const borderHoverClass = 
            feature.border === "border-cyan-200" ? "hover:border-cyan-500" :
            feature.border === "border-purple-200" ? "hover:border-purple-500" :
            "hover:border-teal-500";
          
          return (
          <div
            key={index}
            className={`group relative rounded-2xl bg-gradient-to-br ${darkGradient} p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-gray-700 ${borderHoverClass} animate-fade-in-up`}
            style={{ animationDelay: feature.delay }}
          >
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.iconBg} text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {feature.icon}
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-100 mb-3">{feature.title}</h3>
            <p className="text-gray-300 leading-relaxed">{feature.description}</p>
          </div>
          );
        })}
      </div>
    </section>
  );
}

