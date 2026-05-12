# Czanix Boilerplate — React / Next.js

> Next.js com App Router, Server Components onde faz sentido, Client Components onde é necessário. Estado local com Zustand (simples) ou React Query (servidor). Sem over-engineering — sem under-engineering.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Reference](https://img.shields.io/badge/Czanix-Tech%20Reference-gold)](https://czanix.com/pt/stack)

---

## Estrutura

```
src/
├── app/                          # App Router (Next.js 14+)
│   ├── [locale]/                 # i18n por rota
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── orders/
│   │       ├── page.tsx          # Server Component — busca dados no servidor
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/                      # Route Handlers (API routes)
│       └── orders/
│           └── route.ts
│
├── components/
│   ├── ui/                       # Componentes atômicos reutilizáveis
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   └── features/                 # Componentes de funcionalidade
│       └── orders/
│           ├── OrderList.tsx      # Client Component — interação
│           └── OrderCard.tsx
│
├── lib/
│   ├── api/                      # Camada de acesso a dados
│   │   ├── orders.ts             # fetch com cache e revalidação
│   │   └── types.ts
│   ├── hooks/                    # Hooks customizados
│   │   └── useOrders.ts
│   └── utils/
│       └── result.ts             # Result<T> no frontend também
│
└── styles/
    └── globals.css
```

---

## Server vs Client Components — a decisão mais importante

```
Regra simples:
  Server Component (padrão): busca dados, sem interatividade, SEO
  Client Component ('use client'): useState, eventos, browser APIs

Sinais de que você precisa de Client Component:
  - onClick, onChange, onSubmit
  - useState, useEffect, useRef
  - Browser APIs (localStorage, window, navigator)
  - Animações com estado

Sinais de que você NÃO precisa de Client Component:
  - Só mostra dados
  - Busca dados de API
  - Componente de layout
```

```tsx
// app/[locale]/orders/page.tsx — Server Component
// Busca dados no servidor → SEO, performance, zero bundle no cliente
import { getOrders } from '@/lib/api/orders';
import { OrderList } from '@/components/features/orders/OrderList';

export default async function OrdersPage() {
  // Fetch no servidor — autenticação, cache e revalidação controlados
  const orders = await getOrders();

  return (
    <main>
      <h1>Meus Pedidos</h1>
      {/* OrderList é Client Component para interação */}
      <OrderList initialOrders={orders} />
    </main>
  );
}

// components/features/orders/OrderList.tsx — Client Component
'use client';

import { useState } from 'react';
import { cancelOrder } from '@/lib/api/orders';

export function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);

  async function handleCancel(orderId: string) {
    // Optimistic update
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' } : o
    ));

    const result = await cancelOrder(orderId);
    if (!result.ok) {
      // Reverte
      setOrders(initialOrders);
    }
  }

  return (
    <ul>
      {orders.map(order => (
        <li key={order.id}>
          {order.status}
          <button onClick={() => handleCancel(order.id)}>Cancelar</button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Data fetching — com cache e revalidação

```typescript
// lib/api/orders.ts
import { Result, ok, err } from './result';

// Next.js estende o fetch nativo com cache e revalidação
export async function getOrders(): Promise<Order[]> {
  const res = await fetch(`${process.env.API_URL}/orders`, {
    headers: { Authorization: `Bearer ${await getServerToken()}` },
    next: {
      revalidate: 60,    // revalida a cada 60s (ISR)
      tags: ['orders'],  // permite invalidação por tag
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function cancelOrder(orderId: string): Promise<Result<void>> {
  try {
    const res = await fetch(`${process.env.API_URL}/orders/${orderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await getClientToken()}` },
    });

    if (!res.ok) {
      const body = await res.json();
      return err(body.error ?? 'CANCEL_FAILED');
    }

    // Invalida o cache de pedidos após cancelamento
    revalidateTag('orders');
    return ok(undefined);
  } catch {
    return err('NETWORK_ERROR');
  }
}
```

---

## Metadata e SEO — automático por rota

```typescript
// app/[locale]/orders/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Meus Pedidos | Minha Loja',
    description: 'Acompanhe seus pedidos em tempo real.',
    robots: { index: false },  // páginas autenticadas não indexam
  };
}

// app/[locale]/catalog/[slug]/page.tsx — páginas públicas com SEO completo
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug);

  return {
    title: `${product.name} | Minha Loja`,
    description: product.description,
    openGraph: {
      title: product.name,
      images: [{ url: product.imageUrl }],
    },
    alternates: {
      canonical: `https://minhaloja.com/catalog/${params.slug}`,
    },
  };
}
```

---

## Monitoramento frontend

```typescript
// app/layout.tsx — monitoramento na raiz
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Core Web Vitals — o que o Google usa para ranquear
// LCP < 2.5s, FID < 100ms, CLS < 0.1
// Vercel Analytics monitora automaticamente em produção

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />       {/* eventos de uso */}
        <SpeedInsights />   {/* Core Web Vitals automático */}
      </body>
    </html>
  );
}
```

---

## Referência completa

- [czanix.com/pt/stack/backend](https://czanix.com/pt/stack/backend) — API que este frontend consome
- [czanix.com/pt/stack/devops](https://czanix.com/pt/stack/devops) — Deploy Next.js em produção

---

<div align="center">
<sub>Desenvolvido e mantido por <a href="https://czanix.com">Cesar Zanis</a> — Czanix</sub>
</div>
