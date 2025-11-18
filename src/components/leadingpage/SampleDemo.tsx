"use client";

import React, { useEffect, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time?: string;
  delay?: number;
  image?: string;
}

const demoConversations: Message[][] = [
  [
    {
      id: "1",
      role: "user",
      content: "Hello, I'm looking for a smartphone",
      time: "10:30 AM",
      delay: 1000,
    },
    {
      id: "2",
      role: "assistant",
      content:
        "Hello! I'd be happy to help you find the perfect smartphone. What's your budget range, and what features are most important to you?",
      time: "10:30 AM",
      delay: 2000,
    },
    {
      id: "3",
      role: "user",
      content: "Around $500, good camera and battery life",
      time: "10:31 AM",
      delay: 3000,
    },
    {
      id: "4",
      role: "assistant",
      content:
        "Based on your requirements, I recommend the **Samsung Galaxy A54** ($499). It features:\n\n• 50MP main camera with excellent low-light performance\n• 5000mAh battery (all-day usage)\n• 6.4\" Super AMOLED display\n• 128GB storage, expandable\n\nWould you like to place an order or see more options?",
      time: "10:31 AM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 4000,
    },
    {
      id: "5",
      role: "user",
      content: "I'd like to order the Samsung Galaxy A54.",
      time: "10:32 AM",
      delay: 3500,
    },
    {
      id: "6",
      role: "assistant",
      content:
        "Great choice! To process your order for the **Samsung Galaxy A54**, could you please provide the following information:\n\n• Your full name\n• Delivery address\n• Phone number\n\nYour details will only be used to complete your order.",
      time: "10:32 AM",
      delay: 2500,
    },
    {
      id: "7",
      role: "user",
      content:
        "Sure! My name is Dara. My address is #123, St. 271, Phnom Penh. My phone number is 0881234567.",
      time: "10:33 AM",
      delay: 4500,
    },
    {
      id: "8",
      role: "assistant",
      content:
        "Thank you, Dara! Lastly, which payment method would you prefer?\n\n• ABA transfer\n• Cash on delivery\n• Wing/TrueMoney",
      time: "10:33 AM",
      delay: 2500,
    },
    {
      id: "9",
      role: "user",
      content:
        "I'll pay with ABA transfer.",
      time: "10:34 AM",
      delay: 2000,
    },
    {
      id: "10",
      role: "assistant",
      content:
        "Perfect! Your order for the **Samsung Galaxy A54** is being processed. We will contact you at 0881234567 to confirm the delivery details. Thank you for shopping with us!",
      time: "10:34 AM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 3500,
    },
  ],
  [
    {
      id: "11",
      role: "user",
      content: "សួស្តី! តើអ្នកមានកាបូបស្បែក?",
      time: "2:15 PM",
      delay: 1000,
    },
    {
      id: "12",
      role: "assistant",
      content:
        "សួស្តី! បាទ/ចាស យើងមានកាបូបស្បែកជាច្រើនប្រភេទ។ តើអ្នកចង់បានកាបូបប្រភេទណា?",
      time: "2:15 PM",
      delay: 2000,
    },
    {
      id: "13",
      role: "user",
      content: "កាបូបស្បែកសម្រាប់ស្ត្រី",
      time: "2:16 PM",
      delay: 3000,
    },
    {
      id: "14",
      role: "assistant",
      content:
        "យើងមានកាបូបស្បែកសម្រាប់ស្ត្រីជាច្រើនម៉ូដ។ ខ្ញុំសូមណែនាំ:\n\n• **កាបូបស្បែកធម្មតា** - $45\n• **កាបូបស្បែកពិសេស** - $75\n• **កាបូបស្បែកផ្ទុកច្រើន** - $95\n\nតើអ្នកចង់មើលរូបភាពទេ?",
      time: "2:16 PM",
      delay: 4000,
    },
    {
      id: "15",
      role: "user",
      content: "បាទ/ចាស ខ្ញុំចង់មើលរូបភាពទេ",
      time: "2:17 PM",
      delay: 4000,
    },
    {
      id: "16",
      role: "assistant",
      content: "បាទ/ចាស នេះគឺជាកាបូបស្បែកធម្មតា",
      time: "2:17 PM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 4000,
    },
    {
      id: "17",
      role: "user",
      content: "ខ្ញុំចង់តាមអំពើបញ្ជាទិញ",
      time: "2:18 PM",
      delay: 2000,
    },
    {
      id: "18",
      role: "assistant",
      content:
        "អរគុណច្រើន! សម្រាប់ការបញ្ជាទិញនេះ សូមផ្តល់ឈ្មោះ អាសយដ្ឋាន និងលេខទូរស័ព្ទរបស់អ្នក។\n\nព័ត៍មានរបស់អ្នកត្រូវបានរក្សាសម្ងាត់ជាពិសេស។",
      time: "2:18 PM",
      delay: 3000,
    },
    {
      id: "19",
      role: "user",
      content: "ឈ្មោះ ម៉ានី សResidence Phnom Penh, Tel: 0967654321",
      time: "2:19 PM",
      delay: 3500,
    },
    {
      id: "20",
      role: "assistant",
      content:
        "សូមអរគុណ! តើអ្នកចង់បង់ប្រាក់ទេវិធីណាដូចជា Wing, ABA ឬ ជាយូរអាស័យដ្ឋាន?",
      time: "2:19 PM",
      delay: 2200,
    },
    {
      id: "21",
      role: "user",
      content:
        "ខ្ញុំចង់បង់តាម Wing.",
      time: "2:20 PM",
      delay: 1800,
    },
    {
      id: "22",
      role: "assistant",
      content:
        "ដ្វើរ​! ការបញ្ជាទិញរបស់អ្នកកំពុងដំណើរការ។ យើងនឹងទំនាក់ទំនងទៅលេខ 0967654321 សម្រាប់បញ្ជាក់!",
      time: "2:20 PM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 3500,
    }
  ],
  [
    {
      id: "23",
      role: "user",
      content: "I want to place an order",
      time: "11:45 AM",
      delay: 1000,
    },
    {
      id: "24",
      role: "assistant",
      content: "Great! What product would you like to order?",
      time: "11:45 AM",
      delay: 2000,
    },
    {
      id: "25",
      role: "user",
      content: "The Samsung Galaxy A54 you mentioned earlier",
      time: "11:46 AM",
      delay: 3000,
    },
    {
      id: "26",
      role: "assistant",
      content:
        "Wonderful! I just need your delivery address and phone number to continue with the order.",
      time: "11:46 AM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 3500,
    },
    {
      id: "27",
      role: "user",
      content: "My address is Toul Kork, Phnom Penh. My number is 099999999.",
      time: "11:47 AM",
      delay: 2500,
    },
    {
      id: "28",
      role: "assistant",
      content:
        "Thank you! Which payment method would you prefer?\n\n• ABA transfer\n• Cash on delivery\n• Wing/TrueMoney",
      time: "11:47 AM",
      delay: 2200,
    },
    {
      id: "29",
      role: "user",
      content: "Cash on delivery, please.",
      time: "11:47 AM",
      delay: 2000,
    },
    {
      id: "30",
      role: "assistant",
      content:
        "Your order for the **Samsung Galaxy A54** will be delivered to Toul Kork, Phnom Penh. We'll contact you at 099999999 to confirm your order. Thank you for ordering with us!",
      time: "11:48 AM",
      image: "https://static0.xdaimages.com/wordpress/wp-content/uploads/wm/2023/03/samsung-galaxy-a54-in-awesome-violet-color.png",
      delay: 3000,
    },
  ],
];

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const align = isUser ? "justify-end" : "justify-start";
  const bubble = isUser
    ? "bg-blue-700 text-white"
    : "bg-gray-700 text-gray-100";

  const renderContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${idx++}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <strong key={`b-${idx++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={`t-${idx++}`}>{text.slice(lastIndex)}</span>);
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
  };

  return (
    <div className={`flex ${align} animate-fade-in`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${bubble}`}>
        {renderContent(message.content)}
        {message.time && (
          <div className={`mt-1.5 text-xs ${isUser ? "text-white/80" : "text-gray-400"}`}>
            {message.time}
          </div>
        )}
        {message.image && (
          <div className="mt-2 flex justify-center">
            <img 
              src={message.image} 
              alt="Product image" 
              className="w-full max-w-[360px] max-h-[360px] rounded-md object-contain" 
            />
          </div>
        )}
    </div>
    </div>
  );
}

