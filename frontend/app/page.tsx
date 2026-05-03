"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--primary)" }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
            style={{ background: "var(--accent)" }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
            style={{
              background: "rgba(108,58,237,0.08)",
              color: "var(--primary)",
              border: "1px solid rgba(108,58,237,0.15)",
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
            Research Platform — Now Live
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Your Gateway to
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              Premium Tech
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Explore 60+ cutting-edge gadgets across phones, laptops, headphones, smartwatches,
            cameras, and accessories — all in a simulated shopping experience.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding" className="btn btn-accent btn-lg group">
              Start Shopping
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="/about" className="btn btn-ghost btn-lg">
              Learn About This Research
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "60+", label: "Products" },
              { value: "6", label: "Categories" },
              { value: "12K ₺", label: "Credit Wallet" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--primary)" }}>
                  {stat.value}
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="py-20 px-4" style={{ background: "var(--surface-raised)" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "var(--text-primary)" }}>
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Phones", icon: "📱" },
              { name: "Laptops", icon: "💻" },
              { name: "Headphones", icon: "🎧" },
              { name: "Smartwatches", icon: "⌚" },
              { name: "Cameras", icon: "📷" },
              { name: "Accessories", icon: "🎮" },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={`/shop?category=${cat.name}`}
                className="card p-6 text-center hover:scale-105 transition-transform cursor-pointer group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {cat.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: "var(--text-primary)" }}>
            How It Works
          </h2>
          <p className="text-center mb-12" style={{ color: "var(--text-secondary)" }}>
            Simple 3-step process with your 12,000 ₺ simulated credit wallet
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Profile",
                desc: "Quick onboarding with a few demographic questions.",
              },
              {
                step: "02",
                title: "Browse & Shop",
                desc: "Explore products, read reviews, and add to cart.",
              },
              {
                step: "03",
                title: "Checkout",
                desc: "Pay with your simulated wallet. Apply coupon codes!",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
