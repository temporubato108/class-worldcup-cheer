/**
 * 초등학교 학급 월드컵 응원전 - 학생 페이지 전용 스크립트 (Vanilla JS)
 */

const appState = {
  apiUrl: localStorage.getItem('gas_api_url') || 'https://script.google.com/macros/s/AKfycbzdYRBAbSGJ7VMuLLktGhnXQ6Y5XMVXrvlp6Rq8llspx8s33i13WW8SFXivfFaoGkJYfA/exec', // Google Apps Script URL
  countdown: 10,
  timerId: null,
  isPredictSubmitting: false,
  isCheerSubmitting: false,
  selectedPrediction: '' // 'korea', 'draw', 'czech'
};

// Default Simulated Mock Data
const DEFAULT_PREDICTIONS = [
  { timestamp: "2026. 6. 18. 오전 09:12:45", studentName: "김민수", prediction: "대한민국 승" },
  { timestamp: "2026. 6. 18. 오전 09:30:11", studentName: "이지은", prediction: "무승부" },
  { timestamp: "2026. 6. 18. 오전 10:05:32", studentName: "박준호", prediction: "대한민국 승" },
  { timestamp: "2026. 6. 18. 오전 10:45:19", studentName: "최신우", prediction: "멕시코 승" },
  { timestamp: "2026. 6. 18. 오전 11:15:04", studentName: "한유아", prediction: "대한민국 승" }
];

const DEFAULT_MESSAGES = [
  { timestamp: "2026. 6. 18. 오전 09:12:45", studentName: "김민수", message: "대한민국 화이팅!" },
  { timestamp: "2026. 6. 18. 오전 09:30:11", studentName: "이지은", message: "손흥민 골 넣자!" },
  { timestamp: "2026. 6. 18. 오전 10:05:32", studentName: "박준호", message: "대한민국 우승 가자!" },
  { timestamp: "2026. 6. 18. 오전 10:45:19", studentName: "최신우", message: "체코 힘내라 같이 멋진 경기하자!" },
  { timestamp: "2026. 6. 18. 오전 11:15:04", studentName: "한유아", message: "태극 전사들 부상 없이 경기 뛰어요!" }
];

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Setup Local fallback stores
  if (!localStorage.getItem('local_predictions')) {
    localStorage.setItem('local_predictions', JSON.stringify(DEFAULT_PREDICTIONS));
  }
  if (!localStorage.getItem('local_messages')) {
    localStorage.setItem('local_messages', JSON.stringify(DEFAULT_MOCK_DATA_MESSAGES_ONLY() || DEFAULT_MESSAGES));
  }

  toggleDemoBanner();

  const gasField = document.getElementById('gas-endpoint');
  if (gasField) {
    gasField.value = appState.apiUrl;
  }

  // Load feed initially
  fetchCheeringData();

  // Polling count every 10 seconds
  startPolling();

  // Start real-time match closing countdown and updates
  startMatchCountdown();
  updateParticipantCount();
}

function DEFAULT_MOCK_DATA_MESSAGES_ONLY() {
  return DEFAULT_MESSAGES;
}

function toggleDemoBanner() {
  const banner = document.getElementById('demo-mode-banner');
  if (banner) {
    if (appState.apiUrl) {
      banner.classList.add('hidden');
    } else {
      banner.classList.remove('hidden');
    }
  }
}

function startPolling() {
  if (appState.timerId) {
    clearInterval(appState.timerId);
  }

  appState.countdown = 10;
  updateCountdownUI();

  appState.timerId = setInterval(() => {
    appState.countdown--;
    updateCountdownUI();

    if (appState.countdown <= 0) {
      fetchCheeringData();
      updateParticipantCount();
      appState.countdown = 10;
    }
  }, 1000);
}

function updateCountdownUI() {
  const el = document.getElementById('countdown-indicator');
  if (el) {
    el.textContent = `${appState.countdown}초 후 갱신`;
  }
}

/**
 * Fetch Cheering messages data (max 50 to display)
 */
