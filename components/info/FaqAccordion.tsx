const entries = [
  ["How do I place an order?", "Choose a Product or Look, select the available color and size, add it to your cart and continue to checkout. Enter your delivery details, choose your Wilaya and delivery mode, then confirm your order."],
  ["Do I need an account to order?", "No. You can place an order as a guest. Creating an account makes it easier to access your orders, Favorites and RUN CLUB activity."],
  ["How can I pay?", "Payment is currently Cash on Delivery (COD). You pay the order total when your delivery is received."],
  ["How much does delivery cost?", "Delivery depends on your Wilaya and whether you choose Home Delivery or Stop Desk. The exact price appears at checkout as soon as you select your Wilaya and delivery mode."],
  ["Can I change or cancel my order?", "If your order is still eligible for editing or cancellation, the available action will appear on your Order page. If you need help, contact us as soon as possible before the order is shipped."],
  ["Can I return or exchange an item?", "Contact us within 4 business days of delivery. The item should be unused and in its original condition. We will review the request and explain the next steps. This does not limit rights available under applicable Algerian law."],
  ["What is an Ensemble / Look?", "A Look combines multiple 213 RUN pieces into one outfit. On the Look page you can select the available color and size for each included item before adding the complete Look to your cart."],
  ["What is 213 RUN CLUB?", "RUN CLUB is the 213 RUN community space. You can submit your run proof according to the monthly rules. Approved entries may appear publicly when the required consent has been provided."],
] as const;
export function FaqAccordion() { return <div className="faqAccordion">{entries.map(([question, answer], index) => <details key={question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<i aria-hidden="true">+</i></summary><p>{answer}</p></details>)}</div>; }
