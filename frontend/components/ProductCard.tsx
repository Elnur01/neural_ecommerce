"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store";
import type { Product } from "@/types";
import { useState } from "react";

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCartStore();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const effectivePrice = product.price * (1 - product.discount_rate);
  const hasDiscount = product.discount_rate > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    await addToCart(product.product_id);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Star rating display
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(product.avg_rating));

  return (
    <Link href={`/product/${product.product_id}`} className="block group">
      <div className="card overflow-hidden h-full flex flex-col">
        {/* Image area */}
        <div className="relative aspect-square overflow-hidden" style={{ background: "var(--surface-raised)" }}>
          {/* Discount badge */}
          {hasDiscount && (
            <div
              className="absolute top-3 left-3 z-10 badge"
              style={{ background: "var(--error)", color: "white", fontSize: "11px", fontWeight: 700 }}
            >
              -{Math.round(product.discount_rate * 100)}%
            </div>
          )}

          {/* Placeholder product icon */}
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
            {product.category === "Phones" && "📱"}
            {product.category === "Laptops" && "💻"}
            {product.category === "Headphones" && "🎧"}
            {product.category === "Smartwatches" && "⌚"}
            {product.category === "Cameras" && "📷"}
            {product.category === "Accessories" && "🎮"}
          </div>

          {/* Quick add button */}
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            style={{ background: added ? "var(--success)" : "var(--primary)", boxShadow: "var(--shadow-md)" }}
          >
            {adding ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : added ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Category */}
          <span className="text-xs font-medium mb-1" style={{ color: "var(--primary)" }}>
            {product.category}
          </span>

          {/* Name */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors" style={{ color: "var(--text-primary)" }}>
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            {stars.map((filled, i) => (
              <svg key={i} className="w-3.5 h-3.5" fill={filled ? "#F59E0B" : "#E5E7EB"} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
              ({product.review_count})
            </span>
          </div>

          {/* Price */}
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {effectivePrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
            </span>
            {hasDiscount && (
              <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                {product.price.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
