
const supabaseUrl = "https://kzlhfdnhcmbctffkhmzg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI";
const userId = "5ab1df69-b67f-493c-b4dd-8f7b950049ac";

async function limpar() {
  console.log('--- Limpando Vero ---');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${userId}&description=ilike.Vero`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Sucesso! Registros da "Vero" removidos permanentemente.');
    } else {
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
    }
  } catch (e) {
    console.error('Falha na conexão:', e.message);
  }
}

limpar();
