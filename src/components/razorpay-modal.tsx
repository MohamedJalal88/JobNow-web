import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, CheckCircle2, Loader2 } from "lucide-react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
import { supabase } from "@/lib/supabase";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txId: string) => void;
  amount: number;
  jobTitle: string;
}

export function RazorpayModal({ isOpen, onClose, onSuccess, amount, jobTitle }: RazorpayModalProps) {
  const [status, setStatus] = React.useState<"idle" | "processing" | "success">("idle");
  const [error, setError] = React.useState("");
  const rzpRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && status === "idle") {
      initiateRazorpay();
    }
  }, [isOpen]);

  const initiateRazorpay = async () => {
    setError("");
    setStatus("processing");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first");

      const orderData = await (createRazorpayOrder as any)({
        data: { amount, accessToken: session.access_token }
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JobNow",
        description: jobTitle,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verification = await (verifyRazorpayPayment as any)({
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                accessToken: session.access_token,
              }
            });

            if (verification.success) {
              setStatus("success");
              setTimeout(() => {
                onSuccess(response.razorpay_payment_id);
                setStatus("idle");
                onClose();
              }, 1200);
            } else {
              setError("Payment signature verification failed");
              setStatus("idle");
            }
          } catch (err) {
            setError("Payment verification error");
            setStatus("idle");
          }
        },
        prefill: {
          name: session.user.user_metadata?.name || "JobNow User",
          email: session.user.email || "",
          contact: session.user.user_metadata?.phone || "",
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function() {
            setStatus("idle");
            onClose();
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzpRef.current = rzp;
      rzp.on("payment.failed", function (response: any) {
        setError(response.error.description);
        setStatus("idle");
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to initiate payment");
      setStatus("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border shadow-elegant z-10"
        >
          <div className="bg-primary/5 p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary grid place-items-center text-primary-foreground text-xs font-bold font-mono">
                R
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">Razorpay Secure</h3>
                <p className="text-[10px] text-muted-foreground">JobNow Escrow Services</p>
              </div>
            </div>
            {status !== "processing" && (
              <button
                onClick={() => { setStatus("idle"); onClose(); }}
                className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="p-6 text-center">
            {error ? (
              <div className="py-6">
                <p className="text-destructive font-semibold mb-4">{error}</p>
                <button
                  onClick={initiateRazorpay}
                  className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-soft"
                >
                  Retry Payment
                </button>
              </div>
            ) : status === "success" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="h-12 w-12 rounded-full bg-success/10 text-success grid place-items-center mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="font-extrabold text-base text-success">Escrow Funded!</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Transaction verified. Wages are locked securely.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <h4 className="font-bold text-base">Connecting to Razorpay...</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Please do not close this window.
                </p>
              </div>
            )}
          </div>

          <div className="bg-muted/40 p-4 border-t border-border flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" /> Secure SSL 256-Bit Escrow Protection
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
