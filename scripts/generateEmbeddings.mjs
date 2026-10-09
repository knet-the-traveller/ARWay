import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const sceneries = [
  { id: "rizal-park", name: "Rizal Park (Luneta)", image: "public/sceneries/Luneta.jpg" },
  { id: "manila-baywalk", name: "Manila Baywalk (Bay sunset)", image: "public/sceneries/manila-baywalk.jpg" },
  { id: "intramuros", name: "Intramuros", image: "public/sceneries/Intramuros.jpg" },
  { id: "fort-santiago", name: "Fort Santiago", image: "public/sceneries/Fort-Santiago-Intramuros.avif" },
  { id: "manila-cathedral", name: "Manila Cathedral", image: "public/sceneries/Manila-Cathedral.jpg" },
  { id: "binondo", name: "Binondo (Chinatown)", image: "public/sceneries/Binondo-Chinatown.jpg" },
  { id: "paco-park", name: "Paco Park", image: "public/sceneries/Paco-Park.jpg" },
  { id: "pasig-river-esplanade", name: "Pasig River Esplanade", image: "public/sceneries/Pasig-River-Esplanade.jpg" },
  { id: "manila-bay-dolomite", name: "Manila Bay Dolomite Beach", image: "public/sceneries/Dolomite-Beach.jpg" },
  { id: "ccp-complex", name: "CCP Complex", image: "public/sceneries/CCP-Complex.jpeg" },
  { id: "sm-by-the-bay", name: "SM by the Bay / MOA Seaside Blvd", image: "public/sceneries/SM-MOA.jpg" },
  { id: "ayala-triangle", name: "Ayala Triangle Gardens", image: "public/sceneries/Ayala-Triangle.jpg" },
  { id: "greenbelt-park", name: "Greenbelt Park", image: "public/sceneries/Greenbelt.jpg" },
  { id: "sm-makati", name: "SM Makati", image: "public/sceneries/sm-makati.jpg" }
];

function normalizeVector(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i] * arr[i];
  }
  const norm = Math.sqrt(sum);
  if (norm > 0) {
    return Array.from(arr).map(v => Number((v / norm).toFixed(6)));
  }
  return Array.from(arr);
}

async function run() {
  console.log("Loading @huggingface/transformers CLIP pipeline...");
  const { pipeline, RawImage } = await import("@huggingface/transformers");
  const extractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");

  const results = [];

  for (let i = 0; i < sceneries.length; i++) {
    const s = sceneries[i];
    const imgFullPath = path.join(rootDir, s.image);
    console.log(`[${i + 1}/${sceneries.length}] Embedding ${s.name} (${s.image})...`);

    if (!fs.existsSync(imgFullPath)) {
      console.warn(`File not found: ${imgFullPath}`);
      continue;
    }

    try {
      const rawImg = await RawImage.read(imgFullPath);
      const out = await extractor(rawImg);
      const vector = normalizeVector(out.data);
      results.push({
        placeId: s.id,
        name: s.name,
        vector
      });
      console.log(`  ✓ Successfully embedded ${s.name} (length: ${vector.length})`);
    } catch (err) {
      console.error(`  ✗ Error embedding ${s.name}:`, err);
    }
  }

  const outFilePath = path.join(rootDir, "src", "lib", "precomputedEmbeddings.json");
  fs.writeFileSync(outFilePath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n🎉 Generated ${results.length} embeddings -> saved to ${outFilePath}`);
}

run().catch(console.error);
