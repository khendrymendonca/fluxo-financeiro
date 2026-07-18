const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kzlhfdnhcmbctffkhmzg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  try {
    // 1. Buscar a transação
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', '%Abatimento%')
      .eq('amount', 70);

    if (txError) throw txError;
    console.log('--- TRANSACTIONS FOUND ---');
    console.log(txs);

    if (txs && txs.length > 0) {
      const catIds = txs.map(t => t.category_id).filter(Boolean);
      const subCatIds = txs.map(t => t.subcategory_id).filter(Boolean);

      // 2. Buscar as categorias
      if (catIds.length > 0) {
        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .in('id', catIds);
        console.log('--- CATEGORIES ---');
        console.log(cats);
      }

      // 3. Buscar as subcategorias
      if (subCatIds.length > 0) {
        const { data: subs } = await supabase
          .from('subcategories')
          .select('*')
          .in('id', subCatIds);
        console.log('--- SUBCATEGORIES ---');
        console.log(subs);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

inspect();
