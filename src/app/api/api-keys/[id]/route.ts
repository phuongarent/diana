import { NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';
import {
  findApiKeyById as findInMemoryApiKeyById,
  updateApiKey as updateInMemoryApiKey,
  deleteApiKey as deleteInMemoryApiKey,
} from '@/app/lib/inMemoryStore';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  const userId = user?.id ?? process.env.NOAUTH_USER_ID;

  if (!userId) {
    return NextResponse.json({ error: "No user available. Set NOAUTH_USER_ID or enable auth." }, { status: 400 });
  }
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching API key (DB):', error);
      // fallback to in-memory
      const mem = findInMemoryApiKeyById(params.id, userId);
      if (!mem) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
      return NextResponse.json(mem);
    }
    if (!data) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception fetching API key (DB):', err);
    const mem = findInMemoryApiKeyById(params.id, userId);
    if (!mem) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    return NextResponse.json(mem);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  const userId = user?.id ?? process.env.NOAUTH_USER_ID;

  if (!userId) {
    return NextResponse.json({ error: "No user available. Set NOAUTH_USER_ID or enable auth." }, { status: 400 });
  }

  const { name } = await request.json();

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ name })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select();
    if (error) {
      console.error('Error updating API key (DB):', error);
      // fallback to in-memory update
      const updated = updateInMemoryApiKey(params.id, { name }, userId);
      if (!updated) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
      return NextResponse.json(updated);
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }
    return NextResponse.json(data[0]);
  } catch (err) {
    console.error('Exception updating API key (DB):', err);
    const updated = updateInMemoryApiKey(params.id, { name }, userId);
    if (!updated) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    return NextResponse.json(updated);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  const userId = user?.id ?? process.env.NOAUTH_USER_ID;

  if (!userId) {
    return NextResponse.json({ error: "No user available. Set NOAUTH_USER_ID or enable auth." }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting API key (DB):', error);
    // fallback to in-memory delete
    const deleted = deleteInMemoryApiKey(params.id, userId);
    if (!deleted) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    return NextResponse.json({ message: 'API Key deleted (in-memory fallback)' });
  }

  return NextResponse.json({ message: 'API Key deleted successfully' });
}