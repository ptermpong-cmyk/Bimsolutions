(function () {
  const slot = document.querySelector('.site-login-slot');
  if (!slot) return;
  const homeUrl = slot.dataset.home || './';
  const config = window.BIMS_CONFIG;
  const client = window.supabase && typeof window.supabase.createClient === 'function' && config
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;
  const isEnglish = () => document.documentElement.lang === 'en';
  const label = (th, en) => isEnglish() ? en : th;
  let user = null;
  let previousFocus = null;

  slot.innerHTML = '<button type="button" class="site-login-button"><span class="site-login-avatar" aria-hidden="true"></span><span class="site-login-label"></span></button>';
  const trigger = slot.querySelector('button');
  const overlay = document.createElement('div');
  overlay.className = 'site-login-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<section class="site-login-dialog" role="dialog" aria-modal="true" aria-labelledby="site-login-title">
    <button type="button" class="site-login-close" aria-label="Close">×</button>
    <h2 id="site-login-title"></h2>
    <p id="site-login-intro"></p>
    <form id="site-login-form">
      <label for="site-login-email" id="site-login-email-label"></label>
      <input id="site-login-email" type="email" autocomplete="email" required>
      <label for="site-login-password" id="site-login-password-label"></label>
      <input id="site-login-password" type="password" autocomplete="current-password" required>
      <button type="submit" class="site-login-submit"></button>
    </form>
    <button type="button" class="site-logout-submit" hidden></button>
    <p class="site-login-error" role="alert"></p>
    <p class="site-login-help"><span id="site-login-help-label"></span> <a id="site-login-home-link"></a></p>
  </section>`;
  document.body.appendChild(overlay);
  const form = overlay.querySelector('form');
  const error = overlay.querySelector('.site-login-error');
  const logout = overlay.querySelector('.site-logout-submit');
  const submit = overlay.querySelector('.site-login-submit');
  const homeLink = overlay.querySelector('#site-login-home-link');
  homeLink.href = homeUrl;

  function updateText() {
    const triggerLabel = user?.email || label('เข้าสู่ระบบ', 'Sign In');
    trigger.querySelector('.site-login-label').textContent = triggerLabel;
    const avatar = trigger.querySelector('.site-login-avatar');
    avatar.hidden = !user;
    avatar.textContent = user ? (user.email || '?').charAt(0).toUpperCase() : '';
    trigger.setAttribute('aria-label', user ? label('บัญชีผู้ใช้: ', 'My account: ') + triggerLabel : triggerLabel);
    overlay.querySelector('#site-login-title').textContent = user ? label('บัญชีของฉัน', 'My Account') : label('เข้าสู่ระบบ', 'Sign In');
    overlay.querySelector('#site-login-intro').textContent = user
      ? user.email
      : label('ใช้บัญชี BiMSolutions เดียวกับหน้าแรก', 'Use the same BiMSolutions account as the home page.');
    overlay.querySelector('#site-login-email-label').textContent = label('อีเมล', 'Email');
    overlay.querySelector('#site-login-password-label').textContent = label('รหัสผ่าน', 'Password');
    submit.textContent = label('เข้าสู่ระบบ', 'Sign In');
    logout.textContent = label('ออกจากระบบ', 'Sign Out');
    overlay.querySelector('#site-login-help-label').textContent = label('ยังไม่มีบัญชี?', 'Need an account?');
    homeLink.textContent = label('สมัครสมาชิกที่หน้าแรก', 'Sign up on the home page');
    form.hidden = !!user;
    logout.hidden = !user;
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    error.textContent = '';
    if (previousFocus) previousFocus.focus();
  }
  trigger.addEventListener('click', () => {
    previousFocus = document.activeElement;
    updateText();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    (user ? logout : overlay.querySelector('#site-login-email')).focus();
  });
  overlay.querySelector('.site-login-close').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    if (!client) {
      error.textContent = label('ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง', 'Sign in is unavailable. Please try again later.');
      return;
    }
    submit.disabled = true;
    try {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: overlay.querySelector('#site-login-email').value.trim(),
        password: overlay.querySelector('#site-login-password').value
      });
      if (signInError) throw signInError;
      form.reset();
      close();
    } catch (signInError) {
      error.textContent = label('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Incorrect email or password.');
    } finally { submit.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    if (!client) return;
    logout.disabled = true;
    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      close();
    } catch (signOutError) {
      error.textContent = label('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่', 'Could not sign out. Please try again.');
    } finally { logout.disabled = false; }
  });
  if (client) {
    client.auth.onAuthStateChange((_event, session) => { user = session?.user || null; updateText(); });
    client.auth.getSession().then(({ data }) => { user = data.session?.user || null; updateText(); }).catch(() => updateText());
  }
  new MutationObserver(updateText).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  updateText();
})();
