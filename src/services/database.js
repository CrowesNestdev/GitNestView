import { supabase } from '@/lib/supabase';

export const profilesService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCompanyUsers(companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const companiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(companyData) {
    const { data, error } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const sitesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByCompany(companyId) {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(siteData) {
    const { data, error } = await supabase
      .from('sites')
      .insert([siteData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const channelsService = {
  async getByCompany(companyId) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async create(channelData) {
    const { data, error } = await supabase
      .from('channels')
      .insert([channelData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const sportsEventsService = {
  async getByCompany(companyId, startDate, endDate) {
    let query = supabase
      .from('sports_events')
      .select('*, channels(*)')
      .eq('company_id', companyId);

    if (startDate) {
      query = query.gte('start_time', startDate);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query = query.gte('start_time', yesterday.toISOString());
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('sports_events')
      .select('*, channels(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(eventData) {
    const { data, error } = await supabase
      .from('sports_events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('sports_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('sports_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const siteEventsService = {
  async getBySite(siteId) {
    const { data, error } = await supabase
      .from('site_events')
      .select('*, sports_events(*, channels(*))')
      .eq('site_id', siteId)
      .eq('is_visible', true)
      .order('sports_events(start_time)', { ascending: true });

    if (error) throw error;
    return data;
  },

  async assignEventToSite(siteId, eventId) {
    const { data, error } = await supabase
      .from('site_events')
      .insert([{ site_id: siteId, event_id: eventId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async assignEventsToSites(eventId, siteIds) {
    const insertData = siteIds.map(siteId => ({
      site_id: siteId,
      event_id: eventId,
    }));

    const { data, error } = await supabase
      .from('site_events')
      .insert(insertData)
      .select();

    if (error) throw error;
    return data;
  },

  async removeEventFromSite(siteId, eventId) {
    const { error } = await supabase
      .from('site_events')
      .delete()
      .eq('site_id', siteId)
      .eq('event_id', eventId);

    if (error) throw error;
  },

  async updateVisibility(id, isVisible) {
    const { data, error } = await supabase
      .from('site_events')
      .update({ is_visible: isVisible })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const brandSchemesService = {
  async getByCompany(companyId) {
    const { data, error } = await supabase
      .from('brand_schemes')
      .select('*')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(schemeData) {
    const { data, error } = await supabase
      .from('brand_schemes')
      .insert([schemeData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('brand_schemes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('brand_schemes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const siteBrandSchemesService = {
  async getBySite(siteId) {
    const { data, error } = await supabase
      .from('site_brand_schemes')
      .select('*, brand_schemes(*)')
      .eq('site_id', siteId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async assignSchemeToSite(siteId, brandSchemeId) {
    const { data: existing } = await supabase
      .from('site_brand_schemes')
      .select('id')
      .eq('site_id', siteId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('site_brand_schemes')
        .update({ brand_scheme_id: brandSchemeId })
        .eq('site_id', siteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('site_brand_schemes')
        .insert([{ site_id: siteId, brand_scheme_id: brandSchemeId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async removeSchemeFromSite(siteId) {
    const { error } = await supabase
      .from('site_brand_schemes')
      .delete()
      .eq('site_id', siteId);

    if (error) throw error;
  },
};
