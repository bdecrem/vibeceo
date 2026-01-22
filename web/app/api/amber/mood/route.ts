import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Mark as dynamic since we use request.url for query params
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Calculate mood quadrant from energy and valence
function getQuadrant(energy: number, valence: number): string {
  const highEnergy = energy >= 0.5;
  const outward = valence >= 0.5;

  if (highEnergy && outward) return "animated";
  if (highEnergy && !outward) return "focused";
  if (!highEnergy && outward) return "reflective";
  return "still";
}

// Get description for each quadrant
function getQuadrantDescription(quadrant: string): string {
  switch (quadrant) {
    case "animated":
      return "Bold colors and big gestures. Expressive, warm, declarative.";
    case "focused":
      return "Turned inward with intensity. Complex patterns, searching.";
    case "reflective":
      return "Gentle and open. Soft palette, slow melody, inviting.";
    case "still":
      return "Quiet contemplation. Minimal, spacious, abstract.";
    default:
      return "Steady state.";
  }
}

// Get lunar phase name
function getLunarPhaseName(phase: number): string {
  if (phase < 0.125) return "New Moon";
  if (phase < 0.25) return "Waxing Crescent";
  if (phase < 0.375) return "First Quarter";
  if (phase < 0.5) return "Waxing Gibbous";
  if (phase < 0.625) return "Full Moon";
  if (phase < 0.75) return "Waning Gibbous";
  if (phase < 0.875) return "Last Quarter";
  return "Waning Crescent";
}

interface MoodMetadata {
  date?: string;
  energy_base?: number;
  valence_base?: number;
  lunar_phase?: number;
  pulse_source?: string;
  pulse_fired?: boolean;
  weather?: { temp?: number; condition?: string };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("history") === "true";
    const historyDays = parseInt(searchParams.get("days") || "14", 10);

    // Get mood records
    const limit = includeHistory ? historyDays : 1;
    const { data, error } = await supabase
      .from("amber_state")
      .select("content, metadata, created_at")
      .eq("type", "mood")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        energy: 0.5,
        valence: 0.5,
        quadrant: "balanced",
        description: "Steady state",
        timestamp: new Date().toISOString(),
        history: [],
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        }
      });
    }

    // Current mood (most recent)
    const current = data[0];
    const metadata = current.metadata as MoodMetadata;
    const energy = metadata.energy_base ?? 0.5;
    const valence = metadata.valence_base ?? 0.5;
    const quadrant = getQuadrant(energy, valence);
    const lunarPhase = metadata.lunar_phase ?? 0;

    // Build history array
    const history = data.map((record) => {
      const meta = record.metadata as MoodMetadata;
      const e = meta.energy_base ?? 0.5;
      const v = meta.valence_base ?? 0.5;
      return {
        date: meta.date || record.content,
        energy: e,
        valence: v,
        quadrant: getQuadrant(e, v),
        pulse_source: meta.pulse_source,
        timestamp: record.created_at,
      };
    });

    return NextResponse.json({
      energy,
      valence,
      quadrant,
      description: getQuadrantDescription(quadrant),
      lunar_phase: lunarPhase,
      lunar_phase_name: getLunarPhaseName(lunarPhase),
      weather: metadata.weather,
      pulse_source: metadata.pulse_source,
      timestamp: current.created_at,
      history: includeHistory ? history : undefined,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      }
    });
  } catch (err) {
    console.error("Error fetching mood:", err);
    return NextResponse.json(
      { error: "Failed to fetch mood" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        }
      }
    );
  }
}
