'use strict';
(() => {
  const STYLE = `
  #gamevui-voice{position:fixed;z-index:9999;right:12px;bottom:12px;width:min(290px,calc(100vw - 24px));padding:12px;border:1px solid #ffffff30;border-radius:15px;background:rgba(7,21,15,.96);color:#f3f5e9;box-shadow:0 12px 36px #0008;font:14px/1.4 system-ui,sans-serif;backdrop-filter:blur(12px)}
  #gamevui-voice .gv-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:750}
  #gamevui-voice .gv-status{font-size:12px;color:#b9c9bb;margin:5px 0 9px}
  #gamevui-voice .gv-actions{display:flex;gap:7px}
  #gamevui-voice button{flex:1;border:1px solid #e2bd6270;border-radius:9px;padding:9px 8px;background:#14502f;color:white;font:650 13px system-ui;cursor:pointer}
  #gamevui-voice button[aria-pressed=true]{background:#7c2828;border-color:#ffaaaa}
  #gamevui-voice button:disabled{opacity:.5}
  #gamevui-voice .gv-volume{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:#b9c9bb}
  #gamevui-voice input{width:100%;min-width:0;accent-color:#e2bd62}
  #gamevui-voice .gv-error{color:#ffb4a9;font-size:12px;margin-top:7px}
  @media(max-width:600px){#gamevui-voice{right:8px;bottom:8px;width:min(250px,calc(100vw - 16px));padding:9px}#gamevui-voice button{padding:8px 5px;font-size:12px}}
  `;
  class GamevuiVoice {
    constructor() {
      this.room = '';
      this.token = '';
      this.socket = null;
      this.self = null;
      this.peers = new Map();
      this.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];
      this.stream = null;
      this.enabled = false;
      this.speakerMuted = false;
      this.volume = 0.85;
      this.error = '';
      this.root = null;
      this.reconnectTimer = null;
      this.injectStyle();
      window.addEventListener('pagehide', () => this.leave());
    }
    injectStyle() {
      if (document.getElementById('gamevui-voice-style')) return;
      const style = document.createElement('style');
      style.id = 'gamevui-voice-style';
      style.textContent = STYLE;
      document.head.appendChild(style);
    }
    mount() {
      if (this.root?.isConnected) return;
      this.root = document.getElementById('gamevui-voice');
      if (!this.root) {
        this.root = document.createElement('section');
        this.root.id = 'gamevui-voice';
        this.root.innerHTML = '<div class="gv-head"><span>🎙 Voice Chat</span><span id="gv-count">0 người</span></div><div class="gv-status" id="gv-status">Micro đang tắt mặc định</div><div class="gv-actions"><button id="gv-mic" type="button" aria-pressed="false">🎙 Bật micro</button><button id="gv-speaker" type="button" aria-pressed="false">🔊 Tắt tiếng</button></div><label class="gv-volume">Âm lượng <input id="gv-volume" type="range" min="0" max="100" value="85"></label><div class="gv-error" id="gv-error" role="status"></div>';
        document.body.appendChild(this.root);
        this.root.querySelector('#gv-mic').addEventListener('click', () => this.toggleMic());
        this.root.querySelector('#gv-speaker').addEventListener('click', () => this.toggleSpeaker());
        this.root.querySelector('#gv-volume').addEventListener('input', event => {
          this.volume = Number(event.target.value) / 100;
          this.applyAudioSettings();
        });
      }
      this.render();
    }
    render() {
      if (!this.root?.isConnected) return;
      const count = this.root.querySelector('#gv-count');
      const status = this.root.querySelector('#gv-status');
      const mic = this.root.querySelector('#gv-mic');
      const speaker = this.root.querySelector('#gv-speaker');
      const error = this.root.querySelector('#gv-error');
      if (count) count.textContent = this.peers.size + ' người';
      if (status) status.textContent = this.socket?.readyState === WebSocket.OPEN ? (this.enabled ? 'Micro đang bật · chỉ người trong phòng nghe được' : 'Đã kết nối · micro đang tắt') : 'Đang kết nối kênh thoại…';
      if (mic) { mic.textContent = this.enabled ? '🔇 Tắt micro' : '🎙 Bật micro'; mic.setAttribute('aria-pressed', String(this.enabled)); }
      if (speaker) { speaker.textContent = this.speakerMuted ? '🔈 Bật tiếng' : '🔊 Tắt tiếng'; speaker.setAttribute('aria-pressed', String(this.speakerMuted)); }
      if (error) error.textContent = this.error;
    }
    async enter(room, token) {
      if (!room || !token) return;
      if (this.room === room && this.token === token && this.socket && this.socket.readyState <= WebSocket.OPEN) { this.mount(); return; }
      this.leave();
      this.room = room;
      this.token = token;
      this.mount();
      try {
        const configUrl = '/api/voice/config?room=' + encodeURIComponent(room) + '&token=' + encodeURIComponent(token);
        const response = await fetch(configUrl, { credentials: 'same-origin', cache: 'no-store' });
        const config = await response.json();
        if (this.room !== room || this.token !== token) return;
        if (!response.ok) throw new Error(config.error || 'Không thể xác thực kênh thoại.');
        this.iceServers = Array.isArray(config.iceServers) ? config.iceServers : this.iceServers;
        const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(scheme + '//' + location.host + '/api/voice?room=' + encodeURIComponent(room) + '&token=' + encodeURIComponent(token));
        this.socket = socket;
        socket.onopen = () => { this.error = ''; this.render(); };
        socket.onmessage = event => this.onMessage(event);
        socket.onerror = () => { this.error = 'Kênh thoại gặp lỗi kết nối. Trò chơi vẫn hoạt động bình thường.'; this.render(); };
        socket.onclose = () => {
          if (this.socket !== socket) return;
          this.socket = null;
          this.render();
          if (this.room === room && this.token === token) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              if (this.room === room && this.token === token) this.enter(room, token);
            }, 2500);
          }
        };
      } catch (error) {
        this.error = error.message || 'Không thể kết nối Voice Chat.';
        this.render();
      }
    }
    syncPlayers(players) {
      if (!Array.isArray(players)) return;
      const allowed = new Set(players.filter(p => p && !p.bot && p.connected).map(p => p.id));
      for (const [id, peer] of this.peers) if (!allowed.has(id)) this.removePeer(id);
      this.render();
    }
    send(payload) {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
    }
    onMessage(event) {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'voice:peers') {
        this.self = message.self;
        for (const peer of message.peers || []) this.ensurePeer(peer);
      } else if (message.type === 'voice:peer-joined') {
        this.ensurePeer(message.peer);
      } else if (message.type === 'voice:peer-left') {
        this.removePeer(message.peer?.id);
      } else if (message.type === 'voice:signal') {
        this.handleSignal(message.from, message.signal).catch(error => { this.error = error.message; this.render(); });
      } else if (message.type === 'voice:speaking') {
        const peer = this.peers.get(message.from?.id);
        if (peer) peer.speaking = message.speaking === true;
        this.render();
      }
      this.render();
    }
    ensurePeer(info) {
      if (!info?.id || info.id === this.self?.id || this.peers.has(info.id)) return;
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const record = { id: info.id, name: String(info.name || 'Người chơi').slice(0, 24), pc, audio: null, polite: String(this.self?.id || '').localeCompare(String(info.id)) > 0, makingOffer: false, ignoreOffer: false, candidates: [], speaking: false };
      this.peers.set(info.id, record);
      pc.onicecandidate = event => { if (event.candidate) this.send({ type: 'ice-candidate', to: info.id, candidate: event.candidate.toJSON() }); };
      pc.onnegotiationneeded = async () => {
        try {
          record.makingOffer = true;
          await pc.setLocalDescription();
          this.send({ type: pc.localDescription.type, to: info.id, description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
        } catch (error) { this.error = 'Không thể tạo kết nối với ' + record.name + ': ' + error.message; this.render(); }
        finally { record.makingOffer = false; }
      };
      pc.ontrack = event => {
        let audio = record.audio;
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.playsInline = true;
          audio.dataset.voicePeer = info.id;
          document.body.appendChild(audio);
          record.audio = audio;
        }
        if (event.streams?.[0]) audio.srcObject = event.streams[0];
        this.applyAudioSettings();
        audio.play().catch(() => { this.error = 'Trình duyệt đang chặn phát âm thanh. Hãy tương tác với trang rồi bật tiếng.'; this.render(); });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') this.error = 'Kết nối thoại với ' + record.name + ' thất bại. Có thể cần cấu hình TURN.';
        this.render();
      };
      if (this.stream) for (const track of this.stream.getAudioTracks()) pc.addTrack(track, this.stream);
      this.render();
    }
    async handleSignal(from, signal) {
      if (!from?.id || !signal) return;
      let peer = this.peers.get(from.id);
      if (!peer) { this.ensurePeer(from); peer = this.peers.get(from.id); }
      if (!peer) return;
      const pc = peer.pc;
      if (signal.type === 'ice-candidate') {
        if (signal.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
          else peer.candidates.push(signal.candidate);
        }
        return;
      }
      if (!['offer', 'answer'].includes(signal.type) || !signal.description) return;
      const collision = signal.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
      peer.ignoreOffer = !peer.polite && collision;
      if (peer.ignoreOffer) return;
      if (collision) await Promise.all([pc.setLocalDescription({ type: 'rollback' }), pc.setRemoteDescription(signal.description)]);
      else await pc.setRemoteDescription(signal.description);
      for (const candidate of peer.candidates.splice(0)) await pc.addIceCandidate(candidate);
      if (signal.type === 'offer') {
        await pc.setLocalDescription();
        this.send({ type: 'answer', to: from.id, description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
      }
    }
    async toggleMic() {
      if (this.enabled) {
        for (const peer of this.peers.values()) {
          const sender = peer.pc.getSenders().find(item => item.track?.kind === 'audio');
          if (sender) await sender.replaceTrack(null).catch(() => {});
        }
        for (const track of this.stream?.getTracks() || []) track.stop();
        this.stream = null;
        this.enabled = false;
        this.send({ type: 'voice:speaking', speaking: false });
        this.error = '';
        this.render();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        this.error = 'Trình duyệt hoặc kết nối hiện tại không hỗ trợ micro. Hãy dùng HTTPS và trình duyệt mới.';
        this.render();
        return;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        this.enabled = true;
        for (const peer of this.peers.values()) {
          const track = this.stream.getAudioTracks()[0];
          const sender = peer.pc.getSenders().find(item => item.track?.kind === 'audio') || peer.pc.getTransceivers().find(item => item.receiver.track?.kind === 'audio')?.sender;
          if (sender) await sender.replaceTrack(track);
          else peer.pc.addTrack(track, this.stream);
        }
        this.error = '';
        this.render();
      } catch (error) {
        for (const track of this.stream?.getTracks() || []) track.stop();
        this.stream = null;
        this.enabled = false;
        this.error = error.name === 'NotAllowedError' ? 'Bạn chưa cấp quyền micro. Có thể tiếp tục chơi mà không cần Voice Chat.' : 'Không thể bật micro: ' + (error.message || 'Lỗi thiết bị.');
        this.render();
      }
    }
    toggleSpeaker() {
      this.speakerMuted = !this.speakerMuted;
      this.applyAudioSettings();
      this.render();
    }
    applyAudioSettings() {
      for (const audio of document.querySelectorAll('audio[data-voice-peer]')) {
        audio.muted = this.speakerMuted;
        audio.volume = this.volume;
      }
    }
    removePeer(id) {
      const peer = this.peers.get(id);
      if (!peer) return;
      try { peer.pc.close(); } catch {}
      if (peer.audio) { peer.audio.pause(); peer.audio.srcObject = null; peer.audio.remove(); }
      this.peers.delete(id);
      this.render();
    }
    leave() {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      for (const id of [...this.peers.keys()]) this.removePeer(id);
      for (const track of this.stream?.getTracks() || []) track.stop();
      this.stream = null;
      this.enabled = false;
      const socket = this.socket;
      this.socket = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Left room');
      this.room = '';
      this.token = '';
      this.self = null;
      this.error = '';
      this.root?.remove();
      this.root = null;
    }
  }
  window.GamevuiVoice = new GamevuiVoice();
})();
