import { CharacterCycle, GestureGate, faceGeometry, frameFromHands, faceInside } from './engine.js';

const $ = id => document.getElementById(id);
const video = $('camera'), canvas = $('scene'), ctx = canvas.getContext('2d', { alpha: false });
const characters = [
  { name: '运动财宝', file: 'sport', tag: '红色刘海', text: '红色刘海，睁眼微笑。' },
  { name: '书香财宝', file: 'study', tag: '圆框眼镜', text: '灰色卷发，黑色圆框眼镜。' },
  { name: '音乐财宝', file: 'music', tag: '耳机造型', text: '金色刘海，粉色耳机，闭眼微笑。' },
  { name: '商务财宝', file: 'business', tag: '蓝色刘海', text: '蓝色刘海，睁眼微笑。' },
];
const cycle = new CharacterCycle(characters.length), gate = new GestureGate();
const state = {
  stream: null, running: false, starting: false, ready: false,
  hands: null, faces: null, face: null, faceAt: 0,
  handPoints: [], handsAt: 0, active: false, index: -1, count: 0,
  mirror: true, facing: 'user', size: 1, offset: 0,
  token: 0, frame: 0, detecting: false, filtered: null, lastSeen: 0,
};
const images = characters.map(character => {
  const image = new Image();
  image.src = `assets/${character.file}.png`;
  return image;
});
let assetError = null;
const assetsReady = Promise.all(images.map(image => image.decode())).catch(error => { assetError = error; });

