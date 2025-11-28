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
    
    // Se RESEND_API_KEY não estiver configurada, simular envio
    if (!resendApiKey) {
      console.log('=== SIMULAÇÃO DE ENVIO DE EMAIL ===');
      console.log(`Para: ${email}`);
      console.log(`Nome: ${name}`);
      console.log('Assunto: Complete seu Rhitmo Sync - Apenas 1 minuto! ⚡');
      console.log('Corpo:');
      console.log(`Olá ${name},`);
      console.log('');
      console.log('Seu gestor convidou você para o Rhitmo.');
      console.log('Complete seu perfil de trabalho em apenas 1 minuto:');
      console.log(syncUrl);
      console.log('');
      console.log('São apenas 5 perguntas rápidas sobre suas preferências de trabalho.');
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
        console.error('Erro Resend:', errorData);
        
        // Detectar erro de validação de domínio (403)
        if (errorData.statusCode === 403 && errorData.name === 'validation_error') {
          console.log('⚠️ Resend requer domínio verificado. Simulando envio...');
          
          // Simular o envio em vez de falhar
          console.log('=== EMAIL BLOQUEADO PELO RESEND (domínio não verificado) ===');
          console.log(`Para: ${email}`);
          console.log(`Nome: ${name}`);
          console.log(`Link: ${syncUrl}`);
          console.log('Ação necessária: Verifique um domínio em https://resend.com/domains');
          console.log('=============================================================');
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              simulated: true,
              reason: 'domain_not_verified',
              message: 'Email não enviado: domínio não verificado no Resend. Verifique um domínio em resend.com/domains'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
      }

      const emailData = await resendResponse.json();
      console.log('✅ Email enviado com sucesso via Resend:', emailData);

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
