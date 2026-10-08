// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE to add your own projects.
//
//  cover   : path to a SQUARE image (e.g. "assets/covers/casa-lumen.jpg", ~1500×1500).
//            Leave "" to auto-generate an architectural line-drawing label.
//  video   : a YouTube link, a Vimeo link, or a path to an .mp4
//            (e.g. "assets/videos/casa-lumen.mp4"). Leave "" if not ready yet.
//  palette : two colours for the auto-generated label (top → bottom).
//  art     : 0 = skyline elevation, 1 = floor plan, 2 = axonometric blocks.
//  showTitle: set false if your cover image already has the title on it.
// ─────────────────────────────────────────────────────────────

export const studio = {
  name: "STUDIO",
  tagline: "Architectural Visualization",
};

export const projects = [
  {
    title: "Casa Lumen",
    location: "Lisbon, Portugal",
    year: 2025,
    client: "Private Residence",
    tools: ["3ds Max", "Corona", "After Effects"],
    cover: "",
    video: "",
    palette: ["#d8c3a0", "#6b4f36"],
    art: 0,
    notes: [
      { label: "Format", text: "Exterior walkthrough" },
      { label: "Runtime", text: "1:42 · 4K" },
    ],
  },
  {
    title: "Harbour Pavilion",
    location: "Copenhagen, Denmark",
    year: 2025,
    client: "Nordhavn Development",
    tools: ["Rhino", "Unreal Engine 5"],
    cover: "",
    video: "",
    palette: ["#9fb7c4", "#1f3340"],
    art: 2,
    notes: [
      { label: "Format", text: "Competition film" },
      { label: "Runtime", text: "2:10 · 4K" },
    ],
  },
  {
    title: "Atrium House",
    location: "Pune, India",
    year: 2024,
    client: "Mehta Residence",
    tools: ["SketchUp", "D5 Render"],
    cover: "",
    video: "",
    palette: ["#e7d9c4", "#8a5a3c"],
    art: 1,
    notes: [
      { label: "Format", text: "Interior animation" },
      { label: "Runtime", text: "0:58 · 60fps" },
    ],
  },
  {
    title: "Concrete Garden",
    location: "Ludhiana, India",
    year: 2024,
    client: "Civic Arts Trust",
    tools: ["Blender", "Cycles", "DaVinci"],
    cover: "",
    video: "",
    palette: ["#b9bdb4", "#2f352f"],
    art: 0,
    notes: [
      { label: "Format", text: "Landscape film" },
      { label: "Runtime", text: "1:25 · 4K" },
    ],
  },
  {
    title: "Tower No. 7",
    location: "Dubai, UAE",
    year: 2024,
    client: "Meridian Group",
    tools: ["3ds Max", "V-Ray", "Nuke"],
    cover: "",
    video: "",
    palette: ["#f0c79a", "#3b2142"],
    art: 2,
    notes: [
      { label: "Format", text: "Marketing teaser" },
      { label: "Runtime", text: "0:45 · 8K" },
    ],
  },
  {
    title: "Quiet Library",
    location: "Kyoto, Japan",
    year: 2023,
    client: "Prefectural Archive",
    tools: ["Revit", "Twinmotion"],
    cover: "",
    video: "",
    palette: ["#d6d0c4", "#4a4036"],
    art: 1,
    notes: [
      { label: "Format", text: "Design review film" },
      { label: "Runtime", text: "3:05 · 4K" },
    ],
  },
  {
    title: "Salt Flats Retreat",
    location: "Rann of Kutch, India",
    year: 2023,
    client: "Hospitality Concept",
    tools: ["Blender", "Unreal Engine 5"],
    cover: "",
    video: "",
    palette: ["#efe6dc", "#b0715a"],
    art: 0,
    notes: [
      { label: "Format", text: "Mood film" },
      { label: "Runtime", text: "1:12 · 4K" },
    ],
  },
  {
    title: "Brick & Shade",
    location: "Ahmedabad, India",
    year: 2023,
    client: "School Campus",
    tools: ["SketchUp", "Lumion"],
    cover: "",
    video: "",
    palette: ["#c8826a", "#3d1f17"],
    art: 2,
    notes: [
      { label: "Format", text: "Masterplan flythrough" },
      { label: "Runtime", text: "2:40 · 4K" },
    ],
  },
  {
    title: "Mono Loft",
    location: "Berlin, Germany",
    year: 2022,
    client: "Studio Fit-out",
    tools: ["Cinema 4D", "Redshift"],
    cover: "",
    video: "",
    palette: ["#cfcfcf", "#161616"],
    art: 1,
    notes: [
      { label: "Format", text: "Interior loop" },
      { label: "Runtime", text: "0:30 · Loop" },
    ],
  },
  {
    title: "Ridge Chapel",
    location: "Himachal Pradesh, India",
    year: 2022,
    client: "Community Trust",
    tools: ["Rhino", "Enscape", "Premiere"],
    cover: "",
    video: "",
    palette: ["#a9b9a2", "#22301f"],
    art: 0,
    notes: [
      { label: "Format", text: "Site sequence" },
      { label: "Runtime", text: "1:50 · 4K" },
    ],
  },
];
