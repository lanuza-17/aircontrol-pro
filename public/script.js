/**
 * AirControl Pro — script.js
 * Dark purple/blue IoT dashboard with device management.
 *
 * Features:
 *  - Live simulated data (AC temp, kWh, cost) every 3s
 *  - Add / remove AC units and lights dynamically
 *  - Per-device toggles, temperature, brightness controls
 *  - Chart.js: line, bar, donut charts
 *  - Dark/light mode, alert system, toast notifications
 */

'use strict';

/* ═══════════════════════════════════════════
   APPLICATION STATE
═══════════════════════════════════════════ */
const state = {
  acOn:        true,
  roomTemp:    24.0,
  targetTemp:  22,
  humidity:    58,
  fanSpeed:    'medium',
  mode:        'cool',
  kWh:         1.24,
  rateCNIO:    36.00,
  scheduleOn:  true,
  scheduleStart: '07:00',
  scheduleStop:  '22:00',
  darkMode:    true,
  liveUpdates: true,
  alertsEnabled: true,
  alertShown:  false,
  currentPage: 'pageHome',

  /* Dynamic device lists */
  acDevices: [
    { id: 'ac-1', name: 'Sala principal', on: true,  temp: 22 },
    { id: 'ac-2', name: 'Habitación',     on: false, temp: 24 },
  ],
  lightDevices: [
    { id: 'lt-1', name: 'Luz sala',       on: true,  brightness: 70 },
    { id: 'lt-2', name: 'Abanico',        on: true,  brightness: 100 },
  ],
};

/* Device ID counter */
let devIdCounter = 100;
const newId = () => `dev-${++devIdCounter}`;

/* ═══════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimeout;
function showToast(msg) {
  const t = $('toast');
  clearTimeout(toastTimeout);
  t.textContent = msg;
  t.classList.add('show');
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════
   DEVICE CARD RENDERING
═══════════════════════════════════════════ */

/**
 * Render all AC device cards into #acDevicesGrid.
 */
function renderAcDevices() {
  const grid = $('acDevicesGrid');
  grid.innerHTML = '';
  state.acDevices.forEach(dev => {
    const card = document.createElement('div');
    card.className = `device-card${dev.on ? ' device-on' : ''}`;
    card.id = `card-${dev.id}`;
    card.innerHTML = `
      <div class="device-card-top">
        <div class="device-icon-wrap${dev.on ? ' on' : ''}">
          <span class="material-icons-round">ac_unit</span>
        </div>
        <button class="device-delete-btn" title="Eliminar" data-id="${dev.id}" data-type="ac">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div>
        <div class="device-name">${escHtml(dev.name)}</div>
        <div class="device-status${dev.on ? ' on' : ''}">${dev.on ? 'Encendido' : 'Apagado'}</div>
      </div>
      <div class="device-card-bottom">
        <div class="device-temp-mini">
          <button class="mini-temp-btn" data-id="${dev.id}" data-action="dec">
            <span class="material-icons-round">remove</span>
          </button>
          <span class="mini-temp-val" id="temp-${dev.id}">${dev.temp}°</span>
          <button class="mini-temp-btn" data-id="${dev.id}" data-action="inc">
            <span class="material-icons-round">add</span>
          </button>
        </div>
        <label class="android-switch small">
          <input type="checkbox" ${dev.on ? 'checked' : ''} data-id="${dev.id}" data-type="ac-toggle">
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </label>
      </div>`;
    grid.appendChild(card);
  });
  bindDeviceEvents(grid, 'ac');
}

/**
 * Render all light device cards into #lightDevicesGrid.
 */
