"use strict";

// Existing payment choices and QR asset are preserved.
const BANKS = [
  {id:'tng', name:"Touch 'n Go eWallet", cat:'duitnow', initials:'TNG', color:'#1E88E5', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9011'},
  {id:'maybank_qr', name:'Maybank QRPay', cat:'duitnow', initials:'MBB', color:'#FFCC00', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9012'},
  {id:'rhb_qr', name:'RHB QRPay', cat:'duitnow', initials:'RHB', color:'#005EB8', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9013'},
  {id:'cimb_qr', name:'CIMB QRPay', cat:'duitnow', initials:'CIMB', color:'#E30613', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9014'},
  {id:'boost', name:'Boost', cat:'duitnow', initials:'BST', color:'#000', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9015'},
  {id:'grabpay', name:'GrabPay', cat:'duitnow', initials:'GRAB', color:'#00B14F', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1234 5678 9016'},
  {id:'cimb_online', name:'CIMB Clicks', cat:'online', initials:'CIMB', color:'#E30613', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'8604 1234 5678'},
  {id:'muamalat', name:'Bank Muamalat', cat:'online', initials:'MMLT', color:'#0D6E3F', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1401 1234 5678'},
  {id:'public_bank', name:'Public Bank', cat:'online', initials:'PBB', color:'#D50000', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'3810 1234 5678'},
  {id:'bsn', name:'BSN Bank', cat:'online', initials:'BSN', color:'#003A8C', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1410 1234 5678'},
  {id:'ambank', name:'AmBank', cat:'online', initials:'AM', color:'#C41230', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'8881 1234 5678'},
  {id:'alliance', name:'Alliance Bank', cat:'online', initials:'ALB', color:'#002B6A', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'1201 1234 5678'},
  {id:'ocbc', name:'OCBC Bank', cat:'online', initials:'OCBC', color:'#E60012', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'7071 1234 5678'},
  {id:'maybank2u', name:'Maybank2u', cat:'online', initials:'MB2U', color:'#FFCC00', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'5123 1234 5678'},
  {id:'hongleong', name:'Hong Leong Bank', cat:'online', initials:'HLB', color:'#0A4AA6', logoUrl:'', owner:'DuitJom Sdn Bhd', acc:'0390 1234 5678'},
];

const QR_SOURCE = "../F534F3AA-ACF5-40DB-BEF0-7300EC9FA735.jpeg";
const SESSION_SECONDS = 119;
let activeTab = "duitnow";
let selectedBank = null;
let countdownInterval = null;
let clockInterval = null;
let verifyTimeout = null;
let noticeTimeout = null;
let expiresAt = 0;
let timeLeft = SESSION_SECONDS;
let currentRef = "";
let amount = 350;

const el = id => document.getElementById(id);
const formatAmount = value => new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(value);
const validAmount = () => Number.isFinite(amount) && amount > 0;

function generateNoRef() {
  if (currentRef) return currentRef;
  try { currentRef = sessionStorage.getItem("dj_noref") || ""; } catch {}
  if (!currentRef) {
    currentRef = "iP8-" + Math.floor(10000000 + Math.random() * 90000000) + "-DJO";
    try { sessionStorage.setItem("dj_noref", currentRef); } catch {}
  }
  return currentRef;
}

function startRealtimeClock() {
  function updateClock() {
    el("realtimeClock").textContent = new Date().toLocaleString("ms-MY", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit",
      minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur"
    });
  }
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateContinueButton() {
  const canContinue = selectedBank && selectedBank.cat === activeTab && validAmount();
  el("continueBtn").disabled = !canContinue;
  el("continueText").textContent = canContinue
    ? "Teruskan · RM " + formatAmount(amount) : "Pilih bank untuk teruskan";
}

function switchTab(tab) {
  if (!["duitnow", "online", "transfer"].includes(tab)) return;
  closeDropdown();
  if (tab !== activeTab) {
    selectedBank = null;
    el("selectedCard").hidden = true;
    el("dropdownText").textContent = "Sila pilih bank atau e-wallet";
    el("dropdownText").classList.add("placeholder");
  }
  activeTab = tab;
  for (const method of ["duitnow", "online", "transfer"]) {
    const selected = method === tab;
    el("tab-" + method).classList.toggle("is-active", selected);
    el("tab-" + method).setAttribute("aria-selected", String(selected));
    el("tab-" + method).tabIndex = selected ? 0 : -1;
  }
  el("bankPanel").setAttribute("aria-labelledby", "tab-" + tab);
  el("dropdownBtn").disabled = tab === "transfer";
  el("methodHint").textContent = tab === "transfer"
    ? "Hubungi sokongan untuk maklumat pembayaran melalui pindahan bank."
    : "Pilihan akan ditutup secara automatik selepas anda memilih bank.";
  updateContinueButton();
  renderBankList();
  if (tab === "transfer" && !el("transferModal").open) el("transferModal").showModal();
}

function toggleDropdown() {
  const dialog = el("dropdownList");
  if (dialog.open) return closeDropdown();
  if (activeTab === "transfer") return;
  renderBankList();
  dialog.showModal();
  el("dropdownBtn").setAttribute("aria-expanded", "true");
  const selected = dialog.querySelector(".is-selected") || dialog.querySelector(".bank-option");
  selected?.focus({ preventScroll: true });
}

function closeDropdown() {
  if (el("dropdownList").open) el("dropdownList").close();
  el("dropdownBtn").setAttribute("aria-expanded", "false");
}

function bankTextColor(bank) {
  return bank.color === "#FFCC00" ? "#493b00" : "#ffffff";
}

function renderBankList() {
  el("bankListContainer").innerHTML = BANKS.filter(bank => bank.cat === activeTab).map(bank =>
    '<button type="button" class="bank-option' + (selectedBank?.id === bank.id ? " is-selected" : "") +
    '" data-bank-id="' + bank.id + '" aria-pressed="' + (selectedBank?.id === bank.id) + '">' +
    '<span class="bank-logo" style="background:' + bank.color + ";color:" + bankTextColor(bank) + '">' + bank.initials + '</span>' +
    '<span class="bank-option-name">' + bank.name + '</span>' +
    '<span class="bank-option-check" aria-hidden="true">' +
    (selectedBank?.id === bank.id ? '<svg class="icon"><use href="#icon-check"/></svg>' : "") +
    '</span></button>'
  ).join("");
}

function selectBank(id) {
  const bank = BANKS.find(item => item.id === id && item.cat === activeTab);
  if (!bank) return;
  selectedBank = bank;
  el("dropdownText").textContent = bank.name;
  el("dropdownText").classList.remove("placeholder");
  el("selectedCard").hidden = false;
  el("selectedLogo").style.background = bank.color;
  el("selectedLogo").style.color = bankTextColor(bank);
  el("selectedLogo").textContent = bank.initials;
  el("selectedName").textContent = bank.name;
  el("selectedOwner").textContent = bank.owner;
  updateContinueButton();
  // Close the bank dropdown as soon as a choice is selected.
  closeDropdown();
  el("dropdownBtn").focus({ preventScroll: true });
}

function prepareQRDownloads() {
  const fileName = "DuitJom-QR-" + generateNoRef().replace(/[^a-zA-Z0-9_-]/g, "") + ".jpeg";
  for (const id of ["qrDownloadButton", "qrDownloadLink"]) {
    el(id).href = new URL(QR_SOURCE, document.baseURI).href;
    el(id).download = fileName;
  }
}

function goToQR() {
  if (!selectedBank || selectedBank.cat !== activeTab || !validAmount()) return;
  closeDropdown();
  el("selectionPage").hidden = true;
  el("qrPage").hidden = false;
  el("qrBankName").textContent = selectedBank.name;
  el("qrOwnerName").textContent = selectedBank.owner;
  el("qrAccountNo").textContent = selectedBank.acc;
  el("qrJumlah").textContent = formatAmount(amount);
  el("qrRefDisplay").textContent = generateNoRef();
  el("qrLogo").style.background = selectedBank.color;
  el("qrLogo").style.color = bankTextColor(selectedBank);
  el("qrLogo").textContent = selectedBank.initials;
  el("qrImage").src = QR_SOURCE;
  el("qrPreviewImage").src = QR_SOURCE;
  el("fileInput").value = "";
  el("fileName").textContent = "PNG, JPG atau PDF · Maksimum 5MB";
  el("fileError").hidden = true;
  el("uploadBtn").disabled = true;
  prepareQRDownloads();
  startCountdown();
  window.scrollTo(0, 0);
}

function openQRPreview() {
  if (el("qrPage").hidden || timeLeft <= 0) return;
  prepareQRDownloads();
  const dialog = el("qrPreview");
  if (!dialog.open) dialog.showModal();
  const viewport = el("qrPreviewViewport");
  requestAnimationFrame(() => {
    viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
    viewport.scrollTop = 0;
  });
  // Same-origin download runs directly within the customer's click.
  // The QR bytes are downloaded unchanged; no QR is regenerated.
  el("qrDownloadLink").click();
}

function closeQRPreview() {
  if (el("qrPreview").open) el("qrPreview").close();
}

function backToSelection() {
  clearInterval(countdownInterval);
  clearTimeout(verifyTimeout);
  for (const id of ["qrPreview", "verifyModal"]) {
    if (el(id).open) el(id).close();
  }
  el("qrPage").hidden = true;
  el("selectionPage").hidden = false;
  timeLeft = SESSION_SECONDS;
  updateCountdownDisplay();
  window.scrollTo(0, 0);
}

function updateCountdownDisplay() {
  el("countdown").textContent = Math.floor(timeLeft / 60) + ":" + String(timeLeft % 60).padStart(2, "0");
  el("countdownProgress").style.width = (timeLeft / SESSION_SECONDS * 100) + "%";
  el("countdown").parentElement.classList.toggle("is-urgent", timeLeft <= 30);
}

function tickCountdown() {
  timeLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  updateCountdownDisplay();
  if (timeLeft === 0) {
    backToSelection();
    showNotice("Masa pembayaran tamat. Sila pilih bank untuk mencuba semula.");
  }
}

function startCountdown() {
  clearInterval(countdownInterval);
  timeLeft = SESSION_SECONDS;
  expiresAt = Date.now() + SESSION_SECONDS * 1000;
  updateCountdownDisplay();
  countdownInterval = setInterval(tickCountdown, 1000);
}

function showNotice(message) {
  clearTimeout(noticeTimeout);
  el("pageNotice").textContent = message;
  el("pageNotice").hidden = false;
  noticeTimeout = setTimeout(() => { el("pageNotice").hidden = true; }, 5000);
}

function onFileSelected(input) {
  const file = input.files[0];
  el("uploadBtn").disabled = true;
  el("fileError").hidden = true;
  if (!file) {
    el("fileName").textContent = "PNG, JPG atau PDF · Maksimum 5MB";
    return;
  }
  if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    input.value = "";
    el("fileName").textContent = "PNG, JPG atau PDF · Maksimum 5MB";
    el("fileError").textContent = "Sila pilih fail PNG, JPG atau PDF yang tidak melebihi 5MB.";
    el("fileError").hidden = false;
    return;
  }
  el("fileName").textContent = file.name;
  el("uploadBtn").disabled = false;
}

// Preserve the existing receipt review flow and timing.
function startUpload() {
  if (!el("fileInput").files.length || el("uploadBtn").disabled || el("verifyModal").open) return;
  clearInterval(countdownInterval);
  el("verifyLoading").hidden = false;
  el("verifySuccess").hidden = true;
  el("verifyModal").showModal();
  verifyTimeout = setTimeout(() => {
    el("verifyLoading").hidden = true;
    el("verifySuccess").hidden = false;
  }, 5000);
}

function goToLogin() {
  clearTimeout(verifyTimeout);
  window.location.href = "../index.html";
}

function closeTransferModal() {
  if (el("transferModal").open) el("transferModal").close();
}

function contactWhatsapp() {
  window.open("https://wa.me/601168462807?text=PMDuitJom", "_blank", "noopener,noreferrer");
}

function closeOnBackdrop(dialog, close) {
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom)) close();
  });
}

function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("nama")) el("namaDisplay").textContent = params.get("nama");
  if (params.get("id")) el("idDisplay").textContent = params.get("id");
  if (params.has("jumlah")) amount = Number(params.get("jumlah"));
  el("jumlahDisplay").textContent = validAmount() ? formatAmount(amount) : "—";
  el("qrJumlah").textContent = el("jumlahDisplay").textContent;
  el("noRefDisplay").textContent = generateNoRef();
  startRealtimeClock();
  renderBankList();
  updateContinueButton();
  if (!validAmount()) showNotice("Jumlah bayaran tidak sah. Sila kembali ke borang pelanggan.");

  el("bankListContainer").addEventListener("click", event => {
    const option = event.target.closest("[data-bank-id]");
    if (option) selectBank(option.dataset.bankId);
  });
  el("dropdownList").addEventListener("close", () => {
    el("dropdownBtn").setAttribute("aria-expanded", "false");
  });
  el("qrPreview").addEventListener("close", () => {
    if (!el("qrPage").hidden) el("qrImageButton").focus({ preventScroll: true });
  });
  closeOnBackdrop(el("dropdownList"), closeDropdown);
  closeOnBackdrop(el("qrPreview"), closeQRPreview);
  closeOnBackdrop(el("transferModal"), closeTransferModal);
  el("verifyModal").addEventListener("cancel", event => event.preventDefault());

  document.querySelector(".method-tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = ["duitnow", "online", "transfer"];
    const current = tabs.indexOf(activeTab);
    const index = event.key === "Home" ? 0 : event.key === "End" ? 2 :
      (current + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    switchTab(tabs[index]);
    if (!el("transferModal").open) el("tab-" + tabs[index]).focus();
  });
  el("tab-online").tabIndex = -1;
  el("tab-transfer").tabIndex = -1;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !el("qrPage").hidden && !el("verifyModal").open) tickCountdown();
  });
  window.addEventListener("pagehide", () => {
    clearInterval(countdownInterval);
    clearInterval(clockInterval);
    clearTimeout(verifyTimeout);
    clearTimeout(noticeTimeout);
  });
}

init();
