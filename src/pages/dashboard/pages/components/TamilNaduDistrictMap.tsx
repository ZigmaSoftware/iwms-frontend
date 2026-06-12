import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  Truck,
  AlertTriangle,
  MapPin,
  X,
  TrendingUp,
  TrendingDown,
  Recycle,
  Building2,
  Droplets,
  Shield,
  Leaf,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────

interface DistrictInfo {
  id: string;
  name: string;
  /** SVG polygon points: x=longitude, y=(14.0 – latitude) */
  points: string;
  perf: number;
  collected: number;
  target: number;
  vehicles: number;
  activeVehicles: number;
  grievances: number;
  resolved: number;
  segregationRate: number;
  localBodies: number;
  wet: number;
  dry: number;
  sanitary: number;
  special: number;
}

// ─── DISTRICT DATA ───────────────────────────────────────────────
// Coordinate system: x = longitude, y = 14.0 − latitude
// viewBox "76 0 5 6.5" → lon 76–81°E, lat 7.5–14°N

const DISTRICTS: DistrictInfo[] = [
  // ── NORTHERN COASTAL ──────────────────────────────────────────
  {
    id: "thiruvallur",
    name: "Thiruvallur",
    points: "79.25,0.35 80.0,0.35 80.0,1.0 79.6,1.05 79.25,0.95",
    perf: 82, collected: 410, target: 500, vehicles: 48, activeVehicles: 42,
    grievances: 28, resolved: 24, segregationRate: 74, localBodies: 52,
    wet: 196, dry: 131, sanitary: 49, special: 33,
  },
  {
    id: "chennai",
    name: "Chennai",
    points: "80.0,0.65 80.35,0.65 80.35,1.05 80.0,1.0",
    perf: 92, collected: 1250, target: 1350, vehicles: 85, activeVehicles: 80,
    grievances: 142, resolved: 134, segregationRate: 88, localBodies: 1,
    wet: 600, dry: 400, sanitary: 150, special: 100,
  },
  {
    id: "kancheepuram",
    name: "Kancheepuram",
    points: "79.55,1.0 80.0,1.0 80.0,1.5 79.55,1.5",
    perf: 83, collected: 320, target: 385, vehicles: 36, activeVehicles: 31,
    grievances: 22, resolved: 20, segregationRate: 76, localBodies: 18,
    wet: 154, dry: 102, sanitary: 38, special: 26,
  },
  {
    id: "chengalpattu",
    name: "Chengalpattu",
    points: "79.9,1.05 80.35,1.05 80.35,1.55 79.9,1.55",
    perf: 80, collected: 290, target: 365, vehicles: 32, activeVehicles: 26,
    grievances: 19, resolved: 17, segregationRate: 72, localBodies: 22,
    wet: 139, dry: 93, sanitary: 35, special: 23,
  },
  // ── NORTHERN INLAND ────────────────────────────────────────────
  {
    id: "ranipet",
    name: "Ranipet",
    points: "79.2,0.9 79.6,0.9 79.6,1.2 79.2,1.2",
    perf: 77, collected: 185, target: 240, vehicles: 22, activeVehicles: 17,
    grievances: 14, resolved: 12, segregationRate: 68, localBodies: 15,
    wet: 89, dry: 59, sanitary: 22, special: 15,
  },
  {
    id: "vellore",
    name: "Vellore",
    points: "78.85,0.95 79.25,0.95 79.25,1.45 78.85,1.45",
    perf: 81, collected: 245, target: 305, vehicles: 30, activeVehicles: 25,
    grievances: 18, resolved: 16, segregationRate: 73, localBodies: 20,
    wet: 118, dry: 78, sanitary: 29, special: 20,
  },
  {
    id: "tirupattur",
    name: "Tirupattur",
    points: "78.45,1.15 79.0,1.15 79.0,1.7 78.45,1.7",
    perf: 70, collected: 165, target: 235, vehicles: 18, activeVehicles: 13,
    grievances: 12, resolved: 10, segregationRate: 62, localBodies: 16,
    wet: 79, dry: 53, sanitary: 20, special: 13,
  },
  {
    id: "krishnagiri",
    name: "Krishnagiri",
    points: "77.65,1.05 78.5,1.05 78.5,1.7 77.65,1.7",
    perf: 71, collected: 210, target: 295, vehicles: 25, activeVehicles: 18,
    grievances: 16, resolved: 13, segregationRate: 63, localBodies: 24,
    wet: 101, dry: 67, sanitary: 25, special: 17,
  },
  {
    id: "tiruvannamalai",
    name: "Tiruvannamalai",
    points: "78.5,1.3 79.55,1.3 79.55,2.1 78.5,2.1",
    perf: 72, collected: 220, target: 305, vehicles: 26, activeVehicles: 19,
    grievances: 17, resolved: 14, segregationRate: 64, localBodies: 28,
    wet: 106, dry: 70, sanitary: 26, special: 18,
  },
  {
    id: "villupuram",
    name: "Villupuram",
    points: "79.3,1.95 79.85,1.95 79.85,2.4 79.3,2.4",
    perf: 69, collected: 195, target: 282, vehicles: 23, activeVehicles: 16,
    grievances: 15, resolved: 12, segregationRate: 61, localBodies: 30,
    wet: 94, dry: 62, sanitary: 23, special: 16,
  },
  // ── SECOND TIER ───────────────────────────────────────────────
  {
    id: "dharmapuri",
    name: "Dharmapuri",
    points: "77.6,1.5 78.1,1.5 78.1,2.25 77.6,2.25",
    perf: 69, collected: 170, target: 245, vehicles: 20, activeVehicles: 14,
    grievances: 13, resolved: 10, segregationRate: 60, localBodies: 19,
    wet: 82, dry: 54, sanitary: 20, special: 14,
  },
  {
    id: "salem",
    name: "Salem",
    points: "77.9,1.9 78.7,1.9 78.7,2.6 77.9,2.6",
    perf: 87, collected: 520, target: 600, vehicles: 55, activeVehicles: 48,
    grievances: 35, resolved: 32, segregationRate: 81, localBodies: 8,
    wet: 250, dry: 166, sanitary: 62, special: 42,
  },
  {
    id: "kallakurichi",
    name: "Kallakurichi",
    points: "78.6,2.05 79.3,2.05 79.3,2.5 78.6,2.5",
    perf: 68, collected: 155, target: 228, vehicles: 18, activeVehicles: 12,
    grievances: 12, resolved: 9, segregationRate: 59, localBodies: 22,
    wet: 74, dry: 50, sanitary: 19, special: 12,
  },
  {
    id: "cuddalore",
    name: "Cuddalore",
    points: "79.5,2.35 79.85,2.35 79.85,2.85 79.5,2.85",
    perf: 72, collected: 200, target: 278, vehicles: 24, activeVehicles: 18,
    grievances: 16, resolved: 13, segregationRate: 64, localBodies: 25,
    wet: 96, dry: 64, sanitary: 24, special: 16,
  },
  {
    id: "nilgiris",
    name: "The Nilgiris",
    points: "76.2,2.3 77.0,2.3 77.0,2.8 76.2,2.8",
    perf: 85, collected: 145, target: 170, vehicles: 18, activeVehicles: 16,
    grievances: 9, resolved: 9, segregationRate: 82, localBodies: 6,
    wet: 70, dry: 46, sanitary: 17, special: 12,
  },
  {
    id: "erode",
    name: "Erode",
    points: "77.1,2.25 77.9,2.25 77.9,3.0 77.1,3.0",
    perf: 76, collected: 310, target: 408, vehicles: 36, activeVehicles: 28,
    grievances: 22, resolved: 18, segregationRate: 69, localBodies: 14,
    wet: 149, dry: 99, sanitary: 37, special: 25,
  },
  {
    id: "namakkal",
    name: "Namakkal",
    points: "77.6,2.6 78.4,2.6 78.4,3.0 77.6,3.0",
    perf: 73, collected: 185, target: 253, vehicles: 22, activeVehicles: 16,
    grievances: 14, resolved: 12, segregationRate: 65, localBodies: 17,
    wet: 89, dry: 59, sanitary: 22, special: 15,
  },
  // ── MIDDLE TIER ──────────────────────────────────────────────
  {
    id: "coimbatore",
    name: "Coimbatore",
    points: "76.8,2.75 77.45,2.75 77.45,3.5 76.8,3.5",
    perf: 88, collected: 845, target: 960, vehicles: 70, activeVehicles: 62,
    grievances: 55, resolved: 51, segregationRate: 84, localBodies: 12,
    wet: 406, dry: 270, sanitary: 101, special: 68,
  },
  {
    id: "tiruppur",
    name: "Tiruppur",
    points: "77.15,2.65 77.75,2.65 77.75,3.3 77.15,3.3",
    perf: 84, collected: 460, target: 548, vehicles: 48, activeVehicles: 42,
    grievances: 30, resolved: 27, segregationRate: 78, localBodies: 9,
    wet: 221, dry: 147, sanitary: 55, special: 37,
  },
  {
    id: "karur",
    name: "Karur",
    points: "77.95,2.7 78.6,2.7 78.6,3.4 77.95,3.4",
    perf: 74, collected: 175, target: 237, vehicles: 21, activeVehicles: 15,
    grievances: 13, resolved: 11, segregationRate: 66, localBodies: 10,
    wet: 84, dry: 56, sanitary: 21, special: 14,
  },
  {
    id: "perambalur",
    name: "Perambalur",
    points: "78.6,2.5 79.15,2.5 79.15,3.0 78.6,3.0",
    perf: 67, collected: 110, target: 164, vehicles: 13, activeVehicles: 9,
    grievances: 9, resolved: 7, segregationRate: 58, localBodies: 8,
    wet: 53, dry: 35, sanitary: 13, special: 9,
  },
  {
    id: "ariyalur",
    name: "Ariyalur",
    points: "79.1,2.5 79.5,2.5 79.5,3.0 79.1,3.0",
    perf: 65, collected: 95, target: 146, vehicles: 11, activeVehicles: 7,
    grievances: 8, resolved: 6, segregationRate: 56, localBodies: 7,
    wet: 46, dry: 30, sanitary: 11, special: 8,
  },
  {
    id: "tiruchirappalli",
    name: "Tiruchirappalli",
    points: "78.35,2.9 79.15,2.9 79.15,3.6 78.35,3.6",
    perf: 91, collected: 680, target: 748, vehicles: 58, activeVehicles: 53,
    grievances: 42, resolved: 39, segregationRate: 86, localBodies: 7,
    wet: 326, dry: 218, sanitary: 82, special: 54,
  },
  {
    id: "thanjavur",
    name: "Thanjavur",
    points: "78.9,2.95 79.5,2.95 79.5,3.5 78.9,3.5",
    perf: 80, collected: 310, target: 388, vehicles: 34, activeVehicles: 28,
    grievances: 21, resolved: 18, segregationRate: 73, localBodies: 16,
    wet: 149, dry: 99, sanitary: 37, special: 25,
  },
  {
    id: "mayiladuthurai",
    name: "Mayiladuthurai",
    points: "79.2,2.85 79.65,2.85 79.65,3.2 79.2,3.2",
    perf: 74, collected: 130, target: 176, vehicles: 15, activeVehicles: 11,
    grievances: 10, resolved: 8, segregationRate: 66, localBodies: 9,
    wet: 62, dry: 42, sanitary: 16, special: 10,
  },
  {
    id: "nagapattinam",
    name: "Nagapattinam",
    points: "79.55,3.0 79.9,3.0 79.9,3.45 79.55,3.45",
    perf: 75, collected: 140, target: 187, vehicles: 16, activeVehicles: 12,
    grievances: 11, resolved: 9, segregationRate: 67, localBodies: 11,
    wet: 67, dry: 45, sanitary: 17, special: 11,
  },
  {
    id: "thiruvarur",
    name: "Thiruvarur",
    points: "79.15,3.15 79.65,3.15 79.65,3.7 79.15,3.7",
    perf: 75, collected: 125, target: 167, vehicles: 15, activeVehicles: 11,
    grievances: 10, resolved: 8, segregationRate: 67, localBodies: 10,
    wet: 60, dry: 40, sanitary: 15, special: 10,
  },
  {
    id: "pudukkottai",
    name: "Pudukkottai",
    points: "78.5,3.2 79.25,3.2 79.25,3.8 78.5,3.8",
    perf: 74, collected: 160, target: 216, vehicles: 19, activeVehicles: 14,
    grievances: 12, resolved: 10, segregationRate: 66, localBodies: 14,
    wet: 77, dry: 51, sanitary: 19, special: 13,
  },
  // ── SOUTHERN TIER ────────────────────────────────────────────
  {
    id: "dindigul",
    name: "Dindigul",
    points: "77.5,3.25 78.55,3.25 78.55,3.9 77.5,3.9",
    perf: 78, collected: 270, target: 347, vehicles: 30, activeVehicles: 24,
    grievances: 19, resolved: 16, segregationRate: 71, localBodies: 20,
    wet: 130, dry: 86, sanitary: 32, special: 22,
  },
  {
    id: "madurai",
    name: "Madurai",
    points: "77.6,3.9 78.5,3.9 78.5,4.45 77.6,4.45",
    perf: 85, collected: 720, target: 848, vehicles: 62, activeVehicles: 55,
    grievances: 46, resolved: 43, segregationRate: 80, localBodies: 7,
    wet: 346, dry: 230, sanitary: 86, special: 58,
  },
  {
    id: "theni",
    name: "Theni",
    points: "77.1,3.8 77.65,3.8 77.65,4.35 77.1,4.35",
    perf: 73, collected: 155, target: 212, vehicles: 18, activeVehicles: 13,
    grievances: 12, resolved: 10, segregationRate: 65, localBodies: 12,
    wet: 74, dry: 50, sanitary: 19, special: 12,
  },
  {
    id: "sivaganga",
    name: "Sivaganga",
    points: "78.3,3.85 79.1,3.85 79.1,4.45 78.3,4.45",
    perf: 72, collected: 155, target: 215, vehicles: 18, activeVehicles: 13,
    grievances: 12, resolved: 10, segregationRate: 64, localBodies: 13,
    wet: 74, dry: 50, sanitary: 19, special: 12,
  },
  {
    id: "virudhunagar",
    name: "Virudhunagar",
    points: "77.55,4.15 78.35,4.15 78.35,4.8 77.55,4.8",
    perf: 76, collected: 210, target: 276, vehicles: 24, activeVehicles: 18,
    grievances: 15, resolved: 13, segregationRate: 69, localBodies: 16,
    wet: 101, dry: 67, sanitary: 25, special: 17,
  },
  {
    id: "ramanathapuram",
    name: "Ramanathapuram",
    points: "78.7,4.2 79.45,4.2 79.45,5.0 78.7,5.0",
    perf: 70, collected: 180, target: 257, vehicles: 21, activeVehicles: 15,
    grievances: 14, resolved: 11, segregationRate: 62, localBodies: 15,
    wet: 86, dry: 58, sanitary: 22, special: 14,
  },
  // ── DEEP SOUTH ──────────────────────────────────────────────
  {
    id: "thoothukudi",
    name: "Thoothukudi",
    points: "77.7,4.65 78.8,4.65 78.8,5.45 77.7,5.45",
    perf: 77, collected: 230, target: 299, vehicles: 26, activeVehicles: 20,
    grievances: 17, resolved: 15, segregationRate: 70, localBodies: 10,
    wet: 110, dry: 74, sanitary: 28, special: 18,
  },
  {
    id: "tirunelveli",
    name: "Tirunelveli",
    points: "77.35,5.0 77.9,5.0 77.9,5.65 77.35,5.65",
    perf: 79, collected: 290, target: 367, vehicles: 32, activeVehicles: 25,
    grievances: 21, resolved: 18, segregationRate: 72, localBodies: 8,
    wet: 139, dry: 93, sanitary: 35, special: 23,
  },
  {
    id: "tenkasi",
    name: "Tenkasi",
    points: "77.0,4.8 77.55,4.8 77.55,5.4 77.0,5.4",
    perf: 71, collected: 155, target: 218, vehicles: 18, activeVehicles: 13,
    grievances: 12, resolved: 10, segregationRate: 63, localBodies: 14,
    wet: 74, dry: 50, sanitary: 19, special: 12,
  },
  {
    id: "kanyakumari",
    name: "Kanyakumari",
    points: "76.95,5.25 77.6,5.25 77.6,6.05 76.95,6.05",
    perf: 86, collected: 195, target: 227, vehicles: 22, activeVehicles: 19,
    grievances: 13, resolved: 12, segregationRate: 83, localBodies: 6,
    wet: 94, dry: 62, sanitary: 23, special: 16,
  },
];

