import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "worker" | "contractor";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  skill?: string;       // worker primary skill
  location?: string;
  avatar: string;       // URL or initials
  jobsDone?: number;
  rating?: number;
  latitude?: number;
  longitude?: number;
  resumeUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface LoginPayload {
  identifier: string; // phone or email
  password: string;
  role: UserRole;
}

interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  skill?: string;
  location?: string;
  experience?: string;
  latitude?: number;
  longitude?: number;
  avatar?: string;
  avatarFile?: File;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        
        // Fetch session to check if there is an active session
        // and create a skeleton user if the DB profile does not exist yet.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.id === userId) {
          setState({
            user: {
              id: userId,
              name: session.user.user_metadata?.name || "",
              email: session.user.email || "",
              phone: "", // forces completeProfile flow
              role: (session.user.user_metadata?.role as UserRole) || "worker",
              avatar: session.user.user_metadata?.avatar || "",
            },
            isLoading: false,
          });
        } else {
          setState({ user: null, isLoading: false });
        }
        return;
      }
      
      if (data) {
        setState({
          user: {
            id: data.id,
            name: data.name,
            email: data.email || "",
            phone: data.phone || "",
            role: data.role as UserRole,
            skill: data.skill || undefined,
            location: data.location || "",
            avatar: data.avatar || "",
            jobsDone: data.jobs_done ?? 0,
            rating: data.rating ? parseFloat(data.rating.toString()) : 5.0,
            latitude: data.latitude ? parseFloat(data.latitude.toString()) : undefined,
            longitude: data.longitude ? parseFloat(data.longitude.toString()) : undefined,
            resumeUrl: data.resume_url || "",
          },
          isLoading: false,
        });

        // Background sync: sync email/phone to Supabase Auth table if they exist in profile but not in Auth account
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && session.user.id === data.id) {
            const authUpdates: Record<string, any> = {};
            if (data.phone && data.phone.trim() !== "" && session.user.phone !== data.phone) {
              authUpdates.phone = data.phone;
            }
            if (data.email && data.email.trim() !== "" && session.user.email !== data.email) {
              if (!data.email.endsWith("@jobnow.com")) {
                authUpdates.email = data.email;
              }
            }
            if (Object.keys(authUpdates).length > 0) {
              supabase.auth.updateUser(authUpdates).then(({ error: syncErr }) => {
                if (syncErr) {
                  console.warn("Background auth sync failed:", syncErr.message);
                } else {
                  console.log("Background auth sync completed successfully!");
                }
              });
            }
          }
        });
      } else {
        setState({ user: null, isLoading: false });
      }
    } catch (err) {
      console.error("Exception in fetchProfile:", err);
      setState({ user: null, isLoading: false });
    }
  }, []);

  // Listen to session shifts
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setState({ user: null, isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setState({ user: null, isLoading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Login — validates against Supabase Auth using email or phone.
   */
  const login = useCallback(
    async (payload: LoginPayload) => {
      try {
        let result;
        const identifier = payload.identifier.trim();
        
        if (identifier.includes("@")) {
          // Email login
          result = await supabase.auth.signInWithPassword({
            email: identifier,
            password: payload.password,
          });

          if (result.error) {
            // Fallback: Check if this email is associated with a phone-only account in profiles
            const { data: profile, error: profileErr } = await supabase
              .from("profiles")
              .select("phone")
              .eq("email", identifier)
              .maybeSingle();

            if (profileErr) throw profileErr;

            if (profile && profile.phone && profile.phone.trim() !== "") {
              let formattedPhone = profile.phone.trim();
              if (!formattedPhone.startsWith("+")) {
                formattedPhone = formattedPhone.replace(/\D/g, "");
                formattedPhone = `+91${formattedPhone}`;
              }
              const fallbackResult = await supabase.auth.signInWithPassword({
                phone: formattedPhone,
                password: payload.password,
              });
              if (fallbackResult.error) {
                if (fallbackResult.error.message.includes("Invalid login credentials") || fallbackResult.error.status === 400) {
                  throw new Error("INCORRECT_PASSWORD");
                }
                throw fallbackResult.error;
              }
              result = fallbackResult;
            } else {
              // No fallback profile. Let's check if the email exists in profiles.
              const { data: checkProfile, error: checkErr } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", identifier)
                .maybeSingle();

              if (!checkErr && checkProfile) {
                throw new Error("INCORRECT_PASSWORD");
              }
              throw result.error;
            }
          }
        } else {
          // Phone login
          let formattedPhone = identifier;
          if (!formattedPhone.startsWith("+")) {
            formattedPhone = formattedPhone.replace(/\D/g, "");
            formattedPhone = `+91${formattedPhone}`;
          }
          
          // Try direct phone-and-password sign in (for real SMS OTP registered accounts)
          result = await supabase.auth.signInWithPassword({
            phone: formattedPhone,
            password: payload.password,
          });

          if (result.error) {
            // Fallback for mock/OAuth accounts (resolve phone via profiles to get their registered email address)
            const { data: profile, error: profileErr } = await supabase
              .from("profiles")
              .select("email")
              .eq("phone", formattedPhone)
              .maybeSingle();

            if (profileErr) throw profileErr;

            if (profile && profile.email && profile.email.trim() !== "") {
              const fallbackResult = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: payload.password,
              });
              if (fallbackResult.error) {
                if (fallbackResult.error.message.includes("Invalid login credentials") || fallbackResult.error.status === 400) {
                  throw new Error("INCORRECT_PASSWORD");
                }
                throw fallbackResult.error;
              }
              result = fallbackResult;
            } else if (profile) {
              // Account exists in profiles but has no mock email (real phone user), so throw the direct login error (e.g. wrong password)
              if (result.error.message.includes("Invalid login credentials") || result.error.status === 400) {
                throw new Error("INCORRECT_PASSWORD");
              }
              throw result.error;
            } else {
              throw new Error("No account found with this phone number. Please register first.");
            }
          }
        }

        if (result.error) throw result.error;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  /**
   * Register — signs up a new user with metadata in Supabase.
   */
  const register = useCallback(
    async (payload: RegisterPayload) => {
      try {
        let formattedPhone = payload.phone.trim();
        if (formattedPhone && !formattedPhone.startsWith("+")) {
          formattedPhone = formattedPhone.replace(/\D/g, "");
          formattedPhone = `+91${formattedPhone}`;
        }

        // Supabase requires an email or a phone for signup.
        // If email isn't provided, use a placeholder based on phone.
        const email = payload.email?.trim() || `${formattedPhone.replace("+", "")}@jobnow.com`;

        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: payload.password,
          options: {
            data: {
              name: payload.name,
              phone: formattedPhone,
              role: payload.role,
              skill: payload.skill,
              location: payload.location || "",
              avatar: payload.avatar || getInitials(payload.name),
            },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error("Registration failed.");

        let finalAvatarUrl = payload.avatar || getInitials(payload.name);

        if (payload.avatarFile) {
          try {
            const fileExt = payload.avatarFile.name.split(".").pop();
            const filePath = `${data.user.id}/avatar-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(filePath, payload.avatarFile, { cacheControl: "3600", upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from("avatars")
              .getPublicUrl(filePath);

            finalAvatarUrl = publicUrl;
          } catch (uploadErr) {
            console.error("Failed to upload avatar file during registration:", uploadErr);
          }
        }

        // Ensure profile row exists by using upsert with all details
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            name: payload.name,
            phone: formattedPhone,
            email: email,
            role: payload.role,
            latitude: payload.latitude,
            longitude: payload.longitude,
            location: payload.location || "",
            avatar: finalAvatarUrl,
          });

        if (profileError) {
          console.error("Failed to update profile coordinates during registration:", profileError);
        }
      } catch (err) {
        throw err;
      }
    },
    []
  );

  /** Logout — signs out of Supabase and clears state */
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setState({ user: null, isLoading: false });
    }
  }, []);

  /** Update specific fields on the current user */
  const updateUser = useCallback(
    async (updates: Partial<AuthUser>) => {
      if (!state.user) return;
      
      try {
        const dbUpdates: Record<string, any> = {
          id: state.user.id,
          role: updates.role !== undefined ? updates.role : state.user.role,
          name: updates.name !== undefined ? updates.name : state.user.name,
        };
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.skill !== undefined) dbUpdates.skill = updates.skill;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.jobsDone !== undefined) dbUpdates.jobs_done = updates.jobsDone;
        if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
        if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
        if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
        if (updates.resumeUrl !== undefined) dbUpdates.resume_url = updates.resumeUrl;

        const { error } = await supabase
          .from("profiles")
          .upsert(dbUpdates);

        if (error) throw error;

        // Sync phone and email to Supabase Auth (auth.users) so they can be used as login credentials
        const authUpdates: Record<string, any> = {};
        if (updates.phone !== undefined && updates.phone.trim() !== "" && updates.phone !== state.user.phone) {
          authUpdates.phone = updates.phone;
        }
        if (updates.email !== undefined && updates.email.trim() !== "" && updates.email !== state.user.email) {
          // Do not push fake mock emails (e.g. @jobnow.com) back to Supabase Auth
          if (!updates.email.endsWith("@jobnow.com")) {
            authUpdates.email = updates.email;
          }
        }

        if (Object.keys(authUpdates).length > 0) {
          const { error: authError } = await supabase.auth.updateUser(authUpdates);
          if (authError) {
            console.warn("Failed to sync credentials to Supabase Auth auth.users:", authError.message);
          }
        }

        setState((prev) => {
          if (!prev.user) return prev;
          return {
            ...prev,
            user: { ...prev.user, ...updates },
          };
        });
      } catch (err) {
        console.error("Error updating profile:", err);
        throw err;
      }
    },
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function isProfileIncomplete(user: AuthUser | null): boolean {
  if (!user) return false;
  return (
    !user.phone ||
    user.phone.trim() === "" ||
    !user.name ||
    user.name.trim() === "" ||
    !user.location ||
    user.location.trim() === "" ||
    !user.skill ||
    user.skill.trim() === ""
  );
}