function renderLightDevices() {
  const grid = $('lightDevicesGrid');
  grid.innerHTML = '';
  state.lightDevices.forEach(dev => {
    const card = document.createElement('div');
    card.className = `device-card${dev.on ? ' device-on' : ''}`;
    card.id = `card-${dev.id}`;
    card.innerHTML = `
      <div class="device-card-top">
        <div class="device-icon-wrap${dev.on ? ' on' : ''}">
          <span class="material-icons-round">${dev.brightness > 50 ? 'lightbulb' : 'lightbulb_outline'}</span>
        </div>
        <button class="device-delete-btn" title="Eliminar" data-id="${dev.id}" data-type="light">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div>
        <div class="device-name">${escHtml(dev.name)}</div>
        <div class="device-status${dev.on ? ' on' : ''}">${dev.on ? 'Encendido' : 'Apagado'}</div>
      </div>
      <div class="device-card-bottom">
        <div class="device-bright-mini">
          <span class="material-icons-round">brightness_low</span>
          <input type="range" class="mini-bright-slider" min="0" max="100"
            value="${dev.brightness}"
            data-id="${dev.id}"
            style="--val:${dev.brightness}%"
            ${dev.on ? '' : 'disabled'}>
        </div>
        <label class="android-switch small">
          <input type="checkbox" ${dev.on ? 'checked' : ''} data-id="${dev.id}" data-type="light-toggle">
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </label>
      </div>`;
    grid.appendChild(card);
  });
  bindDeviceEvents(grid, 'light');
}

/**
 * Bind events inside a device grid.
 */
function bindDeviceEvents(grid, type) {
  /* Delete buttons */
  grid.querySelectorAll('.device-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.id;
      const typ = btn.dataset.type;
      if (typ === 'ac') {
        state.acDevices = state.acDevices.filter(d => d.id !== id);
        renderAcDevices();
        showToast('🗑 Aire eliminado');
      } else {
        state.lightDevices = state.lightDevices.filter(d => d.id !== id);
        renderLightDevices();
        showToast('🗑 Luz eliminada');
      }
    });
  });

  if (type === 'ac') {
    /* Toggle switches */
    grid.querySelectorAll('[data-type="ac-toggle"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const dev = state.acDevices.find(d => d.id === chk.dataset.id);
        if (!dev) return;
        dev.on = chk.checked;
        renderAcDevices();
        showToast(dev.on ? `❄ ${dev.name} encendido` : `⏻ ${dev.name} apagado`);
      });
    });
    /* Temp mini buttons */
    grid.querySelectorAll('.mini-temp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dev = state.acDevices.find(d => d.id === btn.dataset.id);
        if (!dev) return;
        if (btn.dataset.action === 'inc' && dev.temp < 30) dev.temp++;
        if (btn.dataset.action === 'dec' && dev.temp > 16) dev.temp--;
        const el = $(`temp-${dev.id}`);
        if (el) el.textContent = `${dev.temp}°`;
        showToast(`🌡 ${dev.name}: ${dev.temp}°C`);
      });
    });
  }

  if (type === 'light') {
    /* Toggle switches */
    grid.querySelectorAll('[data-type="light-toggle"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const dev = state.lightDevices.find(d => d.id === chk.dataset.id);
        if (!dev) return;
        dev.on = chk.checked;
        renderLightDevices();
        showToast(dev.on ? `💡 ${dev.name} encendida` : `🌑 ${dev.name} apagada`);
      });
    });
    /* Brightness sliders */
    grid.querySelectorAll('.mini-bright-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const dev = state.lightDevices.find(d => d.id === slider.dataset.id);
        if (!dev) return;
        dev.brightness = parseInt(slider.value);
        slider.style.setProperty('--val', `${dev.brightness}%`);
      });
    });
  }
}

/* Escape HTML entities for safe insertion */
function escHtml(str) {
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* ═══════════════════════════════════════════
   ADD DEVICE MODAL
═══════════════════════════════════════════ */
let modalDeviceType = 'ac'; /* current selection in modal */

function openModal(forceType) {
  const modal = $('addDeviceModal');
  const typeRow = $('modalTypeRow');
  $('deviceNameInput').value = '';

  if (forceType) {
    modalDeviceType = forceType;
    typeRow.style.display = 'none';
    $('modalTitle').textContent = forceType === 'ac'
      ? 'Agregar Aire Acondicionado' : 'Agregar Luz';
  } else {
    typeRow.style.display = 'grid';
    $('modalTitle').textContent = 'Agregar dispositivo';
  }

  /* Sync type buttons */
  document.querySelectorAll('.modal-type-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.type === modalDeviceType);
  });

  modal.style.display = 'flex';
  setTimeout(() => $('deviceNameInput').focus(), 200);
}

function closeModal() {
  const overlay = $('addDeviceModal');
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('closing');
  }, 200);
}

/* NOTE: all event listeners are bound inside setupEvents(), called from init() */

/* ═══════════════════════════════════════════
   CHART.JS
═══════════════════════════════════════════ */
let lineChart, barChart, donutChart;

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);

