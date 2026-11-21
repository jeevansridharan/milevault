/**
 * scripts/_nuke-by-addr.mjs — delete by contract_address (bypass id confusion)
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
let SUPABASE_URL = '', SUPABASE_KEY = ''
const bEnv = fs.readFileSync('backend/.env', 'utf8')
for (const line of bEnv.split(/\r?\n/)) {
    const [k, ...rest] = line.split('='); const v = rest.join('=').trim()
    if (k?.trim() === 'SUPABASE_URL') SUPABASE_URL = v
    if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = v
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const STALE_ADDR = 'bitcoincash:p0dkkwwauerhqass2qd36q3htnum5vz769nf0sh79wuczkkkxkz9cea98s5za'

// First: show ALL rows with this address
const { data: rows } = await supabase.from('contracts').select('*').eq('contract_address', STALE_ADDR)
console.log('Rows with stale address:', JSON.stringify(rows, null, 2))

// Delete by address
const { data: del, error } = await supabase.from('contracts').delete().eq('contract_address', STALE_ADDR).select()
console.log('Delete error:', error)
console.log('Deleted rows:', del)

// Final state
const { data: all } = await supabase.from('contracts').select('id, project_id, contract_address, oracle_pubkey')
console.log('\nFinal contracts table (' + (all?.length ?? 0) + ' rows):')
for (const r of all ?? []) console.log(' ', r.id, r.contract_address, r.oracle_pubkey?.slice(0, 12) + '...')
