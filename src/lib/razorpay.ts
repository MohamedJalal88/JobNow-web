import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Safely retrieve environment variables across different runtimes (Node, Cloudflare Workers)
function getEnvVariable(name: string): string {
  // 1. Try import.meta.env first (Vite bakes VITE_* vars into the server bundle at build time)
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      // Try exact name
      if (metaEnv[name]) return metaEnv[name] as string;
      // Try with VITE_ prefix (for secrets like RAZORPAY_KEY_SECRET -> VITE_RAZORPAY_KEY_SECRET)
      if (metaEnv[`VITE_${name}`]) return metaEnv[`VITE_${name}`] as string;
    }
  } catch (e) {}

  // 2. Try Node process.env (local dev / CI build time)
  if (typeof process !== "undefined" && process.env) {
    if (process.env[name]) return process.env[name] as string;
    if (process.env[`VITE_${name}`]) return process.env[`VITE_${name}`] as string;
  }

  // 3. Try globalThis — Cloudflare Workers injects bindings at module scope
  try {
    const g = globalThis as any;
    if (g[name] && typeof g[name] === "string") return g[name] as string;
  } catch (e) {}

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
        throw new Error("Server configuration is incomplete.");
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
        throw new Error("Server configuration is incomplete.");
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
