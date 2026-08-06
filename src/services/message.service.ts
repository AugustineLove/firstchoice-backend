// services/messageService.ts
const MESSAGE_ENDPOINT = 'https://susu-pro-backend.onrender.com/api/messages/send-customer';

interface SendMessageResponse {
  status: string;
  message?: string;
}

interface SendMessagePayload {
  messageTo: string | string[];
  messageFrom: string;
  message: string;
}

export async function sendCustomerMessage(payload: SendMessagePayload): Promise<boolean> {
  try {
    const res = await fetch(MESSAGE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const json = (await res.json()) as SendMessageResponse;
    if (json.status !== 'success') throw new Error(json.message || 'Failed to send message');
    return true;
  } catch (err) {
    console.error('Error sending customer message:', err);
    return false; // never throw — a failed SMS shouldn't fail the order
  }
}