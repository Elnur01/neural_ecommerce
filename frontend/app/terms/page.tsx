import Link from "next/link";

export default function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-slide-up">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>Terms of Use</h1>
      
      <div className="space-y-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>1. Purpose of the Platform</h2>
        <p>
          The Neural E-commerce Research Platform is a <strong>simulated environment</strong>. It is not a real business. 
          No physical goods exist, no real money changes hands, and no items will ever be shipped.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>2. Voluntary Participation</h2>
        <p>
          By creating an account, you agree to participate in an academic study regarding online shopping behavior. 
          Your interactions with the website will be logged and analyzed in aggregate.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>3. Simulated Transactions</h2>
        <p>
          Upon signup, your account is credited with a simulated digital balance. Any purchases made deduct from this simulated balance. 
          Do not enter any real credit card numbers or financial information anywhere on this site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>4. Code of Conduct</h2>
        <p>
          You agree not to use automated bots, scrapers, or other tools to artificially inflate interactions or disrupt the platform's stability.
          The research team reserves the right to terminate any account found to be interfering with the data collection process.
        </p>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="btn btn-ghost">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
