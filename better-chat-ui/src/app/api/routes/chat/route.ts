import { NextResponse } from 'next/server';

// Backend URL that points to the Docker container
const BACKEND_URL = "http://localhost:8080/api/routes/chat/";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log(`Proxying request to Docker backend: ${BACKEND_URL}`);
    
    const backendResponse = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${backendResponse.status}`, errorText);
      return NextResponse.json(
        { error: `Docker backend returned status ${backendResponse.status}`, details: errorText },
        { status: backendResponse.status }
      );
    }
    
    const responseData = await backendResponse.json();
    console.log('Successful response from Docker backend', responseData);
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    );
  }
} 