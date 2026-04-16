
const supabaseUrl = "https://kzlhfdnhcmbctffkhmzg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI";

async function checarPerfil() {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.5ab1df69-b67f-493c-b4dd-8f7b950049ac`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await response.json();
  console.log('Perfil:', JSON.stringify(data));
}
checarPerfil();
