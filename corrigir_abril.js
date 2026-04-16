
const supabaseUrl = "https://kzlhfdnhcmbctffkhmzg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI";

async function corrigirAbril() {
  console.log('--- Corrigindo registro de Abril para aparecer na Gestão de Contas ---');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.9471504b-952f-45c6-a85b-98b04fac428b`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        transaction_type: 'recurring',
        is_recurring: false
      })
    });
    
    if (response.ok) {
      console.log('Sucesso! Abril corrigido.');
    } else {
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
    }
  } catch (e) {
    console.error('Falha na conexão:', e.message);
  }
}

corrigirAbril();
