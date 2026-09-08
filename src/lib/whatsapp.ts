/**
 * Envio de avisos por WhatsApp via Twilio.
 *
 * Sem as credenciais da Twilio configuradas, o sistema roda em modo simulado:
 * a mensagem é apenas registrada no log do servidor. Basta preencher
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM para o envio
 * passar a ser real.
 */

const BRAZIL_COUNTRY_CODE = "55";
const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Normaliza um telefone digitado pela recepção para E.164 sem "+"
 * (ex: "(11) 99888-7777" -> "5511998887777"). Retorna null se o número
 * não tiver a quantidade de dígitos de um celular brasileiro.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  const withCountry = digits.startsWith(BRAZIL_COUNTRY_CODE) ? digits : `${BRAZIL_COUNTRY_CODE}${digits}`;

  // 55 + DDD (2) + número (8 ou 9 dígitos)
  if (withCountry.length < 12 || withCountry.length > 13) return null;

  return withCountry;
}

export function calledTicketMessage(params: {
  patientName: string;
  ticketNumber: number;
  queueName: string;
}): string {
  const firstName = params.patientName.trim().split(/\s+/)[0];
  return (
    `Olá, ${firstName}! Sua senha #${params.ticketNumber} (${params.queueName}) acabou de ser chamada. ` +
    `Dirija-se ao atendimento, por favor.`
  );
}

/** Endereço no formato que a Twilio espera: "whatsapp:+5511998887777". */
function whatsappAddress(phone: string): string {
  return `whatsapp:+${phone.replace(/\D/g, "")}`;
}

type TwilioConfig = { accountSid: string; authToken: string; from: string };

/**
 * Lê as credenciais da Twilio. Retorna null quando nenhuma está configurada
 * (modo simulado) e lança quando só parte delas está preenchida — assim uma
 * configuração pela metade aparece como erro em vez de virar silêncio.
 */
function readTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid && !authToken && !from) return null;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Configuração da Twilio incompleta: defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM.",
    );
  }

  return { accountSid, authToken, from };
}

async function deliver(phone: string, message: string): Promise<void> {
  const config = readTwilioConfig();

  if (!config) {
    console.info(`[whatsapp:simulado] para ${phone}: ${message}`);
    return;
  }

  const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  const response = await fetch(`${TWILIO_API_BASE}/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: whatsappAddress(phone),
      From: whatsappAddress(config.from),
      Body: message,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Twilio respondeu ${response.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Envia o aviso e informa se deu certo. Nunca lança: uma falha no WhatsApp
 * não pode impedir a recepção de chamar o paciente.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    await deliver(phone, message);
    return true;
  } catch (error) {
    console.error(`[whatsapp] falha ao enviar para ${phone}:`, error);
    return false;
  }
}
