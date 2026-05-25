"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore, useAuthStore } from "@/lib/store";

export default function Navbar() {
  const pathname = usePathname();
  const { cart, fetchCart } = useCartStore();
  const { user, fetchUser, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user & cart on mount if authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      fetchUser();
      fetchCart();
    }
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!localStorage.getItem("theme")) {
        const isDark = mediaQuery.matches;
        setTheme(isDark ? "dark" : "light");
        if (isDark) {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
    };

    const initialTheme = localStorage.getItem("theme");
    if (initialTheme) {
      setTheme(initialTheme as "light" | "dark");
    } else {
      setTheme(mediaQuery.matches ? "dark" : "light");
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About Us" },
  ];

  const isActive = (href: string) => pathname === href;

  // Don't show navbar on onboarding/login
  if (pathname === "/onboarding" || pathname === "/login") return null;

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-md"
          : "bg-white dark:bg-zinc-900"
      }`}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/shop" className="flex items-center gap-2 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--gradient-brand)" }}
            >
              N
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Neural<span style={{ color: "var(--primary)" }}>Store</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "text-white"
                    : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                }`}
                style={
                  isActive(link.href)
                    ? { background: "var(--primary)", color: "white" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: Cart + Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 cursor-pointer"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {mounted && theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M7.5 12h-2.25m13.5 0H19.5m-2.25-6.75l-1.591 1.591M8.25 15.75l-1.591 1.591m0-9l1.591 1.591m7.5 7.5l1.591 1.591M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
                </svg>
              ) : mounted && theme === "light" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <div className="w-5 h-5" />
              )}
            </button>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--text-secondary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              {itemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--accent)", fontSize: "11px" }}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            {mounted && isAuthenticated() ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ background: "var(--primary)" }}
                  >
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-medium hidden lg:inline" style={{ color: "var(--text-primary)" }}>
                    {user?.credit_balance?.toLocaleString("tr-TR")} ₺
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Logout"
                >
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </div>
            ) : mounted && !isAuthenticated() ? (
              <Link href="/consent" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            ) : (
              <div className="h-9 w-24 bg-transparent" />
            )}
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-1">
            {/* Theme Toggle (Mobile) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 cursor-pointer"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? (
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M7.5 12h-2.25m13.5 0H19.5m-2.25-6.75l-1.591 1.591M8.25 15.75l-1.591 1.591m0-9l1.591 1.591m7.5 7.5l1.591 1.591M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
                </svg>
              ) : mounted && theme === "light" ? (
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <div className="w-5.5 h-5.5" />
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ color: isActive(link.href) ? "var(--primary)" : "var(--text-secondary)" }}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/cart" onClick={() => setMobileOpen(false)} className="px-4 py-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Cart {itemCount > 0 && `(${itemCount})`}
              </Link>
              {mounted && isAuthenticated() ? (
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="px-4 py-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Profile
                </Link>
              ) : mounted && !isAuthenticated() ? (
                <Link href="/consent" onClick={() => setMobileOpen(false)} className="btn btn-primary btn-sm mx-4">
                  Get Started
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
