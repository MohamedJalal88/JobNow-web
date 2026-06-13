import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, ShieldCheck, X, CheckCircle2, ArrowRight, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txId: string) => void;
  amount: number;
  jobTitle: string;
}

export function RazorpayModal({ isOpen, onClose, onSuccess, amount, jobTitle }: RazorpayModalProps) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (method === "upi" && !upiId.includes("@")) {
      setError("Please enter a valid UPI ID (e.g. user@upi)");
      return;
    }
    if (method === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setError("Card number must be 16 digits");
        return;
      }
      if (!expiry.includes("/")) {
        setError("Expiry must be MM/YY");
        return;
      }
      if (cvv.length < 3) {
        setError("CVV must be 3 digits");
        return;
      }
    }

    setStatus("processing");

    // Simulated payment processing delay for testing/demo
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("success");
    await new Promise((r) => setTimeout(r, 1200));

    const simulatedTxId = `pay_mock_${Math.random().toString(36).substring(2, 16)}`;
    onSuccess(simulatedTxId);
    setStatus("idle");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={status === "processing" ? undefined : onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border shadow-elegant z-10"
        >
          {/* Header */}
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
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            {status === "idle" && (
              <form onSubmit={handlePay} className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Funding Amount
                    </span>
                    <h2 className="text-2xl font-black text-foreground">₹{amount.toLocaleString("en-IN")}</h2>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px] tracking-wide uppercase px-2 py-0.5">
                    Job Escrow
                  </Badge>
                </div>

                <div className="p-3 bg-muted/40 rounded-2xl text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Job:</span> {jobTitle}
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 p-1 bg-muted rounded-full">
                  <button
                    type="button"
                    onClick={() => { setMethod("upi"); setError(""); }}
                    className={`h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      method === "upi" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5" /> UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMethod("card"); setError(""); }}
                    className={`h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      method === "card" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Card
                  </button>
                </div>

                {/* Method Inputs */}
                {method === "upi" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">UPI Address</Label>
                    <Input
                      placeholder="e.g. mobile@upi or name@okaxis"
                      className="h-11 rounded-xl bg-card"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center pt-2">
                      <span className="font-bold text-success">✓</span> Simulated Instant GooglePay / PhonePe UPI lock
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Card Number</Label>
                      <Input
                        placeholder="4111 2222 3333 4444"
                        maxLength={19}
                        className="h-11 rounded-xl bg-card"
                        value={cardNumber}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "");
                          v = v.replace(/(.{4})/g, "$1 ").trim();
                          setCardNumber(v);
                        }}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Expiry</Label>
                        <Input
                          placeholder="MM/YY"
                          maxLength={5}
                          className="h-11 rounded-xl bg-card text-center"
                          value={expiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                            setExpiry(v);
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CVV</Label>
                        <Input
                          placeholder="•••"
                          type="password"
                          maxLength={3}
                          className="h-11 rounded-xl bg-card text-center"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft flex items-center justify-center gap-1.5 hover:opacity-95"
                >
                  <span>Pay ₹{amount.toLocaleString("en-IN")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {status === "processing" && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <h4 className="font-bold text-base">Processing Payment...</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Connecting to bank UPI gateway securely. Please do not close or refresh.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-success/10 text-success grid place-items-center mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="font-extrabold text-base text-success">Escrow Funded!</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Transaction verified. Wages are locked securely in trust escrow.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-muted/40 p-4 border-t border-border flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" /> Secure SSL 256-Bit Escrow Protection
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      variant === "secondary" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
    } ${className}`}>
      {children}
    </span>
  );
}