async function fetchCheeringData() {
  const feedContainer = document.getElementById('cheering-board-feed');
  if (!feedContainer) return;

  try {
    let messages = [];

    if (appState.apiUrl) {
      // Fetch both or just messages sheet content from Google Apps Script
      const response = await fetch(`${appState.apiUrl}?action=getMessages`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Google Sheets: Successfully synced messages feed from cloud database Spreadsheet.');
        // Assuming webapp returns either entire db object or direct messages list
        if (Array.isArray(result)) {
          messages = result;
        } else if (result && Array.isArray(result.messages)) {
          messages = result.messages;
        }
        localStorage.setItem('cached_gas_messages', JSON.stringify(messages));
      } else {
        console.warn('Google Sheets: Synceded network response status not OK, using offline caches.');
        messages = JSON.parse(localStorage.getItem('cached_gas_messages')) || [];
      }
    } else {
      messages = JSON.parse(localStorage.getItem('local_messages')) || [];
    }

    // Sort descending (latest on top)
    messages = [...messages].sort((a,b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      return timeB.localeCompare(timeA);
    });

    // Take max 50 items
    messages = messages.slice(0, 50);

    renderMessagesFeed(messages);
    
    // Sync participant count
    updateParticipantCount();

  } catch (error) {
    console.warn('Google Sheet fetch error, falling back locally', error);
    const fallback = JSON.parse(localStorage.getItem('cached_gas_messages')) || 
                     JSON.parse(localStorage.getItem('local_messages')) || [];
    
    // Sort descending
    const sorted = [...fallback].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 50);
    renderMessagesFeed(sorted);
    
    // Sync participant count on error fallback as well
    updateParticipantCount();
  }
}

