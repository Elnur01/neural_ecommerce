"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useCartStore } from "@/lib/store";
import type { Product, Review } from "@/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get<Product>(`/products/${id}`);
      setProduct(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data } = await api.get<Review[]>(`/reviews/product/${id}`);
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    await addToCart(product.product_id, qty);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    try {
      await api.post("/reviews", { product_id: product.product_id, rating: reviewRating, text: reviewText });
      setReviewText("");
      setReviewRating(5);
      fetchReviews();
      fetchProduct(); // refresh avg_rating
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse grid md:grid-cols-2 gap-12">
          <div className="aspect-square rounded-2xl" style={{ background: "var(--surface-raised)" }} />
          <div className="space-y-4">
            <div className="h-8 rounded-lg w-3/4" style={{ background: "var(--border)" }} />
            <div className="h-6 rounded-lg w-1/2" style={{ background: "var(--border)" }} />
            <div className="h-20 rounded-lg" style={{ background: "var(--border)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Product not found</h1>
        <Link href="/shop" className="btn btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const effectivePrice = product.price * (1 - product.discount_rate);
  const hasDiscount = product.discount_rate > 0;
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(product.avg_rating));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        <Link href="/shop" className="hover:underline" style={{ color: "var(--primary)" }}>Shop</Link>
        <span>/</span>
        <Link href={`/shop?category=${product.category}`} className="hover:underline" style={{ color: "var(--primary)" }}>{product.category}</Link>
        <span>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{product.name}</span>
      </nav>

      {/* Product grid */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* Image or Placeholder */}
        {product.image_urls && product.image_urls.length > 0 ? (
          <img
            src={product.image_urls[0]}
            alt={product.name}
            className="w-full h-full object-cover rounded-2xl"
            style={{ border: "1px solid var(--border)" }}
          />
        ) : (
          <div className="aspect-square rounded-2xl flex items-center justify-center text-8xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            {product.category === "Phones" && "📱"}
            {product.category === "Laptops" && "💻"}
            {product.category === "Headphones" && "🎧"}
            {product.category === "Smartwatches" && "⌚"}
            {product.category === "Cameras" && "📷"}
            {product.category === "Accessories" && "🎮"}
          </div>
        )}

        {/* Details */}
        <div>
          <span className="badge badge-primary mb-3">{product.category}</span>
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-0.5">
              {stars.map((filled, i) => (
                <svg key={i} className="w-5 h-5" fill={filled ? "#F59E0B" : "#E5E7EB"} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {product.avg_rating.toFixed(1)} ({product.review_count} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {effectivePrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
            </span>
            {hasDiscount && (
              <>
                <span className="text-xl line-through" style={{ color: "var(--text-muted)" }}>
                  {product.price.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                </span>
                <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "var(--error)" }}>
                  Save {Math.round(product.discount_rate * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {product.description}
          </p>

          {/* Add to cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 text-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer" style={{ color: "var(--text-secondary)" }}>−</button>
              <span className="px-4 py-3 font-semibold min-w-[48px] text-center" style={{ color: "var(--text-primary)" }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3 text-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer" style={{ color: "var(--text-secondary)" }}>+</button>
            </div>
            <button onClick={handleAddToCart} disabled={adding} className="btn btn-accent btn-lg flex-1">
              {adding ? "Adding..." : added ? "✓ Added to Cart" : "Add to Cart"}
            </button>
          </div>

          {/* Stock info */}
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {product.stock_simulated > 0 ? `✓ In stock (${product.stock_simulated} units)` : "Out of stock"}
          </p>
        </div>
      </div>

      {/* Reviews section */}
      <section id="reviews">
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
          Reviews ({reviews.length})
        </h2>

        {/* Write review */}
        <form onSubmit={handleSubmitReview} className="card p-6 mb-8">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Write a Review</h3>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setReviewRating(star)} className="text-2xl transition-transform hover:scale-125">
                {star <= reviewRating ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience..."
            className="input mb-4"
            rows={3}
            style={{ resize: "vertical" }}
          />
          <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>

        {/* Review list */}
        {reviews.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.review_id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} className="w-4 h-4" fill={i < review.rating ? "#F59E0B" : "#E5E7EB"} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                {review.text && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{review.text}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
