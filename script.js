// Navigasi Mode
const navLinks = document.querySelectorAll('.nav-links li');
const panels = document.querySelectorAll('.calculator-panel');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active-panel'));
        
        link.classList.add('active');
        const target = link.getAttribute('data-target');
        document.getElementById(target).classList.add('active-panel');
    });
});

// --- STATE MODE STANDAR ---
let currentInput = '0';
let currentExpression = '';
let memory = 0;
let historyLog = [];
let shouldResetScreen = false;

const resultDisplay = document.getElementById('result');
const expressionDisplay = document.getElementById('expression');
const historyDisplay = document.getElementById('history-log');

// Update UI
function updateDisplay() {
    resultDisplay.innerText = currentInput;
    expressionDisplay.innerText = currentExpression;
}

// Fungsi Trigger Animasi
function triggerFlipAnimation() {
    resultDisplay.classList.remove('animate-flip');
    void resultDisplay.offsetWidth; // trigger reflow
    resultDisplay.classList.add('animate-flip');
}

function appendNumber(num) {
    if (currentInput === '0' || shouldResetScreen) {
        currentInput = num;
        shouldResetScreen = false;
    } else {
        currentInput += num;
    }
    updateDisplay();
}

function appendOperator(op) {
    if (shouldResetScreen) shouldResetScreen = false;
    currentExpression = `${currentInput} ${op} `;
    currentInput = '0';
    updateDisplay();
}

function clearAll() {
    currentInput = '0';
    currentExpression = '';
    updateDisplay();
}

function deleteChar() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function calculateResult() {
    if (!currentExpression || shouldResetScreen) return;
    
    let expressionToEvaluate = currentExpression + currentInput;
    // Mengganti simbol display dengan simbol math JS
    expressionToEvaluate = expressionToEvaluate.replace(/×/g, '*').replace(/÷/g, '/');

    try {
        // Catatan Evaluasi: Penggunaan Function untuk string eval yang relatif lebih aman.
        let result = new Function('return ' + expressionToEvaluate)();
        
        // Handle float precision issue in JS (misal 0.1 + 0.2)
        result = Math.round(result * 1000000000) / 1000000000;
        
        historyDisplay.innerText = expressionToEvaluate;
        currentInput = result.toString();
        currentExpression = '';
        shouldResetScreen = true;
        triggerFlipAnimation();
        updateDisplay();
    } catch (error) {
        currentInput = 'Error';
        updateDisplay();
        shouldResetScreen = true;
    }
}

// Memory Functions
function memoryAction(action) {
    if (action === 'MC') memory = 0;
    if (action === 'MR') { currentInput = memory.toString(); shouldResetScreen = true; }
    if (action === 'M+') memory += parseFloat(currentInput);
    if (action === 'M-') memory -= parseFloat(currentInput);
    updateDisplay();
}

// Export to TXT (PDF membutuhkan library tambahan seperti jsPDF)
document.getElementById('export-btn').addEventListener('click', () => {
    const textToSave = `Riwayat: ${historyDisplay.innerText}\nHasil: ${currentInput}`;
    const blob = new Blob([textToSave], { type: "text/plain" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "raven_calc_result.txt";
    a.click();
});

// Keyboard Support
window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9' || e.key === '.') appendNumber(e.key);
    if (e.key === '+' || e.key === '-') appendOperator(e.key);
    if (e.key === '*') appendOperator('×');
    if (e.key === '/') appendOperator('÷');
    if (e.key === 'Enter' || e.key === '=') calculateResult();
    if (e.key === 'Backspace') deleteChar();
    if (e.key === 'Escape') clearAll();
});

// --- MODE KESEHATAN (BMI) ---
function calculateBMI() {
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const height = parseFloat(document.getElementById('bmi-height').value) / 100; // ubah ke meter
    const card = document.getElementById('bmi-result-card');
    const scoreText = document.getElementById('bmi-score');
    const categoryText = document.getElementById('bmi-category');

    if (!weight || !height) {
        alert("Masukkan berat dan tinggi dengan benar!");
        return;
    }

    const bmi = weight / (height * height);
    scoreText.innerText = bmi.toFixed(1);

    if (bmi < 18.5) { categoryText.innerText = "Kurus (Underweight)"; }
    else if (bmi < 25) { categoryText.innerText = "Normal (Ideal)"; }
    else if (bmi < 30) { categoryText.innerText = "Gemuk (Overweight)"; }
    else { categoryText.innerText = "Obesitas"; }

    card.style.display = 'block';
    card.classList.add('animate-flip');
}
