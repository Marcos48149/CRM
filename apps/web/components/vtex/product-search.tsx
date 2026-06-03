'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductResult {
  id: string;
  name: string;
  description: string;
  price: number;
  images: Array<{ imageUrl: string; imageLabel: string }>;
}

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    setProducts([]);
    setSearched(false);

    try {
      const { default: api } = await import('@/lib/api');
      const res = await api.get('/vtex/products', { params: { q: query.trim() } });
      setProducts(res.data as ProductResult[]);
      setSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar productos';
      setError(msg);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Buscar productos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="vtex-product-search" className="sr-only">
              Nombre del producto
            </Label>
            <Input
              id="vtex-product-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: zapatilla, remera..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {searched && !error && products.length === 0 && (
          <p className="text-sm text-slate-500">
            No se encontraron productos.
          </p>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product) => (
              <div key={product.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex gap-3">
                  {product.images && product.images.length > 0 && (
                    <img
                      src={product.images[0].imageUrl}
                      alt={product.images[0].imageLabel || product.name}
                      className="w-16 h-16 rounded object-cover bg-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).classList.add('hidden');
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {product.description || 'Sin descripción'}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      ${(product.price / 100).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
