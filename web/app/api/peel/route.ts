import { NextResponse } from "next/server";

const FAL_KEY = process.env.FAL_API_KEY;
const FAL_ENDPOINT = "https://fal.run/fal-ai/qwen-image-layered";

export async function POST(req: Request) {
  if (!FAL_KEY) {
    return NextResponse.json(
      { error: "FAL API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { image_url, num_layers = 4, prompt } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: "image_url is required" },
        { status: 400 }
      );
    }

    // Validate num_layers (1-10 per API docs)
    const validLayers = Math.min(Math.max(1, num_layers), 10);

    const response = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url,
        num_layers: validLayers,
        ...(prompt && { prompt }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Peel API] fal.ai error:", errorData);
      return NextResponse.json(
        { error: errorData.message || "Failed to process image" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Peel API] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong processing the image." },
      { status: 500 }
    );
  }
}
