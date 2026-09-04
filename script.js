// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
// Masukkan URL projek dan publishable/anon key apabila sedia.
// Jangan gunakan service_role key dalam kod frontend.
const SUPABASE_URL = "";
const SUPABASE_PUBLISHABLE_KEY = "";
const DUITJOM_AUTH_REDIRECT_URL = window.location.origin + window.location.pathname;

// Initialize Supabase Client
const isSupabaseConfigured = Boolean(
  SUPABASE_URL.trim() && SUPABASE_PUBLISHABLE_KEY.trim() && window.supabase
);
const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Namespaced for safe browser use
window.duitjomSupabaseClient = supabaseClient;
window.DUITJOM_AUTH_REDIRECT_URL = DUITJOM_AUTH_REDIRECT_URL;
window.showAuthConfigurationMessage = function showAuthConfigurationMessage() {
  const message = 'Log masuk belum dikonfigurasi. Masukkan SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY di script.js.';
  if (window.setLoginMessage) window.setLoginMessage(message, 'error');
  else alert(message);
};

if (!supabaseClient) {
  console.info('Supabase Auth menunggu URL projek dan publishable key dalam script.js.');
}

// =====================================================
// CODE ASAL AWAK — KEKALKAN
// =====================================================
let timerInstance = null;
let namaPelangganGlobal = "";

// ---- KAWALAN SIDEBAR ----
function openSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const menu = document.getElementById('sidebarMenu');
    if (!overlay || !menu) return;

    document.body.style.overflowY = 'hidden';
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        menu.classList.remove('translate-x-full');
    }, 10);
}

function closeSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const menu = document.getElementById('sidebarMenu');
    if (!overlay || !menu) return;

    document.body.style.overflowY = '';
    overlay.classList.add('opacity-0');
    menu.classList.add('translate-x-full');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

/* =========================================================
   DUITJOM NEWS AUTOMATIC SLIDER
   AUTO SLIDE: 2.6 SECONDS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const newsTrack = document.getElementById("newsTrack");
    const newsItems = document.querySelectorAll(".news-item");
    const newsDots = document.querySelectorAll(".news-dot");

    if (!newsTrack || newsItems.length === 0) {
        return;
    }

    let currentNewsSlide = 0;
    let newsAutoTimer = null;
    const NEWS_INTERVAL = 2600;

    function updateNewsSlider(index) {

        currentNewsSlide = index;

        newsTrack.style.transform =
            `translateX(-${currentNewsSlide * 100}%)`;

        newsDots.forEach((dot, i) => {
            if (i === currentNewsSlide) {
                dot.classList.add("bg-blue-500");
                dot.classList.remove("bg-slate-300");
            } else {
                dot.classList.add("bg-slate-300");
                dot.classList.remove("bg-blue-500");
            }
        });
    }

    function startNewsAutoSlide() {
        newsAutoTimer = setInterval(() => {
            currentNewsSlide = (currentNewsSlide + 1) % newsItems.length;
            updateNewsSlider(currentNewsSlide);
        }, NEWS_INTERVAL);
    }

    function resetNewsAutoSlide() {
        clearInterval(newsAutoTimer);
        startNewsAutoSlide();
    }

    // Dot click handler
    newsDots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            updateNewsSlider(index);
            resetNewsAutoSlide();
        });
    });

    // Initialize
    updateNewsSlider(0);
    startNewsAutoSlide();
});

/* =========================================================
   TIMER FUNCTIONALITY
========================================================= */
function startTimer(durationInSeconds) {
    let remainingSeconds = durationInSeconds;
    const timerDisplay = document.getElementById("timerDisplay");

    if (timerInstance) clearInterval(timerInstance);

    function updateDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const timeString =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        if (timerDisplay) {
            timerDisplay.textContent = timeString;
        }

        if (remainingSeconds <= 0) {
            clearInterval(timerInstance);
            backToForm();
            return;
        }
        remainingSeconds--;
    }

    updateDisplay();
    timerInstance = setInterval(updateDisplay, 1000);
}

