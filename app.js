// ==================== State ====================
let audioFile = null;
let leftLogoFile = null;
let rightLogoFile = null;
let selectedAnimation = 'pop';

let transcribeData = null; // Holds the JSON returned from /api/transcribe
let activeSegmentIndex = -1;
let currentTime = 0;

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
  
  transcribeData = null;
  activeSegmentIndex = -1;
  currentTime = 0;
  
  // Hide editor, show main dashboard
  document.getElementById('editor-state').classList.add('hidden');
  document.getElementById('main-dashboard').classList.remove('hidden');
  
  showState(uploadState);
};

// ==================== Silence/Snooze Check Helper ====================
function isSpeaking(segment, time) {
  if (!segment || !segment.words || segment.words.length === 0) return false;
  
  const firstWord = segment.words[0];
  const lastWord = segment.words[segment.words.length - 1];
  
  // 1. Before first word or after last word (with 0.15s padding)
  if (time < firstWord.start - 0.15 || time > lastWord.end + 0.15) {
    return false;
  }
  
  // 2. Silent gaps between words (greater than 0.35s)
  for (let i = 0; i < segment.words.length - 1; i++) {
    const currentWordEnd = segment.words[i].end;
    const nextWordStart = segment.words[i+1].start;
    const gap = nextWordStart - currentWordEnd;
    if (gap > 0.35) {
      if (time > currentWordEnd + 0.15 && time < nextWordStart - 0.15) {
        return false;
      }
    }
  }
  
  return true;
}

// ==================== Media Player & Live Caption Overlay ====================
function initMediaPlayer() {
  const wrapper = document.getElementById('preview-wrapper');
  if (!wrapper || !transcribeData) return;
  
  const apiUrl = apiUrlInput.value.replace(/\/+$/, '');
  const mediaUrl = `${apiUrl}/public/${transcribeData.audioPath}`;
  
  let mediaHtml = '';
  if (transcribeData.videoPath) {
    wrapper.classList.remove('audio-mode');
    mediaHtml = `
      <video id="media-player" src="${mediaUrl}" class="preview-media-element" controls></video>
    `;
  } else {
    wrapper.classList.add('audio-mode');
    mediaHtml = `
      <div class="audio-equalizer-dots" style="margin-top: 20px;">
        <div class="audio-equalizer-dot"></div>
        <div class="audio-equalizer-dot"></div>
        <div class="audio-equalizer-dot"></div>
        <div class="audio-equalizer-dot"></div>
      </div>
      <audio id="media-player" src="${mediaUrl}" controls style="width: 90%; margin-bottom: 20px;"></audio>
    `;
  }
  
  // Add the Live Caption Overlay container
  mediaHtml += `
    <div id="live-caption-overlay" class="hidden" style="
      position: absolute;
      bottom: ${transcribeData.videoPath ? '60px' : 'auto'};
      top: ${transcribeData.videoPath ? 'auto' : '15px'};
      left: 12px;
      right: 12px;
      background: rgba(10, 8, 20, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 10px 14px;
      text-align: center;
      pointer-events: none;
      z-index: 10;
      direction: rtl;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      font-size: 16px;
      font-weight: 800;
      font-family: 'Cairo', sans-serif;
      line-height: 1.5;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    "></div>
  `;
  
  wrapper.innerHTML = mediaHtml;
  
  const player = document.getElementById('media-player');
  player.addEventListener('timeupdate', function() {
    updateActiveSegment(this.currentTime);
  });
}

function updateActiveSegment(time) {
  if (!transcribeData) return;
  
  currentTime = time;
  let newActiveIndex = -1;
  for (let i = 0; i < transcribeData.segments.length; i++) {
    const seg = transcribeData.segments[i];
    if (time >= seg.start && time <= seg.end) {
      newActiveIndex = i;
      break;
    }
  }
  
  if (newActiveIndex !== activeSegmentIndex) {
    activeSegmentIndex = newActiveIndex;
    
    // Highlight active card and scroll it into view
    document.querySelectorAll('.segment-card').forEach((card, idx) => {
      if (idx === activeSegmentIndex) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        card.classList.remove('active');
      }
    });
  }
  
  // Update live caption overlay
  updateLiveCaptionOverlay(time);
}

