import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, MapPin, Moon, Search, Settings as SettingsIcon, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";

interface TopNavProps {
  name: string;
  role: "worker" | "contractor";
  onLogout?: () => void;
}

export function TopNav({ name, role, onLogout }: TopNavProps) {
  const [dark, setDark] = useState(false);
  const nav = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof document !== "undefined") {
      setDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", next);
  }

  function handleLogout() {
    onLogout?.();
    nav({ to: "/welcome", replace: true });
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/85 backdrop-blur-xl">
      <div className="h-full px-4 md:px-6 flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{user?.location || "Sector 22, Noida"}</span>
        </div>

        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={role === "worker" ? "Search jobs, contractors, skills…" : "Search workers, jobs, applications…"}
              className="h-10 pl-10 rounded-full bg-muted/60 border-transparent focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <button
          onClick={toggleDark}
          className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>


        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 pl-1.5 pr-2 h-10 rounded-full hover:bg-muted transition-colors">
            <Avatar className="h-8 w-8 overflow-hidden">
              {user?.avatar && user.avatar.startsWith("http") ? (
                <img src={user.avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="hidden md:inline text-sm font-medium">{name.split(" ")[0]}</span>
            <ChevronDown className="hidden md:inline h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-xs text-muted-foreground capitalize">{role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={role === "worker" ? "/worker/profile" : "/contractor/profile"}>
                <User className="h-4 w-4 mr-2" /> {t("Profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={role === "worker" ? "/worker/settings" : "/contractor/settings"}>
                <SettingsIcon className="h-4 w-4 mr-2" /> {t("Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" /> {t("Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
