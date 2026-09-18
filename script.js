// =====================================================
// GLOBAL STATE
// =====================================================
let timerInstance = null;
let namaPelangganGlobal = "";
let djCustomerIdGlobal = "";
let amountGlobal = 0;

function t(key, vars) {
  return window.DJ_I18N ? window.DJ_I18N.t(key, vars) : key;
}

// ---- KAWALAN SIDEBAR ----
function openSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const menu = document.getElementById('sidebarMenu');
    const toggle = document.getElementById('sidebarToggleButton');
    if (!overlay || !menu) {
        window.sidebarOpenPending = true;
        return;
    }

    if (!overlay.classList.contains('hidden') && !menu.classList.contains('translate-x-full')) {
        closeSidebar();
        return;
    }

    window.sidebarOpenPending = false;
    document.body.style.overflowY = 'hidden';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        menu.classList.remove('translate-x-full');
        menu.querySelector('button, a')?.focus();
    });
}

function closeSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const menu = document.getElementById('sidebarMenu');
    const toggle = document.getElementById('sidebarToggleButton');
    if (!overlay || !menu) return;

    document.body.style.overflowY = '';
    overlay.classList.add('opacity-0');
    overlay.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
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

        newsTrack.style.transform = `translateX(-${currentNewsSlide * 100}%)`;

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
        const timeString = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

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
    namaPelangganGlobal = namaEl ? namaEl.value : "Customer";
    djCustomerIdGlobal = djCustomerID;
    amountGlobal = amount;

    if (!djCustomerID || !amount || amount <= 0) {
        alert(t("home.alertFillAll"));
        qrGenerated = false;
        return;
    }

    const qrData = `DJ:${djCustomerID}|${amount}|${Date.now()}`;
    const qrCodeElement = document.getElementById("qrCode");

    if (!qrCodeElement) {
        console.error("QR code element not found");
        qrGenerated = false;
        return;
    }

    try {
        qrCodeElement.innerHTML = "";
        if (typeof QRCode !== "function") throw new Error("QRCode library unavailable");

        new QRCode(qrCodeElement, {
            text: qrData,
            width: 200,
            height: 200,
            correctLevel: QRCode.CorrectLevel.H
        });

        var paymentPage = document.getElementById("paymentPage");
        var qrPage = document.getElementById("qrPage");
        window.showPageTransition(() => {
            if (paymentPage) paymentPage.classList.add("hidden");
            if (qrPage) qrPage.classList.remove("hidden");
        });

        startTimer(600); // 10 minute expiry
    } catch (err) {
        console.error("QR Code generation error:", err);
        alert(t("home.alertQrError"));
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

    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (placeholder) placeholder.classList.add('hidden');
        if (successDiv) successDiv.classList.remove('hidden');
        if (fileNameDisplay) fileNameDisplay.innerText = t("home.fileSelected", { name: file.name });
        
        if (btnSubmitForm) {
            btnSubmitForm.disabled = false;
            btnSubmitForm.className = "flex-1 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-3.5 rounded-xl text-xs text-center shadow-md cursor-pointer transition duration-200 hover:from-blue-500 hover:to-blue-700";
        }
    }
}

