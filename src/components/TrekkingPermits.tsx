import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Info, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Permit = {
  name: string;
  cost: string;
  required: boolean;
  where: string;
  notes: string;
};

const PERMIT_DB: Record<string, Permit[]> = {
  everest: [
    { name: "Sagarmatha National Park Entry", cost: "NPR 3,000", required: true, where: "Monjo checkpoint", notes: "Required for all trekkers into Everest region" },
    { name: "TIMS Card (Trekkers' Information Management System)", cost: "USD 20", required: true, where: "Kathmandu TAAN office or online", notes: "Needed for EBC and most Himalayan treks" },
    { name: "Khumbu Pasang Lhamu Rural Municipality Fee", cost: "NPR 2,000", required: true, where: "Lukla or Monjo", notes: "Local conservation fee" },
  ],
  annapurna: [
    { name: "ACAP (Annapurna Conservation Area Permit)", cost: "NPR 3,000", required: true, where: "TAAN Kathmandu or Pokhara", notes: "Required for all Annapurna Circuit/Sanctuary treks" },
    { name: "TIMS Card", cost: "USD 20", required: true, where: "TAAN/NTB offices", notes: "Required for all listed trekking routes" },
    { name: "Manang or Mustang Restricted Area Permit", cost: "USD 500+ (Upper Mustang)", required: false, where: "Dept. of Immigration, Kathmandu", notes: "Only for Upper Mustang / Upper Dolpo" },
  ],
  langtang: [
    { name: "Langtang National Park Entry", cost: "NPR 3,000", required: true, where: "Park entrance gate", notes: "Required for Langtang, Gosaikunda, Helambu treks" },
    { name: "TIMS Card", cost: "USD 20", required: true, where: "TAAN offices", notes: "Standard requirement" },
  ],
  pokhara: [
    { name: "No permits required", cost: "Free", required: false, where: "N/A", notes: "Day hikes around Pokhara don't need permits. Sarangkot requires a small local fee." },
  ],
  chitwan: [
    { name: "Chitwan National Park Entry Fee", cost: "NPR 1,500 (Nepalese) / USD 25 (foreigners)", required: true, where: "Park gate at Sauraha", notes: "Per-day fee; jeep safari inside park adds extra." },
  ],
  lumbini: [
    { name: "Lumbini Development Trust Entry", cost: "NPR 200", required: true, where: "Main gate", notes: "Covers Sacred Garden access; monastery zones free" },
  ],
};

function detectRegion(dest: string): string | null {
  const d = dest.toLowerCase();
  if (d.includes("everest") || d.includes("lukla") || d.includes("namche") || d.includes("khumbu") || d.includes("ebc")) return "everest";
  if (d.includes("annapurna") || d.includes("mustang") || d.includes("jomsom")) return "annapurna";
  if (d.includes("langtang") || d.includes("gosaikunda") || d.includes("helambu")) return "langtang";
  if (d.includes("pokhara")) return "pokhara";
  if (d.includes("chitwan") || d.includes("sauraha")) return "chitwan";
  if (d.includes("lumbini")) return "lumbini";
  return null;
}

export default function TrekkingPermits({ destination }: { destination: string }) {
  const region = detectRegion(destination);

  if (!region) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Permit info is available for Everest, Annapurna, Langtang, Pokhara, Chitwan, and Lumbini.
            Enter one of these as your destination for details.
          </div>
        </div>
      </div>
    );
  }

  const permits = PERMIT_DB[region];
  const regionLabel = region.charAt(0).toUpperCase() + region.slice(1);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-foreground">
          {regionLabel} Region
        </Badge>
        <span className="text-xs text-muted-foreground">{permits.length} permit{permits.length > 1 ? "s" : ""} relevant</span>
      </div>

      {permits.map((p, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {p.required
                ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              }
              <div>
                <div className="font-semibold leading-tight text-sm">{p.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.notes}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-sm text-primary">{p.cost}</div>
              {p.required && <Badge variant="secondary" className="mt-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Required</Badge>}
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Get at: {p.where}</span>
          </div>
        </div>
      ))}

      <div className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
        <FileText className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Permit fees change yearly. Verify at{" "}
          <a href="https://www.tourism.gov.np" target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-foreground inline-flex items-center gap-0.5">
            tourism.gov.np <ExternalLink className="h-2.5 w-2.5" />
          </a>{" "}
          before your trip.
        </span>
      </div>
    </div>
  );
}
