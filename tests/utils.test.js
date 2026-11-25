const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../scripts/utils.js');

test('esc escapes HTML special characters', () => {
  assert.equal(U.esc('<script>"alert(\'x\')&</script>'), '&lt;script&gt;&quot;alert(&#39;x&#39;)&amp;&lt;/script&gt;');
});

test('csv escapes quotes and neutralizes spreadsheet formula prefixes', () => {
  const out = U.csv([
    ['Name', 'Formula', 'Quote'],
    ['Cadet A', '=CMD()', 'Say "Hi"'],
    ['Cadet B', '+123', '@SUM(A1)']
  ]);
  assert.equal(
    out,
    '"Name","Formula","Quote"\n"Cadet A","\'=CMD()","Say ""Hi"""\n"Cadet B","\'+123","\'@SUM(A1)"'
  );
});

test('formatFee and calculateTotalFee handle Firing (400) + Drill (400)', () => {
  assert.equal(U.formatFee(0), 'Free');
  assert.equal(U.formatFee(400), '₹400');
  assert.equal(U.calculateTotalFee([{ fee: 400 }, { fee: 400 }]), 800);
});

test('safeNextUrl permits local html pages including register.html?eventId=... and blocks external URLs', () => {
  assert.equal(U.safeNextUrl('event.html?id=abc-123'), 'event.html?id=abc-123');
  assert.equal(U.safeNextUrl('register.html?eventId=ev-1'), 'register.html?eventId=ev-1');
  assert.equal(U.safeNextUrl('https://evil.example/phish.html', 'my.html'), 'my.html');
  assert.equal(U.safeNextUrl('//evil.example', 'my.html'), 'my.html');
});

test('validateSignup enforces required fields and password length', () => {
  assert.equal(U.validateSignup({ name: 'A', email: 'bad', password: '123' }).ok, false);
  assert.equal(U.validateSignup({
    name: 'Cadet Kumar',
    email: 'cadet@college.edu',
    password: 'password123',
    regNo: 'TN21SDA1001',
    dept: 'IT',
    phone: '9876543210'
  }).ok, true);
});

test('validateTeamRegistration enforces leader, college, and team size bounds', () => {
  const drill = { minTeamSize: 4, maxTeamSize: 8 };
  const tooSmall = U.validateTeamRegistration({
    teamName: 'Alpha',
    collegeName: 'ABC College',
    leaderName: 'Cadet 1',
    leaderPhone: '9876543210',
    leaderEmail: 'lead@college.edu',
    members: [{ name: 'Cadet 2' }]
  }, drill);
  assert.equal(tooSmall.ok, false);

  const valid = U.validateTeamRegistration({
    teamName: 'Alpha',
    collegeName: 'ABC College',
    leaderName: 'Cadet 1',
    leaderPhone: '9876543210',
    leaderEmail: 'lead@college.edu',
    members: [{ name: 'Cadet 2' }, { name: 'Cadet 3' }, { name: 'Cadet 4' }]
  }, drill);
  assert.equal(valid.ok, true);
  assert.equal(valid.totalSize, 4);
});

test('QR payload roundtrip extracts token cleanly', () => {
  const payload = U.buildQrPayload({ registrationCode: 'NCC-261125-AB12CD', qrToken: 'tok_987654' });
  assert.equal(U.parseQrPayload(payload), 'tok_987654');
  assert.equal(U.parseQrPayload('NCC-261125-AB12CD'), 'NCC-261125-AB12CD');
});

test('isSupabaseConfigured rejects placeholders and service_role keys', () => {
  assert.equal(U.isSupabaseConfigured({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }), false);
  assert.equal(U.isSupabaseConfigured({
    SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
    SUPABASE_ANON_KEY: 'abc'
  }), false);
  assert.equal(U.isSupabaseConfigured({
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role.secret'
  }), false);
  assert.equal(U.isSupabaseConfigured({
    SUPABASE_URL: 'https://abcdefg.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.public'
  }), true);
});