/* =========================================================
   QR GENERATION & PAGE HANDLING
========================================================= */
let qrGenerated = false;

function generateQR() {
    if (qrGenerated) return;
    qrGenerated = true;

    const djcustEl = document.getElementById("djcustInput");
    const djCustomerID = djcustEl ? djcustEl.value.toUpperCase() : "";
    const amountEl = document.getElementById("amountInput");
    const amountInput = amountEl ? amountEl.value : "";
    const amount = parseFloat(amountInput);
    const namaEl = document.getElementById("namaInput");
    namaPelangganGlobal = namaEl ? namaEl.value : "Pelanggan";

    if (!djCustomerID || !amount || amount <= 0) {
        alert("Sila isi semua medan dengan betul.");
        qrGenerated = false;
        return;
    }

    const qrData = `DJ:${djCustomerID}|${amount}|${Date.now()}`;
    const qrCodeElement = document.getElementById("qrCode");

    if (!qrCodeElement) {
        console.error("QR code element not found");
        return;
    }

    try {
        qrCodeElement.innerHTML = "";
        if (typeof QRCode !== "function") throw new Error("Pustaka QRCode tidak tersedia");

        new QRCode(qrCodeElement, {
            text: qrData,
            width: 200,
            height: 200,
            correctLevel: QRCode.CorrectLevel.H
        });

        var paymentPage = document.getElementById("paymentPage");
        if (paymentPage) paymentPage.classList.add("hidden");
        var qrPage = document.getElementById("qrPage");
        if (qrPage) qrPage.classList.remove("hidden");
        startTimer(600);
    } catch (err) {
        console.error("QR Code generation error:", err);
        alert("Ralat semasa menjana kod QR.");
        qrGenerated = false;
    }
}

function backToForm() {
    qrGenerated = false;
    if (timerInstance) clearInterval(timerInstance);

    var qrPageBack = document.getElementById("qrPage");
    if (qrPageBack) { qrPageBack.classList.add("hidden"); }
    var paymentPageBack = document.getElementById("paymentPage");
    if (paymentPageBack) { paymentPageBack.classList.remove("hidden"); }
}

/* =========================================================
   FILE UPLOAD HANDLING
========================================================= */
function handleFileSelected() {
    const fileInput = document.getElementById("receiptFile");
    const placeholder = document.getElementById("uploadPlaceholder");
    const successDiv = document.getElementById("uploadSuccess");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const btnSubmitForm = document.getElementById("btnSubmitForm");

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        placeholder.classList.add('hidden');
        successDiv.classList.remove('hidden');
        fileNameDisplay.innerText = "Fail dipilih: " + file.name;
        
        btnSubmitForm.disabled = false;
        btnSubmitForm.className = "flex-1 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-3.5 rounded-xl text-xs text-center shadow-md cursor-pointer transition duration-200 hover:from-blue-500 hover:to-blue-700";
    }
}

function finalSubmission() {
    clearInterval(timerInstance);
    
    const susunanAyat = "Terima kasih <span class='font-extrabold text-slate-900'>" + namaPelangganGlobal + "</span> kerana telah berjaya membuat bayaran balik pinjaman anda di <span class='text-blue-400 font-bold'>DuitJom</span>. Pembayaran anda sedang diproses dan akan disemak dalam masa <span class='font-bold'>24 jam</span>. Anda akan menerima notifikasi melalui SMS atau email apabila pembayaran telah disahkan.";
    document.getElementById('thanksMessage').innerHTML = susunanAyat;

    var qrPageFinal = document.getElementById('qrPage');
    if (qrPageFinal) { qrPageFinal.classList.add('hidden'); }
    var thanksPage = document.getElementById('thanksPage');
    if (thanksPage) {
        thanksPage.classList.remove('hidden');
        thanksPage.classList.add('flex');
    }
    window.scrollTo({top: 0, behavior: 'smooth'});
}

