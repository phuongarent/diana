// Auth routes disabled for now — project focus is on API keys (create/list).
// This route intentionally returns 404 to indicate auth is disabled.
export async function GET() {
  return new Response(JSON.stringify({ error: "authentication disabled" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(request: Request) {
  return GET();
}

export async function PUT(request: Request) {
  return GET();
}

export async function DELETE(request: Request) {
  return GET();
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

