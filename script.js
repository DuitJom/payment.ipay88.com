const SUPABASE_URL =
"https://cpincildkjsexmtatcid.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
"sb_publishable_OfZvXHIJsU8f5exU6bQXug_iqsOJELn";

const supabaseClient =
window.supabase
? window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
: null;


// Namespaced diagnostic handle; the publishable client remains safe for browser use.
window.duitjomSupabaseClient = supabaseClient;

let authMode = "signin";

function getSupabaseClient() {
    if (!supabaseClient) {
        showAuthMessage("Sistem login belum bersedia. Sila muat semula halaman.", "error");
        return null;
    }
    return supabaseClient;
}

function showAuthMessage(message, type = "info") {
    const messageElement = document.getElementById("authMessage");
    if (!messageElement) return;

    messageElement.textContent = message || "";
    messageElement.className = "mt-3 min-h-[1.25rem] text-center text-[10px] font-semibold";
    messageElement.classList.add(
        type === "error" ? "text-red-600" : type === "success" ? "text-emerald-600" : "text-slate-500"
    );
}

function getAuthEmail() {
    return document.getElementById("authEmail")?.value.trim().toLowerCase() || "";
}

function setAuthBusy(isBusy) {
    const submitButton = document.getElementById("authSubmitButton");
    if (!submitButton) return;

    submitButton.disabled = isBusy;
    submitButton.classList.toggle("opacity-60", isBusy);
    submitButton.textContent = isBusy
        ? "Sila tunggu..."
        : authMode === "signup" ? "Create account"
        : authMode === "forgot" ? "Hantar pautan reset"
        : "Login with email";
}

function showAuthMode(mode = "signin") {
    authMode = ["signin", "signup", "forgot"].includes(mode) ? mode : "signin";

    const signInTab = document.getElementById("authSignInTab");
    const signUpTab = document.getElementById("authSignUpTab");
    const nameField = document.getElementById("authNameField");
    const passwordField = document.getElementById("authPasswordField");
    const confirmField = document.getElementById("authConfirmPasswordField");
    const passwordInput = document.getElementById("authPassword");
    const confirmInput = document.getElementById("authConfirmPassword");
    const nameInput = document.getElementById("authName");
    const submitButton = document.getElementById("authSubmitButton");
    const forgotButton = document.getElementById("forgotPasswordButton");
    const form = document.getElementById("emailPasswordForm");

    const isSignup = authMode === "signup";
    const isForgot = authMode === "forgot";

    signInTab?.classList.toggle("bg-slate-900", authMode === "signin");
    signInTab?.classList.toggle("text-white", authMode === "signin");
    signInTab?.classList.toggle("bg-slate-100", authMode !== "signin");
    signInTab?.classList.toggle("text-slate-600", authMode !== "signin");
    signInTab?.setAttribute("aria-selected", String(authMode === "signin"));

    signUpTab?.classList.toggle("bg-slate-900", isSignup);
    signUpTab?.classList.toggle("text-white", isSignup);
    signUpTab?.classList.toggle("bg-slate-100", !isSignup);
    signUpTab?.classList.toggle("text-slate-600", !isSignup);
    signUpTab?.setAttribute("aria-selected", String(isSignup));

    nameField?.classList.toggle("hidden", !isSignup);
    passwordField?.classList.toggle("hidden", isForgot);
    confirmField?.classList.toggle("hidden", !isSignup);
    forgotButton?.classList.toggle("hidden", isSignup || isForgot);
    form?.classList.remove("hidden");

    if (nameInput) nameInput.required = isSignup;
    if (passwordInput) {
        passwordInput.required = !isForgot;
        passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    }
    if (confirmInput) confirmInput.required = isSignup;

    if (submitButton) {
        submitButton.textContent = isSignup ? "Create account" : isForgot ? "Hantar pautan reset" : "Login with email";
    }

    showAuthMessage(isForgot ? "Masukkan email untuk menerima pautan reset password." : "");
}

function showForgotPassword() {
    showAuthMode("forgot");
}

