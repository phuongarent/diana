import { supabase } from './supabaseClient';

interface ApiKeyData {
  id: string;
  usage: number;
  limit: number | null;
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
  try {
    // Try to select `limit` if present; fall back to selecting without `limit`.
    let apiKeyData: any = null;
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, usage, limit')
        .eq('value', apiKey)
        .maybeSingle();
      if (error) throw error;
      apiKeyData = data;
    } catch (err: any) {
      // If the error indicates the `limit` column is missing, retry without it.
      if (err && err.message && err.message.toLowerCase().includes('could not find the') && err.message.includes('limit')) {
        const { data, error } = await supabase
          .from('api_keys')
          .select('id, usage')
          .eq('value', apiKey)
          .maybeSingle();
        if (error) throw error;
        apiKeyData = data ? { ...data, limit: null } : null;
      } else {
        throw err;
      }
    }

    return apiKeyData;
  } catch (error) {
    console.error('Error validating API key:', error);
    throw error;
  }
}

export async function incrementApiKeyUsage(apiKeyData: ApiKeyData): Promise<{ success: boolean; message: string }> {
  try {
    if (apiKeyData.usage >= apiKeyData.limit) {
      return { success: false, message: 'Rate limit exceeded' };
    }

    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ usage: apiKeyData.usage + 1 })
      .eq('id', apiKeyData.id);

    if (updateError) {
      throw updateError;
    }

    return { success: true, message: 'Usage incremented successfully' };
  } catch (error) {
    console.error('Error incrementing API key usage:', error);
    throw error;
  }
}