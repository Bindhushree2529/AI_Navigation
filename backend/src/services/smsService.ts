import twilio from "twilio";
import { env } from "../config/env";

export async function sendSosSms(to: string, userName: string, location: { lat: number; lng: number }) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return;
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const mapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  await client.messages.create({
    body: `🚨 SOS from ${userName}! Location: ${mapsUrl}`,
    from: env.TWILIO_PHONE!,
    to,
  });
}
