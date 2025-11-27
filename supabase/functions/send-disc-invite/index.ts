import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscInviteRequest {
  name: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email }: DiscInviteRequest = await req.json();

    // Validação básica
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Nome e email são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Se RESEND_API_KEY não estiver configurada, simular envio
    if (!resendApiKey) {
      console.log('=== SIMULAÇÃO DE ENVIO DE EMAIL ===');
      console.log(`Para: ${email}`);
      console.log(`Nome: ${name}`);
      console.log('Assunto: Convite para mapeamento DISC - Rhitmo');
      console.log('Corpo:');
      console.log(`Olá ${name},`);
      console.log('');
      console.log('Seu gestor convidou você para o Rhitmo.');
      console.log('Por favor, complete seu perfil comportamental neste link:');
      console.log('https://exemplo.com/disc-assessment/abc123');
      console.log('');
      console.log('Este link é válido por 7 dias.');
      console.log('');
      console.log('Atenciosamente,');
      console.log('Equipe Rhitmo');
      console.log('===================================');

      return new Response(
        JSON.stringify({ 
          success: true, 
          simulated: true,
          message: 'Email simulado com sucesso (RESEND_API_KEY não configurada)'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Se RESEND_API_KEY estiver configurada, enviar email real via Resend
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Rhitmo <onboarding@resend.dev>',
          to: [email],
          subject: 'Convite para mapeamento DISC - Rhitmo',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Olá ${name}!</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #666;">
                Seu gestor convidou você para o <strong>Rhitmo</strong>, nossa plataforma de gestão de performance contínua.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #666;">
                Para começar, complete seu perfil comportamental DISC clicando no botão abaixo:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://exemplo.com/disc-assessment/abc123" 
                   style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Completar Perfil DISC
                </a>
              </div>
              <p style="font-size: 14px; color: #999;">
                Este link é válido por 7 dias.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="font-size: 12px; color: #999;">
                Atenciosamente,<br>
                <strong>Equipe Rhitmo</strong>
              </p>
            </div>
          `,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
      }

      const emailData = await resendResponse.json();
      console.log('Email enviado com sucesso via Resend:', emailData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          simulated: false,
          emailId: emailData.id 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (resendError: any) {
      console.error('Erro ao enviar via Resend:', resendError);
      throw resendError;
    }
  } catch (error: any) {
    console.error('Erro ao enviar convite DISC:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
