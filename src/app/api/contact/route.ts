import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Envoyer l'email via le backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    try {
      const response = await fetch(`${backendUrl}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = data.detail || data.error || "Erreur lors de l'envoi de l'email";
        console.error("Erreur backend:", errorMessage);
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { message: data.message || "Message envoyé avec succès" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      return NextResponse.json(
        { error: "Impossible de contacter le serveur. Veuillez réessayer plus tard." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erreur dans la route contact:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du traitement de votre demande" },
      { status: 500 }
    );
  }
}


