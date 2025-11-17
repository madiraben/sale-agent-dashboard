interface FAQSectionProps {
  isVisible: boolean;
}

export function FAQSection({ isVisible }: FAQSectionProps) {
  const faqs = [
    {
      question: "How do I get started (overview)?",
      answer:
        "Quick start: 1) Connect your Facebook Page or Telegram Bot via BotFather token; 2) Index your website or upload images/text for RAG; 3) Publish the bot and monitor conversations in the dashboard. Each step includes guided prompts and helpful validation.",
      icon: (
        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      iconBg: "from-cyan-400 to-cyan-600",
      borderHover: "hover:border-cyan-300",
    },
    {
      question: "How do I connect my Facebook Page?",
      answer:
        "In the dashboard go to Connectors → Facebook. Follow the OAuth flow to grant Page access and paste the generated Page token. We only request messaging permissions; tokens are stored encrypted. After connecting, test by sending a message to your Page.",
      icon: (
        <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      ),
      iconBg: "from-purple-400 to-purple-600",
      borderHover: "hover:border-purple-300",
    },
    {
      question: "How do I connect Telegram (BotFather)?",
      answer:
        "Create a bot with BotFather on Telegram, copy the API token, then go to Connectors → Telegram and paste the token. We'll validate the token and show a test chat option. Tokens are encrypted at rest.",
      icon: (
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      ),
      iconBg: "from-teal-400 to-teal-600",
      borderHover: "hover:border-teal-300",
    },
    {
      question: "How does RAG indexing work (images & text)?",
      answer:
        "We extract text and image embeddings from the pages or uploads you select, then store them in a vector index. During chats we retrieve relevant passages/images and use them to ground responses, improving accuracy for product details and visual queries.",
      icon: (
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      iconBg: "from-cyan-400 to-purple-600",
      borderHover: "hover:border-cyan-300",
    },
    {
      question: "Does the bot support Khmer and English?",
      answer:
        "Yes — responses and templates support Khmer and English. You can author templates in either language and the agent will reply in the language detected from the user or per-channel settings.",
      icon: (
        <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      ),
      iconBg: "from-purple-400 to-purple-600",
      borderHover: "hover:border-purple-300",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We follow industry best practices including SOC 2 Type II compliance, end-to-end encryption, and regular security audits. You maintain full control with options to restrict, export, or delete your data at any time. We never share your data with third parties.",
      icon: (
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      ),
      iconBg: "from-teal-400 to-teal-600",
      borderHover: "hover:border-teal-300",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes, you can cancel your subscription at any time with no penalties or hidden fees. Your account will remain active until the end of your current billing period. We also offer a 14-day money-back guarantee if you're not satisfied.",
      icon: (
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      iconBg: "from-cyan-400 to-purple-600",
      borderHover: "hover:border-cyan-300",
    },
  ];

  return (
    <section
      id="faq"
      data-animate
      className={`mt-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100">Frequently Asked Questions</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Everything you need to know about our AI sales agent.
        </p>
      </div>

      <div className="mt-16 max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => {
          const darkBorderHover = 
            faq.borderHover === "hover:border-cyan-300" ? "hover:border-cyan-500" :
            faq.borderHover === "hover:border-purple-300" ? "hover:border-purple-500" :
            "hover:border-teal-500";
          
          return (
          <details
            key={index}
            className={`group rounded-2xl bg-gray-800 border-2 border-gray-700 p-6 ${darkBorderHover} hover:shadow-lg transition-all duration-300`}
          >
            <summary className="cursor-pointer font-semibold text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${faq.iconBg} text-white text-sm`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {faq.icon}
                  </svg>
                </span>
                {faq.question}
              </span>
              <svg
                className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-4 pl-11 text-gray-300 leading-relaxed">{faq.answer}</div>
          </details>
          );
        })}
      </div>
    </section>
  );
}

