interface TestimonialsSectionProps {
  isVisible: boolean;
}

export function TestimonialsSection({ isVisible }: TestimonialsSectionProps) {
  const testimonials = [
    {
      quote:
        "Our Messenger bot started answering customers instantly — response time dropped to seconds and conversions increased across campaigns.",
      author: "Sophea Chum",
      role: "Head of Growth, eCommerce",
      initials: "SP",
      gradient: "from-cyan-100 to-cyan-50",
      avatarBg: "from-cyan-400 to-cyan-600",
    },
    {
      quote:
        "We connected our Telegram bot and it answers order questions in Khmer and English — customers love the instant, localized replies.",
      author: "Vichea Dara",
      role: "Head of Sales, Retail",
      initials: "VC",
      gradient: "from-purple-100 to-purple-50",
      avatarBg: "from-purple-400 to-purple-600",
    },
    {
      quote:
        "RAG image support helped customers find exact products from a photo — our average resolution time dropped dramatically.",
      author: "Linda Jung",
      role: "CEO, Marketplace",
      initials: "LJ",
      gradient: "from-teal-100 to-teal-50",
      avatarBg: "from-teal-400 to-teal-600",
    },
  ];

  return (
    <section
      id="testimonials"
      data-animate
      className={`mt-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100">Loved by Sales Teams</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          See what our customers are saying about their experience.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => {
          const darkGradient = 
            testimonial.gradient === "from-cyan-100 to-cyan-50" ? "from-cyan-900/40 to-gray-800" :
            testimonial.gradient === "from-purple-100 to-purple-50" ? "from-purple-900/40 to-gray-800" :
            "from-teal-900/40 to-gray-800";
          
          return (
          <div key={index} className="relative group">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${darkGradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300`}
            ></div>
            <blockquote className="relative rounded-2xl bg-gray-800 border border-gray-700 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 leading-relaxed italic">"{testimonial.quote}"</p>
              <footer className="mt-6 flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${testimonial.avatarBg} flex items-center justify-center text-white font-semibold`}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <div className="font-semibold text-gray-100 text-sm">{testimonial.author}</div>
                  <div className="text-xs text-gray-400">{testimonial.role}</div>
                </div>
              </footer>
            </blockquote>
          </div>
          );
        })}
      </div>
    </section>
  );
}

