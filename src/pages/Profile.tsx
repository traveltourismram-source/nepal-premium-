import { useState } from "react";
import { useLocation } from "wouter";
import { BookMarked, Calendar, LogOut, MapPin, MountainSnow, Pencil, Save, Trash2, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth, type TravelRole } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

const ROLE_LABELS: Record<TravelRole, string> = {
  "solo-trekker": "🥾 Solo Trekker",
  "couple":       "💑 Couple",
  "family":       "👨‍👩‍👧 Family",
  "group-tour":   "🚌 Group Tour",
  "photographer": "📷 Photographer",
  "pilgrim":      "🙏 Pilgrim",
};

export default function Profile() {
  const { user, logout, trips, deleteTrip, refreshTrips } = useAuth();
  const [, navigate] = useLocation();
  const [editing,    setEditing]    = useState(false);
  const [firstName,  setFirstName]  = useState(user?.firstName ?? "");
  const [lastName,   setLastName]   = useState(user?.lastName  ?? "");
  const [email,      setEmail]      = useState(user?.email     ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10"><User className="h-8 w-8 text-primary" /></div>
        <h2 className="font-display text-2xl">You're not signed in</h2>
        <p className="text-sm text-muted-foreground">Sign in to save trips and access your profile.</p>
        <div className="flex gap-3 mt-2">
          <Button className="rounded-xl" onClick={() => navigate("/login")}>Sign in</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/signup")}>Create account</Button>
        </div>
      </div>
    );
  }

  async function handleLogout() { await logout(); toast.success("Signed out."); navigate("/"); }

  async function handleSave() {
    setSaving(true);
    try {
      const patch: any = {};
      if (firstName !== user.firstName) patch.firstName = firstName;
      if (lastName  !== user.lastName)  patch.lastName  = lastName;
      if (email     !== user.email)     patch.email     = email;
      if (newPassword)                  patch.password  = newPassword;
      await authApi.updateMe(patch);
      await refreshTrips();
      toast.success("Changes saved!");
      setEditing(false); setNewPassword("");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteTrip(id: string) {
    setDeletingId(id);
    try { await deleteTrip(id); toast.success("Trip removed"); }
    catch (e: any) { toast.error(e.message); }
    finally { setDeletingId(null); }
  }

  const joined = new Date(user.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient blob */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 right-0 h-[450px] w-[450px] rounded-full" style={{ background: "radial-gradient(circle, oklch(0.64 0.18 46 / 0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Profile header */}
      <div className="relative border-b border-border bg-card/60 px-5 pb-8 pt-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <a href="/#/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <MountainSnow className="h-4 w-4" /> Nepal Route Planner
          </a>
          <div className="flex items-start gap-5">
            <img src={user.avatar} alt={user.firstName} className="h-20 w-20 rounded-2xl border-2 border-primary/25 bg-secondary object-cover shadow-lift" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl">{user.firstName} {user.lastName}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs bg-primary/10">{ROLE_LABELS[user.role]}</Badge>
                <Badge variant="secondary" className="text-xs"><Calendar className="mr-1 h-3 w-3" />Joined {joined}</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl"
              onClick={() => { setEditing(!editing); if (!editing) { setFirstName(user.firstName); setLastName(user.lastName); setEmail(user.email); } }}>
              <Pencil className="h-3.5 w-3.5" />{editing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 grid gap-5 sm:px-6">

        {/* Edit form */}
        {editing && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h3 className="font-display text-xl mb-5">Account Settings</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-sm">First name</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} className="rounded-xl" /></div>
                <div className="grid gap-1.5"><Label className="text-sm">Last name</Label><Input value={lastName}  onChange={e => setLastName(e.target.value)}  className="rounded-xl" /></div>
              </div>
              <div className="grid gap-1.5"><Label className="text-sm">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl" /></div>
              <div className="grid gap-1.5">
                <Label className="text-sm">New password <span className="font-normal text-muted-foreground">(leave blank to keep current)</span></Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="rounded-xl" />
              </div>
              <Button className="gap-2 rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}

        {/* Saved trips */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lift">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-primary" /><h3 className="font-display text-xl">Saved Trips</h3></div>
            <span className="text-xs text-muted-foreground">{trips.length} trip{trips.length !== 1 ? "s" : ""}</span>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">No saved trips yet.</div>
              <div className="mt-1 text-xs text-muted-foreground">Plan a route and save it from the planner.</div>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/")}>Go to planner</Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {trips.map(trip => (
                <div key={trip.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/40">
                  <div>
                    <div className="font-medium text-sm">{trip.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(trip.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      {trip.distanceKm ? ` · ${trip.distanceKm.toFixed(0)} km` : ""}
                      {trip.mode ? ` · ${trip.mode === "tourist-bus" ? "Bus" : trip.mode === "flight" ? "Flight" : "Private"}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs"
                      onClick={() => navigate(`/?o=${encodeURIComponent(trip.origin)}&d=${encodeURIComponent(trip.destination)}`)}>
                      Open
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTrip(trip.id)} disabled={deletingId === trip.id}>
                      {deletingId === trip.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account actions */}
        <div className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-lift">
          <h3 className="font-display text-xl text-destructive mb-1">Account Actions</h3>
          <Separator className="mb-5 mt-3" />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />Sign out
            </Button>
            <Button variant="ghost" className="gap-2 rounded-xl text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!confirm("This permanently deletes your account and all saved trips. Continue?")) return;
                try { await authApi.deleteMe(); await logout(); toast.success("Account deleted."); navigate("/"); }
                catch (e: any) { toast.error(e.message); }
              }}>
              <Trash2 className="h-4 w-4" />Delete account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
