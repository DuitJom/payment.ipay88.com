const SUPABASE_URL = "https://cpincildkjsexmtatcid.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OfZvXHIJsU8f5exU6bQXug_iqsOJELn";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        console.error(error);
        alert("Google Sign-In gagal: " + error.message);
    }
}

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

// Format IC dengan dashes
function formatIC(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 12) value = value.slice(0, 12);
    
    if (value.length <= 6) {
        input.value = value;
    } else if (value.length <= 8) {
        input.value = value.slice(0, 6) + '-' + value.slice(6);
    } else {
        input.value = value.slice(0, 6) + '-' + value.slice(6, 8) + '-' + value.slice(8, 12);
    }

    const icError = document.getElementById('icError');
    if (value.length === 12) {
        icError.classList.add('hidden');
    } else if (input.value.length > 0) {
        icError.classList.remove('hidden');
    }
}

/// Validate Malaysia Phone Number (+60) - 9 atau 10 digit sahaja
function validatePhone(input) {
    const phoneError = document.getElementById('phoneError');
    
    // Ambil nombor sahaja (buang aksara selain angka)
    let value = input.value.replace(/\D/g, '');

    // Jika pengguna masukkan '0' di hadapan, buang '0' tersebut
    if (value.startsWith('0')) {
        value = value.substring(1);
    }

    // Hadkan input kepada maksimum 10 digit (selepas +60)
    value = value.substring(0, 10);

    // Paparkan semula nombor yang telah dibersihkan ke dalam kotak
    input.value = value;

    // Jika kosong, sembunyikan ralat
    if (value.length === 0) {
        phoneError.classList.add('hidden');
        input.classList.remove('border-red-500');
        return false;
    }

    /*
     * Peraturan baharu:
     * - Mesti bermula dengan angka 1
     - - Boleh jadi 9 digit (cth: 123456789)
     * - ATAU 10 digit (cth: 1234567890)
     */
    const isValid = /^[1][0-9]{8,9}$/.test(value);

    if (!isValid) {
        phoneError.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
    }

    // Nombor sah
    phoneError.classList.add('hidden');
    input.classList.remove('border-red-500');
    return true;
}
// ---- KAWALAN HALAMAN PEMBAYARAN PINJAMAN (DENGAN 7 SAAT SPINNER) ----
function goToPaymentPage() {

    // =====================================================
    // DUITJOM PREMIUM PAGE LOADING
    // TEMPOH: 7 SAAT
    // =====================================================

    // Tunjukkan spinner transisi 7 saat
    const transitionSpinner =
        document.getElementById('pageTransitionSpinner');

    // Progress bar
    const progressBar =
        document.getElementById('pageLoadingProgress');

    // Percentage
    const progressPercentage =
        document.getElementById('pageLoadingPercentage');

    // Status loading
    const progressStatus =
        document.getElementById('pageLoadingStatus');


    // =====================================================
    // PAPARKAN SPINNER
    // =====================================================

    transitionSpinner.classList.remove('hidden');
    transitionSpinner.classList.add('flex');


    // =====================================================
    // RESET PROGRESS
    // =====================================================

    let progress = 0;

    if (progressBar) {
        progressBar.style.width = '0%';
    }

    if (progressPercentage) {
        progressPercentage.innerText = '0%';
    }

    if (progressStatus) {
        progressStatus.innerText = 'Memulakan...';
    }


    // =====================================================
    // STATUS LOADING
    // =====================================================

    const loadingMessages = [
        {
            progress: 0,
            message: 'Memulakan...'
        },
        {
            progress: 15,
            message: 'Menyediakan halaman...'
        },
        {
            progress: 35,
            message: 'Memuatkan maklumat...'
        },
        {
            progress: 55,
            message: 'Menyediakan pembayaran...'
        },
        {
            progress: 75,
            message: 'Mengemas kini sistem...'
        },
        {
            progress: 90,
            message: 'Hampir selesai...'
        },
        {
            progress: 100,
            message: 'Halaman sedia.'
        }
    ];


    // =====================================================
    // PROGRESS ANIMATION
    // =====================================================

    const startTime = Date.now();
    const loadingDuration = 7000;

    let progressTimer = null;


    function updateLoadingProgress() {

        const elapsed =
            Date.now() - startTime;

        const percentage =
            Math.min(
                Math.floor(
                    (elapsed / loadingDuration) * 100
                ),
                99
            );


        // Progress bar
        if (progressBar) {
            progressBar.style.width =
                percentage + '%';
        }


        // Percentage
        if (progressPercentage) {
            progressPercentage.innerText =
                percentage + '%';
        }


        // Cari status yang sesuai
        let currentMessage =
            loadingMessages[0].message;

        for (
            let i = 0;
            i < loadingMessages.length;
            i++
        ) {

            if (
                percentage >=
                loadingMessages[i].progress
            ) {

                currentMessage =
                    loadingMessages[i].message;

            }

        }


        // Update status
        if (progressStatus) {

            progressStatus.innerText =
                currentMessage;

        }


        // Teruskan sehingga 7 saat
        if (elapsed < loadingDuration) {

            progressTimer =
                requestAnimationFrame(
                    updateLoadingProgress
                );

        }

    }


    // Mulakan progress
    progressTimer =
        requestAnimationFrame(
            updateLoadingProgress
        );


    // =====================================================
    // SELEPAS 7 SAAT
    // =====================================================

    setTimeout(() => {

        // Hentikan animation frame
        if (progressTimer) {

            cancelAnimationFrame(
                progressTimer
            );

        }


        // Jadikan 100%
        if (progressBar) {

            progressBar.style.width =
                '100%';

        }


        if (progressPercentage) {

            progressPercentage.innerText =
                '100%';

        }


        if (progressStatus) {

            progressStatus.innerText =
                'Halaman sedia.';

        }


        // =================================================
        // TUNGGU SEKEJAP SUPAYA 100% BOLEH DILIHAT
        // =================================================

        setTimeout(() => {

            // Sembunyikan spinner
            transitionSpinner.classList.add(
                'hidden'
            );

            transitionSpinner.classList.remove(
                'flex'
            );


            // =================================================
            // PINDAH KE HALAMAN PEMBAYARAN
            // =================================================

            document
                .getElementById('mainPage')
                .classList.add('hidden');

            document
                .getElementById('paymentPage')
                .classList.remove('hidden');


            // =================================================
            // MUNCULKAN MODAL TUTORIAL
            // =================================================

            setTimeout(() => {

                document
                    .getElementById('tutorialModal')
                    .classList.remove('hidden');

            }, 200);

        }, 250);

    }, 7000);

}

