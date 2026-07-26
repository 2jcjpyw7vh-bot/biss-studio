export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const exercise = searchParams.get("exercise");

  if (!exercise) {
    return Response.json(
      { error: "Missing exercise" },
      { status: 400 }
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing YouTube API key" },
      { status: 500 }
    );
  }

  const query = `${exercise} exercise proper form tutorial`;

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet` +
    `&type=video` +
    `&maxResults=5` +
    `&videoEmbeddable=true` +
    `&videoDuration=short` +
    `&safeSearch=strict` +
    `&q=${encodeURIComponent(query)}` +
    `&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "YouTube search failed" },
        { status: response.status }
      );
    }

   const preferred =
  data.items?.find(item => {
    const title = item.snippet?.title?.toLowerCase() || "";
    return (
      title.includes("how to") ||
      title.includes("proper form") ||
      title.includes("tutorial") ||
      title.includes("technique")
    );
  }) || data.items?.[0];

const videoId = preferred?.id?.videoId;

    if (!videoId) {
      return Response.json({ videoUrl: "" });
    }

    return Response.json({
      videoUrl: `https://www.youtube.com/embed/${videoId}`
    });
  } catch (error) {
    return Response.json(
      { error: "Video search failed" },
      { status: 500 }
    );
  }
}
