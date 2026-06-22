// ==================== State ====================
let audioFile = null;
let leftLogoFile = null;
let rightLogoFile = null;
let selectedAnimation = 'pop';

// ==================== Elements ====================
const formView = document.getElementById('form-view');
const loadingView = document.getElementById('loading-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const submitBtn = document.getElementById('submit-btn');
const progressMsg = document.getElementById('progress-msg');
const errorMsg = document.getElementById('error-msg');
const outputVideo = document.getElementById('output-video');
const downloadLink = document.getElementById('download-link');
const apiUrlInput = document.getElementById('api-url');

// Load saved API URL
apiUrlInput.value = localStorage.getItem('rekaption_api_url') || '';
apiUrlInput.addEventListener('input', function() {
  localStorage.setItem('rekaption_api_url', this.value);
});

// ==================== Audio Input ====================
const audioInput = document.getElementById('audio-input');
const audioDropzone = document.getElementById('audio-dropzone');
const audioLabel = document.getElementById('audio-label');

audioInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    audioFile = this.files[0];
    audioLabel.textContent = audioFile.name;
    audioDropzone.classList.add('active');
    submitBtn.disabled = false;
  }
});

// Drag & drop support
audioDropzone.addEventListener('dragover', function(e) {
  e.preventDefault();
  this.classList.add('active');
});
audioDropzone.addEventListener('dragleave', function() {
  if (!audioFile) this.classList.remove('active');
});
audioDropzone.addEventListener('drop', function(e) {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    audioFile = e.dataTransfer.files[0];
    audioInput.files = e.dataTransfer.files;
    audioLabel.textContent = audioFile.name;
    this.classList.add('active');
    submitBtn.disabled = false;
  }
});

// ==================== Logo Inputs ====================
const leftLogoInput = document.getElementById('left-logo-input');
const rightLogoInput = document.getElementById('right-logo-input');
const leftLogoContent = document.getElementById('left-logo-content');
const rightLogoContent = document.getElementById('right-logo-content');

leftLogoInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    leftLogoFile = this.files[0];
    showLogoPreview(leftLogoContent, leftLogoFile, 'left');
  }
});

rightLogoInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    rightLogoFile = this.files[0];
    showLogoPreview(rightLogoContent, rightLogoFile, 'right');
  }
});

function showLogoPreview(container, file, side) {
  const url = URL.createObjectURL(file);
  container.innerHTML = `
    <img src="${url}" class="logo-preview" alt="${side} logo" />
    <button class="logo-clear" onclick="event.stopPropagation(); clearLogo('${side}')">&times;</button>
  `;
}

function clearLogo(side) {
  if (side === 'left') {
    leftLogoFile = null;
    leftLogoInput.value = '';
    leftLogoContent.innerHTML = '<span style="font-size:24px">🖼️</span><p class="logo-label">شعار أعلى اليسار</p>';
  } else {
    rightLogoFile = null;
    rightLogoInput.value = '';
    rightLogoContent.innerHTML = '<span style="font-size:24px">🖼️</span><p class="logo-label">شعار أعلى اليمين</p>';
  }
}

// ==================== Animation Selection ====================
function selectAnimation(el) {
  document.querySelectorAll('.anim-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedAnimation = el.dataset.anim;
}

// ==================== Color Pickers ====================
document.getElementById('active-color').addEventListener('input', function() {
  document.getElementById('active-color-hex').textContent = this.value.toUpperCase();
});
document.getElementById('inactive-color').addEventListener('input', function() {
  document.getElementById('inactive-color-hex').textContent = this.value.toUpperCase();
});

// ==================== Advanced Panel ====================
function toggleAdvanced() {
  const panel = document.getElementById('advanced-panel');
  panel.classList.toggle('hidden');
}

// ==================== View Management ====================
function showView(view) {
  formView.classList.add('hidden');
  loadingView.classList.add('hidden');
  successView.classList.add('hidden');
  errorView.classList.add('hidden');
  view.classList.remove('hidden');
}

function resetForm() {
  showView(formView);
}

// ==================== Form Submit ====================
document.getElementById('form-view').addEventListener('submit', async function(e) {
  e.preventDefault();

  const apiUrl = apiUrlInput.value.replace(/\/+$/, '');
  if (!apiUrl) {
    showView(errorView);
    errorMsg.textContent = 'يرجى إدخال رابط الباك إند في الإعدادات المتقدمة أولاً!';
    return;
  }

  if (!audioFile) {
    showView(errorView);
    errorMsg.textContent = 'يرجى اختيار ملف صوتي أولاً!';
    return;
  }

  showView(loadingView);
  progressMsg.textContent = 'جاري تحميل الملفات وتجهيز الطلب...';

  // Simulated progress messages
  const stages = [
    { time: 3000, msg: 'جاري تفريغ الصوت وتحليل التوقيت بالذكاء الاصطناعي (Whisper)...' },
    { time: 15000, msg: 'جاري تشغيل محرك الرندرة (Headless Chrome)...' },
    { time: 30000, msg: 'جاري دمج الصوت والمؤثرات البصرية...' },
    { time: 45000, msg: 'جاري التصدير النهائي وضغط ملف الـ MP4...' },
  ];
  const timers = stages.map(s => setTimeout(() => { progressMsg.textContent = s.msg; }, s.time));

  // Build FormData
  const fd = new FormData();
  fd.append('audio', audioFile);
  if (leftLogoFile) fd.append('leftLogo', leftLogoFile);
  if (rightLogoFile) fd.append('rightLogo', rightLogoFile);
  fd.append('minWords', document.getElementById('min-words').value);
  fd.append('maxWords', document.getElementById('max-words').value);
  fd.append('animation', selectedAnimation);
  fd.append('activeColor', document.getElementById('active-color').value);
  fd.append('inactiveColor', document.getElementById('inactive-color').value);

  try {
    const res = await fetch(apiUrl + '/api/generate', {
      method: 'POST',
      body: fd,
    });

    timers.forEach(t => clearTimeout(t));

    if (!res.ok) {
      let detail = 'خطأ غير معروف من السيرفر';
      try {
        const json = await res.json();
        detail = json.detail || detail;
      } catch(_) {}
      throw new Error(detail);
    }

    progressMsg.textContent = 'جاري تحميل الفيديو الناتج...';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    outputVideo.src = url;
    downloadLink.href = url;
    showView(successView);

  } catch (err) {
    timers.forEach(t => clearTimeout(t));
    showView(errorView);
    errorMsg.textContent = err.message || 'فشل الاتصال بالسيرفر. تحقق من رابط الـ API.';
  }
});
