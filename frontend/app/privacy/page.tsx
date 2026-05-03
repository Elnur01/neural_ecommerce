import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-slide-up">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>Privacy Policy</h1>
      
      <div className="space-y-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>1. Data Collection and Usage</h2>
        <p>
          The Neural E-commerce Research Platform is an academic simulation designed to study digital shopping behaviors. 
          When you register and use the site, we collect specific demographic data (such as age, gender, and city) and sequential behavioral data (such as clicks, time on page, scrolling depth, and simulated purchases).
        </p>
        <p>
          This data is used solely to construct datasets for academic research.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>2. Anonymization and Security</h2>
        <p>
          All collected data is strictly anonymized prior to any analysis or publication. 
          The email address you provide during signup is used only for authentication purposes and to maintain the integrity of your session. It will not be shared, sold, or published.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>3. Cookies and Local Storage</h2>
        <p>
          We use local storage and JWT (JSON Web Tokens) to maintain your session and cart state. No third-party tracking cookies are used. Our event tracker relies on a custom implementation that sends interaction data directly to our backend.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>4. Right to Deletion</h2>
        <p>
          Because participation is voluntary, you may request that your account and all associated behavioral data be deleted from our database. To do so, please contact the research team.
        </p>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="btn btn-ghost">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