export default function SampleDemo() {
  const [currentConversation, setCurrentConversation] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const conversation = demoConversations[currentConversation];
    const timeoutIds: NodeJS.Timeout[] = [];

    const processMessage = (index: number) => {
      if (index >= conversation.length) {
        // Conversation finished, move to next after delay (loop back to start)
        const timeoutId = setTimeout(() => {
          const nextConversation = (currentConversation + 1) % demoConversations.length;
          setCurrentConversation(nextConversation);
          setMessages([]);
        }, 3000);
        timeoutIds.push(timeoutId);
        return;
      }

      const message = conversation[index];
      
      if (message.role === "assistant") {
        setShowTyping(true);
        const typingTimeout = setTimeout(() => {
          setShowTyping(false);
          setMessages((prev) => [...prev, message]);
          const nextTimeout = setTimeout(() => processMessage(index + 1), 1500);
          timeoutIds.push(nextTimeout);
        }, message.delay || 2000);
        timeoutIds.push(typingTimeout);
      } else {
        setMessages((prev) => [...prev, message]);
        const nextTimeout = setTimeout(() => processMessage(index + 1), message.delay || 2000);
        timeoutIds.push(nextTimeout);
      }
    };

    processMessage(0);

    return () => {
      timeoutIds.forEach((id) => clearTimeout(id));
      setShowTyping(false);
    };
  }, [isPlaying, currentConversation]);

  return (
    <section className="mt-24 py-16 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-teal-900/20 rounded-3xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Watch how our AI sales agent handles real customer conversations with product recommendations,
            multilingual support, and order assistance.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Chat Frame */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-700">
            {/* Chat Header */}
            <div className=" bg-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">AI Sales Agent</h3>
                  <p className="text-cyan-100 text-xs">Online • Responds instantly</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div>
                <span className="text-white text-xs">Live</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-[500px] overflow-y-auto p-6 bg-gray-900 space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {showTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-700 rounded-2xl px-4 py-3 shadow-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Controls */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                  disabled
                />
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2 text-white font-medium hover:shadow-lg transition-all"
                  disabled
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white">
                  1
                </span>
                Product Recommendations (RAG)
              </h3>
              <p className="text-gray-300 leading-relaxed">
                The AI agent retrieves product information from your website using RAG technology,
                providing accurate recommendations based on customer needs.
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white">
                  2
                </span>
                Multilingual Support
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Seamlessly handles conversations in both Khmer and English, making your business
                accessible to a wider audience.
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white">
                  3
                </span>
                Order Assistance
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Guides customers through the entire ordering process, from product selection to
                checkout, all within the chat interface.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
