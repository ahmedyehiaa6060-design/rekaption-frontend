// ==================== State ====================
let audioFile = null;
let leftLogoFile = null;
let rightLogoFile = null;
let selectedAnimation = 'pop';

// ==================== UI View Elements ====================
const uploadState = document.getElementById('upload-state');
const loadingState = document.getElementById('loading-state');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');

// ==================== Form Elements ====================
const formControls = document.getElementById('form-controls');
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

// ==================== Audio Dropzone Handling ====================
const audioInput = document.getElementById('audio-input');
const audioDropzone = document.getElementById('audio-dropzone');
const audioLabel = document.getElementById('audio-label');

audioInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    handleAudioSelect(this.files[0]);
  }
});

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
    handleAudioSelect(e.dataTransfer.files[0]);
    audioInput.files = e.dataTransfer.files;
  }
});

function handleAudioSelect(file) {
  audioFile = file;
  audioLabel.textContent = file.name;
  audioDropzone.classList.add('active');
  submitBtn.disabled = false;
}

// ==================== Logo Upload & Preview Handling ====================
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
    <img src="${url}" class="preview-thumbnail" alt="${side} logo preview" />
    <button type="button" class="clear-btn" onclick="event.stopPropagation(); clearLogo('${side}')">&times;</button>
  `;
}

window.clearLogo = function(side) {
  if (side === 'left') {
    leftLogoFile = null;
    leftLogoInput.value = '';
    leftLogoContent.innerHTML = `
      <span class="file-box-icon">🖼️</span>
      <span class="file-box-text">شعار أعلى اليسار</span>
    `;
  } else {
    rightLogoFile = null;
    rightLogoInput.value = '';
    rightLogoContent.innerHTML = `
      <span class="file-box-icon">🖼️</span>
      <span class="file-box-text">شعار أعلى اليمين</span>
    `;
  }
};

// ==================== Animation Styles Selection ====================
window.selectAnimation = function(el) {
  document.querySelectorAll('.anim-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedAnimation = el.dataset.anim;
};

// ==================== Color Pickers Casing ====================
document.getElementById('active-color').addEventListener('input', function() {
  document.getElementById('active-color-hex').textContent = this.value.toUpperCase();
});
document.getElementById('inactive-color').addEventListener('input', function() {
  document.getElementById('inactive-color-hex').textContent = this.value.toUpperCase();
});

// ==================== Advanced Settings panel toggler ====================
window.toggleAdvanced = function() {
  const panel = document.getElementById('advanced-panel');
  panel.classList.toggle('hidden');
};

// ==================== View State Managers ====================
function showState(visibleElement) {
  [uploadState, loadingState, successState, errorState].forEach(el => {
    el.classList.add('hidden');
  });
  visibleElement.classList.remove('hidden');
}

window.resetApp = function() {
  // Clear file states
  audioFile = null;
  audioInput.value = '';
  audioLabel.textContent = 'قم بسحب ملف الصوت أو الفيديو هنا أو انقر للاختيار';
  audioDropzone.classList.remove('active');
  submitBtn.disabled = true;
  
  clearLogo('left');
  clearLogo('right');
  
  showState(uploadState);
};

// ==================== Form submission & API handling ====================
formControls.addEventListener('submit', async function(e) {
  e.preventDefault();

  const apiUrl = apiUrlInput.value.replace(/\/+$/, '');
  if (!apiUrl) {
    showState(errorState);
    errorMsg.textContent = 'يرجى إدخال رابط الباك إند في الإعدادات المتقدمة أولاً لتوجيه الطلبات!';
    return;
  }

  if (!audioFile) {
    showState(errorState);
    errorMsg.textContent = 'يرجى اختيار ملف صوت أو فيديو أولاً لتوليد المقطع!';
    return;
  }

  showState(loadingState);
  progressMsg.textContent = 'جاري رفع الملفات وتجهيز الطلب...';

  // Simulated progress messages for render lifecycle
  const stages = [
    { time: 3000, msg: 'جاري تفريغ الصوت وتحليل التوقيت بالذكاء الاصطناعي (Whisper)...' },
    { time: 15000, msg: 'جاري تشغيل محرك الرندرة (Headless Chrome)...' },
    { time: 32000, msg: 'جاري دمج الكابشن والمؤثرات البصرية...' },
    { time: 48000, msg: 'جاري التصدير النهائي وضغط ملف الـ MP4...' },
  ];
  const timers = stages.map(s => setTimeout(() => { progressMsg.textContent = s.msg; }, s.time));

  // Build FormData payload
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
      let detail = 'حدث خطأ في معالجة الفيديو في السيرفر';
      try {
        const json = await res.json();
        detail = json.detail || detail;
      } catch(_) {}
      throw new Error(detail);
    }

    progressMsg.textContent = 'جاري تنزيل الفيديو المكتمل...';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    outputVideo.src = url;
    downloadLink.href = url;
    showState(successState);

  } catch (err) {
    timers.forEach(t => clearTimeout(t));
    showState(errorState);
    errorMsg.textContent = err.message || 'فشل الاتصال بالسيرفر. يرجى التحقق من تشغيل السيرفر أو الرابط.';
  }
});
