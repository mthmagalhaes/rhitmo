import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOCKED_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'live.com', 'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
  'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br',
];

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return !BLOCKED_DOMAINS.includes(domain);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // optional
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function validateFullName(name: string): boolean {
  return name.trim().split(/\s+/).length >= 2;
}

const VALID_SIZES = ['100-250', '251-500', '501-1000', '1000+'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { full_name, email, company, job_title, company_size, phone, message, consent } = body;

    // Validations
    const errors: string[] = [];
    if (!full_name || !validateFullName(full_name)) errors.push('Nome completo deve ter pelo menos 2 palavras');
    if (!email || !validateEmail(email)) errors.push('Use um email corporativo');
    if (!company || company.trim().length < 3) errors.push('Empresa deve ter pelo menos 3 caracteres');
    if (!job_title || job_title.trim().length < 2) errors.push('Informe seu cargo');
    if (!company_size || !VALID_SIZES.includes(company_size)) errors.push('Selecione o número de colaboradores');
    if (phone && !validatePhone(phone)) errors.push('Telefone inválido. Use formato (XX) XXXXX-XXXX');

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join('. ') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert lead
    const { error: insertError } = await supabase.from('enterprise_leads').insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      job_title: job_title.trim(),
      company_size,
      phone: phone?.trim() || null,
      message: message?.trim() || null,
      consent: consent || false,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Erro ao salvar dados');
    }

    // Send notification email via transactional system
    try {
      await sendAppEmail('enterprise-lead', 'matheus@rhitmo.co', {
        idempotencyKey: `enterprise-lead-${email}-${Date.now()}`,
        templateData: {
          leadName: full_name.trim(),
          leadEmail: email.trim(),
          leadCompany: company.trim(),
          leadJobTitle: job_title.trim(),
          leadCompanySize: company_size,
          leadPhone: phone?.trim() || '',
          leadMessage: message?.trim() || '',
        },
      });
    } catch (emailErr) {
      console.error('Email notification error (non-blocking):', emailErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Enterprise contact error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
