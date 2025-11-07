# Topic Validator Test Cases

## ✅ ON-TOPIC Queries (Should Pass)

### Product Inquiries
- "What products do you have?"
- "Do you sell laptops?"
- "Show me your phones"
- "I'm looking for a shirt"
- "What's the price of this?"
- "Is this in stock?"
- "Can I see the catalog?"

### Shopping/Ordering
- "I want to buy a phone"
- "Add this to cart"
- "How do I place an order?"
- "I'd like to purchase"
- "Can I order 2 items?"
- "What's the total?"

### Product Details
- "What colors does it come in?"
- "What's the size?"
- "Tell me about this product"
- "What are the features?"
- "Do you have specifications?"
- "What's the warranty?"

### Store/Policy Questions
- "What's your return policy?"
- "Do you ship internationally?"
- "What payment methods do you accept?"
- "How long is shipping?"
- "Can I track my order?"
- "Do you offer discounts?"

---

## ❌ OFF-TOPIC Queries (Should Reject)

### General Knowledge
- "What's the capital of France?" ❌
- "Who discovered America?" ❌
- "How far is the moon?" ❌
- "What year did WW2 end?" ❌

### Weather/News
- "What's the weather today?" ❌
- "Tell me the news" ❌
- "Who won the game last night?" ❌

### Personal Advice
- "How do I fix my car?" ❌
- "What should I eat for dinner?" ❌
- "How do I cure a headache?" ❌
- "Give me relationship advice" ❌

### Politics/Religion
- "Who should I vote for?" ❌
- "What's your political opinion?" ❌
- "Tell me about religion" ❌

### Entertainment
- "Tell me a joke" ❌
- "Write me a poem" ❌
- "Sing a song" ❌
- "Tell me a story" ❌

### Homework/Academic
- "Solve this math problem" ❌
- "Write my essay" ❌
- "What's the answer to question 5?" ❌
- "Help me with homework" ❌

### Random Chit-Chat
- "How are you?" ❌
- "What's your name?" ❌
- "Do you have feelings?" ❌
- "Are you human?" ❌

---

## Expected Responses

### For Off-Topic Queries (High Confidence > 0.8):
```
I'm a shopping assistant focused on helping you find and purchase products. I can't help with that question, but I'd be happy to:

• Show you our products
• Help you place an order
• Answer questions about items in our catalog
• Assist with your shopping needs

What products are you interested in?
```

### For Off-Topic Queries (Medium Confidence 0.6-0.8):
```
I'm here to help you shop! I can assist with:

• Finding products
• Answering product questions
• Placing orders
• Checking availability

What can I help you find today?
```

---

## Implementation Notes

### Three Layers of Protection:

1. **Pattern-Based (Fast)**: 
   - Catches obvious off-topic patterns instantly
   - No API call needed
   - Patterns like "tell me a joke", "what's the weather"

2. **AI Validation (Thorough)**:
   - Uses LLM to determine if question is product-related
   - Returns confidence score (0-1)
   - Only rejects if confidence > 0.6

3. **RAG System Prompt (Final Layer)**:
   - RAG assistant itself has instructions to redirect off-topic questions
   - Acts as final safeguard if validation is bypassed

### Confidence Thresholds:
- **> 0.8**: Definitely off-topic → Strong rejection message
- **0.6 - 0.8**: Probably off-topic → Gentle redirect
- **< 0.6**: Unclear → Allow through (benefit of doubt)

### Performance:
- Pattern check: < 1ms
- AI validation: ~200-500ms
- Minimal impact on user experience
- Graceful fallback if validation fails

