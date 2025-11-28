import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscInviteRequest {
  name: string;
  email: string;
  memberId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, memberId }: DiscInviteRequest = await req.json();

    // Validação básica
    if (!name || !email || !memberId) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e memberId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construir URL dinâmica baseada no origin da requisição
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || 'http://localhost:5173';
    const syncUrl = `${origin}/sync/${memberId}`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    // Enviar email real via Resend
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Rhitmo <noreply@rhitmo.co>',
          to: [email],
          subject: 'Complete seu Rhitmo Sync - Apenas 1 minuto! ⚡',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; font-size: 32px; margin: 0;">🎵 Rhitmo</h1>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">Olá ${name}! 👋</h2>
              
              <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
                Seu gestor convidou você para o <strong>Rhitmo</strong>.
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 30px;">
                Complete seu perfil de trabalho em <strong>apenas 1 minuto</strong>. São 5 perguntas rápidas sobre suas preferências:
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 2;">
                  <li>Como você prefere receber informações</li>
                  <li>Seu estilo de feedback favorito</li>
                  <li>Seu nível de autonomia ideal</li>
                  <li>Quando você é mais produtivo</li>
                  <li>O que mais te motiva</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${syncUrl}" 
                   style="background-color: #4F46E5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Preencher Rhitmo Sync ⚡
                </a>
              </div>
              
              <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px;">
                Otimizado para celular 📱 | Leva menos de 1 minuto
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                Atenciosamente,<br>
                <strong>Equipe Rhitmo</strong>
              </p>
            </div>
          `,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('❌ Erro Resend:', errorData);
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
      }

      const emailData = await resendResponse.json();
      console.log('✅ Email enviado com sucesso via Resend:', emailData);

      return new Response(
        JSON.stringify({ 
          success: true,
          emailId: emailData.id,
          syncUrl: syncUrl
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (resendError: any) {
      console.error('❌ Erro ao enviar via Resend:', resendError);
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
