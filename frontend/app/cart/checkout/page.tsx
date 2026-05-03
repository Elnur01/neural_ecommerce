"use client";

import { Suspense } from "react";
import CheckoutContent from "./CheckoutContent";

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 w-48 rounded-lg mx-auto mb-4" style={{ background: "var(--border)" }} />
        <div className="card p-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 rounded-lg" style={{ background: "var(--border)" }} />)}
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
