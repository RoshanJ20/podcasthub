/**
 * Provides the per-request CSP nonce to client components that need to
 * stamp it onto inline content they render (e.g. `@base-ui/react`'s
 * Slider, which emits a server-rendered prehydration `<script>`).
 *
 * The nonce is generated in `middleware.ts`, read in `app/layout.tsx`
 * via `headers()`, and passed into this provider as a prop. Consumers
 * use the `useNonce()` hook to read it.
 *
 * @example
 * const nonce = useNonce();
 * <SliderPrimitive.Thumb nonce={nonce} ... />
 */
'use client';

import { createContext, useContext, type ReactNode } from 'react';

const NonceContext = createContext<string | undefined>(undefined);

interface NonceProviderProps {
  nonce: string | undefined;
  children: ReactNode;
}

export function NonceProvider({ nonce, children }: NonceProviderProps) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/** Returns the per-request CSP nonce, or undefined if not yet provided. */
export function useNonce(): string | undefined {
  return useContext(NonceContext);
}
