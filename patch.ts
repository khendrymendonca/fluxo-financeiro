import { readFile, writeFile } from 'fs/promises';
const run = async () => {
    const content = await readFile('src/hooks/useTransactionMutations.ts', 'utf8');
    const lines = content.split('\n');
    const start = lines.findIndex(l => l.includes('// Detectar se é uma transação virtual'));
    const end = lines.findIndex((l, i) => i > start && l.trim() === '},' && lines[i + 1]?.includes('onMutate:'));

    if (start === -1 || end === -1) throw new Error('Not found');

    const newBlock = `      // Detectar se é uma transação virtual
      const isVirtual = id.includes('-virtual-');
      const realId = isVirtual ? id.split('-virtual-')[0] : id;

      // Buscar a transação base no banco
      const { data: currentTx } = await supabase.from('transactions').select('*').eq('id', realId).single();
      if (!currentTx) throw new Error('Transação base não encontrada');

      const groupId = currentTx.installment_group_id;
      const originalId = currentTx.original_id || (currentTx.is_recurring ? currentTx.id : null);
      
      const isRecurringMother = !isVirtual && currentTx.is_recurring && !currentTx.original_id;

      // ======================================================================
      // CASO A e C: isVirtual ou isRecurringMother + applyScope='this'
      // ======================================================================
      if (applyScope === 'this' && (isVirtual || isRecurringMother)) {
        let targetDate = currentTx.date.slice(0, 10);
        
        if (isVirtual) {
          const virtualParts = id.split('-virtual-');
          if (virtualParts.length === 2) {
            const [yearStr, monthStr] = virtualParts[1].split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr); // 0-based
            const originalDay = new Date(currentTx.date).getDate();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDay);
            targetDate = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(safeDay).padStart(2, '0')}\`;
          }
        } else {
          targetDate = updates.date ? updates.date.slice(0, 10) : currentTx.date.slice(0, 10);
        }

        const { error } = await supabase.from('transactions').insert({
          ...currentTx,
          id: undefined,
          amount: updates.amount ?? currentTx.amount,
          date: targetDate,
          original_id: realId,
          is_recurring: false,
          transaction_type: 'punctual',
          is_paid: false,
          payment_date: null,
          deleted_at: null,
          created_at: undefined,
        });
        if (error) throw error;
        return [];
      }

      // ======================================================================
      // CASO B e D: isVirtual ou isRecurringMother + applyScope='future'
      // ======================================================================
      if (applyScope === 'future' && (isVirtual || isRecurringMother)) {
        await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', realId);

        let targetDate = currentTx.date.slice(0, 10);
        if (isVirtual) {
          const parts = id.split('-virtual-');
          if (parts.length === 2) {
            const [yearStr, monthStr] = parts[1].split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            const originalDay = new Date(currentTx.date).getDate();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDay);
            targetDate = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(safeDay).padStart(2, '0')}\`;
          }
        } else {
          targetDate = updates.date ? updates.date.slice(0, 10) : currentTx.date.slice(0, 10);
        }

        const finalDate = updates.date ? updates.date.slice(0, 10) : targetDate;

        await supabase.from('transactions').insert({
          ...currentTx,
          id: undefined,
          amount: updates.amount ?? currentTx.amount,
          date: finalDate,
          description: updates.description ?? currentTx.description,
          is_recurring: true,
          original_id: null,
          is_paid: false,
          payment_date: null,
          deleted_at: null,
          created_at: undefined,
        });

        const { date: _d, ...childUpdates } = dbUpdates;
        if (Object.keys(childUpdates).length > 0) {
          await supabase.from('transactions')
            .update(childUpdates)
            .eq('original_id', realId)
            .gte('date', targetDate)
            .eq('is_paid', false)
            .is('deleted_at', null);
        }
        return [];
      }

      // ======================================================================
      // CASO E: isVirtual ou isRecurringMother + applyScope='all'
      // ======================================================================
      if (applyScope === 'all' && (isVirtual || isRecurringMother)) {
        const { date: _ignoredDate, ...motherUpdates } = dbUpdates;
        if (Object.keys(motherUpdates).length > 0) {
          const { data, error } = await supabase.from('transactions')
            .update(motherUpdates)
            .or(\`id.eq.\${realId},original_id.eq.\${realId}\`)
            .eq('is_paid', false)
            .is('deleted_at', null)
            .select();
          if (error) { logSafeError('useUpdateTransaction (bulk all)', error); throw error; }
          return data || [];
        }
        return [];
      }

      // ======================================================================
      // CASO F: Transação normal pontual ou Fluxo de Cartão/Parcelamento
      // ======================================================================
      if (applyScope === 'this' || (!groupId && !originalId)) {
        const { data, error } = await supabase.from('transactions').update(dbUpdates).eq('id', realId).select();
        if (error) { logSafeError('useUpdateTransaction (single)', error); throw error; }
        return data || [];
      }

      const targetDateToApply = referenceDate ?? currentTx.date;
      
      if (applyScope === 'all') {
        let query = supabase.from('transactions').update(dbUpdates).eq('is_paid', false).is('deleted_at', null);
        if (groupId) query = query.eq('installment_group_id', groupId);
        else if (originalId) query = query.or(\`id.eq.\${originalId},original_id.eq.\${originalId}\`);
        const { data, error } = await query.select();
        if (error) throw error;
        return data || [];
      }

      if (applyScope === 'future') {
        if (groupId) {
          const { data, error } = await supabase.from('transactions').update(dbUpdates)
            .eq('installment_group_id', groupId).gte('date', targetDateToApply).eq('is_paid', false).is('deleted_at', null).select();
          if (error) throw error;
          return data || [];
        } else if (originalId) {
          const { date: _d, ...motherUpdates } = dbUpdates;
          if (Object.keys(motherUpdates).length > 0) {
            await supabase.from('transactions').update(motherUpdates).eq('id', originalId).eq('is_paid', false).is('deleted_at', null);
          }
          if (Object.keys(dbUpdates).length > 0) {
            const { data, error } = await supabase.from('transactions').update(dbUpdates).eq('original_id', originalId)
              .gte('date', targetDateToApply).eq('is_paid', false).is('deleted_at', null).select();
            if (error) throw error;
            return data || [];
          }
        }
      }
      return [];`;

    const newLines = [...lines.slice(0, start), newBlock, ...lines.slice(end)];
    await writeFile('src/hooks/useTransactionMutations.ts', newLines.join('\n'));
};
run().catch(console.error);
