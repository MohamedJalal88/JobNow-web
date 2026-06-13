import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, IndianRupee, ArrowRight, Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contractor/payments/success")({
  head: () => ({ meta: [{ title: "Payment Success — JobNow" }] }),
  component: PaymentSuccess,
});

function PaymentSuccess() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-elegant text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-primary" />
        
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="mx-auto h-20 w-20 rounded-full bg-success/10 text-success grid place-items-center mb-6"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>
        
        <h1 className="text-3xl font-extrabold mb-2">Payment Sent!</h1>
        <p className="text-muted-foreground">Your payout has been processed successfully.</p>
        
        <div className="mt-8 mb-8 p-6 rounded-2xl bg-muted/30 border border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Amount</p>
          <p className="text-4xl font-black inline-flex items-center text-primary">
            <IndianRupee className="h-7 w-7" /> 3,400
          </p>
          
          <div className="mt-6 space-y-3 pt-6 border-t border-border/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-semibold">Anil Verma</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job</span>
              <span className="font-semibold">Bathroom Plumbing</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference ID</span>
              <span className="font-mono text-xs">TXN-89342011</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow" asChild>
            <Link to="/contractor/payments">
              Back to Payments <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex gap-3">
             <Button variant="outline" className="flex-1 h-11 rounded-full gap-2">
               <Download className="h-4 w-4" /> Receipt
             </Button>
             <Button variant="outline" className="flex-1 h-11 rounded-full gap-2" asChild>
               <Link to="/contractor/active"><RefreshCcw className="h-4 w-4" /> Active Jobs</Link>
             </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
