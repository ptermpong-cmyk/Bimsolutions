document.querySelectorAll('.article-figure img, .cover-figure img').forEach((img) => {
  const link = document.createElement('a');
  link.href = img.getAttribute('src');
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'image-link';
  link.setAttribute('aria-label', `เปิดภาพขนาดเต็ม: ${img.alt}`);
  img.before(link);
  link.append(img);
  const ribbon = img.getAttribute('src').includes('-ribbon.png');
  if (ribbon) {
    const scroll = document.createElement('div');
    scroll.className = 'ribbon-scroll';
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'ภาพแถบเครื่องมือ เลื่อนแนวนอนเพื่อดูคำสั่ง');
    link.before(scroll);
    scroll.append(link);
  }
  const hint = document.createElement('small');
  hint.className = 'image-hint';
  hint.textContent = ribbon ? 'เลื่อนซ้าย–ขวาเพื่อดูเครื่องมือ · คลิกภาพเพื่อเปิดขนาดเต็ม' : 'คลิกภาพเพื่อเปิดขนาดเต็ม';
  img.closest('figure').append(hint);
});