function closeTutorialModal() {
    document.getElementById('tutorialModal').classList.add('hidden');
    setTimeout(() => { 
        document.getElementById('scammerModal').classList.remove('hidden'); 
    }, 200);
}

function closeScammerModal() {
    document.getElementById('scammerModal').classList.add('hidden');
}

function goToNextStepPage(event) {
    event.preventDefault();

    const ic = document.getElementById('inputIC').value.replace(/\D/g, '');
    const phone = document.getElementById('inputPhone').value;
    const djcust = document.getElementById('inputLoanID').value;

    if (ic.length !== 12) {
        alert('Sila masukkan nombor kad pengenalan yang sah (12 digit)');
        return;
    }

    // Semak nombor telefon menggunakan fungsi validatePhone yang sudah dikemaskini
    if (!validatePhone(document.getElementById('inputPhone'))) {
        document.getElementById('phoneError').classList.remove('hidden'); // Papar mesej ralat merah
        return; // Hentikan proses tanpa popup mengganggu
    }

    const djcustRegex = /^[DJCUST0-9/]*$/;
    if (!djcustRegex.test(djcust)) {
        alert('DJ/CUST NUMBER Tidak Sah');
        return;
    }

    document.getElementById('paymentPage').classList.add('hidden');
    document.getElementById('loadingPage').classList.remove('hidden');
    document.getElementById('loadingPage').classList.add('flex');

    setTimeout(() => {
        const nama = document.getElementById('inputNama').value;
        const loanID = document.getElementById('inputLoanID').value;
        const amaun = document.getElementById('inputAmaun').value;

        namaPelangganGlobal = nama;

        document.getElementById('reviewNama').innerText = nama;
        document.getElementById('reviewIC').innerText = document.getElementById('inputIC').value;
        document.getElementById('reviewLoanID').innerText = loanID.toUpperCase();
        document.getElementById('reviewPhone').innerText = phone;
        
        const amaunFormat = parseFloat(amaun).toFixed(2);
        document.getElementById('reviewAmaun').innerText = "RM " + amaunFormat;

        document.getElementById('displayLoanID').innerText = loanID.toUpperCase();
        document.getElementById('displayMainAmaun').innerText = "RM " + amaunFormat;
        document.getElementById('displaySubAmaun').innerText = "RM " + amaunFormat;

        document.getElementById('qrLoanID').innerText = loanID.toUpperCase();
        document.getElementById('qrMainAmaun').innerText = "RM " + amaunFormat;

        document.getElementById('loadingPage').classList.add('hidden');
        document.getElementById('loadingPage').classList.remove('flex');
        document.getElementById('nextStepPage').classList.remove('hidden');
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 7000);
}

function backToInformationPage() {
    document.getElementById('nextStepPage').classList.add('hidden');
    document.getElementById('paymentPage').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function goToStep3Page() {
    document.getElementById('nextStepPage').classList.add('hidden');
    document.getElementById('step3Page').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function backToStep2Page() {
    document.getElementById('step3Page').classList.add('hidden');
    document.getElementById('nextStepPage').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function checkBankSelection() {
    const selectBank = document.getElementById('selectBank').value;
    const btnFinalNext = document.getElementById('btnFinalNext');
    
    if (selectBank !== "") {
        btnFinalNext.disabled = false;
        btnFinalNext.className = "flex-1 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-3.5 rounded-xl text-xs text-center shadow-xs cursor-pointer transition duration-200 hover:from-blue-500 hover:to-blue-700";
    }
}

function goToQRPage() {
    const selectBank = document.getElementById('selectBank');
    const bankText = selectBank.options[selectBank.selectedIndex].text.substring(3);
    document.getElementById('qrBankBadge').innerText = bankText;

    document.getElementById('step3Page').classList.add('hidden');
    document.getElementById('qrPage').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});

    startCountdown();
}

function backToStep3Page() {
    clearInterval(timerInstance);
    document.getElementById('qrPage').classList.add('hidden');
    document.getElementById('step3Page').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function startCountdown() {
    clearInterval(timerInstance);
    let timeAllocated = 119; 
    const display = document.getElementById('countdownTimer');

    timerInstance = setInterval(function () {
        let minutes = parseInt(timeAllocated / 60, 10);
        let seconds = parseInt(timeAllocated % 60, 10);

        minutes = minutes < 10 ? minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.innerText = minutes + "m " + seconds + "s";

        if (--timeAllocated < 0) {
            clearInterval(timerInstance);
            display.innerText = "QR Code Expired";
            alert("Masa transaksi telah tamat. Sila dapatkan semula kod pembayaran baharu.");
            backToStep3Page();
        }
    }, 1000);
}

function handleFileSelected() {
    const fileInput = document.getElementById('receiptUpload');
    const placeholder = document.getElementById('uploadPlaceholder');
    const successDiv = document.getElementById('uploadSuccess');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const btnSubmitForm = document.getElementById('btnSubmitForm');

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

    document.getElementById('qrPage').classList.add('hidden');
    document.getElementById('thanksPage').classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// =====================================================
// FUNGSI CALLBACK GOOGLE OAUTH LOGIN (ANIMASI DUITJOM 5 SAAT)
// =====================================================
function handleGoogleLogin(response) {
    console.log("Google Login berjaya");

    // 1. Dapatkan maklumat akaun pengguna daripada Token Google
    let userName = "";
    let userEmail = "";
    if (response && response.credential) {
        const user = parseJwt(response.credential);
        userName = user.name || "";
        userEmail = user.email || "";
        console.log("Nama:", userName, "| Email:", userEmail);
    }

    // 2. Simpan status login & data pengguna
    localStorage.setItem("googleLogin", "success");
    if (userName) localStorage.setItem("userName", userName);
    if (userEmail) localStorage.setItem("userEmail", userEmail);

    // 3. Tutup Sidebar secara selamat (elak crash)
    if (typeof closeSidebar === "function") {
        closeSidebar();
    }

    // 4. Sembunyikan ruangan butang Google Sign In
    const googleSection = document.getElementById("googleSignInSection");
    if (googleSection) {
        googleSection.classList.add("hidden");
    }

    // 5. Tunjukkan skrin Loading (Spinner Log Masuk)
    const spinnerOverlay = document.getElementById("loginSpinnerOverlay");
    if (spinnerOverlay) {
        spinnerOverlay.classList.remove("hidden");
        spinnerOverlay.classList.add("flex");
    }

    // =====================================================
    // ANIMASI LOADING 5 SAAT
    // =====================================================
    const progressBar = document.getElementById("loginLoadingProgress");
    const progressPercentage = document.getElementById("loginLoadingPercentage");
    const progressStatus = document.getElementById("loginLoadingStatus");

    // Reset progress
    if (progressBar) progressBar.style.width = "0%";
    if (progressPercentage) progressPercentage.innerText = "0%";
    if (progressStatus) progressStatus.innerText = "Memulakan...";

    const loadingMessages = [
        { progress: 0,   message: "Memulakan..." },
        { progress: 20,  message: "Mengesahkan akaun..." },
        { progress: 40,  message: "Memuatkan data..." },
        { progress: 60,  message: "Menyediakan halaman..." },
        { progress: 80,  message: "Hampir selesai..." },
        { progress: 100, message: "Akaun sedia." }
    ];

    const startTime = Date.now();
    const loadingDuration = 5000;
    let progressTimer = null;

    function updateLoginProgress() {
        const elapsed = Date.now() - startTime;
        const percentage = Math.min(Math.floor((elapsed / loadingDuration) * 100), 99);

        if (progressBar) progressBar.style.width = percentage + "%";
        if (progressPercentage) progressPercentage.innerText = percentage + "%";

        let currentMessage = loadingMessages[0].message;
        for (let i = 0; i < loadingMessages.length; i++) {
            if (percentage >= loadingMessages[i].progress) {
                currentMessage = loadingMessages[i].message;
            }
        }
        if (progressStatus) progressStatus.innerText = currentMessage;

        if (elapsed < loadingDuration) {
            progressTimer = requestAnimationFrame(updateLoginProgress);
        }
    }

    progressTimer = requestAnimationFrame(updateLoginProgress);

    // Tunggu 5 saat
    setTimeout(() => {
        // Hentikan animation frame
        if (progressTimer) cancelAnimationFrame(progressTimer);

        // Jadikan 100%
        if (progressBar) progressBar.style.width = "100%";
        if (progressPercentage) progressPercentage.innerText = "100%";
        if (progressStatus) progressStatus.innerText = "Akaun sedia.";

        // Tunggu 250ms supaya 100% boleh dilihat
        setTimeout(() => {
            // Sembunyikan spinner log masuk
            if (spinnerOverlay) {
                spinnerOverlay.classList.add("hidden");
                spinnerOverlay.classList.remove("flex");
            }

            // Reset semula untuk kegunaan akan datang
            if (progressBar) progressBar.style.width = "0%";
            if (progressPercentage) progressPercentage.innerText = "0%";
            if (progressStatus) progressStatus.innerText = "Memulakan...";

            // Munculkan butang Pembayaran Pinjaman
            const btnPay = document.getElementById("btnPembayaranPinjaman");
            if (btnPay) {
                btnPay.classList.remove("hidden");
            }
        }, 250);
    }, 5000);
}

// =====================================================
// FUNGSI PEMBANTU (DECODE GOOGLE TOKEN)
// =====================================================
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// =====================================================
// SEMAK STATUS LOGIN APABILA REFRESH SKRIN
// =====================================================
document.addEventListener("DOMContentLoaded", function () {
    const loginStatus = localStorage.getItem("googleLogin");
    const btnPay = document.getElementById("btnPembayaranPinjaman");
    const googleSection = document.getElementById("googleSignInSection");

    if (loginStatus === "success") {
        // Jika SUDAH log masuk
        if (googleSection) googleSection.classList.add("hidden");
        if (btnPay) btnPay.classList.remove("hidden");
    } else {
        // Jika BELUM log masuk (Halaman Pertama)
        if (btnPay) btnPay.classList.add("hidden");
        if (googleSection) googleSection.classList.remove("hidden");
    }
});
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

        newsDots.forEach((dot, dotIndex) => {

            dot.classList.toggle(
                "active",
                dotIndex === currentNewsSlide
            );

        });

    }

    function nextNewsSlide() {

        currentNewsSlide++;

        if (currentNewsSlide >= newsItems.length) {
            currentNewsSlide = 0;
        }

        updateNewsSlider(currentNewsSlide);
    }

    function startNewsAutoSlider() {

        clearInterval(newsAutoTimer);

        newsAutoTimer = setInterval(
            nextNewsSlide,
            NEWS_INTERVAL
        );

    }

    function restartNewsAutoSlider() {

        clearInterval(newsAutoTimer);

        startNewsAutoSlider();

    }

    /* Dot Navigation */

    newsDots.forEach((dot, index) => {

        dot.addEventListener("click", function () {

            updateNewsSlider(index);

            restartNewsAutoSlider();

        });

    });


    /* Touch / Swipe Support */

    let touchStartX = 0;
    let touchEndX = 0;

    newsTrack.addEventListener(
        "touchstart",
        function (event) {

            touchStartX =
                event.changedTouches[0].screenX;

        },
        { passive: true }
    );

    newsTrack.addEventListener(
        "touchend",
        function (event) {

            touchEndX =
                event.changedTouches[0].screenX;

            const swipeDistance =
                touchStartX - touchEndX;

            if (Math.abs(swipeDistance) < 45) {
                return;
            }

            if (swipeDistance > 0) {

                currentNewsSlide++;

                if (
                    currentNewsSlide >=
                    newsItems.length
                ) {
                    currentNewsSlide = 0;
                }

            } else {

                currentNewsSlide--;

                if (currentNewsSlide < 0) {
                    currentNewsSlide =
                        newsItems.length - 1;
                }

            }

            updateNewsSlider(currentNewsSlide);

            restartNewsAutoSlider();

        },
        { passive: true }
    );


    /* Pause ketika pengguna touch/hover */

    newsTrack.addEventListener(
        "mouseenter",
        function () {
            clearInterval(newsAutoTimer);
        }
    );

    newsTrack.addEventListener(
        "mouseleave",
        function () {
            startNewsAutoSlider();
        }
    );

    newsTrack.addEventListener(
        "touchstart",
        function () {
            clearInterval(newsAutoTimer);
        },
        { passive: true }
    );

    newsTrack.addEventListener(
        "touchend",
        function () {
            restartNewsAutoSlider();
        },
        { passive: true }
    );


    /* Initial State */

    updateNewsSlider(0);

    startNewsAutoSlider();

});
// =========================================================
// SIDEBAR MENU - NEW FUNCTIONS
// =========================================================

// HOME
function sidebarHomeAction() {
    closeSidebar();
}


// PRIVACY
function privacyAction() {
    closeSidebar();
}


// TERM / FAQ
function termFaqAction() {
    closeSidebar();
}


// ABOUT US
function aboutUsAction() {
    closeSidebar();
}


// BLOG
function blogAction() {
    closeSidebar();
}


// APPLY NOW
function applyNowAction() {
    window.open('https://www.duitjom.com', '_blank');
}


// PACKAGE
function packageAction() {
    closeSidebar();
    window.open('https://www.duitjom.com/', '_blank', 'noopener,noreferrer');
}


// =========================================================
// EMAIL POPUP
// =========================================================

function openEmailPopup() {

    const overlay = document.getElementById('emailPopupOverlay');
    const popup = document.getElementById('emailPopup');
    const popupBox = document.getElementById('emailPopupBox');

    const copiedStatus = document.getElementById('copiedStatus');
    const copyIcon = document.getElementById('copyIcon');
    const copiedIcon = document.getElementById('copiedIcon');

    if (!overlay || !popup || !popupBox) {
        return;
    }

    // Reset copy status setiap kali popup dibuka
    if (copiedStatus) {
        copiedStatus.classList.add('hidden');
    }

    if (copyIcon) {
        copyIcon.classList.remove('hidden');
    }

    if (copiedIcon) {
        copiedIcon.classList.add('hidden');
    }

    // Paparkan popup
    overlay.classList.remove('hidden');

    popup.classList.remove('hidden');
    popup.classList.add('flex');

    // Animasi popup
    requestAnimationFrame(function () {

        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');

        popupBox.classList.remove(
            'scale-95',
            'opacity-0'
        );

        popupBox.classList.add(
            'scale-100',
            'opacity-100'
        );

    });

}


// =========================================================
// CLOSE EMAIL POPUP
// =========================================================

function closeEmailPopup() {

    const overlay = document.getElementById('emailPopupOverlay');
    const popup = document.getElementById('emailPopup');
    const popupBox = document.getElementById('emailPopupBox');

    if (!overlay || !popup || !popupBox) {
        return;
    }

    // Animasi keluar
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');

    popupBox.classList.remove(
        'scale-100',
        'opacity-100'
    );

    popupBox.classList.add(
        'scale-95',
        'opacity-0'
    );

    // Sembunyikan selepas animasi selesai
    setTimeout(function () {

        overlay.classList.add('hidden');

        popup.classList.add('hidden');
        popup.classList.remove('flex');

    }, 300);

}


// =========================================================
// COPY DUITJOM EMAIL
// =========================================================

async function copyDuitJomEmail() {

    const emailElement =
        document.getElementById('online.help-customer.duitjom@hotmail.com');

    const copyIcon =
        document.getElementById('copyIcon');

    const copiedIcon =
        document.getElementById('copiedIcon');

    const copiedStatus =
        document.getElementById('copiedStatus');

    const copyButton =
        document.getElementById('copyEmailButton');


    if (
        !emailElement ||
        !copyIcon ||
        !copiedIcon ||
        !copiedStatus ||
        !copyButton
    ) {
        return;
    }


    const email =
        emailElement.textContent.trim();


    try {

        // Cuba gunakan Clipboard API
        await navigator.clipboard.writeText(email);

        showEmailCopiedState();

    } catch (error) {

        // Fallback untuk browser yang tidak menyokong Clipboard API
        const temporaryInput =
            document.createElement('textarea');

        temporaryInput.value = email;

        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';

        document.body.appendChild(
            temporaryInput
        );

        temporaryInput.focus();
        temporaryInput.select();

        try {

            document.execCommand('copy');

            showEmailCopiedState();

        } catch (fallbackError) {

            console.error(
                'Copy email gagal:',
                fallbackError
            );

        }

        document.body.removeChild(
            temporaryInput
        );

    }

}


// =========================================================
// EMAIL COPIED VISUAL STATE
// =========================================================

function showEmailCopiedState() {

    const copyIcon =
        document.getElementById('copyIcon');

    const copiedIcon =
        document.getElementById('copiedIcon');

    const copiedStatus =
        document.getElementById('copiedStatus');

    const copyButton =
        document.getElementById('copyEmailButton');


    if (
        !copyIcon ||
        !copiedIcon ||
        !copiedStatus ||
        !copyButton
    ) {
        return;
    }


    // Tukar icon Copy → Check
    copyIcon.classList.add('hidden');

    copiedIcon.classList.remove('hidden');


    // Paparkan "Copied"
    copiedStatus.classList.remove('hidden');


    // Tukar visual button
    copyButton.classList.remove(
        'bg-white'
    );

    copyButton.classList.add(
        'bg-green-50',
        'text-green-500',
        'border-green-200'
    );


    // Kembalikan keadaan asal selepas 2 saat
    setTimeout(function () {

        copyIcon.classList.remove('hidden');

        copiedIcon.classList.add('hidden');

        copiedStatus.classList.add('hidden');


        copyButton.classList.remove(
            'bg-green-50',
            'text-green-500',
            'border-green-200'
        );

        copyButton.classList.add(
            'bg-white'
        );

    }, 2000);

}


// =========================================================
// ESC KEY - CLOSE EMAIL POPUP
// =========================================================

document.addEventListener(
    'keydown',
    function (event) {

        if (event.key === 'Escape') {

            closeEmailPopup();

        }

    }
);

// =========================================================
// TAMBAHAN: FUNGSI SEMAKAN ID LOAN YANG HILANG
// =========================================================
function validateDJCust(input) {
    const errorElement = document.getElementById('djcustError');
    // Tukar huruf kecil kepada huruf besar secara automatik
    const value = input.value.toUpperCase();
    input.value = value;
    
    // Semak jika input bermula dengan 'DJ' atau 'CUST'
    if (value.length > 0 && !/^(DJ|CUST)/.test(value)) {
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
    } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
    }
}

// =====================================================
// FUNGSI LOG KELUAR (LOGOUT)
// =====================================================
function logoutGoogle() {
    // 1. Padam rekod log masuk dari sistem browser
    localStorage.removeItem("googleLogin");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    // 2. Refresh / muat semula halaman web secara automatik
    // Sistem akan kembali memaparkan butang Google Sign-In
    window.location.reload();
}

// =========================================================
// PANGGIL FAIL FEATURES.HTML
// =========================================================
document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('features-container');
    if (container) {
        fetch('features.html')
            .then(response => {
                if (!response.ok) throw new Error('Ralat memuat turun fail');
                return response.text();
            })
            .then(data => {
                container.innerHTML = data;
            })
            .catch(error => console.error('Terdapat masalah:', error));
    }
});

