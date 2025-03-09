import { NextResponse } from "next/server";

// Backend URL that points to the Docker container's internal API
// In Docker, we can use the internal hostname (localhost) since both services are in the same container
const BACKEND_URL = "http://localhost:8080/api/routes/chat/";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log(`Proxying request to backend: ${BACKEND_URL}`);

    const backendResponse = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${backendResponse.status}`, errorText);
      return NextResponse.json(
        {
          error: `Backend returned status ${backendResponse.status}`,
          details: errorText,
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();
    console.log("Successful response from backend", responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Failed to process request", message: String(error) },
      { status: 500 }
    );
  }
}
