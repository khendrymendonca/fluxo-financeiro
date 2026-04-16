
const supabaseUrl = "https://kzlhfdnhcmbctffkhmzg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI";
const userId = "5ab1df69-b67f-493c-b4dd-8f7b950049ac";

async function limparSalarioDuplicado() {
  console.log('--- Removendo Salário duplicado do dia 02/04 ---');
  
  // Vamos tentar deletar pelo critério exato do dia 02 que sobrou do split
  const response = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${userId}&description=ilike.Salário&date=eq.2026-04-02`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 204 || response.ok) {
    console.log('Sucesso! O Salário do dia 02 foi removido.');
  } else {
    const err = await response.text();
    console.log('Erro na remoção:', err);
  }
}

limparSalarioDuplicado();