function generateHourlyKwh() {
  return hours.map((_, h) => {
    const base = (h >= 6 && h <= 9)   ? 0.8 + Math.random()*0.4
               : (h >= 12 && h <= 15) ? 1.1 + Math.random()*0.6
               : (h >= 18 && h <= 22) ? 0.9 + Math.random()*0.5
               : 0.1 + Math.random()*0.2;
    return parseFloat(base.toFixed(2));
  });
}

function generateDailyData() {
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  return days.map(d => ({ label: d, cost: parseFloat((20 + Math.random()*60).toFixed(2)) }));
}

function chartColors() {
  const dark = state.darkMode;
  return {
    grid:     dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    ticks:    dark ? '#606060' : '#9090b0',
    tooltip:  dark ? '#222222' : '#ffffff',
    ttTitle:  dark ? '#f0f0f0' : '#0d0d1a',
    ttBody:   dark ? '#a0a0a0' : '#4a4470',
    ttBorder: dark ? 'rgba(255,255,255,0.07)' : 'rgba(120,87,255,0.1)',
    accent:   '#7857FF',
    accent2:  '#4B7BF5',
    lineFill: dark ? 'rgba(120,87,255,0.12)' : 'rgba(120,87,255,0.08)',
    bars:     ['#7857FF','#6B52F5','#5E4DEA','#7857FF','#4B7BF5','#5E6BFF','#6B52F5'],
    donut:    ['#7857FF','#fbbf24','#4B7BF5'],
  };
}

function initCharts() {
  if (lineChart)  lineChart.destroy();
  if (barChart)   barChart.destroy();
  if (donutChart) donutChart.destroy();

  const c = chartColors();
  const hourlyData = generateHourlyKwh();
  const dailyData  = generateDailyData();

  const sharedScales = {
    x: { grid: { color: c.grid }, ticks: { color: c.ticks, font: { size: 10 }, maxTicksLimit: 6 } },
    y: { grid: { color: c.grid }, ticks: { color: c.ticks, font: { size: 10 } }, beginAtZero: true },
  };

  const sharedTooltip = (suffix) => ({
    backgroundColor: c.tooltip,
    titleColor: c.ttTitle,
    bodyColor: c.ttBody,
    borderColor: c.ttBorder,
    borderWidth: 1,
    padding: 10,
    callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)}${suffix}` }
  });

  /* Line chart */
  lineChart = new Chart($('lineChart'), {
    type: 'line',
    data: {
      labels: hours,
      datasets: [{
        label: 'kWh',
        data: hourlyData,
        borderColor: c.accent,
        backgroundColor: c.lineFill,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: c.accent,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: sharedTooltip(' kWh') },
      scales: sharedScales,
    }
  });

  /* Bar chart */
  barChart = new Chart($('barChart'), {
    type: 'bar',
    data: {
      labels: dailyData.map(d => d.label),
      datasets: [{
        label: 'C$',
        data: dailyData.map(d => d.cost),
        backgroundColor: c.bars,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: sharedTooltip(' C$') },
      scales: sharedScales,
    }
  });

  /* Donut chart */
  donutChart = new Chart($('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Aire AC', 'Luces', 'Standby'],
      datasets: [{
        data: [68, 22, 10],
        backgroundColor: c.donut,
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltip,
          titleColor: c.ttTitle,
          bodyColor: c.ttBody,
          borderColor: c.ttBorder,
          borderWidth: 1,
          padding: 10,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` }
        }
      }
    }
  });
}

/* ═══════════════════════════════════════════
   EFFICIENCY & RECOMMENDATIONS
═══════════════════════════════════════════ */
const TIPS = [
  'Establece la temperatura a 24°C para reducir el consumo un 15%.',
  'Usa el modo Eco durante horas de menor demanda eléctrica.',
  'Baja la velocidad del ventilador cuando la sala ya esté fresca.',
  'Activa el horario para apagar el AC automáticamente en la noche.',
  'Limpia los filtros del AC mensualmente para mayor eficiencia.',
  'Mantén puertas y ventanas cerradas mientras el AC está activo.',
  'Reduce la temperatura gradualmente para evitar picos de consumo.',
];
let tipIdx = 0;

