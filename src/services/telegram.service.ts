// // services/telegram.service.ts
// import crypto from 'crypto';
// import { prisma } from '../config/prisma';


// const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME!; // e.g. "FirstChoiceAlertsBot" — no @

// const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
// const API = `https://api.telegram.org/bot${BOT_TOKEN}`;


// export async function sendTelegramMessage(chatId: string, text: string) {
//   try {
//     const res = await fetch(`${API}/sendMessage`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         chat_id: chatId,
//         text,
//         parse_mode: 'HTML',
//       }),
//     });
//     const data = await res.json();
//     if (!data.ok) console.error('[telegram] send failed:', data.description);
//     return data.ok;
//   } catch (err) {
//     console.error('[telegram] send error:', err);
//     return false;
//   }
// }

// export async function sendTelegramToMany(chatIds: string[], text: string) {
//   await Promise.allSettled(chatIds.map((id) => sendTelegramMessage(id, text)));
// }

// export async function generateTelegramLink(userId: string) {
//   const code = crypto.randomBytes(8).toString('hex');

//   await prisma.user.update({
//     where: { id: userId },
//     data: {
//       telegramLinkCode: code,
//       telegramLinkCodeExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 min
//     },
//   });

//   return `https://t.me/${BOT_USERNAME}?start=${code}`;
// }