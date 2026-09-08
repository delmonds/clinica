/**
 * Envio de avisos por WhatsApp.
 *
 * Enquanto nenhum provedor estiver configurado, o sistema roda em modo
 * simulado: a mensagem é apenas registrada no log do servidor e o envio é
 * considerado bem-sucedido. Para enviar de verdade, implemente a chamada HTTP
 * do seu provedor em `deliver()` e configure WHATSAPP_ENABLED=true.
 */

const BRAZIL_COUNTRY_CODE = "55";

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

async function deliver(phone: string, message: string): Promise<void> {
  if (process.env.WHATSAPP_ENABLED !== "true") {
    console.info(`[whatsapp:simulado] para ${phone}: ${message}`);
    return;
  }

  // Implemente aqui a chamada ao provedor escolhido (Twilio, Meta Cloud API,
  // Z-API...) usando as credenciais em variáveis de ambiente. Lançar um erro
  // aqui marca o aviso como não enviado, sem interromper a chamada da senha.
  throw new Error(
    "WHATSAPP_ENABLED=true mas nenhum provedor foi implementado em src/lib/whatsapp.ts.",
  );
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
