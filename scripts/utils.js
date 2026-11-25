(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NCCUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch];
    });
  }

  function csv(rows) {
    const cleanCell = function (val) {
      let s = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return rows.map(function (row) {
      return row.map(cleanCell).join(',');
    }).join('\n');
  }

  function formatFee(fee) {
    const num = Number(fee) || 0;
    if (num <= 0) return 'Free';
    return '₹' + num.toLocaleString('en-IN');
  }

  function calculateTotalFee(events) {
    if (!Array.isArray(events)) return 0;
    return events.reduce(function (sum, ev) {
      return sum + Math.max(0, Number(ev && ev.fee) || 0);
    }, 0);
  }

  function safeNextUrl(next, fallback) {
    const fb = fallback || 'my.html';
    if (!next || typeof next !== 'string') return fb;
    return /^[a-z0-9_-]+\.html(\?(id|eventId|mode)=[\w%-]+)?$/i.test(next) ? next : fb;
  }

  function validateSignup(input) {
    const name = String((input && input.name) || '').trim();
    const email = String((input && input.email) || '').trim().toLowerCase();
    const password = String((input && input.password) || '');
    const phone = String((input && input.phone) || '').trim();
    const regNo = String((input && (input.regNo || input.reg_no)) || '').trim();
    const dept = String((input && input.dept) || '').trim();

    if (name.length < 2) return { ok: false, msg: 'Please enter your full name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: 'Please enter a valid email address.' };
    if (password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };
    if (!regNo) return { ok: false, msg: 'Please enter your regimental or roll number.' };
    if (!dept) return { ok: false, msg: 'Please enter your department.' };
    if (!/^[0-9+\s-]{10,15}$/.test(phone)) return { ok: false, msg: 'Please enter a valid 10-digit phone number.' };
    return { ok: true };
  }

  function validateTeamRegistration(input, eventObj) {
    if (!input || !eventObj) return { ok: false, msg: 'Missing team or event details.' };
    const teamName = String(input.teamName || '').trim();
    const collegeName = String(input.collegeName || '').trim();
    const leaderName = String(input.leaderName || '').trim();
    const leaderPhone = String(input.leaderPhone || '').trim();
    const leaderEmail = String(input.leaderEmail || '').trim();
    const members = Array.isArray(input.members)
      ? input.members.filter(function (m) { return m && String(m.name || '').trim() !== ''; })
      : [];

    if (teamName.length < 2) return { ok: false, msg: 'Please enter a valid team name.' };
    if (collegeName.length < 2) return { ok: false, msg: 'Please enter your college name.' };
    if (leaderName.length < 2) return { ok: false, msg: 'Please enter the team leader name.' };
    if (!/^[0-9+\s-]{10,15}$/.test(leaderPhone)) return { ok: false, msg: 'Please enter a valid 10-digit leader contact number.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leaderEmail)) return { ok: false, msg: 'Please enter a valid leader email address.' };

    const totalSize = 1 + members.length;
    const minSize = Math.max(1, Number(eventObj.minTeamSize) || 1);
    const maxSize = Math.max(minSize, Number(eventObj.maxTeamSize) || 8);
    if (totalSize < minSize || totalSize > maxSize) {
      return {
        ok: false,
        msg: 'Total team size (' + totalSize + ', including leader) must be between ' + minSize + ' and ' + maxSize + '.'
      };
    }
    return { ok: true, totalSize: totalSize, members: members };
  }

  function buildQrPayload(reg) {
    if (!reg) return '';
    return JSON.stringify({
      type: 'NCC_TEAM_PASS',
      code: reg.registrationCode || reg.registration_code || '',
      token: reg.qrToken || reg.qr_token || ''
    });
  }

  function parseQrPayload(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.token || parsed.code)) {
          return String(parsed.token || parsed.code).trim();
        }
      } catch (_err) {
        return text;
      }
    }
    return text;
  }

  function isSupabaseConfigured(cfg) {
    if (!cfg || typeof cfg !== 'object') return false;
    const url = String(cfg.SUPABASE_URL || '').trim();
    const key = String(cfg.SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) return false;
    if (url.includes('YOUR-PROJECT-REF') || key.includes('YOUR-PUBLIC-ANON-KEY')) return false;
    if (key.includes('service_role')) return false;
    return /^https:\/\/.+\.supabase\.co$/i.test(url) || /^https?:\/\/localhost(:\d+)?$/i.test(url) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(url);
  }

  return {
    esc: esc,
    csv: csv,
    formatFee: formatFee,
    calculateTotalFee: calculateTotalFee,
    safeNextUrl: safeNextUrl,
    validateSignup: validateSignup,
    validateTeamRegistration: validateTeamRegistration,
    buildQrPayload: buildQrPayload,
    parseQrPayload: parseQrPayload,
    isSupabaseConfigured: isSupabaseConfigured
  };
});
