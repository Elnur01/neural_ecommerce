export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        About This Research
      </h1>

      <div className="prose prose-lg space-y-6" style={{ color: "var(--text-secondary)" }}>
        <p>
          <strong style={{ color: "var(--text-primary)" }}>NeuralStore</strong> is a simulated e-commerce platform
          built for academic research on consumer behavior and sequential purchasing patterns in online shopping environments.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>What We Study</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>How demographic factors influence browsing and purchasing decisions</li>
          <li>Sequential patterns in product discovery, cart management, and checkout behavior</li>
          <li>The role of discount visibility, review engagement, and exit intent on conversion</li>
          <li>Abandonment patterns and their predictors across different user segments</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>How It Works</h2>
        <p>
          When you sign up, you receive a <strong style={{ color: "var(--primary)" }}>12,000 TL simulated credit wallet</strong>.
          This is not real money — it exists only within this platform. You can browse products, add items to your cart,
          apply coupon codes, and complete purchases just like a real e-commerce site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>Your Data</h2>
        <p>
          We collect two types of data for research purposes:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Demographic data:</strong> Age group, city tier, device type, and shopping frequency.</li>
          <li><strong>Behavioral data:</strong> Page views, scroll depth, cart interactions, and session patterns.</li>
        </ul>
        <p>
          All data is anonymized and used strictly for academic purposes. You can view exactly how your data was
          segmented on your <a href="/profile" className="underline" style={{ color: "var(--primary)" }}>Profile page</a>.
        </p>

        <div className="mt-8 p-6 rounded-xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Questions?</h3>
          <p className="text-sm">
            If you have any questions about this research or your data, please contact the research team.
            You have the right to withdraw your data at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