function updateLiveCaptionOverlay(time) {
  const overlayContainer = document.getElementById('live-caption-overlay');
  if (!overlayContainer) return;
  
  if (activeSegmentIndex === -1 || !transcribeData) {
    overlayContainer.classList.add('hidden');
    return;
  }
  
  const segment = transcribeData.segments[activeSegmentIndex];
  
  // Respect silence / snooze
  if (!isSpeaking(segment, time)) {
    overlayContainer.classList.add('hidden');
    return;
  }
  
  overlayContainer.classList.remove('hidden');
  const activeColor = document.getElementById('active-color').value;
  const inactiveColor = document.getElementById('inactive-color').value;
  
  let html = '';
  segment.words.forEach(w => {
    const isWordActive = time >= w.start && time <= w.end;
    const color = isWordActive ? activeColor : inactiveColor;
    const shadow = isWordActive ? `text-shadow: 0 0 8px ${activeColor}B3;` : '';
    const scale = isWordActive ? 'transform: scale(1.12);' : '';
    html += `<span style="color: ${color}; ${shadow} ${scale} transition: all 0.12s ease; display: inline-block; margin: 0 3px;">${w.word}</span>`;
  });
  
  overlayContainer.innerHTML = html;
}

// ==================== Segment Cards Rendering & Event Handling ====================
function renderSegmentCards() {
  const container = document.getElementById('editor-segments');
  if (!container || !transcribeData) return;
  
  let html = '';
  transcribeData.segments.forEach((seg, idx) => {
    html += `
      <div id="segment-card-${idx}" class="segment-card">
        <div class="segment-card-header">
          <span class="segment-time-badge">⏱️ ${seg.start.toFixed(2)} - ${seg.end.toFixed(2)}</span>
          <button type="button" class="segment-play-btn" onclick="seekPlayer(${seg.start})">
            🎧 تشغيل هذه الجملة
          </button>
        </div>
        <textarea class="segment-textarea" oninput="handleSegmentChange(${idx}, this.value)">${seg.text}</textarea>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

window.seekPlayer = function(startTime) {
  const player = document.getElementById('media-player');
  if (player) {
    player.currentTime = startTime;
    player.play();
  }
};

window.handleSegmentChange = function(index, newText) {
  if (!transcribeData) return;
  
  const seg = transcribeData.segments[index];
  seg.text = newText;
  
  // Recalculate word-level timestamps (linear interpolation)
  const words = newText.split(/\s+/).filter(w => w.trim() !== "");
  const duration = seg.end - seg.start;
  seg.words = words.map((w, i) => {
    const start = seg.start + (i * duration) / Math.max(1, words.length);
    const end = seg.start + ((i + 1) * duration) / Math.max(1, words.length);
    return {
      word: w,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3))
    };
  });
  
  // Update the live caption overlay immediately if this is the active segment
  if (index === activeSegmentIndex) {
    updateLiveCaptionOverlay(currentTime);
  }
};

// ==================== Enter Key Split Handling ====================
function handleSegmentSplit(index, cursorPosition, fullText) {
  if (!transcribeData) return;
  
  const seg = transcribeData.segments[index];
  if (!seg.words || seg.words.length <= 1) return; // Cannot split if 0 or 1 word
  
  // 1. Determine how many words are before the cursor
  const textBefore = fullText.substring(0, cursorPosition);
  const wordsBefore = textBefore.trim().split(/\s+/).filter(w => w !== "");
  const splitIndex = wordsBefore.length;
  
  // Only split if we have a valid split point
  if (splitIndex <= 0 || splitIndex >= seg.words.length) return;
  
  // 2. Split the words array
  const wordsA = seg.words.slice(0, splitIndex);
  const wordsB = seg.words.slice(splitIndex);
  
  // 3. Create two new segments (retaining exact word timestamps)
  const segA = {
    start: seg.start,
    end: wordsA[wordsA.length - 1].end,
    text: wordsA.map(w => w.word).join(" "),
    words: wordsA
  };
  
  const segB = {
    start: wordsB[0].start,
    end: seg.end,
    text: wordsB.map(w => w.word).join(" "),
    words: wordsB
  };
  
  // 4. Replace the old segment with the two new segments
  transcribeData.segments.splice(index, 1, segA, segB);
  
  // 5. Re-render the segment cards
  renderSegmentCards();
  
  // 6. Focus the second segment's textarea at the beginning of the text
  setTimeout(() => {
    const nextTextarea = document.querySelector(`#segment-card-${index + 1} .segment-textarea`);
    if (nextTextarea) {
      nextTextarea.focus();
      nextTextarea.setSelectionRange(0, 0);
    }
  }, 50);
}