function showRecoveryPanel() {
    document.getElementById("emailPasswordForm")?.classList.add("hidden");
    document.getElementById("authSignInTab")?.classList.add("hidden");
    document.getElementById("authSignUpTab")?.classList.add("hidden");
    document.getElementById("forgotPasswordButton")?.classList.add("hidden");
    document.getElementById("passwordRecoveryForm")?.classList.remove("hidden");
    showAuthMessage("Pautan reset diterima. Sila tetapkan password baharu.", "info");
}

async function signInWithGoogle() {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: AUTH_REDIRECT_URL }
    });

    if (error) {
        console.error(error);
        showAuthMessage("Google Sign-In gagal: " + error.message, "error");
    }
}

async function submitEmailPassword(event) {
    event?.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const email = getAuthEmail();
    const password = document.getElementById("authPassword")?.value || "";

    if (!email) {
        showAuthMessage("Sila masukkan alamat email yang sah.", "error");
        document.getElementById("authEmail")?.focus();
        return;
    }

    if (authMode === "forgot") {
        return sendPasswordReset(event);
    }

    if (password.length < 6) {
        showAuthMessage("Password mestilah sekurang-kurangnya 6 aksara.", "error");
        return;
    }

    if (authMode === "signup") {
        const name = document.getElementById("authName")?.value.trim() || "";
        const confirmation = document.getElementById("authConfirmPassword")?.value || "";

        if (password !== confirmation) {
            showAuthMessage("Password tidak sepadan.", "error");
            return;
        }

        setAuthBusy(true);
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                emailRedirectTo: AUTH_REDIRECT_URL
            }
        });
        setAuthBusy(false);

        if (error) {
            console.error("Sign-up error:", error);
            showAuthMessage("Sign up gagal: " + error.message, "error");
            return;
        }

        if (data.session) {
            showAuthMessage("Akaun berjaya dicipta dan anda telah log masuk.", "success");
        } else {
            showAuthMessage("Akaun berjaya dicipta. Sila semak email untuk pengesahan.", "success");
        }
        return;
    }

    setAuthBusy(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    setAuthBusy(false);

    if (error) {
        console.error("Sign-in error:", error);
        showAuthMessage("Login gagal: " + error.message, "error");
        return;
    }

    showAuthMessage("Login berjaya.", "success");
}

async function sendPasswordReset(event) {
    event?.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const email = getAuthEmail();
    if (!email) {
        showAuthMessage("Sila masukkan email untuk reset password.", "error");
        return;
    }

    setAuthBusy(true);
    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_REDIRECT_URL
    });
    setAuthBusy(false);

    if (error) {
        console.error("Password reset error:", error);
        showAuthMessage("Reset password gagal: " + error.message, "error");
        return;
    }

    showAuthMessage("Pautan reset password telah dihantar. Sila semak email anda.", "success");
}

async function updateRecoveryPassword(event) {
    event?.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;

    const password = document.getElementById("recoveryPassword")?.value || "";
    const confirmation = document.getElementById("recoveryPasswordConfirm")?.value || "";

    if (password.length < 6 || password !== confirmation) {
        showAuthMessage("Pastikan kedua-dua password sama dan sekurang-kurangnya 6 aksara.", "error");
        return;
    }

    const { error } = await client.auth.updateUser({ password });
    if (error) {
        console.error("Update password error:", error);
        showAuthMessage("Password baharu gagal disimpan: " + error.message, "error");
        return;
    }

    document.getElementById("passwordRecoveryForm")?.classList.add("hidden");
    document.getElementById("authSignInTab")?.classList.remove("hidden");
    document.getElementById("authSignUpTab")?.classList.remove("hidden");
    showAuthMode("signin");
    showAuthMessage("Password baharu berjaya disimpan. Anda boleh login sekarang.", "success");
}

