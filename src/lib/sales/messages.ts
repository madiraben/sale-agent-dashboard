/**
 * Multilingual bot messages
 * Detects language from user text and returns appropriate message
 */

function hasKhmerScript(text: string): boolean {
  return /[\u1780-\u17FF]/.test(text);
}

export function getGreetingMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "សួស្តី! 😊 ខ្ញុំនៅទីនេះដើម្បីជួយអ្នកទិញទំនិញ។ អ្នកអាចធ្វើបាន:\n• សួរអំពីផលិតផលរបស់យើង\n• ធ្វើការបញ្ជាទិញ\n• ទទួលបានការណែនាំផលិតផល\n\nតើអ្នកចង់ធ្វើអី?";
  }
  return "Hello! 😊 I'm here to help you shop. You can:\n• Ask about our products\n• Place an order\n• Get product recommendations\n\nWhat would you like to do?";
}

export function getEmptyCartMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "កន្ត្រករបស់អ្នកទទេ! តើអ្នកចង់ធ្វើការបញ្ជាទិញអ្វី?";
  }
  return "Your cart is empty! What would you like to order?";
}

export function getCartConfirmMessage(userText: string, cartDisplay: string): string {
  if (hasKhmerScript(userText)) {
    return `ល្អណាស់! 😊 សូមពិនិត្យមើលការបញ្ជាទិញរបស់អ្នក:\n\n${cartDisplay}\n\nតើត្រូវហើយទេ? ឆ្លើយ "បាទ/ចាស" ដើម្បីបញ្ជាក់ ឬ "ទេ" ដើម្បីកែប្រែ។`;
  }
  return `Perfect! 😊 Let me confirm your order:\n\n${cartDisplay}\n\nIs this correct? Reply "yes" to confirm or "no" to modify.`;
}

export function getCartAddedMessage(userText: string, cartDisplay: string): string {
  if (hasKhmerScript(userText)) {
    return `អេ! បានបន្ថែមក្នុងកន្ត្រករួច 🎉\n\n${cartDisplay}\n\nតើចង់:\n• បន្ថែមទំនិញបន្ថែម\n• ចេញទិញ (និយាយថា "ចេញទិញ")\n• កែប្រែកន្ត្រក`;
  }
  return `Great! I've added those items to your cart 🎉\n\n${cartDisplay}\n\nWould you like to:\n• Add more items\n• Proceed to checkout (say "checkout")\n• Modify your cart`;
}

export function getProductNotFoundMessage(userText: string, productNames: string[]): string {
  if (hasKhmerScript(userText)) {
    return `សូមទោស! ខ្ញុំរកមិនឃើញផលិតផល "${productNames.join('", "')}" ទេ។ តើអាចពណ៌នាម្តងទៀតបានទេ? ឬសួរថា "មានផលិតផលអ្វីខ្លះ?"`;
  }
  return `Sorry! I couldn't find any products matching "${productNames.join('", "')}". Could you try describing them differently? Or ask me "what products do you have?"`;
}

export function getOrderSuccessMessage(userText: string, orderId: string, total: number, itemCount: number, name: string, contact: string): string {
  if (hasKhmerScript(userText)) {
    return `🎉 បានបញ្ជាក់! ការបញ្ជាទិញ #${orderId}\n\nសរុប: $${total.toFixed(2)}\nទំនិញ: ${itemCount}\n\nអរគុណ ${name}! យើងនឹងទាក់ទងអ្នកនៅ ${contact}\n\nតើមានអីឱ្យជួយទៀតទេ?`;
  }
  return `🎉 Perfect! Order #${orderId} created successfully!\n\nTotal: $${total.toFixed(2)}\nItems: ${itemCount}\n\nThank you ${name}! We'll reach out to you at ${contact}\n\nAnything else I can help with?`;
}

export function getAskContactMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "ដើម្បីបញ្ចប់ការបញ្ជាទិញ ខ្ញុំត្រូវការព័ត៌មានទំនាក់ទំនងរបស់អ្នក។\n\nឈ្មោះអ្នកគឺអី?";
  }
  return "Great! To complete your order, I'll need your contact information.\n\nWhat's your name?";
}

export function getAskNameMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "ឈ្មោះអ្នកគឺអី?";
  }
  return "What's your name?";
}

export function getAskPhoneMessage(userText: string, name: string): string {
  if (hasKhmerScript(userText)) {
    return `អរគុណ ${name}! 😊 តើមធ្យោបាយល្អបំផុតក្នុងការទាក់ទងអ្នកគឺអី? សូមផ្តល់លេខទូរសព្ទរបស់អ្នក។`;
  }
  return `Thanks ${name}! 😊 What's the best way to reach you? Please provide your phone number.`;
}

export function getAskAddressMessage(userText: string, name: string): string {
  if (hasKhmerScript(userText)) {
    return `ល្អណាស់! 😊 តើយើងគួរដឹកជញ្ជូនទៅកាន់អាស័យដ្ឋានណា ${name}? សូមផ្តល់អាស័យដ្ឋានពេញលេញរបស់អ្នក។`;
  }
  return `Perfect! 😊 Where should we deliver the order, ${name}? Please provide your full delivery address.`;
}

export function getCancelMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "បានលុបចោលការបញ្ជាទិញ។ កន្ត្រករបស់អ្នកត្រូវបានសម្អាត។ តើមានអីឱ្យខ្ញុំជួយទៀតទេ?";
  }
  return "Order cancelled. Your cart has been cleared. Can I help you with something else?";
}

export function getModifyCartMessage(userText: string, cartDisplay: string): string {
  if (hasKhmerScript(userText)) {
    return `កន្ត្រកបច្ចុប្បន្ន:\n\n${cartDisplay}\n\nតើចង់ប្តូរអី? អ្នកអាច:\n• បន្ថែមទំនិញបន្ថែម\n• ដកទំនិញចេញ\n• ប្តូរបរិមាណ`;
  }
  return `Current cart:\n\n${cartDisplay}\n\nWhat would you like to change? You can:\n• Add more products\n• Remove items\n• Change quantities`;
}

export function getConfirmContactMessage(userText: string, name: string, contact: string): string {
  if (hasKhmerScript(userText)) {
    return `ខ្ញុំមានព័ត៌មានរបស់អ្នក:\n\nឈ្មោះ: ${name}\nទំនាក់ទំនង: ${contact}\n\nតើត្រូវទេ? (បាទ/ទេ)`;
  }
  return `I have your info on file:\n\nName: ${name}\nContact: ${contact}\n\nIs this still correct? (yes/no)`;
}

export function getUpdateContactMessage(userText: string): string {
  if (hasKhmerScript(userText)) {
    return "មិនអីទេ! តោះធ្វើបច្ចុប្បន្នភាពព័ត៌មានរបស់អ្នក។\n\nឈ្មោះអ្នកគឺអី?";
  }
  return "No problem! Let's update your information.\n\nWhat's your name?";
}

