"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { Product, ProductListResponse } from "@/types";

const CATEGORIES = ["All", "Phones", "Laptops", "Headphones", "Smartwatches", "Cameras", "Accessories"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
];

export default function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchProducts();
  }, [category, sortBy, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE, sort_by: sortBy };
      if (category !== "All") params.category = category;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get<ProductListResponse>("/products", { params });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Shop</h1>
        <p style={{ color: "var(--text-secondary)" }}>{total} products available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex flex-wrap gap-2 flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={
                category === cat
                  ? { background: "var(--primary)", color: "white" }
                  : { background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input pr-10" style={{ width: "220px" }} />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          </form>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="input" style={{ width: "180px" }}>
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-square" style={{ background: "var(--surface-raised)" }} />
              <div className="p-4 space-y-3">
                <div className="h-3 rounded-full w-16" style={{ background: "var(--border)" }} />
                <div className="h-4 rounded-full w-full" style={{ background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No products found</h3>
          <p style={{ color: "var(--text-secondary)" }}>Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => <ProductCard key={product.product_id} product={product} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn btn-ghost btn-sm">← Previous</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className="w-10 h-10 rounded-lg text-sm font-medium transition-all" style={p === page ? { background: "var(--primary)", color: "white" } : { color: "var(--text-secondary)" }}>{p}</button>
          ))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn btn-ghost btn-sm">Next →</button>
        </div>
      )}
    </div>
  );
}
