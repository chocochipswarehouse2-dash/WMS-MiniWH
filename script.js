const form = document.getElementById('overtime-form');
const jamMulai = document.getElementById('jamMulai');
const jamSelesai = document.getElementById('jamSelesai');
const totalJam = document.getElementById('totalJam');
const responseMessage = document.getElementById('response-message');

const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbziFOC_LS6O4jc7-3RcMmkoD5ncs6-FrEIn30nuwJd-HMCkYN1lRpE_ON_yBUgk5QHq/exec';

function calculateTotalHours(startTime, endTime) {
  if (!startTime || !endTime) return '';

  const start = new Date(`2024-01-01T${startTime}:00`);
  const end = new Date(`2024-01-01T${endTime}:00`);

  if (end <= start) {
    return 'Jam selesai harus lebih besar dari jam mulai';
  }

  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  return `${diffHours.toFixed(2)} jam`;
}

function updateTotalJam() {
  const value = calculateTotalHours(jamMulai.value, jamSelesai.value);
  totalJam.value = value;
}

jamMulai.addEventListener('input', updateTotalJam);
jamSelesai.addEventListener('input', updateTotalJam);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const total = calculateTotalHours(payload.jamMulai, payload.jamSelesai);
  if (typeof total === 'string' && total.includes('harus lebih besar')) {
    showMessage(total, 'error');
    return;
  }

  payload.totalJam = total;

  if (!GOOGLE_SHEET_WEB_APP_URL || GOOGLE_SHEET_WEB_APP_URL.includes('PASTE_')) {
    showMessage('Masukkan URL web app Google Apps Script di script.js agar data bisa masuk ke spreadsheet.', 'error');
    return;
  }

  try {
    showMessage('Mengirim data ke spreadsheet...', '');

    const body = new URLSearchParams(payload).toString();

    const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.text();
    showMessage(`Data berhasil dikirim ke spreadsheet. ${result || ''}`.trim(), 'success');
    form.reset();
    totalJam.value = '';
  } catch (error) {
    console.error(error);
    showMessage('Gagal mengirim data. Periksa URL Apps Script, izin akses “Anyone”, dan koneksi internet.', 'error');
  }
});

function showMessage(message, type) {
  responseMessage.textContent = message;
  responseMessage.className = 'response-message';

  if (type) {
    responseMessage.classList.add(type);
  }
}
