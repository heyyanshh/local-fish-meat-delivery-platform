export const metadata = { title: "Frequently asked questions" };
const questions = [
  ["How is my order prepared?", "You choose the weight and available preparation style. In a live store, the partner counter prepares it after the order is confirmed."],
  ["When will my order arrive?", "Choose from the delivery windows shown at checkout. In the current preview, windows and availability are samples; live booking requires PostgreSQL and configured service areas."],
  ["Can I change an order?", "Contact the store before preparation begins. The sample experience does not yet provide customer cancellation or returns."],
  ["Does checkout charge my card?", "No. This build uses cash-on-delivery only for the live backend. Demo checkout stores a sample order in this browser and does not arrange delivery or take payment."],
];
export default function Page() { return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> A FEW HELPFUL THINGS</div><h1 className="page-title">Good questions.<br /><em>Clear answers.</em></h1><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></main>; }
