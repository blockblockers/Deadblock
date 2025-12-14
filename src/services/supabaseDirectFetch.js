// Supabase Direct Fetch Helper
// Bypasses Supabase JS client timeout issues by using direct REST API calls

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';

export const getAuthHeaders = () => {
  const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!authData?.access_token || !ANON_KEY) {
    return null;
  }
  
  return {
    'Authorization': `Bearer ${authData.access_token}`,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
};

export const getCurrentUserId = () => {
  const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  return authData?.user?.id || null;
};

// Direct fetch wrapper for SELECT queries
export const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: { message: 'Not authenticated' } };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = [];
  
  if (options.select) params.push(`select=${encodeURIComponent(options.select)}`);
  if (options.eq) Object.entries(options.eq).forEach(([k, v]) => params.push(`${k}=eq.${v}`));
  if (options.neq) Object.entries(options.neq).forEach(([k, v]) => params.push(`${k}=neq.${v}`));
  if (options.gt) Object.entries(options.gt).forEach(([k, v]) => params.push(`${k}=gt.${v}`));
  if (options.gte) Object.entries(options.gte).forEach(([k, v]) => params.push(`${k}=gte.${v}`));
  if (options.lt) Object.entries(options.lt).forEach(([k, v]) => params.push(`${k}=lt.${v}`));
  if (options.lte) Object.entries(options.lte).forEach(([k, v]) => params.push(`${k}=lte.${v}`));
  if (options.in) Object.entries(options.in).forEach(([k, v]) => params.push(`${k}=in.(${v.join(',')})`));
  if (options.or) params.push(`or=(${options.or})`);
  if (options.order) params.push(`order=${options.order}`);
  if (options.limit) params.push(`limit=${options.limit}`);
  if (options.single) headers['Accept'] = 'application/vnd.pgrst.object+json';
  
  if (params.length) url += '?' + params.join('&');
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { data: null, error };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
};

// Direct fetch wrapper for INSERT
export const dbInsert = async (table, data, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: { message: 'Not authenticated' } };
  
  if (options.returning) headers['Prefer'] = 'return=representation';
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (options.select) url += `?select=${encodeURIComponent(options.select)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { data: null, error };
    }
    const result = await response.json();
    return { data: options.single ? result[0] : result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
};

// Direct fetch wrapper for UPDATE
export const dbUpdate = async (table, data, filters, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: { message: 'Not authenticated' } };
  
  if (options.returning) headers['Prefer'] = 'return=representation';
  
  const params = [];
  if (filters.eq) Object.entries(filters.eq).forEach(([k, v]) => params.push(`${k}=eq.${v}`));
  if (filters.or) params.push(`or=(${filters.or})`);
  if (options.select) params.push(`select=${encodeURIComponent(options.select)}`);
  
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.join('&')}`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { data: null, error };
    }
    const result = await response.json();
    return { data: options.single ? result[0] : result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
};

// Direct fetch wrapper for DELETE
export const dbDelete = async (table, filters) => {
  const headers = getAuthHeaders();
  if (!headers) return { error: { message: 'Not authenticated' } };
  
  const params = [];
  if (filters.eq) Object.entries(filters.eq).forEach(([k, v]) => params.push(`${k}=eq.${v}`));
  if (filters.or) params.push(`or=(${filters.or})`);
  
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.join('&')}`;
  
  try {
    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { error };
    }
    return { error: null };
  } catch (e) {
    return { error: { message: e.message } };
  }
};

// Direct fetch wrapper for RPC calls
export const dbRpc = async (functionName, params = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: { message: 'Not authenticated' } };
  
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return { data: null, error };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
};

// Count query
export const dbCount = async (table, filters = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { count: null, error: { message: 'Not authenticated' } };
  
  headers['Prefer'] = 'count=exact';
  headers['Range-Unit'] = 'items';
  headers['Range'] = '0-0';
  
  const params = ['select=id'];
  if (filters.eq) Object.entries(filters.eq).forEach(([k, v]) => params.push(`${k}=eq.${v}`));
  if (filters.gt) Object.entries(filters.gt).forEach(([k, v]) => params.push(`${k}=gt.${v}`));
  
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.join('&')}`;
  
  try {
    const response = await fetch(url, { headers });
    const contentRange = response.headers.get('content-range');
    const count = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    return { count, error: null };
  } catch (e) {
    return { count: null, error: { message: e.message } };
  }
};

export { SUPABASE_URL };