function renderMessagesFeed(messages) {
  const container = document.getElementById('cheering-board-feed');
  if (!container) return;

  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 text-slate-400 font-semibold space-y-1">
        <p class="text-3xl">💬</p>
        <p class="text-xs font-bold text-slate-400">등록된 응원 한마디가 아직 없습니다.</p>
        <p class="text-[11px] text-slate-350 font-normal">첫 번째 메시지를 등록하고 응원의 불을 지펴보세요!</p>
      </div>
    `;
    return;
  }

  messages.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = "bg-white p-3 rounded-xl border border-slate-200/50 shadow-xs flex justify-between items-center gap-3 transition-all hover:scale-[1.005] hover:shadow-sm";
    
    // Staggered entry animation fade
    el.style.animation = "fadeIn 0.35s ease-out backwards";
    el.style.animationDelay = `${Math.min(index * 0.04, 0.6)}s`;

    el.innerHTML = `
      <div class="space-y-1 flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-black text-slate-900 text-[11px] sm:text-xs bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">${escapeHTML(item.studentName || '익명')}</span>
        </div>
        <p class="text-xs sm:text-xs font-bold text-slate-700 tracking-tight break-all line-clamp-2">
          ${escapeHTML(item.message || '')}
        </p>
      </div>
      <div class="text-[9px] font-mono font-semibold text-slate-400 shrink-0 text-right">
        ${formatShortTime(item.timestamp)}
      </div>
    `;

    container.appendChild(el);
  });
}

/**
 * Handle user choice for Prediction
 */
window.selectPrediction = function(id, text) {
  if (isPredictionClosed()) {
    alert("승부예측 참여가 마감되었습니다. (6월 19일 오전 10시 마감)");
    return;
  }

  appState.selectedPrediction = id;
  const hiddenInput = document.getElementById('match-prediction');
  if (hiddenInput) {
    hiddenInput.value = text;
  }

  // highlight styled buttons
  const cards = document.querySelectorAll('.predict-card');
  cards.forEach(card => {
    card.className = "predict-card border border-slate-200 rounded-lg py-2 px-1 text-center bg-white hover:border-slate-300 transition-all";
  });

  const btn = document.getElementById(`predict-${id}`);
  if (btn) {
    if (id === 'korea') btn.className = "predict-card border-2 border-rose-500 rounded-lg py-2 px-1 text-center bg-rose-50 text-rose-700 font-extrabold shadow-sm scale-102";
    if (id === 'draw') btn.className = "predict-card border-2 border-amber-500 rounded-lg py-2 px-1 text-center bg-amber-50 text-amber-700 font-extrabold shadow-sm scale-102";
    if (id === 'mexico') btn.className = "predict-card border-2 border-blue-500 rounded-lg py-2 px-1 text-center bg-blue-50 text-blue-700 font-extrabold shadow-sm scale-102";
  }
};

/**
 * Predict Event client submission
 */
window.submitPrediction = async function(event) {
  event.preventDefault();

  if (isPredictionClosed()) {
    alert("승부예측 참여가 마감되었습니다. (6월 19일 오전 10시 마감)");
    return;
  }

  if (appState.isPredictSubmitting) return;

  const nameInput = document.getElementById('predict-student-name');
  const predictInput = document.getElementById('match-prediction');
  const submitBtn = document.getElementById('predict-submit-btn');

  const studentName = nameInput ? nameInput.value.trim() : '';
  const prediction = predictInput ? predictInput.value : '';

  if (!studentName) {
    alert('이름을 바르게 입력해주세요!');
    nameInput.focus();
    return;
  }

  const nameRegex = /^[가-힣]{2,4}$/;
  if (!nameRegex.test(studentName)) {
    alert('이름은 한글 2~4글자(공백 없이)로 기입하셔야 참여 가능합니다.');
    nameInput.focus();
    return;
  }

  if (!prediction) {
    alert('경기 결과를 예측하여 카드를 하나 선택해주세요! 🇰🇷🤝🇨🇿');
    return;
  }

  // Duplicate Prediction Check
  try {
    let currentPredictions = [];
    if (appState.apiUrl) {
      // Fetch predictions list to verify duplicate
      const pResponse = await fetch(`${appState.apiUrl}?action=getPredictions`, {
        method: 'GET',
        mode: 'cors'
      });
      if (pResponse.ok) {
        currentPredictions = await pResponse.json();
      } else {
        currentPredictions = JSON.parse(localStorage.getItem('cached_gas_predictions')) || [];
      }
    } else {
      currentPredictions = JSON.parse(localStorage.getItem('local_predictions')) || [];
    }

    const dup = currentPredictions.some(x => x.studentName.toLowerCase() === studentName.toLowerCase());
    if (dup) {
      alert("이미 승부예측에 참여했습니다. (승부예측은 1회만 제출 가능합니다.)");
      return;
    }
  } catch (err) {
    console.error("Duplicate checking exception", err);
  }

  // Submit flow
  appState.isPredictSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>데이터 전송 중...</span>";
  }

  const now = new Date();
  const formatStamp = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const payload = {
    action: 'submitPrediction',
    studentName: studentName,
    prediction: prediction,
    timestamp: formatStamp
  };

  try {
    if (appState.apiUrl) {
      await fetch(appState.apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Predict Cache save
      let cached = JSON.parse(localStorage.getItem('cached_gas_predictions')) || [];
      cached.unshift(payload);
      localStorage.setItem('cached_gas_predictions', JSON.stringify(cached));
    } else {
      let stored = JSON.parse(localStorage.getItem('local_predictions')) || [];
      stored.unshift(payload);
      localStorage.setItem('local_predictions', JSON.stringify(stored));
    }

    // Success UI Feedback
    showPredictionSuccess();
    
    // Update participant count instantly
    updateParticipantCount();
  } catch (error) {
    console.error("Submission failed", error);
    alert('제출 처리 중 오류가 발생했습니다. Apps Script URL 및 인터넷 연결 상태를 확인해주세요.');
  } finally {
    appState.isPredictSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>🎫 예측 투표 제출</span>";
    }
  }
};

function showPredictionSuccess() {
  const alertBox = document.getElementById('predict-success-alert');
  if (alertBox) {
    alertBox.classList.remove('hidden');
    setTimeout(() => {
      alertBox.classList.add('hidden');
    }, 4500);
  }

  const nameInput = document.getElementById('predict-student-name');
  if (nameInput) nameInput.value = '';

  const hiddenInput = document.getElementById('match-prediction');
  if (hiddenInput) hiddenInput.value = '';

  // Class card resets
  const cards = document.querySelectorAll('.predict-card');
  cards.forEach(card => {
    card.className = "predict-card border border-slate-200 rounded-lg py-2 px-1 text-center bg-white hover:border-slate-300 transition-all";
  });

  popConfetti();
}

/**
 * Cheering Message Submissions
 */
window.submitCheeringMessage = async function(event) {
  event.preventDefault();

  if (appState.isCheerSubmitting) return;

  const nameInput = document.getElementById('cheer-student-name');
  const msgInput = document.getElementById('cheering-msg');
  const submitBtn = document.getElementById('cheering-submit-btn');

  const studentName = nameInput ? nameInput.value.trim() : '';
  const message = msgInput ? msgInput.value.trim() : '';

  if (!studentName) {
    alert('이름을 적어주세요.');
    nameInput.focus();
    return;
  }

  const nameRegex = /^[가-힣]{2,4}$/;
  if (!nameRegex.test(studentName)) {
    alert('작성자 이름은 한글 2~4글자(공백 없이)로 입력해 주세요.');
    nameInput.focus();
    return;
  }

  if (!message || message.length > 30) {
    alert('메시지 길이는 1자 이상 30자 이하여야 합니다.');
    msgInput.focus();
    return;
  }

  appState.isCheerSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>메시지 업로드 중... &nbsp;</span>";
  }

  const now = new Date();
  const formatStamp = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const payload = {
    action: 'submitMessage',
    studentName: studentName,
    message: message,
    timestamp: formatStamp
  };

  try {
    if (appState.apiUrl) {
      await fetch(appState.apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let messagesCache = JSON.parse(localStorage.getItem('cached_gas_messages')) || [];
      messagesCache.unshift(payload);
      localStorage.setItem('cached_gas_messages', JSON.stringify(messagesCache));
    } else {
      let messagesLocal = JSON.parse(localStorage.getItem('local_messages')) || [];
      messagesLocal.unshift(payload);
      localStorage.setItem('local_messages', JSON.stringify(messagesLocal));
    }

    showCheerSuccess();
  } catch (error) {
    console.error('Cheer msg transmit error', error);
    alert('메시지 저장 도중 실패했습니다.');
  } finally {
    appState.isCheerSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>🚀 응원메시지 등록</span>";
    }
  }
};

function showCheerSuccess() {
  const alertBox = document.getElementById('cheer-success-alert');
  if (alertBox) {
    alertBox.classList.remove('hidden');
    setTimeout(() => {
      alertBox.classList.add('hidden');
    }, 4000);
  }

  const nameInput = document.getElementById('cheer-student-name');
  if (nameInput) nameInput.value = '';

  const msgInput = document.getElementById('cheering-msg');
  if (msgInput) {
    msgInput.value = '';
    updateCharCount(msgInput);
  }

  fetchCheeringData();
}

/**
 * Characters Counter length indicator
 */
window.updateCharCount = function(el) {
  const badge = document.getElementById('char-count-badge');
  if (badge) {
    badge.textContent = `${el.value.length}/30`;
  }
};

/**
 * Config settings logic
 */
window.openConfigModal = function() {
  const modal = document.getElementById('config-modal');
  if (modal) modal.classList.remove('hidden');
};

window.closeConfigModal = function() {
  const modal = document.getElementById('config-modal');
  if (modal) modal.classList.add('hidden');
};

window.saveConfig = function() {
  const field = document.getElementById('gas-endpoint');
  if (field) {
    let url = field.value.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      alert('올바른 앱스 스크립트 실행 주소(https://...) 여야 합니다.');
      return;
    }
    localStorage.setItem('gas_api_url', url);
    appState.apiUrl = url;
    
    alert('구글 전역 연동 설정 장부가 정상적으로 기록되었습니다.');
    closeConfigModal();
    toggleDemoBanner();
    fetchCheeringData();
    startPolling();
  }
};

// Target closing time: June 19, 2026, 10:00 AM KST
const CLOSING_TIME_MS = Date.parse("2026-06-19T10:00:00+09:00");

function isPredictionClosed() {
  return Date.now() >= CLOSING_TIME_MS;
}

function startMatchCountdown() {
  function updateTimer() {
    const timerLabel = document.getElementById('game-countdown-timer');
    const submitBtn = document.getElementById('predict-submit-btn');
    const nameInput = document.getElementById('predict-student-name');
    
    if (!timerLabel) return;
    
    const now = Date.now();
    const diff = CLOSING_TIME_MS - now;
    
    if (diff <= 0) {
      timerLabel.textContent = "승부예측 마감 (종료됨)";
      timerLabel.classList.remove('text-rose-600');
      timerLabel.classList.add('text-slate-500');
      
      // Close Form Inputs completely
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = "w-full bg-slate-300 text-slate-500 font-extrabold py-2.5 px-4 rounded-lg shadow-none cursor-not-allowed border-none";
        submitBtn.querySelector('span').textContent = "🔒 승부예측 참여 마감";
      }
      if (nameInput) {
        nameInput.disabled = true;
        nameInput.placeholder = "승부예측이 완전히 마감되었습니다.";
      }
      return true; // closed
    }
    
    // Calculate Day, Hour, Min, Sec
    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    timerLabel.textContent = `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
    return false;
  }
  
  const closed = updateTimer();
  if (!closed) {
    setInterval(updateTimer, 1000);
  }
}

