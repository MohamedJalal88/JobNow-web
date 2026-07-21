import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Safely retrieve environment variables across different runtimes (Node, Cloudflare Workers)
function getEnvVariable(name: string): string {
  const cfEnv = (globalThis as any).__CF_ENV__;
  if (cfEnv) {
    if (cfEnv[name]) return cfEnv[name] as string;
    if (cfEnv[`VITE_${name}`]) return cfEnv[`VITE_${name}`] as string;
  }

  // Check process.env (Node / CI build time)
  if (typeof process !== "undefined" && process.env) {
    if (process.env[name]) return process.env[name] as string;
    if (process.env[`VITE_${name}`]) return process.env[`VITE_${name}`] as string;
  }

  // Check globalThis properties
  const g = globalThis as any;
  if (g[name] && typeof g[name] === "string") return g[name] as string;
  if (g[`VITE_${name}`] && typeof g[`VITE_${name}`] === "string") return g[`VITE_${name}`] as string;

  // Fallbacks to default test credentials if not configured in environment
  if (name === "VITE_RAZORPAY_KEY_ID" || name === "RAZORPAY_KEY_ID") {
    return import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SvVqspuWAEmzt1";
  }
  if (name === "RAZORPAY_KEY_SECRET" || name === "VITE_RAZORPAY_KEY_SECRET") {
    return import.meta.env.VITE_RAZORPAY_KEY_SECRET || "w7SKZrUNaRgrdDnK0VLY6u97";
  }
  if (name === "VITE_SUPABASE_URL") {
    return import.meta.env.VITE_SUPABASE_URL || "https://sfzfrutggvzdtelvrftw.supabase.co";
  }
  if (name === "VITE_SUPABASE_ANON_KEY") {
    return (
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmemZydXRnZ3Z6ZHRlbHZyZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjYzNjcsImV4cCI6MjA5NDg0MjM2N30.TGijxjDEExkEgnevb5RDw17BrWE2oicyy2gki636iR4"
    );
  }

  return "";
}

// Server function to create a Razorpay Order ID securely
export const createRazorpayOrder = createServerFn({ method: "POST" })
  // @ts-ignore - TanStack Start server fn handler type
  .handler(async (ctx: any) => {
    const data = ctx?.data as { jobId?: string; amount?: number; accessToken: string };
    try {
      const keyId = getEnvVariable("VITE_RAZORPAY_KEY_ID");
      const keySecret = getEnvVariable("RAZORPAY_KEY_SECRET");
      const supabaseUrl = getEnvVariable("VITE_SUPABASE_URL");
      const supabaseAnonKey = getEnvVariable("VITE_SUPABASE_ANON_KEY");

      if (!keyId || !keySecret || !supabaseUrl || !supabaseAnonKey) {
        const missing = [
          !keyId && "keyId",
          !keySecret && "keySecret",
          !supabaseUrl && "supabaseUrl",
          !supabaseAnonKey && "supabaseAnonKey",
        ].filter(Boolean).join(", ");
        throw new Error(`Server configuration is incomplete. Missing: ${missing}`);
      }

      // Verify user authentication
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${data.accessToken}` } }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      let finalAmount = 0;
      let receiptId = `receipt_${Date.now()}`;

      if (data.jobId) {
        // Securely fetch job details to determine the amount
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('pay_per_day, duration_days, workers_needed')
          .eq('id', data.jobId)
          .single();
          
        if (jobError || !job) {
           throw new Error("Job not found or inaccessible.");
        }
        
        finalAmount = job.pay_per_day * job.duration_days * job.workers_needed;
        receiptId = `receipt_job_${data.jobId}`;
      } else if (data.amount) {
        finalAmount = data.amount;
      } else {
        throw new Error("Missing jobId or amount");
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100), // convert to Paisa securely
          currency: "INR",
          receipt: receiptId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Razorpay order API error response:", errorText);
        throw new Error(`Razorpay order API failed: ${errorText}`);
      }

      const orderData = await response.json();
      return {
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId, // Return keyId to frontend so it knows which account to use
      };
    } catch (error) {
      console.error("Error in createRazorpayOrder server handler:", error);
      throw error;
    }
  });

// Server function to securely verify payment signatures before completing transactions
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  // @ts-ignore - TanStack Start server fn handler type
  .handler(async (ctx: any) => {
    const data = ctx?.data as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      accessToken: string;
    };
    try {
      const keySecret = getEnvVariable("RAZORPAY_KEY_SECRET");
      const supabaseUrl = getEnvVariable("VITE_SUPABASE_URL");
      const supabaseAnonKey = getEnvVariable("VITE_SUPABASE_ANON_KEY");

      if (!keySecret || !supabaseUrl || !supabaseAnonKey) {
        const missing = [
          !keySecret && "keySecret",
          !supabaseUrl && "supabaseUrl",
          !supabaseAnonKey && "supabaseAnonKey",
        ].filter(Boolean).join(", ");
        throw new Error(`Server configuration is incomplete. Missing: ${missing}`);
      }

      // Verify user authentication
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${data.accessToken}` } }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      const text = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(text)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(data.razorpay_signature)
      );
      return { success: isValid };
    } catch (error) {
      console.error("Error in verifyRazorpayPayment server handler:", error);
      throw error;
    }
  });
