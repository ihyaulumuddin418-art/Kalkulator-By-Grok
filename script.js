// script.js
// ==================== RAVEN KALKULATOR v1.0 ====================

let currentMode = 'standard';
let displayValue = '0';
let previousValue = '';
let operator = '';
let shouldResetDisplay = false;
let memory = 0;
let isDeg = true;
let history = JSON.parse(localStorage.getItem('ravenHistory')) || [];

// Tailwind initialization
function initTailwind() {
    return {
        config(userConfig = {}) {
            return {
                content: [],
                theme: {
                    extend: {},
                },
                plugins: [],
                ...userConfig,
            }
        },
        theme: {
            extend: {},
        },
    }
}

// Render history
function renderHistory() {
    const container = document.getElementById('history-list');
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-[#999] italic">Belum ada riwayat</div>`;
        return;
    }
    
    history.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = `px-4 py-4 mb-2 rounded-3xl ${i % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'} border border-transparent hover:border-[#E5E5E5]`;
        div.innerHTML = `
            <div class="flex justify-between text-xs text-[#555]"><span>\( {item.mode}</span><span> \){item.time}</span></div>
            <div class="font-medium text-[#111111]">${item.expression}</div>
            <div class="text-right text-emerald-600 text-2xl font-semibold">${item.result}</div>
        `;
        container.appendChild(div);
    });
}

// Save to history
function addToHistory(mode, expression, result) {
    const entry = {
        mode: mode.charAt(0).toUpperCase() + mode.slice(1),
        expression: expression,
        result: result,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    history.unshift(entry);
    if (history.length > 30) history.pop();
    localStorage.setItem('ravenHistory', JSON.stringify(history));
    renderHistory();
}

// Toggle history panel
function toggleHistory() {
    const panel = document.getElementById('history-panel');
    const overlay = document.getElementById('history-overlay');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        setTimeout(() => panel.style.transform = 'translateX(0)', 10);
        overlay.classList.remove('hidden');
        renderHistory();
    } else {
        panel.style.transform = 'translateX(100%)';
        setTimeout(() => {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
        }, 300);
    }
}

function clearHistory() {
    if (confirm('Hapus semua riwayat?')) {
        history = [];
        localStorage.removeItem('ravenHistory');
        renderHistory();
    }
}

