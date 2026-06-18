/**
 * 초등학교 학급 월드컵 응원전 - 학생용 대시보드 및 결과 발표 (results.js)
 */

const adminState = {
  apiUrl: localStorage.getItem('gas_api_url') || 'https://script.google.com/macros/s/AKfycbzdYRBAbSGJ7VMuLLktGhnXQ6Y5XMVXrvlp6Rq8llspx8s33i13WW8SFXivfFaoGkJYfA/exec',
  predictions: [],
  simulatedWinner: localStorage.getItem('simulated_match_winner') || null // '대한민국 승', '무승부', '멕시코 승' or null (for simulation testing)
};

// Beautiful default list of 28 realistic student predictions to exactly match the requested specs:
// 대한민국 승: 15명, 무승부: 4명, 멕시코 승: 9명 (Total 28명)
const DEFAULT_STUDENT_PREDICTIONS = [
  // 15 대한민국 승
  { studentName: "김민수", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:12:45" },
  { studentName: "이지은", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:15:30" },
  { studentName: "박준호", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:20:11" },
  { studentName: "한유아", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:25:04" },
  { studentName: "강수현", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:30:12" },
  { studentName: "정우진", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:31:45" },
  { studentName: "윤도현", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:32:00" },
  { studentName: "최다은", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:34:10" },
  { studentName: "백승호", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:35:40" },
  { studentName: "윤지효", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:42:19" },
  { studentName: "송지민", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:45:11" },
  { studentName: "조현우", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:50:00" },
  { studentName: "하정우", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 09:55:22" },
  { studentName: "임윤아", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 10:01:05" },
  { studentName: "고아라", prediction: "대한민국 승", timestamp: "2026. 6. 18. 오전 10:05:15" },

  // 4 무승부
  { studentName: "서주현", prediction: "무승부", timestamp: "2026. 6. 18. 오전 10:10:30" },
  { studentName: "정용화", prediction: "무승부", timestamp: "2026. 6. 18. 오전 10:15:12" },
  { studentName: "황효준", prediction: "무승부", timestamp: "2026. 6. 18. 오전 10:20:00" },
  { studentName: "심은경", prediction: "무승부", timestamp: "2026. 6. 18. 오전 10:25:44" },

  // 9 멕시코 승
  { studentName: "최신우", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 10:45:19" },
  { studentName: "임재원", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 10:48:00" },
  { studentName: "안유진", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 10:50:11" },
  { studentName: "장원영", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 10:52:30" },
  { studentName: "김채원", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 10:55:01" },
  { studentName: "레이첼", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 11:00:22" },
  { studentName: "사쿠라", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 11:05:40" },
  { studentName: "권은비", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 11:10:15" },
  { studentName: "허윤진", prediction: "멕시코 승", timestamp: "2026. 6. 18. 오전 11:15:00" }
];

let doughnutChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initBoard();
  
  // Real-time auto reload (every 10 seconds)
  setInterval(() => {
    fetchBoardData();
  }, 10000);
});

function initBoard() {
  // Populate local standard dataset if empty
  if (!localStorage.getItem('local_predictions')) {
    localStorage.setItem('local_predictions', JSON.stringify(DEFAULT_STUDENT_PREDICTIONS));
  }

  // Pre-fill endpoints fields in simulator panel
  const endpointInput = document.getElementById('sim-gas-endpoint');
  if (endpointInput) {
    endpointInput.value = adminState.apiUrl;
  }

  updateSimulatorButtonHighlight();
  fetchBoardData();
}

function mapResultToWinner(r) {
  if (!r) return null;
  const clean = r.toString().trim().toUpperCase();
  if (clean === 'KR' || clean === 'KOREA' || clean === 'KOREA_WIN' || clean === '대한민국 승' || clean === '대한민국승') {
    return '대한민국 승';
  }
  if (clean === 'DRAW' || clean === '무승부') {
    return '무승부';
  }
  if (clean === 'MX' || clean === 'MEXICO' || clean === 'MEXICO_WIN' || clean === '멕시코 승' || clean === '멕시코승') {
    return '멕시코 승';
  }
  return null;
}

/**
 * Fetch predictions list from Google Sheets or fallback to local Cache
 */
async function fetchBoardData() {
  let list = [];
  let sheetResultWinner = null;

  try {
    if (adminState.apiUrl) {
      console.log('Fetching live student predictions from Google Sheets...');
      const response = await fetch(`${adminState.apiUrl}?action=getPredictions`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Try getting result directly from response envelope if any
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          if (result.result) sheetResultWinner = mapResultToWinner(result.result);
          else if (result.matchResult) sheetResultWinner = mapResultToWinner(result.matchResult);
          else if (result.gameResult) sheetResultWinner = mapResultToWinner(result.gameResult);

          if (Array.isArray(result.predictions)) {
            list = result.predictions;
          } else if (Array.isArray(result.data)) {
            list = result.data;
          }
        } else if (Array.isArray(result)) {
          list = result;
        }

        // Save predictions cache
        localStorage.setItem('cached_gas_predictions', JSON.stringify(list));
      } else {
        console.warn('Google sheets retrieval non-OK, using offline cache fallback.');
        list = JSON.parse(localStorage.getItem('cached_gas_predictions')) || [];
      }

      // Fetch dynamic official Match Result from API
      console.log('Fetching official match result from Google Sheets...');
      try {
        const resultResponse = await fetch(`${adminState.apiUrl}?action=getMatchResult`, {
          method: 'GET',
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        });
        if (resultResponse.ok) {
          const matchResultData = await resultResponse.json();
          if (matchResultData && typeof matchResultData.result !== 'undefined') {
            const mapped = mapResultToWinner(matchResultData.result);
            if (mapped) {
              sheetResultWinner = mapped;
              localStorage.setItem('cached_gas_match_result', mapped);
            } else {
              sheetResultWinner = null;
              localStorage.removeItem('cached_gas_match_result');
            }
          }
        }
      } catch (matchErr) {
        console.warn('Failed to fetch getMatchResult directly. Trying backup cache...', matchErr);
        sheetResultWinner = localStorage.getItem('cached_gas_match_result');
      }

    } else {
      list = JSON.parse(localStorage.getItem('local_predictions')) || [];
      sheetResultWinner = localStorage.getItem('cached_gas_match_result');
    }
  } catch (error) {
    console.error('Data pull failed, showing localized fallback cache', error);
    list = JSON.parse(localStorage.getItem('cached_gas_predictions')) || 
           JSON.parse(localStorage.getItem('local_predictions')) || [];
    sheetResultWinner = localStorage.getItem('cached_gas_match_result');
  }

  // Check if system has official match winner row inside the dataset (as custom row item metadata)
  const systemWinnerRow = list.find(x => {
    const name = (x.studentName || '').toString().trim();
    return name === "경기결과" || name === "SYSTEM_RESULT" || name === "경기 결과" || name === "RESULT";
  });
  if (systemWinnerRow) {
    const backupWinner = systemWinnerRow.prediction || systemWinnerRow.result;
    const backupResult = mapResultToWinner(backupWinner) || backupWinner;
    if (backupResult) {
      sheetResultWinner = backupResult;
    }
  }

  adminState.predictions = list;
  processStatistics(list, sheetResultWinner);
}

/**
 * Handle math calculations, charts render, rankings, and winner screens triggers
 */
function processStatistics(predictions, sheetResultWinner) {
  // Filter out any metadata system rows if present to keep student counts precise
  const studentPreds = predictions.filter(x => {
    const name = (x.studentName || '').toString().trim();
    return name !== "경기결과" && name !== "SYSTEM_RESULT" && name !== "경기 결과" && name !== "RESULT";
  });

  const totalCount = studentPreds.length;
  
  // Aggregate selections
  let koreaCount = 0;
  let drawCount = 0;
  let mexicoCount = 0;

  studentPreds.forEach(p => {
    const choice = (p.prediction || '').toString().trim();
    if (choice === '대한민국 승' || choice === 'korea') {
      koreaCount++;
    } else if (choice === '무승부' || choice === 'draw') {
      drawCount++;
    } else if (choice === '멕시코 승' || choice === 'mexico') {
      mexicoCount++;
    }
  });

  // Render text counts & percentage strings
  const pctKorea = totalCount > 0 ? ((koreaCount / totalCount) * 100) : 0;
  const pctDraw = totalCount > 0 ? ((drawCount / totalCount) * 100) : 0;
  const pctMexico = totalCount > 0 ? ((mexicoCount / totalCount) * 100) : 0;

  // Update counters
  const totalTextEl = document.getElementById('total-participants-text');
  if (totalTextEl) totalTextEl.textContent = totalCount;

  // Update Korea
  const kCnt = document.getElementById('card-korea-count');
  const kPct = document.getElementById('card-korea-pct');
  if (kCnt) kCnt.textContent = `${koreaCount}명`;
  if (kPct) kPct.textContent = `${pctKorea.toFixed(1)}%`;

  // Update Draw
  const dCnt = document.getElementById('card-draw-count');
  const dPct = document.getElementById('card-draw-pct');
  if (dCnt) dCnt.textContent = `${drawCount}명`;
  if (dPct) dPct.textContent = `${pctDraw.toFixed(1)}%`;

  // Update Mexico
  const mCnt = document.getElementById('card-mexico-count');
  const mPct = document.getElementById('card-mexico-pct');
  if (mCnt) mCnt.textContent = `${mexicoCount}명`;
  if (mPct) mPct.textContent = `${pctMexico.toFixed(1)}%`;

  // Render Doughnut Chart
  renderDoughnutChart(koreaCount, drawCount, mexicoCount, totalCount);

  // Render Band Chart (띠그래프)
  const bandKoreaEl = document.getElementById('band-korea');
  const bandDrawEl = document.getElementById('band-draw');
  const bandMexicoEl = document.getElementById('band-mexico');
  const bandEmptyEl = document.getElementById('band-empty');

  const bandKoreaPctEl = document.getElementById('band-korea-pct');
  const bandDrawPctEl = document.getElementById('band-draw-pct');
  const bandMexicoPctEl = document.getElementById('band-mexico-pct');

  if (totalCount > 0) {
    if (bandEmptyEl) bandEmptyEl.style.display = 'none';

    if (bandKoreaEl) {
      bandKoreaEl.style.width = `${pctKorea}%`;
      bandKoreaEl.style.display = koreaCount > 0 ? 'flex' : 'none';
    }
    if (bandDrawEl) {
      bandDrawEl.style.width = `${pctDraw}%`;
      bandDrawEl.style.display = drawCount > 0 ? 'flex' : 'none';
    }
    if (bandMexicoEl) {
      bandMexicoEl.style.width = `${pctMexico}%`;
      bandMexicoEl.style.display = mexicoCount > 0 ? 'flex' : 'none';
    }

    if (bandKoreaPctEl) bandKoreaPctEl.textContent = `${pctKorea.toFixed(1)}%`;
    if (bandDrawPctEl) bandDrawPctEl.textContent = `${pctDraw.toFixed(1)}%`;
    if (bandMexicoPctEl) bandMexicoPctEl.textContent = `${pctMexico.toFixed(1)}%`;
  } else {
    if (bandKoreaEl) bandKoreaEl.style.display = 'none';
    if (bandDrawEl) bandDrawEl.style.display = 'none';
    if (bandMexicoEl) bandMexicoEl.style.display = 'none';
    if (bandEmptyEl) bandEmptyEl.style.display = 'flex';
  }

  // Render Rankings (🥈 🥇 🥉)
  renderRankings(koreaCount, drawCount, mexicoCount, totalCount);

  // Check Game State Winner determination (优先사용 simulated, fallback to sheets official result)
  const officialWinner = adminState.simulatedWinner || sheetResultWinner;
  
  const activeCard = document.getElementById('active-match-card');
  const endedCard = document.getElementById('ended-match-card');
  const winnerBadge = document.getElementById('final-winner-display');
  const successAnnounce = document.getElementById('ended-success-announcement');

  if (officialWinner && (officialWinner === '대한민국 승' || officialWinner === '무승부' || officialWinner === '멕시코 승')) {
    // 1) Show Match Result header state
    if (activeCard) activeCard.classList.add('hidden');
    if (endedCard) endedCard.classList.remove('hidden');
    if (winnerBadge) {
      winnerBadge.textContent = `${officialWinner} 🎉`;
      // Adapt badge branding color based on team victorious
      if (officialWinner === '대한민국 승') {
        winnerBadge.className = "bg-rose-500 text-white px-3.5 py-1 rounded-xl shadow-xs text-sm sm:text-base font-extrabold";
      } else if (officialWinner === '무승부') {
        winnerBadge.className = "bg-amber-500 text-slate-950 px-3.5 py-1 rounded-xl shadow-xs text-sm sm:text-base font-extrabold";
      } else {
        winnerBadge.className = "bg-blue-500 text-white px-3.5 py-1 rounded-xl shadow-xs text-sm sm:text-base font-extrabold";
      }
    }

    // 2) Show Predictions winners lists
    if (successAnnounce) successAnnounce.classList.remove('hidden');
    
    // Extract students names matching correct prediction
    const correctStudentsObj = studentPreds.filter(p => {
      const pred = (p.prediction || '').toString().trim();
      return pred === officialWinner || 
             (officialWinner === '대한민국 승' && pred === 'korea') ||
             (officialWinner === '무승부' && pred === 'draw') ||
             (officialWinner === '멕시코 승' && pred === 'mexico');
    });

    const correctCount = correctStudentsObj.length;
    const successPercent = totalCount > 0 ? ((correctCount / totalCount) * 100) : 0;

    // Update Hall of Fame Metrics
    const pctDisp = document.getElementById('success-pct-display');
    const ratioDisp = document.getElementById('success-ratio-display');
    const progressEl = document.getElementById('success-progress-bar');
    const winnersListContainer = document.getElementById('winners-names-list');

    if (pctDisp) pctDisp.textContent = `${successPercent.toFixed(1)}%`;
    if (ratioDisp) ratioDisp.textContent = `총 ${totalCount}명 중 ${correctCount}명 성공`;
    if (progressEl) progressEl.style.width = `${successPercent}%`;

    if (winnersListContainer) {
      winnersListContainer.innerHTML = '';
      if (correctCount === 0) {
        winnersListContainer.innerHTML = `
          <div class="text-slate-400 text-xs w-full py-4 text-center font-normal">
            아쉽게도 정답을 맞춘 학생이 아직 없습니다. 😢
          </div>
        `;
      } else {
        correctStudentsObj.forEach(item => {
          const badge = document.createElement('span');
          badge.className = "bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-bold leading-none hover:bg-rose-500/25 transition-all";
          badge.textContent = item.studentName || '익명';
          winnersListContainer.appendChild(badge);
        });
      }
    }

  } else {
    // Show active matching screen / hide winner announce
    if (activeCard) activeCard.classList.remove('hidden');
    if (endedCard) endedCard.classList.add('hidden');
    if (successAnnounce) successAnnounce.classList.add('hidden');
  }
}

/**
 * Render Chart.js Doughnut Chart
 */
function renderDoughnutChart(korea, draw, mexico, total) {
  const canvas = document.getElementById('predictionDoughnutChart');
  if (!canvas) return;

  if (doughnutChartInstance) {
    doughnutChartInstance.destroy();
  }

  // If there are zero total votes, create a small grey placeholder
  const hasVotes = total > 0;
  const chartData = hasVotes ? [korea, draw, mexico] : [1, 0, 0];
  const chartColors = hasVotes 
    ? ['#f43f5e', '#fbbf24', '#3b82f6'] // Rose 500, Amber 400, Blue 500
    : ['#e2e8f0', '#e2e8f0', '#e2e8f0']; // Slate 200 placehold

  doughnutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['대한민국 승', '무승부', '멕시코 승'],
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: hasVotes ? 6 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: hasVotes,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return ` ${context.label}: ${val}명 (${percent}%)`;
            }
          }
        }
      },
      cutout: '72%'
    },
    plugins: [{
      id: 'centerTotal',
      afterDraw: (chart) => {
        const { ctx, chartArea: { left, right, top, bottom, width, height } } = chart;
        ctx.save();
        ctx.font = '800 13px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${total}명 참여`, left + width / 2, top + height / 2);
        ctx.restore();
      }
    }]
  });
}

/**
 * Render descending ordered ranking elements dynamically (🥇, 🥈, 🥉)
 */
function renderRankings(korea, draw, mexico, total) {
  const container = document.getElementById('prediction-rankings-container');
  if (!container) return;

  const arr = [
    { label: '대한민국 승', count: korea, labelFull: '🇰🇷 대한민국 승', colorBg: 'bg-rose-50/70 border-rose-100/50 text-rose-800' },
    { label: '멕시코 승', count: mexico, labelFull: '🇲🇽 멕시코 승', colorBg: 'bg-blue-50/70 border-blue-100/50 text-blue-800' },
    { label: '무승부', count: draw, labelFull: '🤝 무승부', colorBg: 'bg-amber-50/70 border-amber-100/50 text-amber-800' }
  ];

  // sort descending By counts
  arr.sort((a, b) => b.count - a.count);

  const medals = ['🥇', '🥈', '🥉'];
  container.innerHTML = '';

  arr.forEach((item, index) => {
    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
    
    const div = document.createElement('div');
    div.className = `flex justify-between items-center px-4 py-2.5 rounded-2xl border border-slate-100/80 bg-slate-50/60 font-bold text-xs sm:text-sm hover:scale-[1.01] transition-transform duration-300`;
    div.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base select-none">${medals[index]}</span>
        <span class="text-slate-800 font-extrabold">${item.labelFull}</span>
      </div>
      <div class="flex items-center gap-1.5 font-mono text-slate-500 font-bold">
        <span class="text-slate-800">${item.count}명</span>
        <span class="text-slate-300">•</span>
        <span class="text-[11px] font-black">${pct}%</span>
      </div>
    `;
    container.appendChild(div);
  });
}

/**
 * SIMULATOR PANEL CONTROLLER METHODS
 */
window.toggleSimulator = function() {
  const panel = document.getElementById('simulator-panel');
  if (panel) {
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth' });
    } else {
      panel.classList.add('hidden');
    }
  }
};

window.saveSimUrl = function() {
  const input = document.getElementById('sim-gas-endpoint');
  if (input) {
    const url = input.value.trim();
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
      alert('올바른 웹앱 API 주소(https://...)를 바르게 넣어주세요!');
      return;
    }
    
    localStorage.setItem('gas_api_url', url);
    adminState.apiUrl = url;
    alert('구글 Apps Script API 연동 주소가 성공적으로 동기화 저장 완료되었습니다!');
    fetchBoardData();
  }
};

window.clearSimUrl = function () {
  const input = document.getElementById('sim-gas-endpoint');
  localStorage.removeItem('gas_api_url');
  adminState.apiUrl = '';
  if (input) input.value = '';
  alert('구글 Apps Script API 연동 주소가 해제되었습니다. 로컬 가상 테스팅 상태로 재탑재됩니다.');
  fetchBoardData();
};

window.setSimResult = function(val) {
  adminState.simulatedWinner = val;
  if (val) {
    localStorage.setItem('simulated_match_winner', val);
  } else {
    localStorage.removeItem('simulated_match_winner');
  }
  
  updateSimulatorButtonHighlight();
  fetchBoardData();
};

function updateSimulatorButtonHighlight() {
  const current = adminState.simulatedWinner;
  
  const bNone = document.getElementById('btn-result-none');
  const bKorea = document.getElementById('btn-result-korea');
  const bDraw = document.getElementById('btn-result-draw');
  const bMexico = document.getElementById('btn-result-mexico');

  if (!bNone || !bKorea || !bDraw || !bMexico) return;

  // reset classes
  bNone.className = "bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer transition-all";
  bKorea.className = "bg-rose-55 text-rose-800 border border-rose-200/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all";
  bDraw.className = "bg-amber-55 text-amber-800 border border-amber-200/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all";
  bMexico.className = "bg-blue-55 text-blue-800 border border-blue-200/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all";

  if (current === '대한민국 승') {
    bKorea.className = "bg-rose-500 text-white border border-rose-600 px-3 py-1 rounded text-[10px] font-black shadow-xs ring-2 ring-rose-500/20 cursor-pointer transition-all scale-102";
  } else if (current === '무승부') {
    bDraw.className = "bg-amber-500 text-slate-900 border border-amber-600 px-3 py-1 rounded text-[10px] font-black shadow-xs ring-2 ring-amber-500/20 cursor-pointer transition-all scale-102";
  } else if (current === '멕시코 승') {
    bMexico.className = "bg-blue-500 text-white border border-blue-600 px-3 py-1 rounded text-[10px] font-black shadow-xs ring-2 ring-blue-500/20 cursor-pointer transition-all scale-102";
  } else {
    bNone.className = "bg-slate-800 text-white border border-slate-900 px-2.5 py-1 rounded text-[10px] font-black shadow-xs cursor-pointer transition-all scale-102";
  }
}

window.fetchBoardData = fetchBoardData;
