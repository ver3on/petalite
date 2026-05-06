// ── Arrangements ──

async function fetchPublishedArrangements() {
  const { data, error } = await supabase
    .from('arrangements')
    .select('*')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchAllArrangements() {
  const { data, error } = await supabase
    .from('arrangements')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchTrashedArrangements() {
  const { data, error } = await supabase
    .from('arrangements')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function insertArrangement(payload) {
  const { data, error } = await supabase
    .from('arrangements')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateArrangement(id, payload) {
  const { data, error } = await supabase
    .from('arrangements')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function softDeleteArrangement(id) {
  const { error } = await supabase
    .from('arrangements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function restoreArrangement(id) {
  const { error } = await supabase
    .from('arrangements')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

async function permanentDeleteArrangement(id) {
  const { error } = await supabase
    .from('arrangements')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Storage ──

async function uploadArrangementPhoto(file, existingUrl = null) {
  if (existingUrl) {
    const oldPath = existingUrl.split('/arrangements/')[1];
    if (oldPath) {
      await supabase.storage.from('arrangements').remove([oldPath]);
    }
  }

  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('arrangements')
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('arrangements').getPublicUrl(path);
  return data.publicUrl;
}

async function deleteArrangementPhoto(url) {
  if (!url) return;
  const path = url.split('/arrangements/')[1];
  if (path) {
    await supabase.storage.from('arrangements').remove([path]);
  }
}

async function uploadAboutPhoto(file, existingUrl = null) {
  if (existingUrl) {
    const oldPath = existingUrl.split('/about/')[1];
    if (oldPath) {
      await supabase.storage.from('about').remove([oldPath]);
    }
  }

  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('about')
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('about').getPublicUrl(path);
  return data.publicUrl;
}

// ── Orders ──

async function insertOrder(payload) {
  const { data, error } = await supabase
    .from('orders')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, arrangements(name)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

// ── Shop settings ──

async function fetchShopSettings() {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function updateShopSettings(id, payload) {
  const { data, error } = await supabase
    .from('shop_settings')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Auth attempts ──

async function fetchLatestLockout() {
  const { data, error } = await supabase
    .from('auth_attempts')
    .select('*')
    .order('attempted_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

async function insertAuthAttempt(lockoutUntil = null) {
  const { error } = await supabase
    .from('auth_attempts')
    .insert([{ lockout_until: lockoutUntil }]);
  if (error) throw error;
}

async function clearAuthAttempts() {
  const { error } = await supabase
    .from('auth_attempts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}