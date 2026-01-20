import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { message, email } = await request.json();

    if (!message || !email) {
      return NextResponse.json({ error: "Missing message or email" }, { status: 400 });
    }

    await sgMail.send({
      to: "bdecrem@kochi.to",
      from: "Kochito Labs <amber@intheamber.com>",
      replyTo: email,
      subject: `[Kochito Labs] Message from ${email}`,
      text: `New message via the easter egg CLI:\n\n${message}\n\n—\nFrom: ${email}`,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send contact email:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