/**
 * Fetch Predictions dynamically to update participant total elements
 */
async function updateParticipantCount() {
  const countLabel = document.getElementById('prediction-participant-count');
  if (!countLabel) return;
  
  try {
    let list = [];
    if (appState.apiUrl) {
      const response = await fetch(`${appState.apiUrl}?action=getPredictions`, {
        method: 'GET',
        mode: 'cors'
      });
      if (response.ok) {
        list = await response.json();
      } else {
        list = JSON.parse(localStorage.getItem('cached_gas_predictions')) || [];
      }
    } else {
      list = JSON.parse(localStorage.getItem('local_predictions')) || [];
    }
    countLabel.textContent = list.length;
    
    // update ratio percentages
    updatePredictionRatios(list);
  } catch (e) {
    console.warn("Participant count update error fallback: ", e);
    const fallback = JSON.parse(localStorage.getItem('cached_gas_predictions')) || 
                     JSON.parse(localStorage.getItem('local_predictions')) || [];
    countLabel.textContent = fallback.length;
    updatePredictionRatios(fallback);
  }
}

function updatePredictionRatios(list) {
  const ratioKoreaEl = document.getElementById('ratio-korea');
  const ratioDrawEl = document.getElementById('ratio-draw');
  const ratioMexicoEl = document.getElementById('ratio-mexico');

  if (!ratioKoreaEl || !ratioDrawEl || !ratioMexicoEl) return;

  const closed = isPredictionClosed();

  if (!closed) {
    ratioKoreaEl.classList.add('hidden');
    ratioDrawEl.classList.add('hidden');
    ratioMexicoEl.classList.add('hidden');
    return;
  }

  const total = list.length;
  if (total === 0) {
    ratioKoreaEl.textContent = '0% (0명)';
    ratioDrawEl.textContent = '0% (0명)';
    ratioMexicoEl.textContent = '0% (0명)';
  } else {
    const koreaCount = list.filter(p => {
      const pred = (p.prediction || '').toString().trim();
      return pred === '대한민국 승' || pred === 'korea';
    }).length;

    const drawCount = list.filter(p => {
      const pred = (p.prediction || '').toString().trim();
      return pred === '무승부' || pred === 'draw';
    }).length;

    const mexicoCount = list.filter(p => {
      const pred = (p.prediction || '').toString().trim();
      return pred === '멕시코 승' || pred === 'mexico';
    }).length;

    const koreaPct = Math.round((koreaCount / total) * 100);
    const drawPct = Math.round((drawCount / total) * 100);
    const mexicoPct = Math.round((mexicoCount / total) * 100);

    ratioKoreaEl.textContent = `${koreaPct}% (${koreaCount}명)`;
    ratioDrawEl.textContent = `${drawPct}% (${drawCount}명)`;
    ratioMexicoEl.textContent = `${mexicoPct}% (${mexicoCount}명)`;
  }

  ratioKoreaEl.classList.remove('hidden');
  ratioDrawEl.classList.remove('hidden');
  ratioMexicoEl.classList.remove('hidden');
}

function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatShortTime(dateStr) {
  if (!dateStr) return '';
  try {
    const match = dateStr.match(/(오전|오후)\s\d+:\d+/);
    return match ? match[0] : dateStr.substr(dateStr.indexOf(' ') + 1, 11);
  } catch(e) {
    return dateStr;
  }
}

function popConfetti() {
  const holder = document.getElementById('confetti-holder');
  if (!holder) return;

  holder.innerHTML = '';
  const colors = ['#E11D48', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'absolute pointer-events-none rounded-xs';
    
    const left = Math.random() * 100;
    const duration = 1.5 + Math.random() * 1.5;
    const size = 6 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    p.style.width = `${size}px`;
    p.style.height = `${size + 2}px`;
    p.style.backgroundColor = color;
    p.style.left = `${left}%`;
    p.style.top = `-20px`;
    
    p.style.opacity = '1';
    p.style.animation = `confetti-fall ${duration}s linear infinite`;
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    
    holder.appendChild(p);
  }

  setTimeout(() => {
    holder.innerHTML = '';
  }, 4500);
}
