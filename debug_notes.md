# Debugging Supabase 400 Error

## Problem
The user receives "Erro ao salvar" and a 400 Bad Request in the console when trying to pay a bill ("BAIXAR CONTA").

## Evidence from Screenshot
- Console shows 400 errors on Supabase URLs.
- Fragments of URLs: `user_id%22:1` and `year%22&select=*`.
- This suggests a malformed `select` or `filter` query.

## Hypotheses
1. **Column Name Mismatch**: The code uses `invoice_month_year` but the DB might have `invoice_date` (or vice versa).
2. **Missing Columns**: `payment_date` might be missing if the migration wasn't run, but we are currently NOT sending it in writes (per user's manual purge).
3. **Invalid Data Types**: Sending `1` instead of a UUID for `user_id`. (Though the console fragment might be misleading).
4. **URL Encoding / Syntax**: A weird character in a description or a malformed `eq()` filter.

## Plan
1. [ ] Check `payBill` and `addTransaction` logic in `useFinanceStore.tsx`.
2. [ ] Verify column names in `supabase_schema_v2_1.sql` vs current code.
3. [ ] Check `TransactionList.tsx` for how it calls `onPayBill`.
4. [ ] Verify if `user_id` is correctly retrieved and passed.