async function sendEmailOTP() {
    const client = getSupabaseClient();
    if (!client) return;

    const emailInput = document.getElementById("otpEmail");
    const otpSection = document.getElementById("otpVerificationSection");
    const email = emailInput?.value.trim() || "";

    if (!email) {
        alert("Sila masukkan alamat email anda.");
        emailInput?.focus();
        return;
    }

    const { error } = await client.auth.signInWithOtp({ email });
    if (error) {
        console.error("OTP Error:", error);
        alert("Gagal menghantar OTP: " + error.message);
        return;
    }

    otpSection?.classList.remove("hidden");
    alert("OTP telah dihantar ke email anda.");
}

async function verifyEmailOTP() {
    const client = getSupabaseClient();
    if (!client) return;

    const email = document.getElementById("otpEmail")?.value.trim() || "";
    const otp = document.getElementById("otpCode")?.value.trim() || "";

    if (!email) {
        alert("Email tidak dijumpai.");
        return;
    }
    if (!otp || otp.length !== 6) {
        alert("Sila masukkan OTP 6 digit.");
        return;
    }

    const { data, error } = await client.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) {
        console.error("Verify OTP Error:", error);
        alert("OTP tidak sah atau telah tamat tempoh.");
        return;
    }

    console.log("Email OTP Login berjaya:", data);
    alert("Email berjaya disahkan!");
}
// CODE ASAL AWAK — KEKALKAN
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
    const transitionSpinner = document.getElementById('pageTransitionSpinner');
    const progressBar = document.getElementById('pageLoadingProgress');
    const progressPercentage = document.getElementById('pageLoadingPercentage');
    const progressStatus = document.getElementById('pageLoadingStatus');

    const mainPage = document.getElementById('mainPage');
    const paymentPage = document.getElementById('paymentPage');
    if (!mainPage || !paymentPage) return;

    // If the asynchronously loaded spinner is unavailable, do not trap the user.
    if (!transitionSpinner) {
        mainPage.classList.add('hidden');
        paymentPage.classList.remove('hidden');
        paymentPage.classList.add('flex');
        return;
    }

    transitionSpinner.classList.remove('hidden');
    transitionSpinner.classList.add('flex');

    const loadingMessages = [
        { progress: 0, message: 'Memulakan...' },
        { progress: 15, message: 'Menyediakan halaman...' },
        { progress: 35, message: 'Memuatkan maklumat...' },
        { progress: 55, message: 'Menyediakan pembayaran...' },
        { progress: 75, message: 'Mengemas kini sistem...' },
        { progress: 90, message: 'Hampir selesai...' },
        { progress: 100, message: 'Halaman sedia.' }
    ];

    const loadingDuration = 2200;
    const startTime = Date.now();
    let progressTimer = null;

    function updateLoadingProgress() {
        const elapsed = Date.now() - startTime;
        const percentage = Math.min(Math.floor((elapsed / loadingDuration) * 100), 99);

        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressPercentage) progressPercentage.innerText = percentage + '%';
        if (progressStatus) {
            const currentMessage = loadingMessages.reduce(
                (message, item) => percentage >= item.progress ? item.message : message,
                loadingMessages[0].message
            );
            progressStatus.innerText = currentMessage;
        }

        if (elapsed < loadingDuration) {
            progressTimer = requestAnimationFrame(updateLoadingProgress);
        }
    }

    if (progressBar) progressBar.style.width = '0%';
    if (progressPercentage) progressPercentage.innerText = '0%';
    if (progressStatus) progressStatus.innerText = 'Memulakan...';
    progressTimer = requestAnimationFrame(updateLoadingProgress);

    window.setTimeout(() => {
        if (progressTimer) cancelAnimationFrame(progressTimer);
        if (progressBar) progressBar.style.width = '100%';
        if (progressPercentage) progressPercentage.innerText = '100%';
        if (progressStatus) progressStatus.innerText = 'Halaman sedia.';

        window.setTimeout(() => {
            transitionSpinner.classList.add('hidden');
            transitionSpinner.classList.remove('flex');
            mainPage.classList.add('hidden');
            paymentPage.classList.remove('hidden');
            paymentPage.classList.add('flex');

            const tutorialModal = document.getElementById('tutorialModal');
            if (tutorialModal) {
                window.setTimeout(() => tutorialModal.classList.remove('hidden'), 200);
            }
        }, 180);
    }, loadingDuration);
}