function exportHistoryToText() {
    let text = "=== RIWAYAT RAVEN KALKULATOR ===\n\n";
    history.forEach(h => {
        text += `${h.time} | \( {h.mode}\n \){h.expression} = ${h.result}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raven-history-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
}

// Export current results to PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Raven Kalkulator", 20, 25);
    
    doc.setFontSize(12);
    doc.text(`Mode: ${currentMode.toUpperCase()}`, 20, 40);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 20, 48);
    
    let y = 65;
    
    if (currentMode === 'standard' || currentMode === 'scientific') {
        doc.text(`Hasil terakhir: ${document.getElementById('main-display').innerText}`, 20, y);
    } else if (currentMode === 'financial') {
        doc.text(document.getElementById('loan-result').innerText || document.getElementById('compound-result').innerText || 'Tidak ada hasil', 20, y);
    } else {
        // Ambil teks dari semua hasil yang terlihat
        doc.text("Hasil perhitungan mode saat ini telah diekspor.", 20, y);
    }
    
    doc.save(`raven-\( {currentMode}- \){Date.now()}.pdf`);
    addToHistory(currentMode, 'PDF Export', 'File berhasil diunduh');
}

// Switch mode
function switchMode(mode) {
    currentMode = mode;
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active-mode', 'bg-[#F9F9F9]', 'shadow-sm'));
    document.getElementById(`nav-${mode}`).classList.add('active-mode', 'bg-[#F9F9F9]', 'shadow-sm');
    
    // Update header indicator
    const modeNames = {
        standard: { icon: '🧮', name: 'Standar' },
        scientific: { icon: '📐', name: 'Ilmiah' },
        financial: { icon: '💰', name: 'Keuangan' },
        health: { icon: '❤️', name: 'Kesehatan' },
        conversion: { icon: '📏', name: 'Konversi' },
        tax: { icon: '📋', name: 'Pajak' },
        engineering: { icon: '⚙️', name: 'Teknik' }
    };
    
    document.getElementById('mode-icon').innerHTML = modeNames[mode].icon;
    document.getElementById('mode-name').textContent = modeNames[mode].name;
    document.getElementById('current-mode-display').classList.remove('hidden');
    
    // Hide all contents
    document.querySelectorAll('.mode-content').forEach(el => el.classList.add('hidden'));
    
    // Show selected
    const target = document.getElementById(`content-${mode}`);
    if (target) target.classList.remove('hidden');
    
    // Show/hide main calculator display
    const displayContainer = document.getElementById('calculator-display-container');
    if (mode === 'standard' || mode === 'scientific') {
        displayContainer.classList.remove('hidden');
        resetCalculatorDisplay();
    } else {
        displayContainer.classList.add('hidden');
    }
    
    // Special init for conversion category
    if (mode === 'conversion') initConversion();
    if (mode === 'engineering') initGeometryInputs();
}

// STANDARD CALCULATOR LOGIC
function handleStandardInput(val) {
    const display = document.getElementById('main-display');
    
    if (shouldResetDisplay) {
        displayValue = '0';
        shouldResetDisplay = false;
    }
    
    if (['+', '−', '×', '÷'].includes(val)) {
        if (operator !== '' && !shouldResetDisplay) calculateStandard(true);
        previousValue = displayValue;
        operator = val === '−' ? '-' : val === '×' ? '*' : val === '÷' ? '/' : val;
        shouldResetDisplay = true;
        document.getElementById('expression').textContent = `${previousValue} ${val}`;
        return;
    }
    
    if (val === 'AC') {
        displayValue = '0';
        previousValue = '';
        operator = '';
        document.getElementById('expression').textContent = '';
    } else if (val === 'C') {
        displayValue = displayValue.length > 1 ? displayValue.slice(0, -1) : '0';
    } else if (val === '%') {
        displayValue = (parseFloat(displayValue) / 100).toString();
    } else if (val === '.') {
        if (!displayValue.includes('.')) displayValue += '.';
    } else {
        displayValue = displayValue === '0' ? val : displayValue + val;
    }
    
    display.textContent = displayValue;
}

function calculateStandard(keepOperator = false) {
    if (operator === '') return;
    
    let result;
    const prev = parseFloat(previousValue);
    const curr = parseFloat(displayValue);
    
    switch (operator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr !== 0 ? prev / curr : 'Error'; break;
    }
    
    const display = document.getElementById('main-display');
    displayValue = result.toString();
    display.textContent = displayValue;
    
    addToHistory('standard', `${previousValue} ${operator} ${curr}`, displayValue);
    
    if (!keepOperator) {
        operator = '';
        previousValue = '';
        document.getElementById('expression').textContent = '';
    }
    shouldResetDisplay = true;
}

function memoryOperation(op) {
    const display = document.getElementById('main-display');
    const current = parseFloat(display.textContent) || 0;
    
    if (op === 'MC') memory = 0;
    else if (op === 'MR') displayValue = memory.toString();
    else if (op === 'M+') memory += current;
    else if (op === 'M-') memory -= current;
    
    document.getElementById('memory-value').textContent = memory;
    if (op === 'MR') display.textContent = displayValue;
}

// SCIENTIFIC FUNCTIONS
function handleScientificInput(cmd) {
    const display = document.getElementById('main-display');
    let num = parseFloat(display.textContent);
    let result;
    
    switch (cmd) {
        case 'sin': result = isDeg ? Math.sin(num * Math.PI / 180) : Math.sin(num); break;
        case 'cos': result = isDeg ? Math.cos(num * Math.PI / 180) : Math.cos(num); break;
        case 'tan': result = isDeg ? Math.tan(num * Math.PI / 180) : Math.tan(num); break;
        case 'asin': result = isDeg ? Math.asin(num) * 180 / Math.PI : Math.asin(num); break;
        case 'acos': result = isDeg ? Math.acos(num) * 180 / Math.PI : Math.acos(num); break;
        case 'atan': result = isDeg ? Math.atan(num) * 180 / Math.PI : Math.atan(num); break;
        case 'log': result = Math.log10(num); break;
        case 'ln': result = Math.log(num); break;
        case 'log2': result = Math.log2(num); break;
        case 'sqrt': result = Math.sqrt(num); break;
        case 'pow': {
            const exp = prompt('Masukkan pangkat:');
            if (exp !== null) result = Math.pow(num, parseFloat(exp));
            break;
        }
        case 'pi': result = Math.PI; break;
        case 'e': result = Math.E; break;
        case 'fact': {
            result = 1;
            for (let i = 2; i <= num; i++) result *= i;
            break;
        }
        case 'x2': result = num * num; break;
        case 'x3': result = num * num * num; break;
        case 'deg': isDeg = true; return;
        case 'rad': isDeg = false; return;
    }
    
    if (result !== undefined) {
        display.textContent = Number(result.toFixed(8)).toString();
        addToHistory('scientific', cmd + '(' + num + ')', display.textContent);
    }
}

function toggleDegRad() {
    isDeg = !isDeg;
    // Visual feedback sudah di-handle oleh checkbox
}

// FINANCIAL CALCULATIONS
function calculateLoan() {
    const P = parseFloat(document.getElementById('loan-principal').value);
    const annualRate = parseFloat(document.getElementById('loan-rate').value) / 100;
    const n = parseFloat(document.getElementById('loan-tenor').value);
    
    const r = annualRate / 12;
    const M = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    
    const resultDiv = document.getElementById('loan-result');
    resultDiv.innerHTML = `
        <div class="text-4xl font-semibold text-emerald-600">Rp ${M.toLocaleString('id-ID', {minimumFractionDigits: 0})}</div>
        <div class="text-sm text-[#555] mt-1">Angsuran per bulan</div>
        <div class="mt-6 grid grid-cols-3 gap-4 text-xs">
            <div>Total bunga: <span class="font-medium">Rp ${(M * n - P).toLocaleString('id-ID')}</span></div>
            <div>Total bayar: <span class="font-medium">Rp ${(M * n).toLocaleString('id-ID')}</span></div>
            <div>Tenor: <span class="font-medium">${n} bulan</span></div>
        </div>
    `;
    resultDiv.classList.remove('hidden');
    addToHistory('financial', `KPR Rp\( {P.toLocaleString()} @ \){annualRate*100}% × \( {n} bln`, `Rp \){M.toLocaleString()}`);
}

function calculateCompound() {
    const pv = parseFloat(document.getElementById('pv').value);
    const rate = parseFloat(document.getElementById('rate').value) / 100;
    const years = parseFloat(document.getElementById('years').value);
    
    const fv = pv * Math.pow(1 + rate, years);
    const resultDiv = document.getElementById('compound-result');
    resultDiv.innerHTML = `
        <div class="text-4xl font-semibold">Rp ${fv.toLocaleString('id-ID')}</div>
        <div class="text-sm text-[#555]">Nilai masa depan setelah ${years} tahun</div>
    `;
    resultDiv.classList.remove('hidden');
    addToHistory('financial', `Investasi Rp\( {pv.toLocaleString()} @ \){rate*100}% × \( {years} thn`, `Rp \){fv.toLocaleString()}`);
}

// HEALTH
function calculateBMI() {
    const weight = parseFloat(document.getElementById('weight').value);
    const heightCm = parseFloat(document.getElementById('height').value);
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    
    let category = '';
    if (bmi < 18.5) category = 'Kurus';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Gemuk';
    else category = 'Obesitas';
    
    const div = document.getElementById('bmi-result');
    div.innerHTML = `
        <div class="text-6xl font-semibold text-center">${bmi.toFixed(1)}</div>
        <div class="text-center mt-3 text-xl font-medium">${category}</div>
        <div class="text-xs text-center mt-6 text-[#555]">BMI = Berat / (Tinggi²)</div>
    `;
    div.classList.remove('hidden');
    addToHistory('health', `BMI ${weight}kg / ${heightCm}cm`, bmi.toFixed(1));
}

function calculateBMR() {
    const gender = document.getElementById('gender').value;
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height-bmr').value);
    const weight = parseFloat(document.getElementById('weight-bmr').value);
    
    let bmr;
    if (gender === 'male') {
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    const div = document.getElementById('bmr-result');
    div.innerHTML = `
        <div class="text-center">
            <div class="text-5xl font-semibold">${Math.round(bmr)}</div>
            <div class="text-sm text-[#555] mt-2">kalori/hari (BMR)</div>
            <div class="text-xs mt-8">Rumus Mifflin-St Jeor</div>
        </div>
    `;
    div.classList.remove('hidden');
    addToHistory('health', `BMR ${gender} ${age}thn ${weight}kg ${height}cm`, Math.round(bmr) + ' kcal');
}

// UNIT CONVERSION
const conversionData = {
    length: { units: ['mm', 'cm', 'm', 'km', 'inch', 'feet', 'yard', 'mile'], factor: { mm: 1, cm: 10, m: 1000, km: 1e6, inch: 25.4, feet: 304.8, yard: 914.4, mile: 1609344 } },
    weight: { units: ['mg', 'g', 'kg', 'ton', 'ounce', 'pound'], factor: { mg: 1, g: 1000, kg: 1e6, ton: 1e9, ounce: 28349.5, pound: 453592 } },
    temperature: { units: ['Celsius', 'Fahrenheit', 'Kelvin'], special: true },
    area: { units: ['cm²', 'm²', 'km²', 'hectare', 'acre'], factor: { 'cm²': 1, 'm²': 10000, 'km²': 1e10, hectare: 1e8, acre: 4046856.42 } },
    speed: { units: ['m/s', 'km/h', 'mph', 'knot'], factor: { 'm/s': 1, 'km/h': 1/3.6, mph: 0.44704, knot: 0.514444 } }
};

function initConversion() {
    const catContainer = document.getElementById('conv-category');
    catContainer.innerHTML = Object.keys(conversionData).map(key => 
        `<button onclick="setConversionCategory('${key}')" class="px-6 py-2 rounded-3xl border \( {key === 'length' ? 'bg-[#111111] text-white' : 'border-[#E5E5E5]'}"> \){key}</button>`
    ).join('');
    setConversionCategory('length');
}

function setConversionCategory(cat) {
    document.getElementById('conv-category').querySelectorAll('button').forEach(b => b.classList.remove('bg-[#111111]', 'text-white'));
    Array.from(document.getElementById('conv-category').children).find(b => b.textContent === cat).classList.add('bg-[#111111]', 'text-white');
    
    const data = conversionData[cat];
    const fromSelect = document.getElementById('conv-from-unit');
    const toSelect = document.getElementById('conv-to-unit');
    
    fromSelect.innerHTML = data.units.map(u => `<option value="\( {u}"> \){u}</option>`).join('');
    toSelect.innerHTML = data.units.map(u => `<option value="\( {u}"> \){u}</option>`).join('');
    
    // Default different unit
    if (toSelect.options.length > 1) toSelect.selectedIndex = 1;
    
    convertUnit();
}

function convertUnit() {
    const input = parseFloat(document.getElementById('conv-input').value);
    if (isNaN(input)) return;
    
    const from = document.getElementById('conv-from-unit').value;
    const to = document.getElementById('conv-to-unit').value;
    const cat = Array.from(document.getElementById('conv-category').children).find(b => b.classList.contains('bg-[#111111]')).textContent;
    
    const data = conversionData[cat];
    let result;
    
    if (data.special && cat === 'temperature') {
        if (from === 'Celsius' && to === 'Fahrenheit') result = input * 9/5 + 32;
        else if (from === 'Fahrenheit' && to === 'Celsius') result = (input - 32) * 5/9;
        else if (from === 'Celsius' && to === 'Kelvin') result = input + 273.15;
        else if (from === 'Kelvin' && to === 'Celsius') result = input - 273.15;
        else result = input; // same unit
    } else {
        // Normal conversion
        const inBase = input * data.factor[from];
        result = inBase / data.factor[to];
    }
    
    document.getElementById('conv-result').textContent = Number(result.toFixed(6));
}

// TAX INDONESIA
function calculatePPh21() {
    const bruto = parseFloat(document.getElementById('gaji-bruto').value) * 12;
    const status = document.querySelector('input[name="status"]:checked').value;
    
    // PTKP 2025 approximation
    let ptkp = 54000000; // TK/0
    if (status === 'married') ptkp = 58500000;
    if (status === 'married1') ptkp = 63000000;
    
    const pkp = Math.max(0, bruto - ptkp);
    
    let pajak = 0;
    if (pkp > 0) {
        if (pkp <= 60000000) pajak = pkp * 0.05;
        else if (pkp <= 250000000) pajak = 3000000 + (pkp - 60000000) * 0.15;
        else if (pkp <= 500000000) pajak = 3000000 + 28500000 + (pkp - 250000000) * 0.25;
        else pajak = 3000000 + 28500000 + 62500000 + (pkp - 500000000) * 0.30;
    }
    
    const monthlyTax = pajak / 12;
    
    const div = document.getElementById('pph-result');
    div.innerHTML = `
        <div class="text-4xl font-semibold">Rp ${monthlyTax.toLocaleString('id-ID')}</div>
        <div class="text-xs text-[#555]">PPh 21 bulanan</div>
        <div class="mt-4 text-[10px] leading-tight">PKP tahunan: Rp\( {pkp.toLocaleString('id-ID')}<br>PTKP: Rp \){ptkp.toLocaleString('id-ID')}</div>
    `;
    div.classList.remove('hidden');
    addToHistory('tax', `PPh 21 Rp\( {(bruto/12).toLocaleString()}`, `Rp \){monthlyTax.toLocaleString()}`);
}

function calculatePPN() {
    const harga = parseFloat(document.getElementById('harga-before').value);
    const ppn = harga * 0.11;
    const total = harga + ppn;
    
    const div = document.getElementById('ppn-result');
    div.innerHTML = `
        <div>PPN 11% = Rp ${ppn.toLocaleString('id-ID')}</div>
        <div class="text-4xl font-semibold mt-3">Total = Rp ${total.toLocaleString('id-ID')}</div>
    `;
    div.classList.remove('hidden');
    addToHistory('tax', `Harga Rp\( {harga.toLocaleString()} + PPN`, `Rp \){total.toLocaleString()}`);
}

// ENGINEERING
function calculateOhm() {
    const v = parseFloat(document.getElementById('ohm-v').value);
    const i = parseFloat(document.getElementById('ohm-i').value);
    const r = parseFloat(document.getElementById('ohm-r').value);
    
    let resultHTML = '';
    if (!isNaN(v) && !isNaN(i)) resultHTML += `<div>V = I × R → R = ${(v/i).toFixed(2)} Ω</div>`;
    if (!isNaN(v) && !isNaN(r)) resultHTML += `<div>P = V × I → P = ${(v * (v/r)).toFixed(2)} Watt</div>`;
    if (!isNaN(i) && !isNaN(r)) resultHTML += `<div>P = I² × R → P = ${(i * i * r).toFixed(2)} Watt</div>`;
    
    document.getElementById('ohm-result').innerHTML = resultHTML || 'Masukkan minimal 2 nilai';
    document.getElementById('ohm-result').classList.remove('hidden');
}

function initGeometryInputs() {
    // Dynamic inputs will be handled on selection change
    const select = document.getElementById('geo-type');
    select.onchange = initGeometryInputs;
    initGeometryInputs(); // initial
}

function initGeometryInputs() {
    const type = document.getElementById('geo-type').value;
    const container = document.getElementById('geo-inputs');
    let html = '';
    
    if (type === 'circle') {
        html = `<input id="geo-radius" placeholder="Jari-jari (cm)" class="w-full h-12 px-5 rounded-3xl border border-[#E5E5E5]">`;
    } else if (type === 'triangle') {
        html = `<div class="grid grid-cols-3 gap-3"><input id="geo-a" placeholder="sisi a" class="h-12 px-5 rounded-3xl border"><input id="geo-b" placeholder="sisi b" class="h-12 px-5 rounded-3xl border"><input id="geo-c" placeholder="sisi c" class="h-12 px-5 rounded-3xl border"></div>`;
    } else if (type === 'cube') {
        html = `<input id="geo-side" placeholder="Panjang sisi (cm)" class="w-full h-12 px-5 rounded-3xl border border-[#E5E5E5]">`;
    } else if (type === 'speed') {
        html = `<div class="grid grid-cols-3 gap-3"><input id="geo-s" placeholder="Jarak" class="h-12 px-5 rounded-3xl border"><input id="geo-v" placeholder="Kecepatan" class="h-12 px-5 rounded-3xl border"><input id="geo-t" placeholder="Waktu" class="h-12 px-5 rounded-3xl border"></div>`;
    }
    container.innerHTML = html;
}

function calculateGeometry() {
    const type = document.getElementById('geo-type').value;
    const resultDiv = document.getElementById('geo-result');
    
    if (type === 'circle') {
        const r = parseFloat(document.getElementById('geo-radius').value);
        const area = Math.PI * r * r;
        const keliling = 2 * Math.PI * r;
        resultDiv.innerHTML = `Luas: ${area.toFixed(2)} cm²<br>Keliling: ${keliling.toFixed(2)} cm`;
    } else if (type === 'triangle') {
        const a = parseFloat(document.getElementById('geo-a').value);
        const b = parseFloat(document.getElementById('geo-b').value);
        const c = parseFloat(document.getElementById('geo-c').value);
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        resultDiv.innerHTML = `Luas: ${area.toFixed(2)} cm²`;
    } else if (type === 'cube') {
        const side = parseFloat(document.getElementById('geo-side').value);
        resultDiv.innerHTML = `Volume: ${(side * side * side).toFixed(2)} cm³`;
    } else if (type === 'speed') {
        const s = parseFloat(document.getElementById('geo-s').value);
        const v = parseFloat(document.getElementById('geo-v').value);
        const t = parseFloat(document.getElementById('geo-t').value);
        let txt = '';
        if (s && v) txt += `Waktu = ${s/v} detik<br>`;
        if (s && t) txt += `Kecepatan = ${s/t} m/s<br>`;
        if (v && t) txt += `Jarak = ${v*t} meter`;
        resultDiv.innerHTML = txt || 'Masukkan 2 nilai';
    }
    resultDiv.classList.remove('hidden');
}

// KEYBOARD SUPPORT
function toggleKeyboard() {
    // Already active by default
}

function handleKeyboard(e) {
    if (!['standard', 'scientific'].includes(currentMode)) return;
    
    const display = document.getElementById('main-display');
    
    if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        if (currentMode === 'standard') calculateStandard();
        return;
    }
    
    if (e.key === 'Backspace') {
        handleStandardInput('C');
        return;
    }
    
    if ('0123456789.+-*/%'.includes(e.key)) {
        let mapped = e.key;
        if (e.key === '*') mapped = '×';
        if (e.key === '/') mapped = '÷';
        if (e.key === '-') mapped = '−';
        handleStandardInput(mapped);
    }
    
    // Scientific shortcuts
    if (currentMode === 'scientific') {
        const map = { 's': 'sin', 'c': 'cos', 't': 'tan', 'l': 'log' };
        if (map[e.key]) handleScientificInput(map[e.key]);
    }
}

// BOOTSTRAP
document.addEventListener('DOMContentLoaded', () => {
    initTailwind();
    
    // Initial mode
    switchMode('standard');
    
    // Keyboard global
    document.addEventListener('keydown', handleKeyboard);
    
    console.log('%c🚀 Raven Kalkulator siap digunakan!', 'color:#111111; font-family:monospace; font-size:10px');
});