// ─── TN APPROXIMATE OUTLINE ──────────────────────────────────────
// Used as a visual boundary overlay
const TN_OUTLINE =
  "80.3,0.6 80.35,0.9 80.35,1.55 80.1,1.75 79.9,2.05 79.9,2.5 " +
  "79.85,2.9 79.9,3.35 79.8,3.55 79.65,3.8 79.45,4.05 79.45,5.0 " +
  "79.2,5.45 78.8,5.75 78.3,5.95 77.9,5.85 77.6,6.05 77.5,5.95 " +
  "77.2,5.75 77.0,5.45 76.9,4.95 76.8,3.55 76.8,3.05 76.4,2.82 " +
  "76.2,2.55 76.2,2.25 76.5,1.85 76.7,1.55 77.2,1.05 77.6,0.7 " +
  "78.0,0.5 78.5,0.3 79.0,0.3 79.2,0.35 79.6,0.4 79.9,0.35 80.0,0.45";

// ─── HELPERS ─────────────────────────────────────────────────────

function districtFill(perf: number, selected: boolean, hovered: boolean): string {
  if (selected) return "#2563eb";
  if (hovered) return "#0ea5e9";
  if (perf >= 90) return "#15803d";
  if (perf >= 80) return "#22c55e";
  if (perf >= 70) return "#84cc16";
  if (perf >= 60) return "#f59e0b";
  return "#ef4444";
}