function closeTutorialModal() {
    document.getElementById('tutorialModal')?.classList.add('hidden');
    window.setTimeout(() => {
        document.getElementById('scammerModal')?.classList.remove('hidden');
    }, 200);
}

function closeScammerModal() {
    document.getElementById('scammerModal')?.classList.add('hidden');
}

function goToNextStepPage(event) {
    event?.preventDefault();

    const inputIC = document.getElementById('inputIC');
    const inputPhone = document.getElementById('inputPhone');
    const inputLoanID = document.getElementById('inputLoanID');
    const paymentPage = document.getElementById('paymentPage');
    const loadingPage = document.getElementById('loadingPage');
    const nextStepPage = document.getElementById('nextStepPage');

    if (!inputIC || !inputPhone || !inputLoanID || !paymentPage || !loadingPage || !nextStepPage) {
        console.error('Payment flow markup is incomplete.');
        return false;
    }

    const ic = inputIC.value.replace(/\D/g, '');
    const phone = inputPhone.value;
    const djcust = inputLoanID.value.trim();

    if (ic.length !== 12) {
        alert('Sila masukkan nombor kad pengenalan yang sah (12 digit)');
        return false;
    }

    if (!validatePhone(inputPhone)) {
        document.getElementById('phoneError')?.classList.remove('hidden');
        return false;
    }

    if (!/^(DJ|CUST)[A-Z0-9/]*$/i.test(djcust)) {
        alert('DJ/CUST NUMBER Tidak Sah');
        return false;
    }

    paymentPage.classList.add('hidden');
    paymentPage.classList.remove('flex');
    loadingPage.classList.remove('hidden');
    loadingPage.classList.add('flex');

    const progressBar = document.getElementById('loadingPageProgress');
    const progressPercentage = document.getElementById('loadingPagePercentage');
    const progressStatus = document.getElementById('loadingPageStatus');
    const loadingDuration = 2200;
    const startTime = Date.now();
    let progressTimer = null;

    function updatePageProgress() {
        const elapsed = Date.now() - startTime;
        const percentage = Math.min(Math.floor((elapsed / loadingDuration) * 100), 99);
        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressPercentage) progressPercentage.innerText = percentage + '%';
        if (progressStatus) {
            progressStatus.innerText = percentage < 35
                ? 'Mengesahkan maklumat...'
                : percentage < 70
                    ? 'Menyediakan halaman seterusnya...'
                    : 'Hampir selesai...';
        }
        if (elapsed < loadingDuration) progressTimer = requestAnimationFrame(updatePageProgress);
    }

    if (progressBar) progressBar.style.width = '0%';
    if (progressPercentage) progressPercentage.innerText = '0%';
    if (progressStatus) progressStatus.innerText = 'Memulakan...';
    progressTimer = requestAnimationFrame(updatePageProgress);

    window.setTimeout(() => {
        if (progressTimer) cancelAnimationFrame(progressTimer);
        const nama = document.getElementById('inputNama')?.value.trim() || '';
        const loanID = inputLoanID.value.trim();
        const amaun = document.getElementById('inputAmaun')?.value || '0';
        const amaunFormat = Number.parseFloat(amaun || '0').toFixed(2);

        namaPelangganGlobal = nama;
        document.getElementById('reviewNama').innerText = nama;
        document.getElementById('reviewIC').innerText = inputIC.value;
        document.getElementById('reviewLoanID').innerText = loanID.toUpperCase();
        document.getElementById('reviewPhone').innerText = phone;
        document.getElementById('reviewAmaun').innerText = 'RM ' + amaunFormat;
        document.getElementById('displayLoanID').innerText = loanID.toUpperCase();
        document.getElementById('displayMainAmaun').innerText = 'RM ' + amaunFormat;
        document.getElementById('displaySubAmaun').innerText = 'RM ' + amaunFormat;
        document.getElementById('qrLoanID').innerText = loanID.toUpperCase();
        document.getElementById('qrMainAmaun').innerText = 'RM ' + amaunFormat;

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercentage) progressPercentage.innerText = '100%';
        if (progressStatus) progressStatus.innerText = 'Maklumat sedia.';

        window.setTimeout(() => {
            loadingPage.classList.add('hidden');
            loadingPage.classList.remove('flex');
            nextStepPage.classList.remove('hidden');
            nextStepPage.classList.add('flex');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 180);
    }, loadingDuration);

    return false;
}

