(() => {
  const key = 'bims-revit-beginner-progress-v1';
  const checks = [...document.querySelectorAll('[data-complete]')];
  const status = document.getElementById('course-progress');
  let saved = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(parsed)) saved = parsed;
  } catch (_) { /* The lessons remain usable without browser storage. */ }
  checks.forEach(check => { check.checked = saved.includes(check.dataset.complete); });
  function update(persist) {
    const done = checks.filter(check => check.checked).map(check => check.dataset.complete);
    status.textContent = `เรียนจบแล้ว ${done.length} / ${checks.length} บท`;
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify(done)); }
      catch (_) { status.textContent += ' (เบราว์เซอร์นี้ไม่สามารถบันทึกความคืบหน้าได้)'; }
    }
  }
  checks.forEach(check => check.addEventListener('change', () => update(true)));
  update(false);
  document.querySelectorAll('.video-slot').forEach(slot => {
    const lesson = slot.dataset.lesson;
    const id = window.BIMS_BEGINNER_VIDEOS?.[lesson];
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return;
    slot.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `วิดีโอประกอบบทที่ ${lesson}`;
    const note = document.createElement('p');
    note.textContent = 'กดเพื่อโหลดวิดีโอจาก YouTube แล้วหยุดเป็นช่วง ๆ เพื่อลองทำตาม';
    const button = document.createElement('button');
    button.className = 'course-button';
    button.type = 'button';
    button.textContent = 'โหลดวิดีโอประกอบ';
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
      frame.title = `บทเรียน Revit สำหรับผู้เริ่มต้น บทที่ ${lesson}`;
      frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      button.replaceWith(frame);
    }, { once: true });
    const link = document.createElement('a');
    link.href = `https://www.youtube.com/watch?v=${id}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'เปิดวิดีโอใน YouTube';
    const paragraph = document.createElement('p');
    paragraph.append(link);
    slot.append(title, note, button, paragraph);
  });
})();
