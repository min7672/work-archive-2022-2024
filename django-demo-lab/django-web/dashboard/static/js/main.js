function updateTrack(slider) {
    const val = slider.value;
    slider.style.setProperty('--val', `${val}%`);

}

document.querySelectorAll('.soc-slider').forEach(slider => {

    updateTrack(slider);
    slider.addEventListener('input', e => {
        updateTrack(e.target);
        const value = +e.target.value;              // 현재 슬라이더 값 (0~100)
        const gradId = e.target.dataset.target;     // 연결된 <linearGradient> ID
        const grad = document.getElementById(gradId); // 해당 gradient DOM 찾기
        if (!grad) return;

        // === (1) 기존 stop 모두 제거 ===
        while (grad.firstChild) grad.removeChild(grad.firstChild);

        // === (2) 색상 설정 ===
        const baseColor = "#A9E3FF";
        const fillColor = "#5FF272";

        // === (3) offset 구간 계산 ===
        const raw = Math.max(0, Math.min(100, value)); // 0~100 클램프
        const v = 100 - raw; // ← 방향 반전 (0% 효과가 아래, 100%가 위)
        const eps = 0.1; // 경계 완화용 (0.1%)

        // === (4) stop 추가 ===
        const stops = [
            { offset: "0%", color: baseColor },
            { offset: `${v - eps}%`, color: baseColor },
            { offset: `${v}%`, color: baseColor },
            { offset: `${v}%`, color: fillColor },
            { offset: `${v + eps}%`, color: fillColor },
            { offset: "100%", color: fillColor },
        ];

        stops.forEach(s => {
            const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop.setAttribute("offset", s.offset);
            stop.setAttribute("stop-color", s.color);
            grad.appendChild(stop);
        });

        // === (5) 퍼센트 텍스트 업데이트 ===
        const suffix = e.target.previousElementSibling.querySelector('.legend-suffix span');
        if (suffix) suffix.textContent = value;
    });
});

function setLineDirection(isCharging) {
    const lines = document.querySelectorAll('.line-animation1, .line-animation2');

    lines.forEach(line => {
        // 충전 → 정방향 / 방전 → 역방향
        line.style.animationDirection = isCharging ? 'reverse' : 'normal';
        // 색상도 시각적으로 구분할 경우
        line.style.stroke = isCharging ? '#5FF272' : '#ff5e6c';
    });
}

// 버튼 이벤트 연결
document.querySelector('.legend-suffix.charging')?.addEventListener('click', () => {
    setLineDirection(true);
});

document.querySelector('.legend-suffix.discharging')?.addEventListener('click', () => {
    setLineDirection(false);
});