function backToInformationPage() {
    document.getElementById('nextStepPage')?.classList.add('hidden');
    const paymentPage = document.getElementById('paymentPage');
    paymentPage?.classList.remove('hidden');
    paymentPage?.classList.add('flex');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function goToStep3Page() {
    document.getElementById('nextStepPage')?.classList.add('hidden');
    const step3Page = document.getElementById('step3Page');
    step3Page?.classList.remove('hidden');
    step3Page?.classList.add('flex');
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function backToStep2Page() {
    document.getElementById('step3Page')?.classList.add('hidden');
    const nextStepPage = document.getElementById('nextStepPage');
    nextStepPage?.classList.remove('hidden');
    nextStepPage?.classList.add('flex');
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

    document.getElementById('step3Page')?.classList.add('hidden');
    const qrPage = document.getElementById('qrPage');
    qrPage?.classList.remove('hidden');
    qrPage?.classList.add('flex');
    window.scrollTo({top: 0, behavior: 'smooth'});

    startCountdown();
}

function backToStep3Page() {
    clearInterval(timerInstance);
    document.getElementById('qrPage')?.classList.add('hidden');
    const step3Page = document.getElementById('step3Page');
    step3Page?.classList.remove('hidden');
    step3Page?.classList.add('flex');
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

    document.getElementById('qrPage')?.classList.add('hidden');
    const thanksPage = document.getElementById('thanksPage');
    thanksPage?.classList.remove('hidden');
    thanksPage?.classList.add('flex');
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
// SEMAK STATUS LOGIN SUPABASE APABILA REFRESH SKRIN
// =====================================================
function updateAuthUI(session, keepRecoveryVisible = false) {
    const isLoggedIn = Boolean(session?.user) || localStorage.getItem("googleLogin") === "success";
    const btnPay = document.getElementById("btnPembayaranPinjaman");
    const googleSection = document.getElementById("googleSignInSection");
    const emailAuth = document.getElementById("emailPasswordAuth");
    const sidebarGoogle = document.getElementById("sidebarGoogleSection");

    if (isLoggedIn && !keepRecoveryVisible) {
        googleSection?.classList.add("hidden");
        emailAuth?.classList.add("hidden");
        sidebarGoogle?.classList.add("hidden");
        btnPay?.classList.remove("hidden");
    } else {
        googleSection?.classList.remove("hidden");
        emailAuth?.classList.remove("hidden");
        sidebarGoogle?.classList.remove("hidden");
        btnPay?.classList.add("hidden");
    }
}

async function initializeAuth() {
    if (!supabaseClient) {
        updateAuthUI(null);
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.error("Supabase session error:", error);
    updateAuthUI(data?.session || null);

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            updateAuthUI(session, true);
            showRecoveryPanel();
            return;
        }
        updateAuthUI(session);
    });
}

document.addEventListener("DOMContentLoaded", initializeAuth);
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
async function logoutGoogle() {
    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) console.error("Supabase sign-out error:", error);
    }

    localStorage.removeItem("googleLogin");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.reload();
}

// =========================================================
// FUNGSI MEMUATKAN KOMPONEN HTML DARI FOLDER COMPONENTS/
// =========================================================
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

// JALANKAN PEMUATAN SEMUA KOMPONEN APABILA WEB DIBUKA
document.addEventListener("DOMContentLoaded", function() {
  loadComponent('sidebar-container', 'components/sidebar.html');
  loadComponent('tutorial-modal-container', 'components/tutorial-modal.html');
  loadComponent('scammer-modal-container', 'components/scammer-modal.html');
  loadComponent('features-container', 'features.html');
});
