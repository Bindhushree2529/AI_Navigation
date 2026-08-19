import twilio from "twilio";
import { redis } from "../config/redis";
import { env } from "../config/env";

const OTP_TTL = 300; // 5 minutes
const OTP_KEY = (phone: string) => `otp:${phone}`;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(phone: string): Promise<string> {
  const otp = generateOtp();
  await redis.setex(OTP_KEY(phone), OTP_TTL, otp);

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your NaviAssist OTP is: ${otp}. Valid for 5 minutes.`,
      from: env.TWILIO_PHONE!,
      to: phone,
    });
    return "";
  }
  console.info(`[DEV] OTP for ${phone}: ${otp}`);
  return otp; // return OTP in dev mode
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get(OTP_KEY(phone));
  if (!stored || stored !== otp) return false;
  await redis.del(OTP_KEY(phone));
  return true;
}
