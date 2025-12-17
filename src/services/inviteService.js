// inviteService.js - INVITE LINK ENHANCEMENT
// ============================================
// ADD THESE FUNCTIONS to your existing inviteService.js
// Search for "INVITE_ENHANCEMENT" comments for new additions
// ============================================

// ============================================
// ENHANCED getInviteByCode - Returns more info about the inviter
// REPLACE your existing getInviteByCode with this version
// ============================================

async getInviteByCode(code) {
  if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

  try {
    // First, try the RPC function (if it exists)
    const headers = getAuthHeaders();
    const fetchHeaders = headers || {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
    
    // Try the enhanced RPC function first
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_email_invite_by_code_enhanced`;
    const rpcResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ code })
    });

    if (rpcResponse.ok) {
      const data = await rpcResponse.json();
      if (data && (Array.isArray(data) ? data[0] : data)) {
        const invite = Array.isArray(data) ? data[0] : data;
        return { data: invite, error: null };
      }
    }
    
    // Fallback to original RPC function
    const fallbackUrl = `${SUPABASE_URL}/rest/v1/rpc/get_email_invite_by_code`;
    const fallbackResponse = await fetch(fallbackUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ code })
    });

    if (!fallbackResponse.ok) {
      return { data: null, error: { message: 'Invite not found' } };
    }
    
    const fallbackData = await fallbackResponse.json();
    const invite = fallbackData?.[0] || fallbackData;
    
    if (!invite) {
      return { data: null, error: { message: 'Invite not found' } };
    }
    
    // If we have the invite, try to get the inviter's profile info
    if (invite.from_user_id) {
      try {
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${invite.from_user_id}&select=id,username,display_name,rating`;
        const profileResponse = await fetch(profileUrl, { 
          headers: fetchHeaders 
        });
        
        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          const profile = profiles?.[0];
          
          if (profile) {
            invite.from_username = profile.username;
            invite.from_display_name = profile.display_name;
            invite.from_rating = profile.rating;
          }
        }
      } catch (profileErr) {
        console.log('Could not fetch inviter profile:', profileErr);
        // Continue without profile info
      }
    }
    
    // Parse recipient name from to_email field
    if (invite.to_email && !invite.to_email.startsWith('friend_')) {
      invite.recipient_name = invite.to_email;
    }
    
    return { data: invite, error: null };
  } catch (e) {
    console.error('getInviteByCode exception:', e);
    return { data: null, error: { message: e.message } };
  }
}

// ============================================
// NEW: acceptInviteByCode - Accept an invite using the code
// This is an alternative to the RPC function call in App.jsx
// ============================================

async acceptInviteByCode(code, acceptingUserId) {
  if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };
  
  try {
    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: { message: 'Not authenticated' } };
    
    // Call the RPC function to accept the invite
    const url = `${SUPABASE_URL}/rest/v1/rpc/accept_invite_link`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: code,
        accepting_user_id: acceptingUserId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('acceptInviteByCode failed:', response.status, errorText);
      return { data: null, error: { message: 'Failed to accept invite' } };
    }
    
    const data = await response.json();
    
    if (data?.success) {
      return { data, error: null };
    } else {
      return { data: null, error: { message: data?.message || 'Could not accept invite' } };
    }
  } catch (e) {
    console.error('acceptInviteByCode exception:', e);
    return { data: null, error: { message: e.message } };
  }
}

// ============================================
// ENHANCED createInviteLink - Store recipient name better
// REPLACE your existing createInviteLink with this version
// ============================================

async createInviteLink(fromUserId, recipientName = '') {
  if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

  try {
    // Clean up the recipient name
    const cleanRecipientName = recipientName.trim();
    const toEmailField = cleanRecipientName || `friend_${Date.now()}`;
    
    const { data: invite, error: createError } = await dbInsert('email_invites', {
      from_user_id: fromUserId,
      to_email: toEmailField,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }, { returning: true, single: true });

    if (createError) {
      console.error('Error creating invite link:', createError);
      return { data: null, error: createError };
    }

    const appUrl = window.location.origin;
    const inviteLink = `${appUrl}/?invite=${invite.invite_code}`;

    return {
      data: { 
        ...invite, 
        inviteLink, 
        recipientName: cleanRecipientName || 'Friend' 
      },
      error: null
    };
  } catch (e) {
    console.error('createInviteLink exception:', e);
    return { data: null, error: { message: e.message } };
  }
}
