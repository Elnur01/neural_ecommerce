"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Product, ProductListResponse } from "@/types";

export default function AdminImageUploadPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ProductListResponse>("/products?page_size=100");
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (productId: string, file: File) => {
    setUploading(prev => ({ ...prev, [productId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await api.post(`/products/${productId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert("Image uploaded successfully!");
      fetchProducts(); // Refresh to show new image count
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      setUploading(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin: Product Image Management</h1>
      
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.product_id} className="card p-4 border">
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Category: {product.category}</p>
              
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {product.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                ))}
                {product.image_urls.length === 0 && (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                    No img
                  </div>
                )}
              </div>
              
              <label className="btn btn-secondary w-full text-center cursor-pointer">
                {uploading[product.product_id] ? "Uploading..." : "Upload Image"}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden"
                  disabled={uploading[product.product_id]}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(product.product_id, file);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
