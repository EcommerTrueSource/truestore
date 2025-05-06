import emailjs from '@emailjs/browser';

interface EmailParams {
  from_name: string;
  from_email: string;
  subject: string;
  message: string;
  [key: string]: unknown;
}

// Validação básica de email
function isValidEmail(email: string): boolean {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Serviço para envio de emails usando EmailJS
 */
export const EmailService = {
  /**
   * Inicializa o EmailJS com a chave pública
   */
  init(): void {
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init(publicKey);
    }
  },

  /**
   * Envia um email usando EmailJS
   * @param params Parâmetros do email a ser enviado
   * @returns Promise com o resultado do envio
   */
  async sendContactEmail(params: EmailParams): Promise<{ success: boolean; message: string }> {
    try {
      // Validação básica dos campos
      if (!params.from_name || params.from_name.trim().length < 3) {
        return {
          success: false,
          message: 'Por favor, informe seu nome completo',
        };
      }
      
      if (!params.from_email || !isValidEmail(params.from_email)) {
        return {
          success: false,
          message: 'Por favor, informe um endereço de email válido',
        };
      }
      
      if (!params.subject || params.subject.trim().length < 3) {
        return {
          success: false,
          message: 'Por favor, informe um assunto para a mensagem',
        };
      }
      
      if (!params.message || params.message.trim().length < 10) {
        return {
          success: false,
          message: 'Por favor, escreva uma mensagem com pelo menos 10 caracteres',
        };
      }

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        console.error('Variáveis de ambiente do EmailJS não foram configuradas');
        return {
          success: false,
          message: 'Configuração do serviço de email não está completa',
        };
      }

      const result = await emailjs.send(serviceId, templateId, params, publicKey);
      return {
        success: true,
        message: 'Email enviado com sucesso!',
      };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return {
        success: false,
        message: 'Ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.',
      };
    }
  },
};

export default EmailService; 