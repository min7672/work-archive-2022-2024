/* =====================================================================
 * Canvas & Charts Utility
 * ===================================================================== */

/* =========================================================
 * 0) HiDPI(레티나) 대응 유틸
 *    - CSS 크기(논리 px)를 유지하면서 내부 버퍼를 DPR 배수로 확장
 *    - 컨텍스트에 스케일을 걸어 좌표계를 CSS px 기반으로 통일
 * ========================================================= */
function fitHiDPI(canvas){
  const dpr = Math.max(1, window.devicePixelRatio || 1);     // 디스플레이 배율
  const rect = canvas.getBoundingClientRect();               // CSS 픽셀 크기
  // 내부 픽셀 버퍼가 실제 표시 크기 * DPR 과 다르면 재설정
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr){
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
  }
  const ctx = canvas.getContext('2d');
  // 논리 좌표계를 CSS px 로 맞추기 (그리기 코드는 DPR 신경 안 써도 됨)
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return ctx;
}

/* =========================================================
 * 1) Bar Chart (막대 차트) – 서로 독립적으로 동작
 *    - 랜덤 데이터 생성 → 캔버스에 막대 + 축 그리기
 *    - 슬라이더/컬러피커로 즉시 갱신
 * ========================================================= */
const barCanvas = document.getElementById('bar-canvas');
let barCtx = fitHiDPI(barCanvas);      // HiDPI 컨텍스트
let barData = genRandom(20);           // 초기 더미 데이터

// n개 랜덤값 생성 (max 기본 400) – 데모용
function genRandom(n, max=400){
  return Array.from({length:n}, ()=> Math.random()*max + 40);
}