function getEfficiency() {
  const { kWh, targetTemp, acOn } = state;
  if (!acOn) return { level: 'Apagado',     icon: 'power_off',     cls: '' };
  if (kWh < 1.0 || targetTemp >= 24) return { level: 'Eficiente',  icon: 'eco',           cls: '' };
  if (kWh < 1.8 || targetTemp >= 22) return { level: 'Normal',     icon: 'check_circle',  cls: 'warning' };
  return                                     { level: 'Alto uso',   icon: 'warning',       cls: 'danger' };
}

function rotateRecommendation() {
  const el = $('recText');
  const eff = getEfficiency();
  if (!state.acOn) {
    el.textContent = 'El AC está apagado. Enciéndelo para comenzar el monitoreo.';
    return;
  }
  if (eff.level === 'Alto uso') {
    el.textContent = '¡Consumo alto detectado! Considera subir la temperatura o usar el modo Eco.';
    return;
  }
  tipIdx = (tipIdx + 1) % TIPS.length;
  el.textContent = TIPS[tipIdx];
}

/* ═══════════════════════════════════════════
   HOME STATS UPDATE
═══════════════════════════════════════════ */
function updateHomeStats() {
  const { acOn, roomTemp, targetTemp, humidity, kWh, rateCNIO } = state;

  /* Room temp */
  $('roomTemp').textContent = roomTemp.toFixed(1).replace('.0', '');

  /* Target & humidity */
  $('targetTempDisplay').textContent = `${targetTemp}°C`;
  $('humidityDisplay').textContent   = `${humidity}%`;

  /* kWh */
  $('kwhDisplay').textContent = kWh.toFixed(2);
  $('kwhBig').textContent     = kWh.toFixed(3);
  animateCount($('kwhDisplay'));

  /* Cost */
  const cost = kWh * rateCNIO;
  $('costDisplay').textContent = cost.toFixed(2);
  animateCount($('costDisplay'));

  /* Monthly estimate */
  const h = new Date().getHours() || 1;
  const monthly = (kWh / h) * 24 * 30 * rateCNIO;
  $('monthlyCostDisplay').textContent = Math.round(Math.min(monthly, 99999)).toLocaleString();

  /* Efficiency */
  const eff = getEfficiency();
  $('efficiencyDisplay').textContent = eff.level;
  $('efficiencyIcon').textContent    = eff.icon;
  $('efficiencyIconCard').className  = `stat-icon efficiency-icon ${eff.cls}`;

  /* AC status UI */
  const dot  = $('statusDot');
  const lbl  = $('statusLabel');
  const pBtn = $('powerBtn');
  dot.classList.toggle('off', !acOn);
  lbl.textContent = acOn ? 'AC ON' : 'AC OFF';
  pBtn.classList.toggle('off', !acOn);
  $('appBarSubtitle').textContent = acOn ? 'Sala Principal • Activo' : 'Sala Principal • Apagado';
}

function animateCount(el) {
  el.classList.remove('counting');
  void el.offsetWidth;
  el.classList.add('counting');
}

/* ═══════════════════════════════════════════
   ALERTS
═══════════════════════════════════════════ */
function checkAlerts() {
  if (!state.alertsEnabled) return;
  const eff = getEfficiency();
  if (eff.level === 'Alto uso' && !state.alertShown) {
    $('alertText').textContent = '⚡ Consumo energético alto. Considera el modo Eco.';
    $('alertBanner').style.display = 'flex';
    $('notifBadge').style.display  = 'block';
    state.alertShown = true;
  } else if (eff.level !== 'Alto uso') {
    state.alertShown = false;
  }
}

function hideAlert() {
  $('alertBanner').style.display = 'none';
  $('notifBadge').style.display  = 'none';
}

/* ═══════════════════════════════════════════
   LIVE SIMULATION
═══════════════════════════════════════════ */
let liveInterval;

