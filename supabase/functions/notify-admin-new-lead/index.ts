import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ADMIN_EMAIL = "matheus@rhitmo.co";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    email: string;
    name?: string;
    phone?: string;
    team_size?: string;
    created_at: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log('📨 Novo lead recebido:', payload);

    const { record } = payload;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    // Enviar email de notificação para admin
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rhitmo <noreply@rhitmo.co>',
        to: [ADMIN_EMAIL],
        subject: `🚀 Novo Lead na Fila: ${record.email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7C3AED;">🚀 Novo Lead!</h1>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Um novo interessado acabou de se cadastrar na lista de espera.
            </p>
            
            <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📧 Email:</strong> ${record.email}</p>
              ${record.name ? `<p><strong>👤 Nome:</strong> ${record.name}</p>` : ''}
              ${record.phone ? `<p><strong>📱 Telefone:</strong> ${record.phone}</p>` : ''}
              ${record.team_size ? `<p><strong>👥 Tamanho do time:</strong> ${record.team_size}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://rhitmo.co/admin" 
                 style="background-color: #7C3AED; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Acessar Painel Admin
              </a>
            </div>
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Rhitmo • Gestão de Performance Contínua
            </p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Erro Resend:', errorData);
      throw new Error(`Resend error: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await resendResponse.json();
    console.log('✅ Notificação enviada para admin:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro na notificação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
