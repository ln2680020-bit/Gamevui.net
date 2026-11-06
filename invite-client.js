'use strict';
(() => {
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if (!room || !/^[a-zA-Z0-9_-]{1,20}$/.test(room)) return;
  let saved;
  try { saved = JSON.parse(localStorage.getItem('samuno:' + room) || '{}'); } catch { saved = {}; }
  if (!saved.token) return;

  const style = document.createElement('style');
  style.textContent = `
    #room-invite-tools{position:fixed;z-index:10000;right:14px;top:14px;font:14px/1.4 system-ui,sans-serif}
    #room-invite-open{border:1px solid #ffffff35;border-radius:12px;padding:10px 14px;background:linear-gradient(135deg,#267b9a,#3156a0);color:#fff;font-weight:800;box-shadow:0 8px 24px #0005;cursor:pointer}
    #room-invite-panel{display:none;width:min(340px,calc(100vw - 28px));margin-top:8px;padding:13px;border:1px solid #ffffff30;border-radius:14px;background:#10243a;color:#f4f7ff;box-shadow:0 16px 40px #0008}
    #room-invite-panel.open{display:block}#room-invite-panel p{margin:0 0 8px;color:#c1cede;font-size:12px}
    #room-invite-link{width:100%;padding:9px;border:1px solid #ffffff30;border-radius:8px;background:#071626;color:#fff;font-size:12px}
    #room-invite-copy{width:100%;margin-top:8px;padding:9px;border:0;border-radius:8px;background:#287c9c;color:#fff;font-weight:800;cursor:pointer}
    #room-event-toast{position:fixed;z-index:10001;top:72px;right:14px;max-width:min(340px,calc(100vw - 28px));padding:11px 14px;border:1px solid #ffffff30;border-radius:12px;background:#142b40;color:#fff;box-shadow:0 12px 35px #0008;font:13px/1.4 system-ui,sans-serif;opacity:0;transform:translateY(-8px);transition:.2s;pointer-events:none}
    #room-event-toast.show{opacity:1;transform:translateY(0)}
    @media(max-width:600px){#room-invite-tools{right:9px;top:9px}#room-invite-open{padding:8px 11px;font-size:12px}}
  `;
  document.head.append(style);
  const wrap = document.createElement('div');
  wrap.id = 'room-invite-tools';
  wrap.innerHTML = '<button id="room-invite-open" type="button">↗ Mời người chơi</button><div id="room-invite-panel"><p>Chia sẻ link này để người khác vào đúng phòng. Link có hiệu lực 24 giờ.</p><input id="room-invite-link" readonly aria-label="Đường link mời"><button id="room-invite-copy" type="button">Sao chép link mời</button></div>';
  document.body.append(wrap);
  const toast = document.createElement('div');
  toast.id = 'room-event-toast';
  toast.setAttribute('role','status');
  document.body.append(toast);
  let toastTimer = null;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  const panel = document.getElementById('room-invite-panel');
  document.getElementById('room-invite-open').addEventListener('click', async () => {
    panel.classList.toggle('open');
    if (panel.dataset.ready === '1') return;
    try {
      const response = await fetch('/api/room/invite', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({room,token:saved.token})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được link mời');
      document.getElementById('room-invite-link').value = location.origin + data.path;
      panel.dataset.ready = '1';
    } catch (error) { notify(error.message === 'unauthorized' ? 'Phiên chơi đã hết hạn. Hãy tải lại phòng.' : 'Không thể tạo link mời lúc này.'); }
  });
  document.getElementById('room-invite-copy').addEventListener('click', async () => {
    const input = document.getElementById('room-invite-link');
    if (!input.value) return;
    try { await navigator.clipboard.writeText(input.value); notify('Đã sao chép link mời.'); }
    catch { input.focus(); input.select(); notify('Hãy sao chép đường link đang được chọn.'); }
  });

  let initialized = false;
  const seen = new Set();
  const source = new EventSource('/api/events?room=' + encodeURIComponent(room) + '&token=' + encodeURIComponent(saved.token));
  source.onmessage = event => {
    try {
      const state = JSON.parse(event.data);
      const notifications = Array.isArray(state.notifications) ? state.notifications : [];
      if (!initialized) {
        notifications.forEach(item => seen.add(item.id));
        initialized = true;
        return;
      }
      for (const item of notifications) {
        if (!item || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        if (seen.size > 100) seen.delete(seen.values().next().value);
        notify(item.message || 'Có cập nhật mới trong phòng.');
      }
    } catch {}
  };
  source.onerror = () => {};
})();
