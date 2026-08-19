import nodemailer from "nodemailer";
import { env } from "../config/env";

export async function sendWelcomeEmail(to: string, name: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: env.FROM_EMAIL, to,
    subject: "Welcome to NaviAssist",
    html: `<h1>Welcome, ${name}!</h1><p>Your NaviAssist account is ready.</p>`,
  });
}

export async function sendSosEmail(to: string, userName: string, location: { lat: number; lng: number }) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}`;
  await transporter.sendMail({
    from: env.FROM_EMAIL, to,
    subject: `🚨 SOS Alert from ${userName}`,
    html: `<h2>Emergency Alert</h2><p><strong>${userName}</strong> triggered SOS.</p><p><a href="${mapsUrl}">View location</a></p>`,
  });
}