function finalSubmission() {
    if (timerInstance) clearInterval(timerInstance);

    const thanksMessage = document.getElementById('thanksMessage');
    if (thanksMessage) {
        thanksMessage.innerHTML = t("confirmation.message", { name: namaPelangganGlobal });
    }

    const summary = document.getElementById('confirmationSummary');
    if (summary) {
        const rows = [
            [t("confirmation.summaryName"), namaPelangganGlobal],
            [t("confirmation.summaryId"), djCustomerIdGlobal],
            [t("confirmation.summaryAmount"), "RM " + amountGlobal.toFixed(2)]
        ];
        summary.innerHTML = rows.map(([label, value]) =>
            `<div class="confirmation-summary-row"><span>${label}</span><span>${value}</span></div>`
        ).join("");
    }

    var qrPageFinal = document.getElementById('qrPage');
    var thanksPage = document.getElementById('thanksPage');
    window.showPageTransition(() => {
        if (qrPageFinal) { qrPageFinal.classList.add('hidden'); }
        if (thanksPage) {
            thanksPage.classList.remove('hidden');
            thanksPage.classList.add('flex');
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

/* =========================================================
   COMPONENT LOADING
========================================================= */
function loadComponent(containerId, filePath) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.resolve(false);

  return fetch(filePath, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error('Failed to load file: ' + filePath);
      return response.text();
    })
    .then(data => {
      container.innerHTML = data;
      window.DJ_I18N?.applyTranslations(container);
      document.dispatchEvent(new CustomEvent("duitjom:component-loaded", { detail: { containerId } }));
      return true;
    })
    .catch(error => {
      console.error('Component error:', error);
      if (containerId === "features-container") {
        container.innerHTML = '<p class="features-load-error">This section could not be loaded. Please reload the page.</p>';
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
window.unloadLoginFeatures = function unloadLoginFeatures() {
  const container = document.getElementById("features-container");
  if (container) container.innerHTML = "";
  loginFeaturesLoaded = false;
};

// JALANKAN PEMUATAN KOMPONEN BERSAMA APABILA WEB DIBUKA
document.addEventListener("DOMContentLoaded", function() {
  loadComponent('sidebar-container', 'components/sidebar.html').then((loaded) => {
    if (loaded && window.sidebarOpenPending) openSidebar();
  });
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
    
    const isValid = /^(?:D[0-9]+|J[0-9]+|DJ[0-9]+|CUST[0-9]+)$/.test(value);

    if (value.length > 0 && !isValid) {
        if (errorElement) errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
    } else {
        if (errorElement) errorElement.classList.add('hidden');
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
        console.error('Copy email failed:', error);
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeEmailPopup();
        closeSidebar();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const notificationOverlay = document.getElementById('notificationOverlay');
    const closeIconButton = document.getElementById('closePopupIcon');
    const closeButton = document.getElementById('closePopupButton');

    // Fungsi untuk membuka popup
    function openNotificationPopup() {
        if (notificationOverlay) {
            notificationOverlay.style.display = 'flex';
            // Optional: Tambahkan class untuk animasi jika ada
            // notificationOverlay.classList.add('fade-in');
        }
    }

    // Fungsi untuk menutup popup
    function closeNotificationPopup() {
        if (notificationOverlay) {
            // Optional: Tambahkan class untuk animasi jika ada
            // notificationOverlay.classList.remove('fade-in');
            notificationOverlay.style.display = 'none';
        }
    }

    // Buka popup secara automatik apabila halaman dimuatkan
    // Anda boleh menambah logik di sini untuk tidak memaparkan popup jika ia sudah dilihat
    // atau bergantung kepada parameter URL, dsb. Buat masa ini, ia akan sentiasa muncul.
    openNotificationPopup();

    // Event listener untuk ikon 'X' (closeIconButton)
    if (closeIconButton) {
        closeIconButton.addEventListener('click', closeNotificationPopup);
    }

    // Event listener untuk butang 'Tutup' (closeButton)
    if (closeButton) {
        closeButton.addEventListener('click', closeNotificationPopup);
    }

    // Event listener untuk menutup popup apabila klik di luar kandungan popup
    if (notificationOverlay) {
        notificationOverlay.addEventListener('click', function(event) {
            // Pastikan klik adalah pada overlay itu sendiri, bukan pada kandungan popup
            if (event.target === notificationOverlay) {
                closeNotificationPopup();
            }
        });
    }

    // ---------- Logik untuk tab login (jika ada dalam auth-login.html anda) ----------
    // Jika anda mempunyai tab login seperti 'Email', 'Phone', 'TOTP',
    // pastikan logik ini juga ada dalam script.js anda.
    const loginMethods = document.querySelectorAll('.login-method');
    const loginPanels = document.querySelectorAll('.login-panel');

    loginMethods.forEach(method => {
        method.addEventListener('click', function() {
            // Buang kelas 'active' dari semua tab
            loginMethods.forEach(m => m.classList.remove('active'));
            // Tambah kelas 'active' pada tab yang diklik
            this.classList.add('active');

            // Sembunyikan semua panel login
            loginPanels.forEach(panel => panel.classList.add('hidden'));

            // Paparkan panel yang sepadan dengan tab yang diklik
            const targetPanelId = this.dataset.target; // Ambil ID panel dari atribut data-target
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.remove('hidden');
            }
        });
    });

    // Tetapkan tab dan panel pertama sebagai aktif secara lalai apabila dimuatkan
    if (loginMethods.length > 0) {
        loginMethods[0].click(); // Simulasikan klik pada tab pertama
    }
});

/* =========================================================
   DUITJOM MAINTENANCE NOTICE
   Isolated from authentication and navigation behaviour.
========================================================= */
document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('maintenanceNotificationPopup');
    const popup = overlay?.querySelector('.maintenance-popup');
    const closeButtons = [
        document.getElementById('maintenancePopupClose'),
        document.getElementById('maintenancePopupCloseX')
    ].filter(Boolean);

    if (!overlay || !popup || closeButtons.length === 0) return;

    const previouslyFocusedElement = document.activeElement;

    function closeMaintenanceNotice() {
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('maintenance-popup-open');
        if (previouslyFocusedElement instanceof HTMLElement) {
            previouslyFocusedElement.focus({ preventScroll: true });
        }
    }

    function openMaintenanceNotice() {
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('maintenance-popup-open');
        window.requestAnimationFrame(() => popup.focus());
    }

    closeButtons.forEach((button) => {
        button.addEventListener('click', closeMaintenanceNotice);
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') {
            closeMaintenanceNotice();
        }
    });

    openMaintenanceNotice();
});
