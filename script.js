// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
// PASTE YOUR SUPABASE CREDENTIALS HERE:
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";
const DUITJOM_AUTH_REDIRECT_URL = window.location.origin + window.location.pathname;

// Initialize Supabase Client
const supabaseClient = window.supabase
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

if (!supabaseClient) {
  console.warn('Supabase client not initialized. Check your credentials in script.js');
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
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        menu.classList.remove('translate-x-full');
    }, 10);
}

function closeSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const menu = document.getElementById('sidebarMenu');
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
   FEATURE CARD ICON SIZING
========================================================= */
.live-icon svg {
    width: 32px !important;
    height: 32px !important;
    stroke-width: 1.5 !important;
}

/* =========================================================
   TIMER FUNCTIONALITY
========================================================= */
function startTimer(durationInSeconds) {
    let remainingSeconds = durationInSeconds;
    const timerDisplay = document.getElementById("timerDisplay");
    const qrPage = document.getElementById("qrPage");

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
            if (qrPage) qrPage.classList.add("hidden");
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

    const djCustomerID = document.getElementById("djcustInput")?.value.toUpperCase() || "";
    const amountInput = document.getElementById("amountInput")?.value || "";
    const amount = parseFloat(amountInput);
    namaPelangganGlobal = document.getElementById("namaInput")?.value || "Pelanggan";

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
        QRCode.toCanvas(
            qrCodeElement,
            qrData,
            {
                errorCorrectionLevel: "H",
                type: "image/png",
                width: 200,
                margin: 2,
                color: { dark: "#000", light: "#FFF" }
            },
            function (error) {
                if (error) {
                    console.error(error);
                    alert("Gagal menjana kod QR.");
                    qrGenerated = false;
                    return;
                }
                console.log("QR Code generated successfully");

                document.getElementById("formPage")?.classList.add("hidden");
                document.getElementById("qrPage")?.classList.remove("hidden");
                startTimer(600);
            }
        );
    } catch (err) {
        console.error("QR Code generation error:", err);
        alert("Ralat semasa menjana kod QR.");
        qrGenerated = false;
    }
}

function backToForm() {
    qrGenerated = false;
    if (timerInstance) clearInterval(timerInstance);

    document.getElementById("qrPage")?.classList.add("hidden");
    document.getElementById("formPage")?.classList.remove("hidden");
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

    document.getElementById('qrPage')?.classList.add('hidden');
    const thanksPage = document.getElementById('thanksPage');
    thanksPage?.classList.remove('hidden');
    thanksPage?.classList.add('flex');
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

// Features belong to the sign-in view only; auth-ui calls this after confirming no active session.
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
});

/* =========================================================
   VALIDATE DJCUST INPUT
========================================================= */
function validateDJCust(input) {
    const errorElement = document.getElementById('djcustError');
    const value = input.value.toUpperCase();
    input.value = value;
    
    if (value.length > 0 && !/^(DJ|CUST)/.test(value)) {
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
    } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
    }
}