function simulateUpdate() {
  if (!state.liveUpdates) return;

  /* Temperature drift */
  const diff  = state.targetTemp - state.roomTemp;
  const drift = (Math.random() * 0.2 - 0.08) + (state.acOn ? diff * 0.05 : 0.04);
  state.roomTemp = Math.max(16, Math.min(35, state.roomTemp + drift));

  /* kWh accumulation */
  if (state.acOn) {
    const fm = { low: 0.6, medium: 1.0, high: 1.4, auto: 0.9 }[state.fanSpeed];
    const mm = { cool: 1.0, dry: 0.7, fan: 0.3, eco: 0.55 }[state.mode];
    /* Extra load per additional active AC */
    const extraACs = state.acDevices.filter(d => d.on).length;
    const inc = 0.003 * fm * mm * (1 + Math.random() * 0.3) * (1 + extraACs * 0.15);
    state.kWh = parseFloat((state.kWh + inc).toFixed(3));
  }

  /* Humidity drift */
  state.humidity = Math.max(30, Math.min(85, state.humidity + (Math.random() * 2 - 1)));

  updateHomeStats();
  checkAlerts();
  rotateRecommendation();

  /* Update line chart current hour */
  if (lineChart) {
    const h = new Date().getHours();
    lineChart.data.datasets[0].data[h] = parseFloat(state.kWh.toFixed(2));
    lineChart.update('none');
  }
}

function startLive() { clearInterval(liveInterval); liveInterval = setInterval(simulateUpdate, 3000); }
function stopLive()  { clearInterval(liveInterval); }

/* ═══════════════════════════════════════════
   DARK MODE (function only, no global calls)
═══════════════════════════════════════════ */
function applyDarkMode(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  $('darkModeIcon').textContent      = dark ? 'light_mode' : 'dark_mode';
  $('darkModeSwitch').checked        = dark;
  const sdi = document.getElementById('sidebarDarkIcon');
  const sdl = document.getElementById('sidebarDarkLabel');
  if (sdi) sdi.textContent = dark ? 'light_mode' : 'dark_mode';
  if (sdl) sdl.textContent = dark ? 'Modo claro'  : 'Modo oscuro';
  state.darkMode = dark;
  if (lineChart) initCharts();
}

/* Shared page-switch helper — keeps bottom nav + sidebar in sync */
function navigateTo(target) {
  if (state.currentPage === target) return;
  /* Pages */
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(target).classList.add('active');
  state.currentPage = target;
  /* Bottom nav */
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === target);
  });
  /* Sidebar */
  document.querySelectorAll('.sidebar-item').forEach(s => {
    s.classList.toggle('active', s.dataset.page === target);
  });
  /* Init charts lazily */
  if (target === 'pageEnergy' && !chartsReady) {
    setTimeout(() => { initCharts(); chartsReady = true; }, 100);
  }
}

function updateScheduleSub() {
  $('scheduleSub').textContent = state.scheduleOn
    ? `Se enciende a las ${state.scheduleStart}, apaga a las ${state.scheduleStop}`
    : 'Horario desactivado';
}

/* ═══════════════════════════════════════════
   SETUP EVENTS — called once from init()
═══════════════════════════════════════════ */
let chartsReady = false;

