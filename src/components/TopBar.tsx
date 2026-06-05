import { LogIn, Menu, Moon, MountainSnow, Sun, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; href: string };

export default function TopBar({ nav }: { title?: string; tagline?: string; nav: NavItem[] }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 py-1">
      {/* Brand */}
      <a href="/#/" className="group flex items-center gap-3 shrink-0">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/8 text-white transition-all group-hover:border-amber-400/50 group-hover:bg-amber-400/12">
          <MountainSnow className="h-4.5 w-4.5" />
        </div>
        <div className="leading-none">
          <div className="text-sm font-bold tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Nepal Route
          </div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-white/45">Planner</div>
        </div>
      </a>

      {/* Desktop nav */}
      <nav className="hidden items-center md:flex" aria-label="Primary">
        {nav.map((item) => (
          <a key={item.href} href={item.href}
            className="px-3 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-white/55 transition-colors hover:text-white">
            {item.label}
          </a>
        ))}

        <div className="mx-3 h-4 w-px bg-white/15" />

        <button onClick={toggleTheme} aria-label="Toggle theme"
          className="grid h-8 w-8 place-items-center text-white/45 transition-colors hover:text-white">
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 overflow-hidden rounded-xl border-2 border-white/20 transition-colors hover:border-amber-400/60">
                <img src={user.avatar} alt={user.firstName} className="block h-8 w-8" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel>
                <div className="font-semibold">{user.firstName} {user.lastName}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/#/profile" className="cursor-pointer"><UserCircle className="mr-2 h-4 w-4" />My profile</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="ml-2 flex items-center gap-1.5">
            <a href="/#/login">
              <button className="px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase text-white/55 transition-colors hover:text-white">
                Sign in
              </button>
            </a>
            <a href="/#/signup">
              <button className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-400/12 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] uppercase text-amber-300 transition-all hover:border-amber-400 hover:bg-amber-400/20">
                <LogIn className="h-3 w-3" /> Sign up
              </button>
            </a>
          </div>
        )}
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden">
        <button onClick={toggleTheme} className="grid h-8 w-8 place-items-center text-white/45 hover:text-white transition-colors">
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        {user
          ? <a href="/#/profile"><img src={user.avatar} alt={user.firstName} className="h-8 w-8 rounded-xl border-2 border-white/20" /></a>
          : <a href="/#/login"><button className="rounded-lg border border-amber-400/60 bg-amber-400/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">Sign in</button></a>
        }
        <Sheet>
          <SheetTrigger asChild>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/60 transition-colors hover:border-white/30 hover:text-white">
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle style={{ fontFamily: "'Playfair Display', serif" }}>Nepal Route Planner</SheetTitle>
            </SheetHeader>
            <div className="mt-6 grid gap-1.5">
              {nav.map((item) => (
                <a key={item.href} href={item.href}
                  className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                  {item.label}
                </a>
              ))}
              {user ? (
                <a href="/#/profile" className="mt-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium hover:bg-secondary">
                  👤 {user.firstName}'s profile
                </a>
              ) : (
                <div className="mt-3 grid gap-2">
                  <a href="/#/login" className="rounded-xl border border-border px-4 py-3 text-center text-sm font-medium hover:bg-secondary">Sign in</a>
                  <a href="/#/signup" className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-primary/18">Create account</a>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
