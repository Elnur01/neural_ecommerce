import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto py-8" style={{ background: "var(--surface-raised)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        <div>
          &copy; {new Date().getFullYear()} Neural E-commerce Research. For academic purposes only.
        </div>
        <div className="flex gap-6">
          <Link href="/about" className="hover:text-primary transition-colors">About the Study</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
        </div>
      </div>
    </footer>
  );
}