// 캔버스용 라운드 사각형 Path 유틸
function roundRect(ctx,x,y,w,h,r){
  // 반경이 너비/높이의 절반을 넘지 않도록 클램프
  r = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// 막대 차트 렌더링
function drawBars(){
  barCtx = fitHiDPI(barCanvas); // 리사이즈/줌 대비 매 프레임 보정
  const w = barCanvas.getBoundingClientRect().width;   // CSS px 기준 폭
  const h = barCanvas.getBoundingClientRect().height;  // CSS px 기준 높이

  // UI 값 읽기
  const count  = +document.getElementById('bar-count').value;     // 막대 개수
  const bW     = +document.getElementById('bar-width').value;     // 막대 폭
  const gap    = +document.getElementById('bar-gap').value;       // 막대 간격
  const radius = +document.getElementById('bar-radius').value;    // 상단 모서리 반경
  const margin = +document.getElementById('bar-margin').value;    // 좌측 여백
  const bg     = document.getElementById('bar-bg').value;         // 배경색
  const color  = document.getElementById('bar-color').value;      // 막대색

  // 데이터 길이가 바뀔 때만 재생성 (사용자 경험 안정화)
  if (barData.length !== count) barData = genRandom(count, h*0.75);

  // 배경 초기화
  barCtx.clearRect(0,0,w,h);
  barCtx.fillStyle = bg;
  barCtx.fillRect(0,0,w,h);

  // 바닥축/왼축(가이드) – 시각적 기준선
  barCtx.strokeStyle = "#222a";
  barCtx.lineWidth = 1.5;
  barCtx.beginPath(); barCtx.moveTo(0,   h-0.5); barCtx.lineTo(w,   h-0.5); barCtx.stroke(); // X축
  barCtx.beginPath(); barCtx.moveTo(0.5, 0);     barCtx.lineTo(0.5, h);     barCtx.stroke(); // Y축

  // 막대 그리기
  let x = margin;               // 시작 X 위치
  barCtx.fillStyle = color;
  for (let i=0;i<count;i++){
    // 상단 여유를 주고 화면 높이를 넘지 않게 클램프
    const val = Math.max(2, Math.min(h-20, barData[i]));
    const y   = h - val;        // 캔버스 좌표계(y 아래로 증가)이므로 변환
    roundRect(barCtx, x, y, bW, val, radius);
    barCtx.fill();
    x += bW + gap;
    if (x > w) break;           // 화면을 넘어가면 중단 (오버플로 방지)
  }
}

/* 컨트롤 바인딩 – Bar
 * - 각 Input 변화 시 값 라벨 갱신 + 즉시 재렌더
 */
(function bindBar(){
  const ids = [
    ['bar-count','bar-count-val'],
    ['bar-width','bar-width-val'],
    ['bar-gap','bar-gap-val'],
    ['bar-radius','bar-radius-val'],
    ['bar-margin','bar-margin-val'],
    ['bar-bg','bar-bg-val'],
    ['bar-color','bar-color-val'],
  ];
  ids.forEach(([inputId, valId])=>{
    const i = document.getElementById(inputId);
    const s = document.getElementById(valId);
    const handler = ()=>{
      // 색상은 HEX 그대로, 숫자는 문자열로 반영
      s.textContent = i.type==='color' ? i.value : String(i.value);
      drawBars();
    };
    i.addEventListener('input', handler);
  });
})();

/* =========================================================
 * 2) Line Chart (라인 차트) – 독립적으로 동작
 *    - 부드러운 Bezier 보간 사용 (smooth=0~1)
 *    - 슬라이더/컬러피커로 즉시 갱신
 * ========================================================= */
const lineCanvas = document.getElementById('line-canvas');
let lineCtx   = fitHiDPI(lineCanvas);
let lineData  = genRandom(20, 300); // 라인용 초기 더미

function drawLine(){
  lineCtx = fitHiDPI(lineCanvas); // HiDPI 재보정
  const w = lineCanvas.getBoundingClientRect().width;
  const h = lineCanvas.getBoundingClientRect().height;

  // UI 값 읽기
  const count  = +document.getElementById('line-count').value;          // 포인트 개수
  const stroke = +document.getElementById('line-width').value;          // 선 두께
  const smooth = +document.getElementById('line-smooth').value / 100;   // 0~1 보간 강도
  const margin = +document.getElementById('line-margin').value;         // 좌/우 여백
  const bg     = document.getElementById('line-bg').value;              // 배경색
  const color  = document.getElementById('line-color').value;           // 선 색상

  // 포인트 수가 변경될 때만 데이터 재생성
  if (lineData.length !== count) lineData = genRandom(count, h*0.75);

  // 배경 초기화
  lineCtx.clearRect(0,0,w,h);
  lineCtx.fillStyle = bg;
  lineCtx.fillRect(0,0,w,h);

  // 축(가이드)
  lineCtx.strokeStyle = "#ffffff1a";
  lineCtx.lineWidth = 1;
  lineCtx.beginPath(); lineCtx.moveTo(margin,     h-0.5); lineCtx.lineTo(w-margin, h-0.5); lineCtx.stroke(); // X축
  lineCtx.beginPath(); lineCtx.moveTo(margin-0.5, 0);     lineCtx.lineTo(margin-0.5, h);   lineCtx.stroke(); // Y축

  // 라인(베지어 곡선 연결)
  const step = (w - margin*2) / Math.max(1, (count-1)); // 포인트 간 X 간격
  lineCtx.strokeStyle = color;
  lineCtx.lineWidth = stroke;
  lineCtx.beginPath();
  // 시작점
  lineCtx.moveTo(margin, h - lineData[0]);

  for (let i=1;i<count;i++){
    const x0 = margin + (i-1)*step;
    const y0 = h - lineData[i-1];
    const x1 = margin + i*step;
    const y1 = h - lineData[i];

    // 양 끝점의 접선 방향을 간단히 가정한 제어점
    const cp1x = x0 + step * smooth;
    const cp1y = y0;
    const cp2x = x1 - step * smooth;
    const cp2y = y1;

    lineCtx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,x1,y1);
  }
  lineCtx.stroke();
}

/* 컨트롤 바인딩 – Line
 * - 슬라이더/컬러 선택 시 값 라벨 갱신 + 즉시 재렌더
 */
(function bindLine(){
  const ids = [
    ['line-count','line-count-val'],
    ['line-width','line-width-val'],
    ['line-smooth','line-smooth-val'],
    ['line-margin','line-margin-val'],
    ['line-bg','line-bg-val'],
    ['line-color','line-color-val'],
  ];
  ids.forEach(([inputId, valId])=>{
    const i = document.getElementById(inputId);
    const s = document.getElementById(valId);
    const handler = ()=>{
      s.textContent = i.type==='color' ? i.value : String(i.value);
      drawLine();
    };
    i.addEventListener('input', handler);
  });
})();

/* =========================================================
 * 3) 초기 렌더 + 리사이즈 대응
 *    - 최초 1회 그리기
 *    - 창 크기/줌 변경 시 HiDPI 스케일 재적용 → 재렌더
 * ========================================================= */
drawBars();
drawLine();

window.addEventListener('resize', ()=>{
  drawBars();
  drawLine();
});
