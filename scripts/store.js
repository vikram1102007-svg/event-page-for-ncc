/* NCC Two-Day Event - Supabase Data & Auth Layer.
   All pages use window.Store. No secrets or service_role keys are placed here. */
(function () {
  const U = window.NCCUtils;
  const esc = U.esc;
  const DEFAULT_CFG = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    COLLEGE_NAME: 'College NCC Unit (Sample)',
    NCC_UNIT: 'National Cadet Corps — Senior Wing & Senior Division',
    EVENT_DATES: 'Two-Day College Event (Sample Dates TBA)',
    EVENT_VENUE: 'College Parade Ground & Firing Range (Sample)',
    CONTACT_EMAIL: 'ncc.event@college.edu',
    CONTACT_PHONE: '+91 90000 00000',
    SIGNATORY_NAME: 'Associate NCC Officer (ANO)',
    SIGNATORY_TITLE: 'Event Convenor, NCC Unit',
    DEMO_PAYMENT_MODE: true
  };

  function getConfig() {
    return Object.assign({}, DEFAULT_CFG, window.NCC_CONFIG || {});
  }

  let client = null;
  let cachedUser = undefined;

  function getClient() {
    if (client) return client;
    const cfg = getConfig();
    if (!U.isSupabaseConfigured(cfg) || !window.supabase || typeof window.supabase.createClient !== 'function') {
      return null;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function mapEvent(row, countsMap) {
    const taken = Number((countsMap && countsMap[row.id]) || 0);
    const seats = Math.max(0, Number(row.seats) || 0);
    return {
      id: row.id,
      slug: row.slug || '',
      title: row.title,
      day: Number(row.day) || 1,
      date: row.event_date || 'Sample Date TBA',
      time: row.event_time || 'TBA',
      venue: row.venue || 'Venue TBA',
      type: row.event_type || 'Team',
      seats: seats,
      minTeamSize: Math.max(1, Number(row.min_team_size) || 1),
      maxTeamSize: Math.max(1, Number(row.max_team_size) || 8),
      fee: Math.max(0, Number(row.fee) || 0),
      criteria: row.criteria || '',
      desc: row.description || '',
      rules: row.rules || '',
      deadline: row.deadline || '',
      registrationOpen: row.registration_open !== false,
      isSample: row.is_sample !== false,
      isActive: row.is_active !== false,
      taken: taken,
      left: Math.max(0, seats - taken)
    };
  }

  function mapRegistration(row) {
    const ev = row.events || {};
    const team = row.teams || {};
    const membersRaw = Array.isArray(team.team_members) ? team.team_members : [];
    const members = membersRaw.slice().sort(function (a, b) {
      if (a.role_in_team === 'Leader' && b.role_in_team !== 'Leader') return -1;
      if (a.role_in_team !== 'Leader' && b.role_in_team === 'Leader') return 1;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    }).map(function (m) {
      return {
        id: m.id,
        name: m.member_name,
        regNo: m.reg_no || '',
        dept: m.dept || '',
        year: m.year || '',
        phone: m.phone || '',
        roleInTeam: m.role_in_team || 'Member'
      };
    });

    const payRaw = Array.isArray(row.payments) ? row.payments[0] : row.payments;
    const attRaw = Array.isArray(row.attendance) ? row.attendance[0] : row.attendance;
    const certsRaw = Array.isArray(row.certificates) ? row.certificates : (row.certificates ? [row.certificates] : []);

    const certByMember = {};
    certsRaw.forEach(function (c) {
      certByMember[c.team_member_id] = {
        id: c.id,
        certificateNumber: c.certificate_number,
        teamMemberId: c.team_member_id,
        participantName: c.participant_name,
        teamName: c.team_name,
        collegeName: c.college_name,
        eventTitle: c.event_title,
        eventDate: c.event_date,
        status: c.status,
        issuedAt: c.issued_at,
        approvedAt: c.approved_at,
        rejectionReason: c.rejection_reason || ''
      };
    });

    return {
      id: row.id,
      registrationCode: row.registration_code,
      eventId: row.event_id,
      teamId: row.team_id,
      userId: row.user_id,
      status: row.status || 'pending',
      qrToken: row.qr_token,
      at: row.created_at,
      eventTitle: ev.title || '',
      eventDay: ev.day || 1,
      eventDate: ev.event_date || '',
      eventTime: ev.event_time || '',
      eventVenue: ev.venue || '',
      eventFee: Number(ev.fee) || 0,
      teamName: team.team_name || '',
      collegeName: team.college_name || '',
      nccUnit: team.ncc_unit || '',
      leaderName: team.leader_name || '',
      leaderRegNo: team.leader_reg_no || '',
      leaderPhone: team.leader_phone || '',
      leaderEmail: team.leader_email || '',
      members: members,
      payment: payRaw ? {
        id: payRaw.id,
        amount: Number(payRaw.amount) || 0,
        status: payRaw.status || 'pending',
        mode: payRaw.payment_mode || 'demo',
        reference: payRaw.payment_reference || '',
        verifiedAt: payRaw.verified_at || null
      } : {
        id: null,
        amount: Number(ev.fee) || 0,
        status: 'pending',
        mode: 'demo',
        reference: '',
        verifiedAt: null
      },
      present: Boolean(attRaw && attRaw.present),
      checkedInAt: attRaw ? attRaw.checked_in_at : null,
      checkInMethod: attRaw ? attRaw.check_in_method : null,
      certificates: certsRaw.map(function (c) { return certByMember[c.team_member_id]; }),
      certByMember: certByMember
    };
  }

  async function fetchSeatCounts(sb) {
    const map = {};
    const res = await sb.rpc('get_event_seat_counts');
    if (!res.error && Array.isArray(res.data)) {
      res.data.forEach(function (item) {
        map[item.event_id] = Number(item.taken) || 0;
      });
    }
    return map;
  }

  function notConfiguredMsg() {
    return 'Supabase backend is not configured yet. Add your SUPABASE_URL and public SUPABASE_ANON_KEY in scripts/config.js (see DEPLOYMENT.md).';
  }

  const Store = {
    esc: esc,
    csv: U.csv,
    formatFee: U.formatFee,
    config: getConfig,

    isConfigured: function () {
      return Boolean(getClient());
    },

    setupBannerHtml: function () {
      if (Store.isConfigured()) return '';
      return '<div class="msg show" role="status"><strong>Supabase setup required:</strong> Add your <code>SUPABASE_URL</code> and public <code>SUPABASE_ANON_KEY</code> in <code>scripts/config.js</code> and run <code>supabase/schema.sql</code> + <code>supabase/seed.sql</code> in Supabase SQL Editor. See <code>DEPLOYMENT.md</code>.</div>';
    },

    user: async function (forceRefresh) {
      if (!forceRefresh && cachedUser !== undefined) return cachedUser;
      const sb = getClient();
      if (!sb) {
        cachedUser = null;
        return null;
      }
      const authRes = await sb.auth.getUser();
      const authUser = authRes && authRes.data && authRes.data.user;
      if (!authUser) {
        cachedUser = null;
        return null;
      }
      const profRes = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      let profileData = profRes.data;
      if (!profRes.error && !profileData) {
        const meta = authUser.user_metadata || {};
        const profileRes = await sb.from('profiles').upsert({
          id: authUser.id,
          email: String(authUser.email || '').toLowerCase(),
          name: meta.name || authUser.email || 'Participant',
          reg_no: meta.reg_no || '',
          dept: meta.dept || '',
          year: meta.year || '1',
          phone: meta.phone || '',
          college: meta.college || '',
          ncc_unit: meta.ncc_unit || ''
        }, { onConflict: 'id' }).select('*').maybeSingle();
        if (!profileRes.error) profileData = profileRes.data;
      }
      if (profRes.error || !profileData) {
        cachedUser = {
          id: authUser.id,
          email: authUser.email || '',
          name: (authUser.user_metadata && authUser.user_metadata.name) || authUser.email || 'Participant',
          regNo: (authUser.user_metadata && authUser.user_metadata.reg_no) || '',
          dept: (authUser.user_metadata && authUser.user_metadata.dept) || '',
          year: (authUser.user_metadata && authUser.user_metadata.year) || '1',
          phone: (authUser.user_metadata && authUser.user_metadata.phone) || '',
          college: (authUser.user_metadata && authUser.user_metadata.college) || '',
          nccUnit: (authUser.user_metadata && authUser.user_metadata.ncc_unit) || '',
          role: 'participant'
        };
        return cachedUser;
      }
      const p = profileData;
      cachedUser = {
        id: p.id,
        email: p.email,
        name: p.name,
        regNo: p.reg_no,
        dept: p.dept,
        year: p.year,
        phone: p.phone,
        college: p.college,
        nccUnit: p.ncc_unit,
        role: p.role
      };
      return cachedUser;
    },

    signup: async function (u, emailRedirectTo) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };

      const valid = U.validateSignup(u);
      if (!valid.ok) return valid;

      const email = String(u.email).trim().toLowerCase();
      const res = await sb.auth.signUp({
        email: email,
        password: u.password,
        options: {
          emailRedirectTo: emailRedirectTo || undefined,
          data: {
            name: String(u.name).trim(),
            reg_no: String(u.regNo || '').trim(),
            dept: String(u.dept || '').trim(),
            year: String(u.year || '1').trim(),
            phone: String(u.phone || '').trim(),
            college: String(u.college || '').trim(),
            ncc_unit: String(u.nccUnit || '').trim()
          }
        }
      });

      if (res.error) return { ok: false, msg: res.error.message };
      cachedUser = undefined;

      if (res.data && !res.data.session) {
        return {
          ok: true,
          needsEmailConfirmation: true,
          msg: 'Account created! Please check your email and click the confirmation link before logging in.'
        };
      }

      const user = await Store.user(true);
      await renderHeader();
      return { ok: true, user: user, msg: 'Account created successfully.' };
    },

    login: async function (email, password) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };

      const res = await sb.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password: String(password || '')
      });
      if (res.error) return { ok: false, msg: res.error.message };
      cachedUser = undefined;
      const user = await Store.user(true);
      await renderHeader();
      return { ok: true, user: user };
    },

    resetPassword: async function (email) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const clean = String(email || '').trim().toLowerCase();
      if (!clean) return { ok: false, msg: 'Enter your registered email address.' };
      const redirectTo = window.location.origin + window.location.pathname.replace(/[^/]*$/, 'login.html?mode=reset');
      const res = await sb.auth.resetPasswordForEmail(clean, { redirectTo: redirectTo });
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true, msg: 'Password reset link sent to your email.' };
    },

    updatePassword: async function (newPassword) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      if (String(newPassword || '').length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };
      const res = await sb.auth.updateUser({ password: newPassword });
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true, msg: 'Password updated successfully.' };
    },

    updateProfile: async function (updates) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const u = await Store.user();
      if (!u) return { ok: false, msg: 'Please log in first.' };

      const payload = {
        name: String(updates.name || u.name).trim(),
        reg_no: String(updates.regNo !== undefined ? updates.regNo : u.regNo).trim(),
        dept: String(updates.dept !== undefined ? updates.dept : u.dept).trim(),
        year: String(updates.year !== undefined ? updates.year : u.year).trim(),
        phone: String(updates.phone !== undefined ? updates.phone : u.phone).trim(),
        college: String(updates.college !== undefined ? updates.college : u.college).trim(),
        ncc_unit: String(updates.nccUnit !== undefined ? updates.nccUnit : u.nccUnit).trim()
      };

      const res = await sb.from('profiles').update(payload).eq('id', u.id);
      if (res.error) return { ok: false, msg: res.error.message };
      cachedUser = undefined;
      await Store.user(true);
      await renderHeader();
      return { ok: true, msg: 'Profile updated.' };
    },

    logout: async function () {
      const sb = getClient();
      cachedUser = null;
      if (sb) await sb.auth.signOut();
      await renderHeader();
    },

    events: async function (opts) {
      const sb = getClient();
      if (!sb) return [];
      let query = sb.from('events').select('*').order('day', { ascending: true }).order('title', { ascending: true });
      if (!opts || !opts.includeInactive) {
        query = query.eq('is_active', true);
      }
      const [evRes, counts] = await Promise.all([query, fetchSeatCounts(sb)]);
      if (evRes.error || !Array.isArray(evRes.data)) return [];
      return evRes.data.map(function (row) { return mapEvent(row, counts); });
    },

    event: async function (id) {
      const sb = getClient();
      if (!sb || !id) return null;
      const [evRes, counts] = await Promise.all([
        sb.from('events').select('*').eq('id', id).maybeSingle(),
        fetchSeatCounts(sb)
      ]);
      if (evRes.error || !evRes.data) return null;
      return mapEvent(evRes.data, counts);
    },

    saveEvent: async function (ev) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };

      const minTeam = Math.max(1, parseInt(ev.minTeamSize, 10) || 1);
      const maxTeam = Math.max(minTeam, parseInt(ev.maxTeamSize, 10) || minTeam);

      const payload = {
        title: String(ev.title || '').trim(),
        day: Number(ev.day) === 2 ? 2 : 1,
        event_date: String(ev.date || 'Sample Date TBA').trim() || 'Sample Date TBA',
        event_time: String(ev.time || 'TBA').trim() || 'TBA',
        venue: String(ev.venue || 'Venue TBA').trim() || 'Venue TBA',
        event_type: ev.type === 'Individual' ? 'Individual' : 'Team',
        seats: Math.max(0, parseInt(ev.seats, 10) || 0),
        min_team_size: minTeam,
        max_team_size: maxTeam,
        fee: Math.max(0, parseInt(ev.fee, 10) || 0),
        criteria: String(ev.criteria || '').trim(),
        description: String(ev.desc || '').trim(),
        rules: String(ev.rules || '').trim(),
        deadline: String(ev.deadline || '').trim(),
        registration_open: ev.registrationOpen === true || ev.registrationOpen === 'true' || ev.registrationOpen === 'on',
        is_sample: ev.isSample === true || ev.isSample === 'true' || ev.isSample === 'on',
        is_active: ev.isActive === false || ev.isActive === 'false' ? false : true
      };

      if (!payload.title) return { ok: false, msg: 'Event title is required.' };

      const res = ev.id
        ? await sb.from('events').update(payload).eq('id', ev.id).select().single()
        : await sb.from('events').insert(payload).select().single();

      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true, msg: 'Event saved.', event: res.data };
    },

    deleteEvent: async function (id) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.from('events').delete().eq('id', id);
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true, msg: 'Event deleted.' };
    },

    registerTeam: async function (payload) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const u = await Store.user();
      if (!u) return { ok: false, login: true, msg: 'Please log in first to register a team.' };

      const res = await sb.rpc('register_team_for_event', {
        p_event_id: payload.eventId,
        p_team_name: payload.teamName,
        p_college_name: payload.collegeName,
        p_ncc_unit: payload.nccUnit || '',
        p_leader_name: payload.leaderName,
        p_leader_reg_no: payload.leaderRegNo || '',
        p_leader_phone: payload.leaderPhone,
        p_leader_email: payload.leaderEmail,
        p_members: payload.members || []
      });

      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Team registration failed.' };
    },

    myRegs: async function () {
      const sb = getClient();
      if (!sb) return [];
      const u = await Store.user();
      if (!u) return [];

      const res = await sb
        .from('registrations')
        .select('*, events(*), teams(*, team_members(*)), payments(*), attendance(*), certificates(*)')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });

      if (res.error || !Array.isArray(res.data)) return [];
      return res.data.map(mapRegistration);
    },

    submitDemoPayment: async function (regId) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('submit_demo_payment', { p_registration_id: regId });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Could not submit demo payment.' };
    },

    startGatewayPayment: async function (regId) {
      const sb = getClient(), cfg = getConfig();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      if (!cfg.RAZORPAY_KEY_ID) return { ok: false, msg: 'Online payment is not configured. The organizer must add Razorpay credentials in Vercel.' };
      const sessionRes = await sb.auth.getSession(), session = sessionRes && sessionRes.data && sessionRes.data.session;
      if (!session || !session.access_token) return { ok: false, msg: 'Your session expired. Please log in again.' };
      try {
        const orderRes = await fetch('/api/payment/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ registrationId: regId }) });
        const order = await orderRes.json();
        if (!orderRes.ok || !order.ok) return { ok: false, msg: order.msg || 'Could not create payment order.' };
        if (!window.Razorpay) await new Promise(function (resolve, reject) {
          const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve; script.onerror = function () { reject(new Error('Razorpay Checkout failed to load.')); };
          document.head.appendChild(script);
        });
        return await new Promise(function (resolve) {
          const checkout = new window.Razorpay({
            key: order.key, amount: order.amount, currency: order.currency || 'INR',
            name: cfg.COLLEGE_NAME || 'NCC Event Registration', description: order.eventTitle || 'Event registration fee',
            order_id: order.orderId, prefill: { name: order.participantName || '', email: order.email || '' },
            notes: { registration_id: regId }, theme: { color: '#0b1f3a' },
            handler: async function (response) {
              try {
                const vr = await fetch('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ registrationId: regId, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }) });
                const result = await vr.json(); resolve({ ok: vr.ok && result.ok, msg: result.msg || 'Payment verification failed.' });
              } catch (_) { resolve({ ok: false, msg: 'Payment submitted, but verification did not respond. Refresh your dashboard and contact the organizer before paying again.' }); }
            },
            modal: { ondismiss: function () { resolve({ ok: false, cancelled: true, msg: 'Checkout closed. Your registration is saved; you can retry payment from the dashboard.' }); } }
          });
          checkout.on('payment.failed', function (response) { resolve({ ok: false, msg: response.error && response.error.description || 'Payment failed.' }); });
          checkout.open();
        });
      } catch (err) { return { ok: false, msg: err.message || 'Unable to start payment.' }; }
    },

    requestCertificate: async function (regId, memberId) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('request_certificate', {
        p_registration_id: regId,
        p_team_member_id: memberId
      });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Could not request certificate.' };
    },

    adminRegs: async function () {
      const sb = getClient();
      if (!sb) return [];
      const res = await sb
        .from('registrations')
        .select('*, events(*), teams(*, team_members(*)), payments(*), attendance(*), certificates(*)')
        .order('created_at', { ascending: false });
      if (res.error || !Array.isArray(res.data)) return [];
      return res.data.map(mapRegistration);
    },

    adminProfiles: async function () {
      const sb = getClient();
      if (!sb) return [];
      const res = await sb.from('profiles').select('*').order('created_at', { ascending: false });
      return !res.error && Array.isArray(res.data) ? res.data : [];
    },

    setUserRole: async function (email, role) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('set_user_role', { p_email: email, p_role: role });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Could not update user role.' };
    },

    updateRegStatus: async function (regId, status) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('update_registration_status', {
        p_registration_id: regId,
        p_status: status
      });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Could not update registration status.' };
    },

    verifyPayment: async function (paymentId, status, reference) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('verify_payment', {
        p_payment_id: paymentId,
        p_status: status,
        p_reference: reference || null
      });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Could not verify payment.' };
    },

    setPresent: async function (regId, present) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const admin = await Store.user();
      if (!admin || admin.role !== 'admin') return { ok: false, msg: 'Unauthorized.' };

      const regRes = await sb.from('registrations').select('id, event_id, team_id').eq('id', regId).single();
      if (regRes.error || !regRes.data) return { ok: false, msg: 'Registration not found.' };

      const r = regRes.data;
      const res = await sb.from('attendance').upsert({
        registration_id: r.id,
        event_id: r.event_id,
        team_id: r.team_id,
        present: Boolean(present),
        checked_in_at: present ? new Date().toISOString() : null,
        checked_in_by: admin.id,
        check_in_method: 'manual'
      }, { onConflict: 'registration_id' });

      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true };
    },

    checkInByQr: async function (rawInput, method) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const codeOrToken = U.parseQrPayload(rawInput);
      const res = await sb.rpc('check_in_registration', {
        p_qr_or_code: codeOrToken,
        p_method: method || 'qr'
      });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Check-in failed.' };
    },

    manageCertificate: async function (regId, memberId, action, reason) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.rpc('manage_certificate', {
        p_registration_id: regId,
        p_team_member_id: memberId,
        p_action: action,
        p_reason: reason || ''
      });
      if (res.error) return { ok: false, msg: res.error.message };
      return res.data || { ok: false, msg: 'Certificate action failed.' };
    },

    announcements: async function (includeAll) {
      const sb = getClient();
      if (!sb) return [];
      let q = sb.from('announcements').select('*').order('created_at', { ascending: false });
      if (!includeAll) q = q.eq('published', true);
      const res = await q;
      return !res.error && Array.isArray(res.data) ? res.data : [];
    },

    saveAnnouncement: async function (a) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const u = await Store.user();
      const payload = {
        title: String(a.title || '').trim(),
        body: String(a.body || '').trim(),
        published: a.published !== false,
        created_by: u ? u.id : null
      };
      if (!payload.title || !payload.body) return { ok: false, msg: 'Title and message are required.' };
      const res = a.id
        ? await sb.from('announcements').update(payload).eq('id', a.id)
        : await sb.from('announcements').insert(payload);
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true };
    },

    deleteAnnouncement: async function (id) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.from('announcements').delete().eq('id', id);
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true };
    },

    scheduleItems: async function () {
      const sb = getClient();
      if (!sb) return [];
      const res = await sb.from('schedule_items').select('*').order('day', { ascending: true }).order('sort_order', { ascending: true });
      return !res.error && Array.isArray(res.data) ? res.data : [];
    },

    saveScheduleItem: async function (item) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const payload = {
        day: Number(item.day) === 2 ? 2 : 1,
        time_label: String(item.time_label || 'TBA').trim(),
        title: String(item.title || '').trim(),
        subtitle: String(item.subtitle || '').trim(),
        sort_order: parseInt(item.sort_order, 10) || 1
      };
      if (!payload.title) return { ok: false, msg: 'Schedule title is required.' };
      const res = item.id
        ? await sb.from('schedule_items').update(payload).eq('id', item.id)
        : await sb.from('schedule_items').insert(payload);
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true };
    },

    deleteScheduleItem: async function (id) {
      const sb = getClient();
      if (!sb) return { ok: false, msg: notConfiguredMsg() };
      const res = await sb.from('schedule_items').delete().eq('id', id);
      if (res.error) return { ok: false, msg: res.error.message };
      return { ok: true };
    }
  };

  function buildHeaderHtml(u) {
    return '<header class="site-header"><div class="container nav-wrap">' +
      '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">NCC</span><span><strong>NCC TWO-DAY EVENT</strong><small>OFFICIAL EVENT PORTAL</small></span></a>' +
      '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
      '<nav id="site-nav" class="site-nav" aria-label="Main navigation">' +
      '<a href="index.html">Home</a>' +
      '<a href="events.html">Events</a>' +
      '<a href="register.html">Register Team</a>' +
      (u ? '<a href="my.html">Dashboard</a>' : '') +
      (u && u.role === 'admin' ? '<a href="admin.html">Admin</a>' : '') +
      (u ? '<a class="nav-cta" href="#" id="logout">Logout (' + esc(u.name.split(' ')[0]) + ')</a>'
         : '<a class="nav-cta" href="login.html">Login / Sign up</a>') +
      '</nav></div></header>';
  }

  function wireHeaderEvents() {
    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('#site-nav');
    if (menuButton && navigation) {
      menuButton.addEventListener('click', function () {
        const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', String(!isOpen));
        navigation.classList.toggle('is-open', !isOpen);
      });
      navigation.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          menuButton.setAttribute('aria-expanded', 'false');
          navigation.classList.remove('is-open');
        });
      });
    }
    const lo = document.getElementById('logout');
    if (lo) {
      lo.addEventListener('click', async function (e) {
        e.preventDefault();
        await Store.logout();
        window.location.href = 'index.html';
      });
    }
  }

  async function renderHeader() {
    const h = document.getElementById('hdr');
    if (!h) return;
    const u = await Store.user();
    h.innerHTML = buildHeaderHtml(u);
    wireHeaderEvents();
  }

  const hInit = document.getElementById('hdr');
  if (hInit) {
    hInit.innerHTML = buildHeaderHtml(null);
    wireHeaderEvents();
    renderHeader();
  }

  Store.renderHeader = renderHeader;
  window.Store = Store;
})();
