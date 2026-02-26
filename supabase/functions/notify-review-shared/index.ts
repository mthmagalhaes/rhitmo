import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyRequest {
  memberName: string;
  memberEmail: string;
  leaderName: string;
  reviewTitle: string;
  reviewDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberName, memberEmail, leaderName, reviewTitle, reviewDate }: NotifyRequest = await req.json();

    if (!memberName || !memberEmail || !leaderName || !reviewTitle) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: memberName, memberEmail, leaderName, reviewTitle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const formattedDate = reviewDate
      ? new Date(reviewDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Data não especificada';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rhitmo <noreply@rhitmo.co>',
        to: [memberEmail],
        subject: `${leaderName} compartilhou sua avaliação de desempenho`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; font-size: 32px; margin: 0;">🎵 <strong>Rhitmo</strong></h1>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${memberName}! 👋</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
              Seu líder <strong>${leaderName}</strong> compartilhou sua avaliação formal de desempenho no Rhitmo.
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 2; list-style: none;">
                <li>📝 <strong>${reviewTitle}</strong></li>
                <li>📅 Gerada em ${formattedDate}</li>
                <li>🔓 Disponível no seu portal do colaborador</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://rhitmo.co/dashboard" 
                 style="background-color: #7C3AED; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                Ver minha avaliação →
              </a>
            </div>
            
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
    console.log('✅ Email de notificação enviado:', emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao enviar notificação de review:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
