import { MountainSnow, Heart, ArrowUpRight } from "lucide-react";

const LINKS = {
  Plan: [
    { label: "Route Planner", href: "/#/planner" },
    { label: "Destinations", href: "/#/gallery" },
    { label: "Trekking Permits", href: "/#/permits" },
    { label: "Hotel Ads", href: "/#/ads" },
  ],
  "Data & APIs": [
    { label: "OpenStreetMap", href: "https://openstreetmap.org", ext: true },
    { label: "OSRM Routing", href: "https://project-osrm.org", ext: true },
    { label: "Photon Geocoder", href: "https://photon.komoot.io", ext: true },
    { label: "Open-Meteo Weather", href: "https://open-meteo.com", ext: true },
  ],
  Contact: [
    { label: "info@nepalroute.com", href: "mailto:info@nepalroute.com" },
    { label: "+977 980-000-0000", href: "tel:+9779800000000" },
    { label: "WhatsApp us", href: "https://wa.me/9779800000000", ext: true },
    { label: "Partner with us", href: "/#/contact" },
  ],
};

export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border" style={{ background: "var(--ink, #0a0e1c)" }}>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.7fr_1fr_1fr_1fr]">

          {/* Brand block */}
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/18 text-white">
                <MountainSnow className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <div className="text-sm font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Nepal Route</div>
                <div className="mt-0.5 text-[10px] font-semibold tracking-[0.13em] uppercase text-white/38">Planner</div>
              </div>
            </div>
            <p className="mt-5 max-w-[230px] text-sm leading-relaxed text-white/42">
              Free, open-source route planner for Nepal — built for travellers, trekkers, and tourism businesses.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Free to use", "No sign-in", "OSM-powered"].map((t) => (
                <span key={t} className="rounded border border-white/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/32">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">{section}</div>
              <ul className="grid gap-2.5">
                {items.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}
                      target={"ext" in link && link.ext ? "_blank" : undefined}
                      rel={"ext" in link && link.ext ? "noreferrer" : undefined}
                      className="group inline-flex items-center gap-1 text-sm text-white/42 transition-colors hover:text-white/80">
                      {link.label}
                      {"ext" in link && link.ext &&
                        <ArrowUpRight className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-10 h-px" style={{ background: "linear-gradient(90deg, var(--saffron, #c9640e) 0%, transparent 55%)" }} />

        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-white/26">
          <div className="flex items-center gap-1.5">
            Made with <Heart className="h-2.5 w-2.5 fill-current text-rose-500/70" /> for Nepal tourism
            &nbsp;·&nbsp; © {new Date().getFullYear()} Nepal Route Planner
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>OpenStreetMap</span><span className="text-white/15">·</span>
            <span>OSRM</span><span className="text-white/15">·</span>
            <span>AI: Claude by Anthropic</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
