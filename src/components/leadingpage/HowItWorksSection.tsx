interface HowItWorksSectionProps {
  isVisible: boolean;
}

export function HowItWorksSection({ isVisible }: HowItWorksSectionProps) {
  const steps = [
    {
      number: 1,
      title: "Connect",
      description:
        "Link your Facebook Page (Page token) or paste your Telegram BotFather token to authorize messaging. Permissions are requested securely — no code needed.",
      gradient: "from-cyan-100 to-cyan-50",
      border: "border-cyan-100",
      numberBg: "from-cyan-400 to-cyan-600",
    },
    {
      number: 2,
      title: "Index (RAG)",
      description:
        "Crawl and index your website content (text + images) or upload assets manually — we build a retrieval-augmented knowledge base so responses are accurate and grounded in your product data.",
      gradient: "from-teal-100 to-teal-50",
      border: "border-teal-100",
      numberBg: "from-teal-400 to-teal-600",
    },
    {
      number: 3,
      title: "Deploy",
      description:
        "Publish your bot to Messenger and Telegram, enable Khmer & English responses, test conversations, and monitor performance from the dashboard.",
      gradient: "from-purple-100 to-purple-50",
      border: "border-purple-100",
      numberBg: "from-purple-400 to-purple-600",
    },
  ];

  return (
    <section
      id="how-it-works"
      data-animate
      className={`mt-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100">How It Works</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Get your Messenger & Telegram bots live in three steps — connect, index, deploy.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
        <div className="hidden md:block absolute top-14 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-purple-500"></div>

        {steps.map((step) => {
          const darkGradient = 
            step.gradient === "from-cyan-100 to-cyan-50" ? "from-cyan-900/40 to-gray-800" :
            step.gradient === "from-teal-100 to-teal-50" ? "from-teal-900/40 to-gray-800" :
            "from-purple-900/40 to-gray-800";
          const darkBorder = 
            step.border === "border-cyan-100" ? "border-cyan-700" :
            step.border === "border-teal-100" ? "border-teal-700" :
            "border-purple-700";
          
          return (
          <div key={step.number} className="relative group">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${darkGradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300`}
            ></div>
            <div className={`relative bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border ${darkBorder}`}>
              <div className="flex justify-center">
                <div
                  className={`inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${step.numberBg} text-white text-2xl font-bold shadow-lg`}
                >
                  {step.number}
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-100 text-center">{step.title}</h3>
              <p className="mt-3 text-gray-300 text-center leading-relaxed">{step.description}</p>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

