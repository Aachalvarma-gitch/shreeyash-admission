"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

type ToastSeverity = "default" | "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  severity?: ToastSeverity;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastData, "id">) => void;
}

const ToastCtx = createContext<ToastContextValue | undefined>(undefined);

export function useShowToast() {
  const context = useContext(ToastCtx);
  if (!context) {
    throw new Error("useShowToast must be used within ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 max-w-sm">
        {toasts.map((t) => {
          const styles = {
            default: "border-input bg-background text-foreground",
            success: "border-green-500 bg-green-50 text-green-900",
            error: "border-red-500 bg-red-50 text-red-900",
            warning: "border-yellow-500 bg-yellow-50 text-yellow-900",
            info: "border-blue-500 bg-blue-50 text-blue-900",
          };

          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start justify-between w-full p-4 rounded-lg border shadow-lg",
                styles[t.severity || "default"]
              )}
            >
              <div className="flex-1">
                <p className="font-semibold">{t.title}</p>
                {t.description && (
                  <p className="text-sm mt-1 opacity-90">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-4 text-sm opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}