import { Suspense } from "react";
import ShopContent from "./ShopContent";

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 rounded-lg" style={{ background: "var(--border)" }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-square" style={{ background: "var(--surface-raised)" }} />
                <div className="p-4 space-y-3">
                  <div className="h-3 rounded-full w-16" style={{ background: "var(--border)" }} />
                  <div className="h-4 rounded-full w-full" style={{ background: "var(--border)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