function gradeLabel(perf: number): string {
  if (perf >= 90) return "A+";
  if (perf >= 80) return "A";
  if (perf >= 70) return "B";
  if (perf >= 60) return "C";
  return "D";
}

function gradeBadgeCls(perf: number): string {
  if (perf >= 90) return "bg-emerald-100 text-emerald-800 border border-emerald-300";
  if (perf >= 80) return "bg-green-100 text-green-800 border border-green-300";
  if (perf >= 70) return "bg-lime-100 text-lime-800 border border-lime-300";
  if (perf >= 60) return "bg-amber-100 text-amber-800 border border-amber-300";
  return "bg-red-100 text-red-800 border border-red-300";
}

// ─── COMPONENT ───────────────────────────────────────────────────

export default function TamilNaduDistrictMap() {
  const [selected, setSelected] = useState<DistrictInfo | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    district: DistrictInfo;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, d: DistrictInfo) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        district: d,
      });
      setHovered(d.id);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHovered(null);
  }, []);

  const handleClick = useCallback((d: DistrictInfo) => {
    setSelected((prev) => (prev?.id === d.id ? null : d));
  }, []);

  const sortedByPerf = [...DISTRICTS].sort((a, b) => b.perf - a.perf);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Tamil Nadu — District Performance Map
          </CardTitle>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-emerald-700 inline-block" />≥90% A+
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-green-500 inline-block" />80–89% A
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-lime-400 inline-block" />70–79% B
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-amber-400 inline-block" />60–69% C
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500 inline-block" />&lt;60% D
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="grid gap-4 lg:grid-cols-5">

          {/* ── SVG MAP ─────────────────────────────────────── */}
          <div className="lg:col-span-3 relative">
            <svg
              ref={svgRef}
              viewBox="76 0 5 6.5"
              className="w-full h-auto"
              style={{ maxHeight: 520 }}
              onMouseLeave={handleMouseLeave}
            >
              {/* Background / water */}
              <rect x="76" y="0" width="5" height="6.5" fill="#e0f2fe" />

              {/* TN land background */}
              <polygon
                points={TN_OUTLINE}
                fill="#f0fdf4"
                stroke="#a7f3d0"
                strokeWidth="0.015"
              />

              {/* District polygons */}
              {DISTRICTS.map((d) => (
                <polygon
                  key={d.id}
                  points={d.points}
                  fill={districtFill(d.perf, selected?.id === d.id, hovered === d.id)}
                  stroke="white"
                  strokeWidth="0.018"
                  strokeLinejoin="round"
                  opacity={selected && selected.id !== d.id ? 0.6 : 1}
                  style={{ cursor: "pointer", transition: "fill 0.15s" }}
                  onMouseMove={(e) => handleMouseMove(e, d)}
                  onClick={() => handleClick(d)}
                />
              ))}

              {/* District name labels */}
              {DISTRICTS.map((d) => {
                const pts = d.points.trim().split(/\s+/).map((p) => {
                  const [x, y] = p.split(",").map(Number);
                  return { x, y };
                });
                const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                const label =
                  d.name.length > 9 ? d.name.split(" ")[0] : d.name;
                return (
                  <text
                    key={`label-${d.id}`}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="0.085"
                    fill="white"
                    fontWeight="600"
                    style={{
                      pointerEvents: "none",
                      textShadow: "0 0 2px rgba(0,0,0,0.8)",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Outline border on top */}
              <polygon
                points={TN_OUTLINE}
                fill="none"
                stroke="#059669"
                strokeWidth="0.025"
                strokeLinejoin="round"
              />
            </svg>

            {/* ── Floating Tooltip ─────────────────────────── */}
            {tooltip && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: Math.min(tooltip.x + 12, 260),
                  top: Math.max(tooltip.y - 10, 0),
                }}
              >
                <div className="bg-background border border-border rounded-lg shadow-xl p-3 text-xs min-w-[180px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-foreground">
                      {tooltip.district.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${gradeBadgeCls(tooltip.district.perf)}`}>
                      {gradeLabel(tooltip.district.perf)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-semibold">{tooltip.district.perf}%</span>
                    </div>
                    <Progress value={tooltip.district.perf} className="h-1" />
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="font-semibold">{tooltip.district.collected} MT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grievances</span>
                      <span className="font-semibold text-amber-600">
                        {tooltip.district.grievances - tooltip.district.resolved} pending
                      </span>
                    </div>
                    <div className="pt-1 text-[10px] text-muted-foreground italic">
                      Click for detailed breakdown
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-3">

            {/* District detail panel */}
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-bold">{selected.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${gradeBadgeCls(selected.perf)}`}>
                      {gradeLabel(selected.perf)} — {selected.perf}%
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 p-2.5 bg-emerald-50/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Trash2 className="h-3 w-3 text-emerald-600" />
                      <span className="text-[11px] text-muted-foreground">Waste Collected</span>
                    </div>
                    <p className="text-base font-bold">{selected.collected} MT</p>
                    <p className="text-[11px] text-muted-foreground">of {selected.target} MT target</p>
                    <Progress
                      value={(selected.collected / selected.target) * 100}
                      className="h-1 mt-1.5"
                    />
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5 bg-blue-50/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Truck className="h-3 w-3 text-blue-600" />
                      <span className="text-[11px] text-muted-foreground">Fleet Status</span>
                    </div>
                    <p className="text-base font-bold">{selected.activeVehicles}/{selected.vehicles}</p>
                    <p className="text-[11px] text-muted-foreground">vehicles active</p>
                    <Progress
                      value={(selected.activeVehicles / selected.vehicles) * 100}
                      className="h-1 mt-1.5"
                    />
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5 bg-amber-50/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      <span className="text-[11px] text-muted-foreground">Grievances</span>
                    </div>
                    <p className="text-base font-bold text-amber-700">
                      {selected.grievances - selected.resolved}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selected.resolved}/{selected.grievances} resolved
                    </p>
                    <Progress
                      value={(selected.resolved / selected.grievances) * 100}
                      className="h-1 mt-1.5"
                    />
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5 bg-violet-50/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Recycle className="h-3 w-3 text-violet-600" />
                      <span className="text-[11px] text-muted-foreground">Segregation</span>
                    </div>
                    <p className="text-base font-bold text-violet-700">{selected.segregationRate}%</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selected.localBodies} local bodies
                    </p>
                    <Progress value={selected.segregationRate} className="h-1 mt-1.5" />
                  </div>
                </div>

                {/* Waste breakdown */}
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-semibold mb-2.5 text-foreground">Waste Type Breakdown</p>
                  <div className="space-y-2">
                    {[
                      { label: "Wet Waste", value: selected.wet, Icon: Droplets, cls: "text-emerald-600", barCls: "bg-emerald-500" },
                      { label: "Dry Waste", value: selected.dry, Icon: Recycle, cls: "text-blue-600", barCls: "bg-blue-500" },
                      { label: "Sanitary", value: selected.sanitary, Icon: Shield, cls: "text-amber-600", barCls: "bg-amber-400" },
                      { label: "Special Care", value: selected.special, Icon: Leaf, cls: "text-violet-600", barCls: "bg-violet-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.Icon className={`h-3 w-3 ${item.cls} flex-shrink-0`} />
                        <span className="text-[11px] w-20 text-muted-foreground flex-shrink-0">
                          {item.label}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.barCls}`}
                            style={{ width: `${(item.value / selected.collected) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold w-14 text-right flex-shrink-0">
                          {item.value} MT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance trend indicator */}
                <div className="rounded-lg border border-border/60 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {selected.perf >= 80
                      ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      : <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                    }
                    <span className="text-xs text-muted-foreground">
                      {selected.perf >= 80 ? "Performing well" : "Needs improvement"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[11px] h-5">
                    <Building2 className="h-3 w-3 mr-1" />
                    {selected.localBodies} local bodies
                  </Badge>
                </div>
              </div>
            ) : (
              /* District ranking list when none selected */
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  District Rankings — Click map to drill down
                </p>
                <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
                  {sortedByPerf.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => handleClick(d)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                    >
                      <span className="text-[11px] text-muted-foreground w-5 flex-shrink-0 text-right">
                        {i + 1}
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ background: districtFill(d.perf, false, false) }}
                      />
                      <span className="text-xs font-medium flex-1 truncate">{d.name}</span>
                      <span className={`text-[10px] px-1.5 rounded-full font-bold flex-shrink-0 ${gradeBadgeCls(d.perf)}`}>
                        {d.perf}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Summary footer ───────────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Top Performer",
              value: sortedByPerf[0].name,
              sub: `${sortedByPerf[0].perf}%`,
              cls: "text-emerald-700",
              dotCls: "bg-emerald-500",
            },
            {
              label: "Needs Attention",
              value: sortedByPerf[sortedByPerf.length - 1].name,
              sub: `${sortedByPerf[sortedByPerf.length - 1].perf}%`,
              cls: "text-red-700",
              dotCls: "bg-red-500",
            },
            {
              label: "State Average",
              value: `${Math.round(DISTRICTS.reduce((s, d) => s + d.perf, 0) / DISTRICTS.length)}%`,
              sub: "38 districts",
              cls: "text-sky-700",
              dotCls: "bg-sky-500",
            },
            {
              label: "A/A+ Grade",
              value: `${DISTRICTS.filter((d) => d.perf >= 80).length} districts`,
              sub: "≥80% performance",
              cls: "text-green-700",
              dotCls: "bg-green-500",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/60"
            >
              <span className={`h-2 w-2 rounded-full mt-1 flex-shrink-0 ${item.dotCls}`} />
              <div>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className={`text-xs font-bold ${item.cls}`}>{item.value}</p>
                <p className="text-[11px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
