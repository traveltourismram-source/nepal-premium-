import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, MountainSnow, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth, type TravelRole } from "@/contexts/AuthContext";

const ROLES: { value: TravelRole; label: string; icon: string }[] = [
  { value: "solo-trekker", label: "Solo Trekker", icon: "🥾" },
  { value: "couple",       label: "Couple",       icon: "💑" },
  { value: "family",       label: "Family",        icon: "👨‍👩‍👧" },
  { value: "group-tour",   label: "Group Tour",    icon: "🚌" },
  { value: "photographer", label: "Photographer",  icon: "📷" },
  { value: "pilgrim",      label: "Pilgrim",       icon: "🙏" },
];

function PwStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number",    ok: /\d/.test(password) },
    { label: "Symbol",    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const cols  = ["bg-destructive","bg-orange-500","bg-amber-400","bg-emerald-500","bg-emerald-500"];
  const labels= ["","Weak","Fair","Good","Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 grid gap-1.5">
      <div className="flex items-center gap-1">
        {[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i<score ? cols[score] : "bg-border"}`} />)}
        <span className="ml-2 text-xs text-muted-foreground">{labels[score]}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            <CheckCircle2 className="h-3 w-3" />{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const [, navigate] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [role,      setRole]      = useState<TravelRole>("solo-trekker");
  const [newsletter, setNewsletter] = useState(true);
  const [terms,     setTerms]     = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) { toast.error("Fill in all required fields."); return; }
    if (!terms)           { toast.error("Please accept the terms."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    try { await signup({ firstName, lastName, email, password, role, newsletter }); toast.success("Account created! Welcome."); navigate("/"); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full" style={{ background: "radial-gradient(circle, oklch(0.64 0.18 46 / 0.09) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, oklch(0.60 0.13 220 / 0.09) 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-[440px]">
        <div className="rounded-2xl border border-border bg-card/90 p-8 shadow-float backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center gap-3">
            <a href="/#/" className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <MountainSnow className="h-6 w-6" />
            </a>
            <div className="text-center">
              <h1 className="font-display text-3xl">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Free forever. No credit card.</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 gap-2 rounded-xl" onClick={() => {
                const backend = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
                window.location.href = `${backend}/api/auth/google`;
              }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </Button>
            <Button variant="outline" className="h-11 gap-2 rounded-xl" onClick={() => toast.info("Connect Facebook OAuth")}>
              <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </Button>
          </div>

          <div className="relative mb-6"><Separator /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">or with email</span></div>

          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">First name</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Aarav" className="h-11 pl-9 rounded-xl" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Last name</Label>
                <Input placeholder="Sharma" className="h-11 rounded-xl" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" placeholder="you@example.com" className="h-11 pl-9 rounded-xl" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showPw ? "text" : "password"} placeholder="••••••••" className="h-11 pl-9 pr-10 rounded-xl" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PwStrength password={password} />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">I'm travelling as…</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`rounded-xl border px-2 py-2 text-center text-xs transition-all ${role === r.value ? "border-primary bg-primary/10 font-bold text-foreground" : "border-border text-muted-foreground hover:border-primary/35"}`}>
                    <div className="mb-0.5 text-base">{r.icon}</div>{r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2.5">
              <div className="flex items-start gap-2.5">
                <Checkbox id="nl" checked={newsletter} onCheckedChange={v => setNewsletter(!!v)} className="mt-0.5" />
                <Label htmlFor="nl" className="cursor-pointer text-sm font-normal leading-snug text-muted-foreground">Send me Nepal travel tips and route updates (max 1/week)</Label>
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox id="terms" checked={terms} onCheckedChange={v => setTerms(!!v)} className="mt-0.5" />
                <Label htmlFor="terms" className="cursor-pointer text-sm font-normal leading-snug text-muted-foreground">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </Label>
              </div>
            </div>

            <Button type="submit" className="h-12 rounded-xl text-base font-bold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create free account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}<a href="/#/login" className="font-semibold text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