function setupEvents() {
  /* ── Alerts & notifications ── */
  $('alertClose').addEventListener('click', hideAlert);
  $('notifBtn').addEventListener('click', () => { hideAlert(); showToast('Sin nuevas notificaciones'); });

  /* ── Power button ── */
  $('powerBtn').addEventListener('click', () => {
    state.acOn = !state.acOn;
    updateHomeStats();
    showToast(state.acOn ? '✅ AC encendido' : '⏻ AC apagado');
  });

  /* ── Temperature +/- ── */
  $('tempIncrease').addEventListener('click', () => {
    if (state.targetTemp < 30) {
      state.targetTemp++;
      $('targetTempBig').textContent = state.targetTemp;
      updateHomeStats();
      showToast(`🌡 Objetivo: ${state.targetTemp}°C`);
    }
  });

  $('tempDecrease').addEventListener('click', () => {
    if (state.targetTemp > 16) {
      state.targetTemp--;
      $('targetTempBig').textContent = state.targetTemp;
      updateHomeStats();
      showToast(`🌡 Objetivo: ${state.targetTemp}°C`);
    }
  });

  /* ── Fan speed ── */
  $('fanGroup').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#fanGroup .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.fanSpeed = chip.dataset.value;
    showToast(`💨 Ventilador: ${chip.textContent}`);
  });

  /* ── Mode ── */
  $('modeGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    document.querySelectorAll('#modeGroup .mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    showToast(`Modo: ${btn.querySelector('span:last-child').textContent}`);
  });

  /* ── Schedule ── */
  $('scheduleToggle').addEventListener('change', () => {
    state.scheduleOn = $('scheduleToggle').checked;
    $('scheduleTimes').style.opacity       = state.scheduleOn ? '1' : '0.4';
    $('scheduleTimes').style.pointerEvents = state.scheduleOn ? 'auto' : 'none';
    updateScheduleSub();
    showToast(state.scheduleOn ? '⏰ Horario activado' : '⏰ Horario desactivado');
  });

  $('saveScheduleBtn').addEventListener('click', () => {
    state.scheduleStart = $('scheduleStart').value;
    state.scheduleStop  = $('scheduleStop').value;
    updateScheduleSub();
    showToast(`✅ Horario guardado: ${state.scheduleStart} – ${state.scheduleStop}`);
  });

  /* ── Dark mode (top bar + settings + sidebar buttons) ── */
  $('darkModeToggle').addEventListener('click', () => {
    applyDarkMode(!state.darkMode);
    showToast(state.darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro');
  });

  $('darkModeSwitch').addEventListener('change', () => {
    applyDarkMode($('darkModeSwitch').checked);
    showToast(state.darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro');
  });

  const sidebarDarkBtn = document.getElementById('sidebarDarkBtn');
  if (sidebarDarkBtn) {
    sidebarDarkBtn.addEventListener('click', () => {
      applyDarkMode(!state.darkMode);
      showToast(state.darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro');
    });
  }

  /* ── Settings toggles ── */
  $('alertsToggle').addEventListener('change', () => {
    state.alertsEnabled = $('alertsToggle').checked;
    showToast(state.alertsEnabled ? '🔔 Alertas activadas' : '🔕 Alertas desactivadas');
    if (!state.alertsEnabled) hideAlert();
  });

  $('liveUpdateToggle').addEventListener('change', () => {
    state.liveUpdates = $('liveUpdateToggle').checked;
    state.liveUpdates
      ? (startLive(), showToast('▶ Actualizaciones en vivo'))
      : (stopLive(),  showToast('⏸ Actualizaciones pausadas'));
  });

  /* ── Modal: type selector ── */
  document.querySelectorAll('.modal-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalDeviceType = btn.dataset.type;
      document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  $('modalCancel').addEventListener('click', closeModal);

  $('addDeviceModal').addEventListener('click', (e) => {
    if (e.target === $('addDeviceModal')) closeModal();
  });

  $('modalConfirm').addEventListener('click', () => {
    const name = $('deviceNameInput').value.trim();
    if (!name) {
      $('deviceNameInput').focus();
      $('deviceNameInput').style.borderColor = '#f87171';
      setTimeout(() => ($('deviceNameInput').style.borderColor = ''), 1200);
      return;
    }
    if (modalDeviceType === 'ac') {
      state.acDevices.push({ id: newId(), name, on: true, temp: 22 });
      renderAcDevices();
      showToast(`❄ Aire "${name}" agregado`);
    } else {
      state.lightDevices.push({ id: newId(), name, on: true, brightness: 80 });
      renderLightDevices();
      showToast(`💡 Luz "${name}" agregada`);
    }
    closeModal();
  });

  $('deviceNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('modalConfirm').click();
  });

  /* ── Add device buttons ── */
  $('addAcBtn').addEventListener('click',    () => openModal('ac'));
  $('addLightBtn').addEventListener('click', () => openModal('light'));

  /* ── Bottom navigation ── */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  /* ── Sidebar navigation ── */
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init() {
  /* Apply dark theme by default (matches reference palette) */
  applyDarkMode(true);

  /* Bind all event listeners (DOM is ready here) */
  setupEvents();

  /* Initial stats render */
  updateHomeStats();
  $('targetTempBig').textContent = state.targetTemp;
  $('scheduleStart').value       = state.scheduleStart;
  $('scheduleStop').value        = state.scheduleStop;
  updateScheduleSub();
  rotateRecommendation();

  /* Render device lists */
  renderAcDevices();
  renderLightDevices();

  /* Demo alert after 4s */
  setTimeout(() => {
    if (state.alertsEnabled) {
      $('alertText').textContent     = '⚡ Consumo por encima del promedio para esta hora.';
      $('alertBanner').style.display = 'flex';
      $('notifBadge').style.display  = 'block';
    }
  }, 4000);

  /* Start live simulation */
  startLive();

  console.log('✅ AirControl Pro iniciado.');
}

/* Guard: run after DOM is fully parsed */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