function status(text, live = false) {
  $('status').textContent = text;
  $('statusDot').classList.toggle('live', live);
}
function showError(text) { $('error').textContent = text; $('error').hidden = false; }
function clearError() { $('error').hidden = true; $('error').textContent = ''; }
function controls() {
  $('start').disabled = state.starting || state.running;
  $('welcomeStart').disabled = state.starting;
  $('start').textContent = state.starting ? '正在开启…' : state.running ? '摄像头已开启' : '开启摄像头';
  for (const id of ['change', 'restore', 'capture']) $(id).disabled = !state.running || !state.ready;
  $('switch').disabled = state.starting || !state.running;
  $('stop').disabled = state.starting || !state.running;
}
function resetTracking() {
  state.face = null; state.faceAt = 0; state.handPoints = []; state.filtered = null; state.lastSeen = 0;
  gate.reset();
}
function restore() {
  state.active = false;
  $('mode').textContent = '真人模式';
  $('activeTag').textContent = '尚未选择';
  document.querySelectorAll('[data-character]').forEach(element => element.classList.remove('active'));
}
function choose() {
  if (!state.running || !state.ready || !state.face || performance.now() - state.faceAt > 650) {
    $('hint').textContent = '请正对镜头，让画面识别到一张清晰的人脸。';
    return;
  }
  state.index = cycle.next(); state.active = true; state.count++;
  const character = characters[state.index];
  $('currentImage').src = images[state.index].src;
  $('currentImage').alt = character.name;
  $('currentName').textContent = character.name;
  $('currentText').textContent = character.text;
  $('activeTag').textContent = character.tag;
  $('mode').textContent = character.name;
  $('counter').textContent = `已换脸 ${state.count} 次`;
  document.querySelectorAll('[data-character]').forEach(element => element.classList.toggle('active', Number(element.dataset.character) === state.index));
  $('hint').textContent = `已切换为${character.name}。放下双手后可再次比框换脸。`;
}
async function setup() {
  if (state.ready) return;
  if (!window.Hands || !window.FaceMesh) throw new Error('本地识别组件缺失，请检查 vendor 文件夹是否完整。');
  if (!state.hands) {
    state.hands = new window.Hands({ locateFile: file => new URL(`vendor/hands/${file}`, location.href).href });
    state.hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: .6, minTrackingConfidence: .6, selfieMode: false });
    state.hands.onResults(result => {
      if (!state.running) return;
      state.handPoints = result.multiHandLandmarks || [];
      state.handsAt = performance.now();
    });
  }
  if (!state.faces) {
    state.faces = new window.FaceMesh({ locateFile: file => new URL(`vendor/face_mesh/${file}`, location.href).href });
    state.faces.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: .6, minTrackingConfidence: .6, selfieMode: false });
    state.faces.onResults(result => {
      if (!state.running) return;
      state.face = result.multiFaceLandmarks?.[0] || null;
      state.faceAt = performance.now();
      if (!state.face) state.filtered = null;
    });
  }
  await state.faces.initialize();
  await state.hands.initialize();
  await assetsReady;
  if (assetError) throw new Error('财宝儿贴图读取失败，请检查 assets 文件夹后刷新页面。');
  state.ready = true;
}
function cameraError(error) {
  return ({
    NotAllowedError: '摄像头权限未获允许。请点击地址栏左侧的权限图标，允许摄像头后重试。',
    NotFoundError: '未找到摄像头。请连接摄像头后重试。',
    NotReadableError: '摄像头被其他程序占用，请关闭占用镜头的软件后重试。',
    OverconstrainedError: '当前镜头不支持所选参数，请尝试其他摄像头。',
  })[error.name] || error.message || String(error);
}
async function start() {
  if (state.starting || state.running) return;
  state.starting = true; clearError(); controls();
  const token = ++state.token;
  try {
    if (!window.isSecureContext) throw new Error('摄像头需要安全环境，请使用启动脚本打开 localhost 地址，或部署至 HTTPS。');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器不支持摄像头，请使用新版 Edge 或 Chrome。');
    status('正在请求摄像头权限');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: state.facing }, width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24, max: 30 } },
    });
    if (token !== state.token) { stream.getTracks().forEach(track => track.stop()); return; }
    state.stream = stream; video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth || 960; canvas.height = video.videoHeight || 540;
    status('正在加载本地识别组件，首次启动请稍候');
    await setup();
    if (token !== state.token) return;
    resetTracking(); state.running = true;
    $('welcome').hidden = true;
    status('镜头已开启 · 本地识别中', true);
    state.frame = requestAnimationFrame(render);
    detect(token);
  } catch (error) {
    if (token === state.token) { stop(); showError(cameraError(error)); status('启动失败，请查看提示'); }
  } finally { state.starting = false; controls(); }
}
function stop() {
  state.running = false; state.token++;
  cancelAnimationFrame(state.frame);
  state.stream?.getTracks().forEach(track => track.stop());
  state.stream = null; video.srcObject = null;
  resetTracking(); restore();
  $('welcome').hidden = false;
  ctx.fillStyle = '#211e23'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  $('tracking').textContent = '镜头已关闭';
  status('摄像头已关闭'); controls();
}
async function detect(token) {
  if (state.detecting) return;
  state.detecting = true;
  try {
    while (state.running && token === state.token) {
      if (video.readyState >= 2) {
        await state.faces.send({ image: video });
        if (!state.running || token !== state.token) break;
        await state.hands.send({ image: video });
      }
      await new Promise(resolve => setTimeout(resolve, 35));
    }
  } catch (error) {
    if (token === state.token) { stop(); showError(`识别已停止：${cameraError(error)}。请刷新页面后重试。`); }
  } finally {
    state.detecting = false;
    if (state.running && token !== state.token) detect(state.token);
  }
}
function geometry(now) {
  if (!state.face || now - state.faceAt > 650) { state.filtered = null; return null; }
  const current = faceGeometry(state.face, canvas.width, canvas.height, state.mirror);
  if (!state.filtered) state.filtered = current;
  else {
    for (const key of ['x', 'y', 'width', 'height', 'angle']) state.filtered[key] += (current[key] - state.filtered[key]) * .45;
    state.filtered.center = current.center;
  }
  return state.filtered;
}
function drawSticker(target, face, scale = 1) {
  const image = images[state.index];
  if (!image?.complete || !image.naturalWidth) return;
  const width = face.width * state.size * scale, height = width * image.naturalHeight / image.naturalWidth;
  target.save();
  target.translate(face.x * scale, (face.y + state.offset * face.height) * scale);
  target.rotate(face.angle);
  target.shadowColor = '#0002'; target.shadowBlur = 4 * scale;
  target.drawImage(image, -width * .5, -height * .5, width, height);
  target.restore();
}
function drawFrame(frame, progress) {
  const color = progress > 0 ? '#ffdc98' : '#f6f0e9';
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]); ctx.strokeRect(frame.x, frame.y, frame.w, frame.h); ctx.setLineDash([]);
  frame.tips.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
  if (progress > 0) {
    ctx.fillStyle = '#ffffff55'; ctx.fillRect(frame.x, frame.y - 12, frame.w, 5);
    ctx.fillStyle = '#ffdc98'; ctx.fillRect(frame.x, frame.y - 12, frame.w * progress, 5);
  }
  ctx.restore();
}
function drawCamera(target, width, height) {
  target.save();
  if (state.mirror) { target.translate(width, 0); target.scale(-1, 1); }
  target.drawImage(video, 0, 0, width, height);
  target.restore();
}
function render(now) {
  if (!state.running) return;
  drawCamera(ctx, canvas.width, canvas.height);
  const face = geometry(now);
  if (state.active && face) drawSticker(ctx, face);
  if (face) state.lastSeen = now;
  if (!face && state.active && now - state.lastSeen > 1200) {
    restore();
    $('hint').textContent = '人脸已离开画面。重新入镜后，再比框或点击按钮换脸。';
  }
  const hands = now - state.handsAt < 650 ? state.handPoints : [];
  const frame = frameFromHands(hands, canvas.width, canvas.height, state.mirror);
  if (gate.update(faceInside(frame, face), now)) choose();
  if (frame && $('guides').checked) drawFrame(frame, gate.progress);
  $('tracking').textContent = `${face ? '已识别人脸' : '请正对镜头'} · ${hands.length}/2 只手`;
  state.frame = requestAnimationFrame(render);
}
async function capture() {
  if (!state.running || video.readyState < 2) return;
  const photo = document.createElement('canvas');
  photo.width = 1280;
  const height = Math.round(canvas.height / canvas.width * 1280);
  photo.height = height + 116;
  const target = photo.getContext('2d');
  drawCamera(target, 1280, height);
  const face = geometry(performance.now());
  if (state.active && face) drawSticker(target, face, 1280 / canvas.width);
  target.fillStyle = '#f8f4ee'; target.fillRect(0, height, 1280, 116);
  target.fillStyle = '#781f35'; target.fillRect(32, height + 25, 4, 65);
  target.font = 'bold 29px "Microsoft YaHei",sans-serif'; target.fillText('财宝儿换脸', 57, height + 52);
  target.font = '15px "Microsoft YaHei",sans-serif'; target.fillStyle = '#7f7275';
  target.fillText('中央财经大学 · 财宝儿主题合影', 57, height + 83);
  target.textAlign = 'right'; target.fillText(state.active && face ? characters[state.index].name : '校园合影', 1244, height + 52);
  target.font = '13px sans-serif'; target.fillText(new Date().toLocaleDateString('zh-CN'), 1244, height + 82);
  const blob = await new Promise(resolve => photo.toBlob(resolve, 'image/png'));
  if (!blob) { showError('照片导出失败，请重新拍摄。'); return; }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `财宝儿换脸-${new Date().toISOString().replace(/[:.]/g, '-')}.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  $('flash').classList.remove('fire'); void $('flash').offsetWidth; $('flash').classList.add('fire');
  $('hint').textContent = '校园合影已生成，请在浏览器下载记录中查看。';
}
$('start').onclick = start; $('welcomeStart').onclick = start; $('stop').onclick = stop;
$('change').onclick = choose;
$('restore').onclick = () => { restore(); $('hint').textContent = '已恢复真人，下次比框可再次换脸。'; };
$('capture').onclick = () => capture().catch(error => showError(error.message));
$('mirror').onchange = event => { state.mirror = event.target.checked; state.filtered = null; gate.reset(); };
$('size').oninput = event => { state.size = Number(event.target.value) / 100; $('sizeValue').textContent = `${event.target.value}%`; };
$('offset').oninput = event => { state.offset = Number(event.target.value) / 100; $('offsetValue').textContent = event.target.value; };
$('switch').onclick = async () => {
  if (state.starting) return;
  state.facing = state.facing === 'user' ? 'environment' : 'user'; stop(); await start();
};
window.addEventListener('keydown', event => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || !state.running || event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); choose(); }
  else if (event.key.toLowerCase() === 'r') $('restore').click();
  else if (event.key.toLowerCase() === 's') $('capture').click();
});
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (state.running || state.starting)) {
    stop(); $('hint').textContent = '页面切至后台，摄像头已关闭。返回后点击开启摄像头继续。';
  }
});
controls();
