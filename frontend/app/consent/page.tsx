"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Research Consent Form</h1>
        <p style={{ color: "var(--text-secondary)" }}>Please read the following information before proceeding.</p>
      </div>

      <div className="card p-8 space-y-6 text-sm" style={{ color: "var(--text-primary)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--primary)" }}>1. Purpose of the Study</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Welcome to the Neural E-commerce Research Platform. This simulated e-commerce environment is designed to collect data for academic research purposes. Our primary objective is to analyze shopping behavior and the relationships between demographic profiles and e-commerce interaction patterns.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--primary)" }}>2. What Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--text-secondary)" }}>
            <li><strong>Demographic Data:</strong> Information you provide during signup (e.g., age, city, gender).</li>
            <li><strong>Behavioral Data:</strong> Your interactions with the site, including pages visited, time spent, scrolling depth, cart actions, and simulated checkout behavior.</li>
            <li><strong>Device Info:</strong> Basic device type inferred from your browser.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--primary)" }}>3. How Data is Used & Protected</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            All collected data is stored securely and will be strictly anonymized before analysis. No personally identifiable information (other than an email for login purposes) is shared or published. The data will only be used in aggregated formats for academic research and publication.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--primary)" }}>4. Right to Withdraw</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Your participation is entirely voluntary. You may stop participating at any time simply by leaving the site. You may also request deletion of your account and associated data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--primary)" }}>5. No Real Purchases</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Please note that this is a <strong>simulated environment</strong>. No real financial transactions will take place, and no products will be shipped. A simulated digital wallet balance is provided for your use within the platform.
          </p>
        </section>

        <div className="pt-6 mt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-0.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <div className="w-5 h-5 rounded border transition-colors peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center" style={{ borderColor: "var(--border)", backgroundColor: agreed ? "var(--primary)" : "transparent" }}>
                {agreed && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span style={{ color: "var(--text-primary)" }}>
              I have read and understood the information above. I am at least 18 years old and I voluntarily consent to participate in this research study.
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
        <Link href="/" className="btn btn-ghost">
          Decline & Return Home
        </Link>
        <button
          onClick={() => router.push("/onboarding")}
          disabled={!agreed}
          className="btn btn-accent px-8"
        >
          I Agree, Continue to Signup
        </button>
      </div>
    </div>
  );
}
