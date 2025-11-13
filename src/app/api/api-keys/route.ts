import { NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';
import { addApiKey as addInMemoryApiKey, getApiKeysForUser as getInMemoryApiKeysForUser } from '@/app/lib/inMemoryStore';

export async function GET() {
  const user = await getSessionUser();
  const userId = user?.id ?? process.env.NOAUTH_USER_ID;

  // If no userId is available (no session and NOAUTH_USER_ID not configured),
  // return an empty list to avoid querying the DB with an invalid UUID.
  if (!userId) {
    return NextResponse.json([]);
  }

  try {
    const { data, error } = await supabase.from('api_keys').select('*').eq('user_id', userId);
    if (error) {
      console.error('Error fetching API keys (DB):', error);
      // fallback to in-memory store
      const mem = getInMemoryApiKeysForUser(userId);
      return NextResponse.json(mem);
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching API keys (exception):', err);
    const mem = getInMemoryApiKeysForUser(userId);
    return NextResponse.json(mem);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const userId = user?.id ?? process.env.NOAUTH_USER_ID;

  // Creating a key without a user is not allowed when NOAUTH_USER_ID is not set.
  if (!userId) {
    return NextResponse.json(
      { error: "No user available. Set NOAUTH_USER_ID in .env.local or enable auth." },
      { status: 400 }
    );
  }

  const { name, limit } = await request.json();
  const newKeyValue = `dandi-${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

  const insertObj: Record<string, any> = {
    name,
    value: newKeyValue,
    usage: 0,
    user_id: userId,
  };
  if (typeof limit !== 'undefined') {
    insertObj.limit = limit;
  }
  // Try insert into DB first; on DB failure fallback to in-memory store.
  try {
    // Try DB insert (existing behavior with limit conditional)
    try {
      const res = await supabase.from('api_keys').insert([insertObj]).select();
      if (!res.error && res.data) {
        return NextResponse.json(res.data[0]);
      }
      // if there is an error, throw to outer catch to handle it
      if (res.error) throw res.error;
    } catch (dbErr: any) {
      console.error('Error creating API key (DB):', dbErr);
      // If DB complains about missing `limit`, try retry without limit
      const message = dbErr?.message || '';
      const code = dbErr?.code || '';
      if ((message && message.toLowerCase().includes("could not find the 'limit'")) || code === 'PGRST204') {
        delete insertObj.limit;
        try {
          const res2 = await supabase.from('api_keys').insert([insertObj]).select();
          if (!res2.error && res2.data) {
            return NextResponse.json(res2.data[0]);
          }
          if (res2.error) throw res2.error;
        } catch (dbErr2: any) {
          console.error('Retry insert without limit failed (DB):', dbErr2);
          // fall through to in-memory fallback below
        }
      }
      // If DB duplicate PK error, try quick-hack generation (as before)
      if (code === '23505') {
        try {
          const { randomUUID } = await import('crypto');
          insertObj.user_id = randomUUID();
          const retryRes = await supabase.from('api_keys').insert([insertObj]).select();
          if (!retryRes.error && retryRes.data) {
            return NextResponse.json(retryRes.data[0]);
          }
          console.error('Retry after generating new user_id failed (DB):', retryRes.error);
          // fall through to in-memory fallback
        } catch (retryErr) {
          console.error('Retry insert after generating user_id threw (DB):', retryErr);
        }
      }
    }
  } catch (err) {
    console.error('Unexpected DB error creating API key:', err);
  }

  // Fallback: store in-memory for dev when DB is not usable.
  try {
    const { randomUUID } = await import('crypto');
    const memEntry = {
      id: randomUUID(),
      name: insertObj.name,
      value: insertObj.value,
      usage: insertObj.usage ?? 0,
      user_id: insertObj.user_id,
      created_at: new Date().toISOString(),
      ...(insertObj.limit ? { limit: insertObj.limit } : {}),
    };
    addInMemoryApiKey(memEntry);
    console.warn('Fell back to in-memory API keys store (dev-only).');
    return NextResponse.json(memEntry);
  } catch (memErr) {
    console.error('Failed to store API key in-memory fallback:', memErr);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}