// Add event delegation for Enter key split on segment textareas
document.getElementById('editor-segments').addEventListener('keydown', function(e) {
  if (e.target.classList.contains('segment-textarea') && e.key === 'Enter') {
    e.preventDefault(); // Prevent inserting actual newline character
    
    const textarea = e.target;
    const card = textarea.closest('.segment-card');
    const index = parseInt(card.id.replace('segment-card-', ''));
    
    handleSegmentSplit(index, textarea.selectionStart, textarea.value);
  }
});

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
  progressMsg.textContent = 'جاري رفع الملفات وتحليل الصوت بالذكاء الاصطناعي (Whisper)...';

  // Build FormData payload for transcribe
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
    const res = await fetch(apiUrl + '/api/transcribe', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      let detail = 'حدث خطأ في معالجة الملف في السيرفر';
      try {
        const json = await res.json();
        detail = json.detail || detail;
      } catch(_) {}
      throw new Error(detail);
    }

    const data = await res.json();
    transcribeData = data;
    
    // Hide main dashboard, show editor workspace
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('editor-state').classList.remove('hidden');
    
    // Initialize editor view
    initMediaPlayer();
    renderSegmentCards();

  } catch (err) {
    showState(errorState);
    errorMsg.textContent = err.message || 'فشل الاتصال بالسيرفر. يرجى التحقق من تشغيل السيرفر أو الرابط.';
  }
});

// ==================== Render final video from edits ====================
window.renderVideo = async function() {
  if (!transcribeData) return;
  
  const apiUrl = apiUrlInput.value.replace(/\/+$/, '');
  
  // Transition back to main dashboard loading state
  document.getElementById('editor-state').classList.add('hidden');
  const mainDashboard = document.getElementById('main-dashboard');
  mainDashboard.classList.remove('hidden');
  
  showState(loadingState);
  progressMsg.textContent = 'جاري تشغيل محرك الرندرة لإنتاج الفيديو النهائي (Remotion)...';
  
  // Simulated progress messages for render lifecycle
  const stages = [
    { time: 8000, msg: 'جاري التقاط لقطات الفيديو ودمج الكابشن المصحح...' },
    { time: 20000, msg: 'جاري التجميع النهائي وضغط مقطع الـ MP4...' },
    { time: 35000, msg: 'جاري تصدير الفيديو وتجهيزه للتحميل...' }
  ];
  const timers = stages.map(s => setTimeout(() => { progressMsg.textContent = s.msg; }, s.time));
  
  const renderPayload = {
    audioPath: transcribeData.audioPath,
    videoPath: transcribeData.videoPath,
    durationInSeconds: transcribeData.durationInSeconds,
    segments: transcribeData.segments,
    animationType: selectedAnimation,
    activeColor: document.getElementById('active-color').value,
    inactiveColor: document.getElementById('inactive-color').value,
    leftLogo: transcribeData.leftLogo,
    rightLogo: transcribeData.rightLogo
  };
  
  try {
    const res = await fetch(`${apiUrl}/api/render/${transcribeData.taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(renderPayload)
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
    errorMsg.textContent = err.message || 'فشل رندرة الفيديو. يرجى المحاولة مرة أخرى.';
  }
};
