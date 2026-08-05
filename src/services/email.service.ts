import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true,
  debug: true,
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

export async function sendPasswordResetEmail(to: string, name: string, otp: string) {
  await transporter.sendMail({
    from: `"FirstChoice" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your FirstChoice password',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto;">
        <div style="background:#0a6e4f; padding: 24px; border-radius: 16px 16px 0 0; text-align:center;">
          <h1 style="color:#fff; margin:0; font-size:20px;">FirstChoice</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 16px 16px;">
          <p>Hi ${name},</p>
          <p>Use this code to reset your password. It expires in 15 minutes.</p>
          <div style="font-size: 17px; font-weight: 800; letter-spacing: 6px; text-align:center; padding: 16px; background:#f5f5f5; border-radius: 12px; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color:#888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}