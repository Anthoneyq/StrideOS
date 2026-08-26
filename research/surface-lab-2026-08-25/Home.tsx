/**
 * Biomechanics Field Ledger — asymmetric scientific editorial layout.
 * Warm limestone paper, mineral ink, Grade Orange, contour rules, and explicit evidence hierarchy.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Calculator,
  Copy,
  ExternalLink,
  FlaskConical,
  Footprints,
  Gauge,
  Info,
  Mountain,
  Printer,
  Route,
  Ruler,
  Share2,
  Timer,
  Wind,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const HERO_URL = "/manus-storage/running-surface-hero_ac561fc7.png";
const LOGO_URL = "/manus-storage/surface-lab-logo_e485320e.png";
const OUTDOOR_URL = "/manus-storage/outdoor-grade-study_aec93be3.png";
const TREADMILL_URL = "/manus-storage/treadmill-grade-study_07f67bce.png";
const G = 9.81;

type EquivalenceMode = "geometry" | "energy" | "power" | "sprint" | "load";
type SurfaceFilter = "all" | "metabolic" | "loading" | "geometry";

const references = [
  ["Minetti et al. (2002)", "Energy cost of walking and running at extreme uphill and downhill slopes", "https://doi.org/10.1152/japplphysiol.01177.2001"],
  ["Looney, Hoogkamer & Kram (2026)", "Metabolic energy expenditure during level, uphill, and downhill running", "https://doi.org/10.1007/s00421-025-05999-5"],
  ["Jones & Doust (1996)", "A 1% treadmill grade most accurately reflects the energetic cost of outdoor running", "https://doi.org/10.1080/02640419608727717"],
  ["Shahidi et al. (2026)", "Overground running incurs a higher energetic cost than treadmill running at a 1% grade", "https://doi.org/10.1371/journal.pone.0355988"],
  ["Miller et al. (2019)", "Treadmill versus overground physiology, perception and performance meta-analysis", "https://doi.org/10.1007/s40279-019-01087-9"],
  ["Van Hooren et al. (2020)", "Treadmill versus overground biomechanics meta-analysis", "https://doi.org/10.1007/s40279-019-01237-z"],
  ["Pugh (1970)", "Oxygen intake in track and treadmill running and air resistance", "https://doi.org/10.1113/jphysiol.1970.sp009097"],
  ["Davies (1980)", "Effects of wind assistance and resistance on a runner", "https://doi.org/10.1152/jappl.1980.48.4.702"],
  ["da Silva, Kram & Hoogkamer (2022)", "Metabolic cost of emulated aerodynamic drag", "https://doi.org/10.1152/japplphysiol.00086.2022"],
  ["Willwacher et al. (2021)", "Treadmill belt velocity fluctuations", "https://doi.org/10.1038/s41598-021-81951-9"],
  ["Lejeune, Willems & Heglund (1998)", "Mechanics and energetics of locomotion on sand", "https://doi.org/10.1242/jeb.201.13.2071"],
  ["Moon et al. (2025)", "Track, asphalt, grass and treadmill biomechanics", "https://doi.org/10.1080/14763141.2025.2511766"],
  ["Gottschall & Kram (2005)", "Ground reaction forces during downhill and uphill running", "https://doi.org/10.1016/j.jbiomech.2004.04.023"],
  ["Lu et al. (2025)", "Review of uphill and downhill running", "https://doi.org/10.3389/fbioe.2025.1690023"],
  ["di Prampero et al. (2005)", "Sprint running: a new energetic approach", "https://doi.org/10.1242/jeb.01700"],
  ["Delaney et al. (2022)", "Uphill sprinting load- and force-velocity profiling", "https://doi.org/10.1080/02640414.2021.1992868"],
  ["Ebben, Davies & Clewien (2008)", "Downhill slope and acute sprint velocity", "https://doi.org/10.1519/JSC.0b013e31816a4149"],
  ["World Athletics", "Technical information and 400 m standard-track marking plan", "https://worldathletics.org/about-iaaf/documents/technical-information"],
] as const;

const surfaces = [
  { name: "Synthetic track", tags: ["loading", "geometry"], scalar: "No universal scalar", finding: "Exact lane geometry; impact measures available", evidence: "Direct + official", tone: "teal" },
  { name: "Asphalt / road", tags: ["loading", "geometry"], scalar: "No universal scalar", finding: "Wind, grade and impact can be measured separately", evidence: "Direct", tone: "ink" },
  { name: "Grass", tags: ["loading"], scalar: "No universal scalar", finding: "Lower eversion velocity in one controlled study", evidence: "Direct", tone: "moss" },
  { name: "Motorized treadmill", tags: ["metabolic", "loading", "geometry"], scalar: "Machine-specific", finding: "Broadly comparable, not identical; calibrate speed", evidence: "Meta-analysis", tone: "orange" },
  { name: "Sand", tags: ["metabolic", "loading"], scalar: "≈ 1.6× study-specific", finding: "≈1.15× external work at matched speed", evidence: "Direct", tone: "ochre" },
  { name: "Trail", tags: ["geometry"], scalar: "No universal scalar", finding: "Segment grade; keep technicality separate", evidence: "Model framework", tone: "moss" },
];

const officialStaggers = [0, 7.038, 14.704, 22.37, 30.034, 37.7, 45.366, 53.032];

function minettiCost(gradeDecimal: number) {
  const x = gradeDecimal;
  return 155.4 * x ** 5 - 30.4 * x ** 4 - 43.3 * x ** 3 + 46.3 * x ** 2 + 19.5 * x + 3.6;
}

function re3GradeCoefficient(gradeDecimal: number) {
  const x = gradeDecimal;
  return 30.43 * x * (1 - 1.133 ** (1 - 1.056 ** (100 * x + 43)));
}

function re3Rate(speed: number, gradeDecimal: number) {
  return 4.43 + 1.51 * speed + 0.37 * speed ** 2 + re3GradeCoefficient(gradeDecimal) * speed;
}

function htkRate(speed: number, gradeDecimal: number) {
  const sinTheta = gradeDecimal / Math.sqrt(1 + gradeDecimal ** 2);
  return 1.44 + speed * (2.01 + 1.74 * Math.exp(-18.24 * sinTheta) + (G / 0.23) * sinTheta);
}

function sameRe3RateSpeed(targetRate: number, gradeDecimal: number) {
  const a = 0.37;
  const b = 1.51 + re3GradeCoefficient(gradeDecimal);
  const c = 4.43 - targetRate;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const positive = (-b + Math.sqrt(discriminant)) / (2 * a);
  return positive > 0 ? positive : null;
}

function paceLabel(speed: number) {
  const totalSeconds = 1000 / speed;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function Citation({ n }: { n: number }) {
  return (
    <a className="citation" href={references[n - 1][2]} target="_blank" rel="noreferrer" aria-label={`Open source ${n}`}>
      [{n}]
    </a>
  );
}

function Metric({ label, value, unit, note, accent = false }: { label: string; value: string; unit?: string; note?: string; accent?: boolean }) {
  return (
    <div className={`metric ${accent ? "metric-accent" : ""}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {unit && <span className="metric-unit">{unit}</span>}
      {note && <span className="metric-note">{note}</span>}
    </div>
  );
}

function EvidenceTab({ children, kind = "model" }: { children: React.ReactNode; kind?: "direct" | "model" | "heuristic" | "official" }) {
  return <span className={`evidence-tab evidence-${kind}`}>{children}</span>;
}

export default function Home() {
  const [equivalenceMode, setEquivalenceMode] = useState<EquivalenceMode>("energy");
  const [grade, setGrade] = useState(5);
  const [speed, setSpeed] = useState(3);
  const [distance, setDistance] = useState(1000);
  const [mass, setMass] = useState(70);
  const [flatReferenceSpeed, setFlatReferenceSpeed] = useState(4);
  const [calibration, setCalibration] = useState(0);
  const [headwind, setHeadwind] = useState(0);
  const [cda, setCda] = useState(0.5);
  const [surfaceFilter, setSurfaceFilter] = useState<SurfaceFilter>("all");
  const [acceleration, setAcceleration] = useState(3);
  const [sprintGrade, setSprintGrade] = useState(8.8);
  const [lane, setLane] = useState(1);
  const [trackSpeed, setTrackSpeed] = useState(5);
  const [laps, setLaps] = useState(10);

  const gradeDecimal = grade / 100;
  const angle = Math.atan(gradeDecimal);
  const horizontal = distance * Math.cos(angle);
  const vertical = distance * Math.sin(angle);
  const duration = distance / speed;
  const minetti = minettiCost(gradeDecimal);
  const minettiRatio = minetti / minettiCost(0);
  const flatEquivalent = distance * minettiRatio;
  const re3 = re3Rate(speed, gradeDecimal);
  const calories = (re3 * mass * duration) / 4184;
  const flatTargetRate = re3Rate(flatReferenceSpeed, 0);
  const samePowerSpeed = sameRe3RateSpeed(flatTargetRate, gradeDecimal);
  const minettiSamePowerSpeed = (flatReferenceSpeed * minettiCost(0)) / minetti;

  const chartData = useMemo(() => {
    const levelRe3 = re3Rate(speed, 0);
    return Array.from({ length: 91 }, (_, i) => {
      const p = i - 45;
      const x = p / 100;
      return {
        grade: p,
        minetti: minettiCost(x) / minettiCost(0),
        re3: re3Rate(speed, x) / levelRe3,
      };
    });
  }, [speed]);

  const relativeAirSpeed = speed + headwind;
  const dragForce = 0.5 * 1.225 * cda * relativeAirSpeed * Math.abs(relativeAirSpeed);
  const dragPower = dragForce * speed;
  const dragBodyWeightPercent = (100 * dragForce) / (mass * G);
  const dragMetabolicSensitivity = 6.13 * dragBodyWeightPercent;
  const calibratedTenK = 10000 * (1 + calibration / 100);

  const accelerationEquivalentGrade = (100 * acceleration) / G;
  const sprintAngle = (Math.atan(sprintGrade / 100) * 180) / Math.PI;
  const sprintVelocityRatio = Math.max(0, 1 - 0.017 * sprintAngle);
  const trackRadius = 36.8 + (lane - 1) * 1.22;
  const lapDistance = 400 + officialStaggers[lane - 1];
  const centripetal = trackSpeed ** 2 / trackRadius;
  const lean = (Math.atan(centripetal / G) * 180) / Math.PI;

  const filteredSurfaces = surfaces.filter((surface) => surfaceFilter === "all" || surface.tags.includes(surfaceFilter));

  const analysisText = `RUNNING SURFACE EQUIVALENCY LAB\nGrade: ${grade.toFixed(1)}% (${(angle * 180 / Math.PI).toFixed(2)}°)\nSpeed: ${speed.toFixed(2)} m/s (${paceLabel(speed)})\nPath distance: ${distance.toFixed(0)} m\nVertical change: ${vertical.toFixed(1)} m\nMinetti cost ratio: ${minettiRatio.toFixed(3)}× level\nMinetti flat-energy-equivalent: ${flatEquivalent.toFixed(0)} m\nRE3 gross metabolic rate: ${re3.toFixed(2)} W/kg\nRE3 gross energy (${mass} kg): ${calories.toFixed(1)} kcal\nSame-RE3-rate speed vs ${flatReferenceSpeed.toFixed(1)} m/s level: ${samePowerSpeed?.toFixed(2) ?? "No positive solution"} m/s\n\nModel notes: steady-state population estimates; metabolic equivalence does not preserve impact, braking, sprint mechanics, or individual physiology.\nSources: Minetti 2002 https://doi.org/10.1152/japplphysiol.01177.2001 | Looney et al. 2026 https://doi.org/10.1007/s00421-025-05999-5`;

  async function copyAnalysis() {
    await navigator.clipboard.writeText(analysisText);
    toast.success("Analysis copied with assumptions and sources.");
  }

  async function shareAnalysis() {
    if (navigator.share) {
      await navigator.share({ title: "Running Surface Equivalency", text: analysisText, url: window.location.href });
      return;
    }
    await copyAnalysis();
  }

  return (
    <div className="site-shell">
      <aside className="field-index" aria-label="Research sections">
        <a href="#top" className="brand-lockup">
          <img src={LOGO_URL} alt="Surface Lab contour mark" />
          <span><b>SURFACE</b><em>LAB / 01</em></span>
        </a>
        <div className="index-rule" />
        <nav>
          {[
            ["01", "Finding", "#finding"],
            ["02", "Grade lab", "#grade-lab"],
            ["03", "Treadmill", "#treadmill"],
            ["04", "Surfaces", "#surfaces"],
            ["05", "Sprints", "#sprints"],
            ["06", "Track", "#track"],
            ["07", "Formulae", "#formulae"],
            ["08", "Sources", "#sources"],
          ].map(([n, label, href]) => (
            <a key={href} href={href}><span>{n}</span>{label}</a>
          ))}
        </nav>
        <div className="evidence-key">
          <span className="key-title">EVIDENCE KEY</span>
          <EvidenceTab kind="direct">DIRECT</EvidenceTab>
          <EvidenceTab kind="model">MODEL</EvidenceTab>
          <EvidenceTab kind="heuristic">HEURISTIC</EvidenceTab>
          <EvidenceTab kind="official">OFFICIAL</EvidenceTab>
        </div>
        <div className="rail-actions">
          <button onClick={copyAnalysis}><Copy /> Copy analysis</button>
          <button onClick={() => window.print()}><Printer /> Print / save</button>
        </div>
      </aside>

      <main id="top">
        <header className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(247,250,252,.99) 0%, rgba(240,247,251,.94) 43%, rgba(229,241,247,.18) 76%), url(${HERO_URL})` }}>
          <div className="hero-register">FIELD NOTE / 25 AUG 2026 <span>18 SOURCES</span></div>
          <div className="hero-copy">
            <div className="hero-brand-signature">
              <img src={LOGO_URL} alt="Surface Lab abstract slope and contour symbol" />
              <div><span>RUNNING SCIENCE / FIELD INSTRUMENT 01</span><strong>SURFACE <i>/</i> LAB</strong></div>
            </div>
            <EvidenceTab kind="model">RUNNING SCIENCE / INTERACTIVE</EvidenceTab>
            <div className="campaign-label">FIELD FINDING</div>
            <h1>One surface.<br /><i>Many kinds</i> of effort.</h1>
            <p>Translate grade, path distance, metabolic energy, treadmill conditions, sprint resistance, and track geometry—without pretending unlike workouts are perfectly interchangeable.</p>
            <div className="hero-actions">
              <Button asChild size="lg"><a href="#grade-lab"><Calculator /> Set a pace. Trace effort.</a></Button>
              <Button variant="outline" size="lg" asChild><a href="#formulae"><BookOpen /> Inspect the math</a></Button>
            </div>
          </div>
          <div className="hero-stamp"><strong>±45%</strong><span>GRADE RANGE</span></div>
        </header>

        <section id="finding" className="section finding-section contour-section">
          <div className="section-kicker">01 / THE FINDING</div>
          <div className="finding-grid">
            <div>
              <h2>A 10% hill is not simply <em>ten percent harder.</em></h2>
              <p className="lede">There is no universal conversion among track, road, hill, treadmill, grass, sand, and trail. First name the outcome you want to conserve; only then choose the equation.</p>
            </div>
            <aside className="margin-note">
              <Info />
              <strong>What “equivalent” may mean</strong>
              <span>Same geometry, energy, power, oxygen uptake, sprint speed, or tissue load. These do not collapse into one score.</span>
            </aside>
          </div>

          <div className="equivalence-switch" role="group" aria-label="Choose an equivalence question">
            {([
              ["geometry", "Distance & climb", Ruler],
              ["energy", "Metabolic energy", Activity],
              ["power", "Effort rate", Gauge],
              ["sprint", "Sprint resistance", Footprints],
              ["load", "Impact & braking", Mountain],
            ] as const).map(([mode, label, Icon]) => (
              <button key={mode} className={equivalenceMode === mode ? "active" : ""} onClick={() => setEquivalenceMode(mode)}>
                <Icon /> <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="mode-answer">
            {equivalenceMode === "geometry" && <><b>Use exact slope geometry.</b><span>Convert grade ↔ angle, then resolve path distance into horizontal and vertical components.</span><code>h = dG / √(1+G²)</code></>}
            {equivalenceMode === "energy" && <><b>Integrate cost by segment.</b><span>Minetti provides transparent cost per metre; RE3 provides speed-aware gross rate.</span><code>d<sub>flat,eq</sub> = Σ[C(Gᵢ)dᵢ] / C(0)</code></>}
            {equivalenceMode === "power" && <><b>Solve for a matching rate.</b><span>Use the positive RE3 speed root at the selected grade. Matching rate does not match time or distance.</span><code>Ṁ<sub>grade</sub>(S) = Ṁ<sub>level</sub>(S₀)</code></>}
            {equivalenceMode === "sprint" && <><b>Use sprint-specific evidence.</b><span>Acceleration can be mapped to an equivalent slope; hill maximal-speed data are valid only across tested grades.</span><code>ES = a / g</code></>}
            {equivalenceMode === "load" && <><b>Keep loading separate.</b><span>Moderate downhill may cost less oxygen per metre while increasing impact and braking forces.</span><code>metabolic cost ≠ tissue load</code></>}
          </div>
        </section>

        <section id="grade-lab" className="section grade-lab-section">
          <div className="section-head">
            <div><span className="section-kicker">02 / GRADE LAB</span><h2>Steady-state grade, <i>made auditable.</i></h2></div>
            <div className="model-note"><EvidenceTab kind="model">MODEL</EvidenceTab><span>Minetti + RE3 + HTK</span></div>
          </div>

          <div className="lab-layout">
            <div className="instrument-panel">
              <div className="instrument-title"><FlaskConical /><span>INPUT RAILS</span><b>LIVE</b></div>
              <label className="control-row">
                <span><b>Grade</b><em>−45% to +45%</em></span>
                <output>{grade > 0 ? "+" : ""}{grade.toFixed(1)}%</output>
                <Slider min={-45} max={45} step={0.5} value={[grade]} onValueChange={(v) => setGrade(v[0])} aria-label="Grade percent" />
              </label>
              <label className="control-row">
                <span><b>Path speed</b><em>{paceLabel(speed)}</em></span>
                <output>{speed.toFixed(2)} m/s</output>
                <Slider min={1.8} max={6} step={0.05} value={[speed]} onValueChange={(v) => setSpeed(v[0])} aria-label="Speed metres per second" />
              </label>
              <label className="control-row">
                <span><b>Path distance</b><em>along surface</em></span>
                <output>{distance.toFixed(0)} m</output>
                <Slider min={100} max={10000} step={100} value={[distance]} onValueChange={(v) => setDistance(v[0])} aria-label="Path distance metres" />
              </label>
              <label className="control-row">
                <span><b>Body mass</b><em>energy only</em></span>
                <output>{mass.toFixed(0)} kg</output>
                <Slider min={40} max={120} step={1} value={[mass]} onValueChange={(v) => setMass(v[0])} aria-label="Body mass kilograms" />
              </label>
              <label className="control-row">
                <span><b>Level reference</b><em>same RE3 rate</em></span>
                <output>{flatReferenceSpeed.toFixed(2)} m/s</output>
                <Slider min={2} max={6} step={0.05} value={[flatReferenceSpeed]} onValueChange={(v) => setFlatReferenceSpeed(v[0])} aria-label="Level reference speed" />
              </label>

              <div className="grade-wedge" style={{ "--grade-angle": `${Math.max(-24.2, Math.min(24.2, angle * 180 / Math.PI))}deg` } as React.CSSProperties}>
                <div className="wedge-ground" /><div className="wedge-slope" /><div className="wedge-runner">●</div>
                <span className="wedge-angle">{(angle * 180 / Math.PI).toFixed(2)}°</span>
                <span className="wedge-rise">{vertical >= 0 ? "RISE" : "DROP"} {Math.abs(vertical).toFixed(1)} m</span>
                <span className="wedge-run">RUN {horizontal.toFixed(1)} m</span>
              </div>
            </div>

            <div className="results-panel">
              <div className="result-banner">
                <span>ENERGY-EQUIVALENT FLAT DISTANCE</span>
                <strong>{flatEquivalent.toFixed(0)}<small> m</small></strong>
                <em>for {distance.toFixed(0)} m at {grade > 0 ? "+" : ""}{grade.toFixed(1)}%, Minetti definition</em>
              </div>
              <div className="metrics-grid">
                <Metric label="Vertical change" value={`${vertical >= 0 ? "+" : ""}${vertical.toFixed(1)}`} unit="m" note={`${horizontal.toFixed(1)} m horizontal`} />
                <Metric label="Elapsed time" value={`${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}`} note="at selected path speed" />
                <Metric label="Minetti cost" value={minetti.toFixed(2)} unit="J·kg⁻¹·m⁻¹" note={`${minettiRatio.toFixed(2)}× level`} accent />
                <Metric label="RE3 gross rate" value={re3.toFixed(2)} unit="W·kg⁻¹" note={`${calories.toFixed(1)} kcal gross`} accent />
                <Metric label="Same-rate speed" value={samePowerSpeed ? samePowerSpeed.toFixed(2) : "—"} unit="m/s" note={`matches level ${flatReferenceSpeed.toFixed(2)} m/s`} />
                <Metric label="Minetti Cv speed" value={minettiSamePowerSpeed.toFixed(2)} unit="m/s" note="grade-only comparison" />
                <Metric label="HTK uphill rate" value={grade >= 0 ? htkRate(speed, gradeDecimal).toFixed(2) : "N/A"} unit={grade >= 0 ? "W·kg⁻¹" : undefined} note={grade >= 0 ? "level/uphill model" : "not a downhill model"} />
                <Metric label="Path pace" value={paceLabel(speed)} note={`${(speed * 3.6).toFixed(1)} km/h`} />
              </div>
              <div className="warning-strip"><Info /><span>Steady-state population models. Metabolic equivalence does not preserve impact, braking, sprint mechanics, or personal economy.</span></div>
            </div>
          </div>

          <div className="chart-panel">
            <div className="chart-copy">
              <span className="section-kicker">COST CURVE / SELECTED SPEED {speed.toFixed(2)} M·S⁻¹</span>
              <h3>Downhill cost falls—<br />until braking takes over.</h3>
              <p>Minetti compares energy per path metre. RE3 compares gross metabolic rate at the selected speed. Both are normalized to their own level value.</p>
              <div className="chart-callout"><b>≈ −18%</b><span>Minetti polynomial minimum</span></div>
            </div>
            <div className="chart-wrap" role="img" aria-label="Line chart of normalized Minetti cost and RE3 metabolic rate by grade">
              <ResponsiveContainer width="100%" height={390}>
                <LineChart data={chartData} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="2 7" stroke="#cbd9e1" vertical={false} />
                  <XAxis dataKey="grade" tickFormatter={(v) => `${v}%`} stroke="#526675" tick={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <YAxis domain={[0, "auto"]} tickFormatter={(v) => `${v.toFixed(1)}×`} stroke="#526675" tick={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#08131b", border: "1px solid #2c4658", color: "#f7fafc", fontFamily: "IBM Plex Mono", fontSize: 12, borderRadius: 8 }} labelFormatter={(v) => `GRADE ${Number(v) > 0 ? "+" : ""}${v}%`} formatter={(value, name) => [`${Number(value).toFixed(3)}× level`, name === "minetti" ? "Minetti cost / metre" : `RE3 rate @ ${speed.toFixed(2)} m/s`]} />
                  <Legend formatter={(value) => value === "minetti" ? "Minetti cost / metre" : "RE3 gross rate"} />
                  <ReferenceArea x1={-22} x2={-14} fill="#2f6bff" fillOpacity={0.07} />
                  <ReferenceLine y={1} stroke="#0c1720" strokeDasharray="4 5" />
                  <ReferenceLine x={grade} stroke="#2f6bff" strokeWidth={2} />
                  <Line type="monotone" dataKey="minetti" stroke="#2f6bff" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="re3" stroke="#12b8d4" strokeWidth={2.5} strokeDasharray="8 5" dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="accessible-data-table">
            <table>
              <caption>Selected grade reference values</caption>
              <thead><tr><th>Grade</th><th>Angle</th><th>Minetti ratio</th><th>RE3 rate ratio @ {speed.toFixed(2)} m/s</th><th>Vertical / 1 km path</th></tr></thead>
              <tbody>{[-20, -10, 0, 5, 10, 20, 45].map((p) => { const x = p / 100; return <tr key={p}><td>{p > 0 ? "+" : ""}{p}%</td><td>{(Math.atan(x) * 180 / Math.PI).toFixed(2)}°</td><td>{(minettiCost(x) / minettiCost(0)).toFixed(3)}×</td><td>{(re3Rate(speed, x) / re3Rate(speed, 0)).toFixed(3)}×</td><td>{(1000 * x / Math.sqrt(1 + x * x)).toFixed(1)} m</td></tr>; })}</tbody>
            </table>
          </div>
        </section>

        <section id="treadmill" className="section treadmill-section contour-section">
          <div className="section-head">
            <div><span className="section-kicker">03 / TREADMILL LENS</span><h2>The 1% rule is a <i>useful approximation,</i> not a law.</h2></div>
            <div className="model-note"><EvidenceTab kind="heuristic">HEURISTIC</EvidenceTab><span>Speed- and setup-dependent</span></div>
          </div>
          <div className="treadmill-story">
            <div className="story-image"><img src={TREADMILL_URL} alt="Editorial cutaway of an inclined treadmill with airflow and calibration tools" /></div>
            <div className="story-copy">
              <p>Jones and Doust found 1% often matched road oxygen cost from 2.92–5.00 m·s⁻¹, but 0% was also statistically compatible at slower speeds. A 34-study meta-analysis found similar submaximal oxygen uptake at both 0% and 1%. A 2026 track study still found outdoor cost higher than 1% treadmill in its sample.<Citation n={3} /> <Citation n={4} /> <Citation n={5} /></p>
              <div className="evidence-timeline">
                <div><b>1996</b><span>1% practical rule</span></div><div><b>2019</b><span>Outcome depends on speed</span></div><div><b>2026</b><span>1% did not fully match track</span></div>
              </div>
            </div>
          </div>

          <div className="treadmill-lab-grid">
            <div className="mini-lab">
              <div className="mini-lab-head"><Gauge /><span>BELT CALIBRATION</span></div>
              <label className="control-row compact"><span><b>Measured speed error</b><em>study envelope</em></span><output>{calibration > 0 ? "+" : ""}{calibration.toFixed(1)}%</output><Slider min={-3} max={3} step={0.1} value={[calibration]} onValueChange={(v) => setCalibration(v[0])} /></label>
              <div className="calibration-readout"><span>Nominal 10.00 km becomes</span><strong>{(calibratedTenK / 1000).toFixed(3)} km</strong><em>Average belt speed ranged ≈98–103% of target across four machines.<Citation n={10} /></em></div>
            </div>
            <div className="mini-lab">
              <div className="mini-lab-head"><Wind /><span>AIR-DRAG SENSITIVITY</span></div>
              <label className="control-row compact"><span><b>Headwind</b><em>tailwind is negative</em></span><output>{headwind > 0 ? "+" : ""}{headwind.toFixed(1)} m/s</output><Slider min={-4} max={8} step={0.25} value={[headwind]} onValueChange={(v) => setHeadwind(v[0])} /></label>
              <label className="control-row compact"><span><b>Effective CdA</b><em>illustrative input</em></span><output>{cda.toFixed(2)} m²</output><Slider min={0.3} max={0.8} step={0.01} value={[cda]} onValueChange={(v) => setCda(v[0])} /></label>
              <div className="drag-readout"><Metric label="Drag force" value={dragForce.toFixed(1)} unit="N" /><Metric label="Mechanical drag power" value={dragPower.toFixed(1)} unit="W" /><Metric label="da Silva sensitivity" value={`${dragMetabolicSensitivity >= 0 ? "+" : ""}${dragMetabolicSensitivity.toFixed(1)}`} unit="%" note="group equation; individual range broad" /></div>
            </div>
          </div>
          <div className="quote-strip"><span>CALM AIR</span><blockquote>At the same speed, a treadmill removes most external air resistance—but it does not recreate deck stiffness, belt behavior, turns, temperature, or athlete familiarity.</blockquote><Citation n={6} /> <Citation n={7} /> <Citation n={9} /></div>
        </section>

        <section id="surfaces" className="section surfaces-section">
          <div className="section-head">
            <div><span className="section-kicker">04 / SURFACE MATRIX</span><h2>Where the evidence supports a number—<i>and where it does not.</i></h2></div>
            <div className="filter-row" role="group" aria-label="Filter surfaces">
              {(["all", "metabolic", "loading", "geometry"] as SurfaceFilter[]).map((filter) => <button key={filter} className={surfaceFilter === filter ? "active" : ""} onClick={() => setSurfaceFilter(filter)}>{filter}</button>)}
            </div>
          </div>
          <div className="surface-intro">
            <img src={OUTDOOR_URL} alt="Editorial terrain ribbon showing level, uphill and downhill running" />
            <div><EvidenceTab kind="direct">DIRECT</EvidenceTab><h3>Sand is the exception in this evidence set.</h3><p>At matched speed, one controlled study measured roughly 1.6× metabolic expenditure and 1.15× external mechanical work on sand versus hard ground. It is a study-specific sensitivity, not a universal beach constant.<Citation n={11} /></p></div>
          </div>
          <div className="surface-table" role="table" aria-label="Surface evidence matrix">
            <div className="surface-row surface-header" role="row"><span>Surface</span><span>Metabolic scalar</span><span>Supported finding</span><span>Evidence</span></div>
            {filteredSurfaces.map((surface) => <div className={`surface-row tone-${surface.tone}`} role="row" key={surface.name}><strong>{surface.name}</strong><b>{surface.scalar}</b><span>{surface.finding}</span><EvidenceTab kind={surface.evidence === "Direct" || surface.evidence === "Direct + official" ? "direct" : "model"}>{surface.evidence}</EvidenceTab></div>)}
          </div>
          <div className="surface-notes"><div><strong>Peak tibial acceleration</strong><span>Asphalt 11.0 g · Grass 10.7 g · Track 10.6 g · Treadmill 7.9 g</span><Citation n={12} /></div><div><strong>Do not convert this to calories</strong><span>Biomechanical loading outcomes are not metabolic multipliers.</span></div></div>
        </section>

        <section id="sprints" className="section sprint-section contour-dark">
          <div className="section-head light">
            <div><span className="section-kicker">05 / SPRINT LENS</span><h2>Short, maximal efforts need <i>different math.</i></h2></div>
            <div className="model-note"><EvidenceTab kind="model">MODEL</EvidenceTab><span>Transient acceleration</span></div>
          </div>
          <div className="sprint-grid">
            <div className="sprint-card main-sprint-card">
              <span className="card-number">A / ACCELERATION</span>
              <h3>Equivalent slope</h3>
              <p>Forward acceleration creates a fore–aft inertial demand analogous—in this model only—to gravity on an incline.<Citation n={15} /></p>
              <label className="control-row dark-control"><span><b>Forward acceleration</b><em>m·s⁻²</em></span><output>{acceleration.toFixed(2)}</output><Slider min={0.5} max={7} step={0.05} value={[acceleration]} onValueChange={(v) => setAcceleration(v[0])} /></label>
              <div className="sprint-output"><span>ES = a / g</span><strong>+{accelerationEquivalentGrade.toFixed(1)}%</strong><em>{accelerationEquivalentGrade > 45 ? "Beyond Minetti's measured +45% range" : "Within Minetti's measured grade range"}</em></div>
            </div>
            <div className="sprint-card">
              <span className="card-number">B / UPHILL V<sub>MAX</sub></span>
              <h3>Empirical grade resistance</h3>
              <label className="control-row dark-control"><span><b>Hill grade</b><em>tested to 17.6%</em></span><output>{sprintGrade.toFixed(1)}%</output><Slider min={0} max={17.6} step={0.1} value={[sprintGrade]} onValueChange={(v) => setSprintGrade(v[0])} /></label>
              <div className="sprint-output small"><span>{sprintAngle.toFixed(2)}° hill angle</span><strong>{(sprintVelocityRatio * 100).toFixed(1)}%</strong><em>estimated share of flat maximal speed; narrow cohort relation<Citation n={16} /></em></div>
            </div>
            <div className="sprint-card downhill-card">
              <span className="card-number">C / DOWNHILL OVERSPEED</span>
              <h3>Steeper was not faster.</h3>
              <div className="downhill-mark"><strong>−5.8°</strong><span>≈ −10.2% grade</span></div>
              <p>Best acute tested slope: maximal speed +7.09% and acceleration +6.54% on average.<Citation n={17} /></p>
              <div className="hazard-note">Higher braking and impact; not a continuous pace calculator or safety prescription.</div>
            </div>
          </div>
          <div className="force-band"><div><span>−9° DOWNHILL</span><strong>+54%</strong><em>normal impact peak</em></div><div><span>−9° DOWNHILL</span><strong>+73%</strong><em>parallel braking peak</em></div><div><span>+9° UPHILL</span><strong>+75%</strong><em>parallel propulsive peak</em></div><Citation n={13} /></div>
        </section>

        <section id="track" className="section track-section">
          <div className="section-head">
            <div><span className="section-kicker">06 / TRACK LENS</span><h2>Four hundred metres—<i>only on the measuring line.</i></h2></div>
            <div className="model-note"><EvidenceTab kind="official">OFFICIAL</EvidenceTab><span>World Athletics geometry</span></div>
          </div>
          <div className="track-layout">
            <div className="track-diagram">
              <div className="oval-track">
                {[8,7,6,5,4,3,2,1].map((n) => <button key={n} className={lane === n ? "selected" : ""} onClick={() => setLane(n)} aria-label={`Select lane ${n}`}><span>{n}</span></button>)}
              </div>
              <span className="track-caption">SELECT A LANE</span>
            </div>
            <div className="track-controls">
              <label className="control-row"><span><b>Lane</b><em>full unstaggered lap</em></span><output>{lane}</output><Slider min={1} max={8} step={1} value={[lane]} onValueChange={(v) => setLane(v[0])} /></label>
              <label className="control-row"><span><b>Laps</b><em>whole laps</em></span><output>{laps}</output><Slider min={1} max={25} step={1} value={[laps]} onValueChange={(v) => setLaps(v[0])} /></label>
              <label className="control-row"><span><b>Curve speed</b><em>{paceLabel(trackSpeed)}</em></span><output>{trackSpeed.toFixed(1)} m/s</output><Slider min={2} max={10} step={0.1} value={[trackSpeed]} onValueChange={(v) => setTrackSpeed(v[0])} /></label>
              <div className="track-results"><Metric label="Unstaggered lap" value={lapDistance.toFixed(3)} unit="m" /><Metric label={`${laps} lap distance`} value={(lapDistance * laps).toFixed(1)} unit="m" accent /><Metric label="Centripetal acceleration" value={centripetal.toFixed(3)} unit="m·s⁻²" /><Metric label="Idealized lean" value={lean.toFixed(2)} unit="°" /></div>
              <p>Proper staggered race starts remove outer-lane distance differences. Curve force is `mv²/r`; it is not a universal calorie penalty.<Citation n={18} /></p>
            </div>
          </div>
        </section>

        <section id="formulae" className="section formula-section contour-section">
          <div className="section-head">
            <div><span className="section-kicker">07 / FORMULA LEDGER</span><h2>Every output, <i>open to inspection.</i></h2></div>
            <Button variant="outline" onClick={copyAnalysis}><Copy /> Copy current analysis</Button>
          </div>
          <Accordion type="multiple" defaultValue={["geometry", "minetti", "re3"]} className="formula-accordion">
            <AccordionItem value="geometry"><AccordionTrigger><span>01</span> Grade geometry <EvidenceTab kind="official">EXACT</EvidenceTab></AccordionTrigger><AccordionContent><code>G = rise/run · θ = atan(G)<br />horizontal = path/√(1+G²)<br />vertical = path·G/√(1+G²)</code><p>Pure geometry. Treadmill belt distance is path distance, not horizontal projection.</p></AccordionContent></AccordionItem>
            <AccordionItem value="minetti"><AccordionTrigger><span>02</span> Minetti cost of transport <EvidenceTab kind="model">−45%…+45%</EvidenceTab></AccordionTrigger><AccordionContent><code>C(G)=155.4G⁵−30.4G⁴−43.3G³+46.3G²+19.5G+3.6</code><p>Returns J·kg⁻¹·m⁻¹. Flat-energy-equivalent distance is `ΣC(Gᵢ)dᵢ / C(0)`.<Citation n={1} /></p></AccordionContent></AccordionItem>
            <AccordionItem value="re3"><AccordionTrigger><span>03</span> RE3 gross metabolic rate <EvidenceTab kind="model">SPEED + GRADE</EvidenceTab></AccordionTrigger><AccordionContent><code>Ṁ=4.43+1.51S+0.37S²+30.43SG[1−1.133^(1−1.056^(100G+43))]</code><p>Returns W·kg⁻¹. Energy is `mṀt`. Coefficients are those verified in the public manuscript; the journal record notes a 2026 correction.<Citation n={2} /></p></AccordionContent></AccordionItem>
            <AccordionItem value="htk"><AccordionTrigger><span>04</span> HTK physiology-based rate <EvidenceTab kind="model">UPHILL</EvidenceTab></AccordionTrigger><AccordionContent><code>Ṁ=1.44+S[2.01+1.74e^(−18.24sinθ)+(9.81/0.23)sinθ]</code><p>Level and uphill only. `sinθ=G/√(1+G²)`.<Citation n={2} /></p></AccordionContent></AccordionItem>
            <AccordionItem value="drag"><AccordionTrigger><span>05</span> Aerodynamic drag <EvidenceTab kind="direct">PHYSICS + EMPIRICAL</EvidenceTab></AccordionTrigger><AccordionContent><code>F=½ρCdA·v<sub>rel</sub>|v<sub>rel</sub>|<br />P=F·v<sub>ground</sub></code><p>Calm-air mechanical power rises with speed cubed. Metabolic conversion requires empirical evidence.<Citation n={7} /> <Citation n={8} /> <Citation n={9} /></p></AccordionContent></AccordionItem>
            <AccordionItem value="sprint"><AccordionTrigger><span>06</span> Sprint equivalent slope <EvidenceTab kind="model">TRANSIENT</EvidenceTab></AccordionTrigger><AccordionContent><code>ES=a/g · EM=√(1+ES²)<br />C<sub>sr</sub>=C(ES)·EM · P=C<sub>sr</sub>v</code><p>Maps acceleration to uphill energetics; it does not reproduce coordination or muscle action.<Citation n={15} /></p></AccordionContent></AccordionItem>
          </Accordion>
        </section>

        <section id="sources" className="section sources-section">
          <div className="section-head light">
            <div><span className="section-kicker">08 / SOURCE REGISTER</span><h2>Full citations. <i>No hidden conversion table.</i></h2></div>
            <span className="source-count">18 / SOURCES</span>
          </div>
          <div className="source-register">
            {references.map(([author, title, url], i) => <a href={url} target="_blank" rel="noreferrer" className="source-item" key={url}><span>{String(i + 1).padStart(2, "0")}</span><div><strong>{author}</strong><em>{title}</em></div><ExternalLink /></a>)}
          </div>
          <div className="method-note"><BookOpen /><div><strong>Method and limitations</strong><p>Primary studies and systematic reviews were prioritized. Every calculator names its conserved outcome, equation, range, and caveat. Where no validated universal scalar exists—track versus asphalt, grass, concrete, or trail—the site says so rather than fabricating precision.</p></div></div>
        </section>

        <footer>
          <div className="footer-brand"><img src={LOGO_URL} alt="Surface Lab abstract slope and contour symbol" /><span><b>SURFACE <i>/</i> LAB</b><em>RUNNING EQUIVALENCY FIELD INSTRUMENT</em></span></div>
          <p>Research synthesis and interactive models by Manus AI · 25 August 2026</p>
          <div className="footer-actions"><Button variant="outline" onClick={shareAnalysis}><Share2 /> Share analysis</Button><Button onClick={() => window.print()}><Printer /> Print / save</Button></div>
        </footer>
      </main>
    </div>
  );
}