/* =========================================================
   COMPONENT LOADING
========================================================= */
function loadComponent(containerId, filePath) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.resolve(false);

  return fetch(filePath, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error('Gagal memuatkan fail: ' + filePath);
      return response.text();
    })
    .then(data => {
      container.innerHTML = data;
      document.dispatchEvent(new CustomEvent("duitjom:component-loaded", { detail: { containerId } }));
      return true;
    })
    .catch(error => {
      console.error('Ralat Component:', error);
      if (containerId === "features-container") {
        container.innerHTML = '<p class="features-load-error">Bahagian ciri-ciri tidak dapat dimuatkan. Sila muat semula halaman.</p>';
      }
      return false;
    });
}

// features.html ialah partial homepage sahaja.
let loginFeaturesLoaded = false;
window.loadLoginFeatures = function loadLoginFeatures() {
  if (loginFeaturesLoaded) return;
  loginFeaturesLoaded = true;
  loadComponent('features-container', 'features.html');
};

// JALANKAN PEMUATAN KOMPONEN BERSAMA APABILA WEB DIBUKA
document.addEventListener("DOMContentLoaded", function() {
  loadComponent('sidebar-container', 'components/sidebar.html');
  loadComponent('auth-login-container', 'components/auth-login.html');
  loadComponent('tutorial-modal-container', 'components/tutorial-modal.html');
  loadComponent('scammer-modal-container', 'components/scammer-modal.html');
  if (document.body.dataset.page === 'home') window.loadLoginFeatures();
});

/* =========================================================
   VALIDATE DJCUST INPUT
========================================================= */
function validateDJCust(input) {
    const errorElement = document.getElementById('djcustError');
    const value = input.value.toUpperCase();
    input.value = value;
    
    const isValid = /^(?:DJ|CUST)[0-9/]+$/.test(value);

    if (value.length > 0 && !isValid) {
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
    } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
    }
}

/* =========================================================
   SIDEBAR & MODAL ACTIONS
========================================================= */
function sidebarHomeAction() {
    closeSidebar();
}

function aboutUsAction() {
    closeSidebar();
}

function blogAction() {
    closeSidebar();
}

function applyNowAction() {
    window.open('https://www.duitjom.com/', '_blank', 'noopener,noreferrer');
}

function packageAction() {
    closeSidebar();
    window.open('https://www.duitjom.com/', '_blank', 'noopener,noreferrer');
}

function closeTutorialModal() {
    document.getElementById('tutorialModal')?.classList.add('hidden');
    document.getElementById('scammerModal')?.classList.remove('hidden');
}

function closeScammerModal() {
    document.getElementById('scammerModal')?.classList.add('hidden');
}

function openEmailPopup() {
    const overlay = document.getElementById('emailPopupOverlay');
    const popup = document.getElementById('emailPopup');
    const popupBox = document.getElementById('emailPopupBox');
    if (!overlay || !popup || !popupBox) return;

    overlay.classList.remove('hidden');
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    requestAnimationFrame(() => {
        overlay.classList.replace('opacity-0', 'opacity-100');
        popupBox.classList.remove('scale-95', 'opacity-0');
        popupBox.classList.add('scale-100', 'opacity-100');
    });
}

function closeEmailPopup() {
    const overlay = document.getElementById('emailPopupOverlay');
    const popup = document.getElementById('emailPopup');
    const popupBox = document.getElementById('emailPopupBox');
    if (!overlay || !popup || !popupBox) return;

    overlay.classList.replace('opacity-100', 'opacity-0');
    popupBox.classList.remove('scale-100', 'opacity-100');
    popupBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        overlay.classList.add('hidden');
        popup.classList.add('hidden');
        popup.classList.remove('flex');
    }, 300);
}

async function copyDuitjomEmail() {
    const email = document.getElementById('duitjomEmail')?.textContent.trim();
    if (!email) return;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(email);
        } else {
            const input = document.createElement('textarea');
            input.value = email;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }

        document.getElementById('copyIcon')?.classList.add('hidden');
        document.getElementById('copiedIcon')?.classList.remove('hidden');
        document.getElementById('copiedStatus')?.classList.remove('hidden');
    } catch (error) {
        console.error('Copy email gagal:', error);
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeEmailPopup();
        closeSidebar();
    }
});
