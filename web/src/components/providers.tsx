"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useState } from "react";

interface ToastContextValue {
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3200);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={{ notify }}>
        {children}
        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 rounded-xl border border-[#d6cbf7] bg-[#29213d] px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            {toast}
          </div>
        ) : null}
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
