// --- 1. POČETNI PODACI (Ako je localStorage prazan) ---
const defaultProducts = [
    { name: "NVIDIA RTX 4070 Ti", price: 1650, category: "GPU", brand: "NVIDIA", condition: "Novo", owner: "pro_gamer", specs: "12GB GDDR6X, vrhunska kartica za 1440p i 4K gaming. Kupljena nova, garancija 2 godine.", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Ryzen 7 7800X3D", price: 850, category: "CPU", brand: "AMD", condition: "Novo", owner: "hardware_fan", specs: "8 jezgri, 16 threadova, najbolji procesor za gaming na svijetu trenutno. Fabričko pakovanje.", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141" }
];

const defaultUsers = [
    { name: "Amar Softić", username: "pro_gamer", email: "amar@test.com", coins: 250 },
    { name: "Emina Spahić", username: "hardware_fan", email: "emina@test.com", coins: 120 }
];

// Povlačenje baza podataka iz localStorage / sessionStorage
let products = JSON.parse(localStorage.getItem('hardware_products')) || defaultProducts;
let users = JSON.parse(localStorage.getItem('hardware_users')) || defaultUsers;
let reports = JSON.parse(localStorage.getItem('hardware_reports')) || [];
let isAdmin = sessionStorage.getItem('isAdminActive') === 'true';

const grid = document.getElementById('productGrid');

// --- 2. RENDEROVANJE KARTICA NA FEED-u ---
function render(productsToDisplay) {
    if(productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    grid.innerHTML = productsToDisplay.map((p, index) => {
        // Ako je prijavljen admin, ubaci crveno dugme za brisanje
        const adminButtonHTML = isAdmin ? 
            `<button onclick="obrisiArtikal(${index})" class="btn-action btn-danger full-width" style="margin-top:10px">Obriši oglas (Kršenje pravila)</button>` : '';

        return `
            <div class="card">
                <div>
                    <img src="${p.img}">
                    <h4>${p.name}</h4>
                    <div class="card-meta">
                        <span>Objavio: <b style="color:#3b82f6;">${p.owner || 'Gost'}</b></span>
                        <span class="badge-condition">${p.condition}</span>
                    </div>
                    <p class="specs">${p.specs}</p>
                </div>
                <div>
                    <p class="price">${p.price} KM</p>
                    <button class="btn-action secondary full-width" style="margin-top:15px">Pogledaj detalje</button>
                    ${adminButtonHTML}
                </div>
            </div>
        `;
    }).join('');
}

// Funkcija za admin brisanje artikla sa feeda
function obrisiArtikal(index) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas sa sistema?")) {
        products.splice(index, 1);
        localStorage.setItem('hardware_products', JSON.stringify(products));
        render(products);
        if(isAdmin) osveziAdminPanel(); // Osvježi brojače u panelu ako je otvoren
    }
}


// --- 3. RENDEROVANJE I LOGIKA ADMIN PANELA ---
function osveziAdminPanel() {
    const tableBody = document.getElementById('adminUsersTableBody');
    const reportsContainer = document.getElementById('adminReportsContainer');

    // Punjenje tabele korisnika
    tableBody.innerHTML = users.map((u, idx) => {
        const brojObjava = products.filter(p => p.owner === u.username).length;
        return `
            <tr>
                <td><b>${u.name}</b></td>
                <td>@${u.username}</td>
                <td>${u.email}</td>
                <td style="text-align:center;"><b>${brojObjava}</b></td>
                <td style="color:#eab308; font-weight:800;">💰 ${u.coins} Coins</td>
                <td>
                    <button onclick="promijeniCoinse(${idx}, 50)" class="btn-coin plus">+50</button>
                    <button onclick="promijeniCoinse(${idx}, -50)" class="btn-coin minus">-50</button>
                    <button onclick="obrisiKorisnika(${idx})" class="btn-coin minus" style="background:rgba(239,68,68,0.1); padding:5px 8px;">Ukloni</button>
                </td>
            </tr>
        `;
    }).join('');

    // Punjenje inboxa za podršku (Reports)
    if(reports.length === 0) {
        reportsContainer.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:20px;">Trenutno nema otvorenih tiketa podrške.</p>`;
        return;
    }

    reportsContainer.innerHTML = reports.map((r, idx) => `
        <div class="report-card">
            <div style="width: 80%;">
                <h5>⚠️ ${r.subject}</h5>
                <div class="meta">Od korisnika: @${r.username}</div>
                <p>"${r.message}"</p>
            </div>
            <button onclick="ZatvoriTiket(${idx})" class="btn-action btn-danger" style="padding: 6px 12px; font-size:0.8rem;">Riješeno</button>
        </div>
    `).join('');
}

// Funkcije unutar admin panela
function promijeniCoinse(index, iznos) {
    users[index].coins = (users[index].coins || 0) + iznos;
    if(users[index].coins < 0) users[index].coins = 0; 
    localStorage.setItem('hardware_users', JSON.stringify(users));
    osveziAdminPanel();
}

function obrisiKorisnika(index) {
    if(confirm("Uklanjanjem korisnika brišete i njegove podatke iz baze. Nastaviti?")) {
        users.splice(index, 1);
        localStorage.setItem('hardware_users', JSON.stringify(users));
        osveziAdminPanel();
    }
}

function ZatvoriTiket(index) {
    reports.splice(index, 1);
    localStorage.setItem('hardware_reports', JSON.stringify(reports));
    osveziAdminPanel();
}


// --- 4. CENTAR ZA PODRŠKU (Korisnički Submit) ---
const reportForm = document.getElementById('reportForm');
const reportModal = document.getElementById('reportModal');

reportForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const noviReport = {
        username: document.getElementById('repUser').value,
        subject: document.getElementById('repSubject').value,
        message: document.getElementById('repMessage').value
    };

    reports.push(noviReport);
    localStorage.setItem('hardware_reports', JSON.stringify(reports));

    alert("Vaš zahtjev je poslan admin timu! Pregledat ćemo ga u najkraćem roku.");
    reportForm.reset();
    reportModal.style.display = 'none';
});


// --- 5. LOGIKA ZA OBJAVU ARTIKALA (FileReader za slike) ---
const sellForm = document.getElementById('sellForm');
const sellModal = document.getElementById('sellModal');

sellForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const novoIme = document.getElementById('prodName').value;
    const vlasnik = document.getElementById('prodOwner').value; 
    const noviBrend = document.getElementById('prodBrand').value;
    const novaKategorija = document.getElementById('prodCategory').value;
    const novaCijena = parseFloat(document.getElementById('prodPrice').value);
    const noveSpecifikacije = document.getElementById('prodSpecs').value;
    const stanje = document.querySelector('input[name="prodCondition"]:checked').value;
    const slikaInput = document.getElementById('prodImgFile');
    const fajl = slikaInput.files[0];

    if (fajl) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const noviArtikal = {
                name: novoIme, price: novaCijena, category: novaKategorija, owner: vlasnik,
                brand: noviBrend, condition: stanje, specs: noveSpecifikacije, img: e.target.result 
            };
            products.unshift(noviArtikal);
            localStorage.setItem('hardware_products', JSON.stringify(products));
            render(products);
            sellForm.reset();
            sellModal.style.display = "none";
            alert("Vaš artikal je uspješno objavljen!");
        };
        reader.readAsDataURL(fajl);
    }
});


// --- 6. REGISTRACIJA I SLANJE EMAILJS KORISTEĆI TVOJE KLJUČEVE ---
// Inicijalizacija sa tvojim tačnim Public Key-om
emailjs.init("ulfQJccZt4N0kFq78"); 

const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');
const authModal = document.getElementById('authModal');

registerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    btnRegister.innerText = "Slanje...";
    btnRegister.disabled = true;

    const templateParams = {
        ime: document.getElementById('regName').value,
        prezime: document.getElementById('regSurname').value,
        username: document.getElementById('regUsername').value,
        email_korisnika: document.getElementById('regEmail').value,
        datum: document.getElementById('regDob').value
    };

    // Slanje maila preko tvog Service ID-a i Template ID-a
    emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
        .then(function() {
            alert("Uspješna registracija! Potvrda je poslana na email.");
            
            // Nakon uspješnog maila, spašavamo usera lokalno
            const noviUser = {
                name: templateParams.ime + " " + templateParams.prezime,
                username: templateParams.username,
                email: templateParams.email_korisnika,
                coins: 100 // Poklon dobrodošlice
            };

            // Spriječi duplanje ako isti klikne dvaput
            if(!users.some(u => u.username === noviUser.username)) {
                users.push(noviUser);
                localStorage.setItem('hardware_users', JSON.stringify(users));
            }

            registerForm.reset();
            authModal.style.display = "none";
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        }, function(error) {
            alert("Greška pri slanju maila: " + error.text);
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        });
});


// --- 7. ADMIN LOGIN I KONTROLA INTERFEJSA ---
const adminLoginForm = document.getElementById('adminLoginForm');
const adminModal = document.getElementById('adminModal');
const logoutBtn = document.getElementById('logoutBtn');

function proveriAdminInterfejs() {
    const adminBadge = document.getElementById('adminBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const openAuthBtn = document.getElementById('openAuth');
    const openAdminPanelBtn = document.getElementById('openAdminPanelBtn');

    if (isAdmin) {
        adminBadge.style.display = 'block';
        logoutBtn.style.display = 'block';
        openAdminPanelBtn.style.display = 'block'; 
        openAuthBtn.style.display = 'none';
    } else {
        adminBadge.style.display = 'none';
        logoutBtn.style.display = 'none';
        openAdminPanelBtn.style.display = 'none';
        openAuthBtn.style.display = 'block';
    }
}

adminLoginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const uName = document.getElementById('adminUser').value;
    const uPass = document.getElementById('adminPass').value;

    if(uName === "admin" && uPass === "admin123") {
        isAdmin = true;
        sessionStorage.setItem('isAdminActive', 'true');
        alert("Dobrodošli nazad, šefe!");
        adminLoginForm.reset();
        adminModal.style.display = 'none';
        proveriAdminInterfejs();
        osveziAdminPanel();
        render(products);
    } else {
        alert("Pogrešni administrativni podaci!");
    }
});

logoutBtn.onclick = () => {
    isAdmin = false;
    sessionStorage.removeItem('isAdminActive');
    alert("Admin mod deaktiviran.");
    proveriAdminInterfejs();
    render(products);
};


// --- 8. FILTRIRANJE I PRETRAGA ---
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const filterBrand = document.getElementById('filterBrand');
const filterMinPrice = document.getElementById('filterMinPrice');
const filterMaxPrice = document.getElementById('filterMaxPrice');
const filterNew = document.getElementById('filterNew');
const filterUsed = document.getElementById('filterUsed');
const btnApplyFilters = document.getElementById('btnApplyFilters');
const btnResetFilters = document.getElementById('btnResetFilters');

function filtrirajSve() {
    const searchText = searchInput.value.toLowerCase();
    const odabranaKategorija = filterCategory.value;
    const odabraniBrend = filterBrand.value;
    const minCijena = parseFloat(filterMinPrice.value) || 0;
    const maxCijena = parseFloat(filterMaxPrice.value) || Infinity;
    const traziNovo = filterNew.checked;
    const traziPolovno = filterUsed.checked;

    const filtrirani = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchText) || 
                              p.brand.toLowerCase().includes(searchText) || 
                              p.specs.toLowerCase().includes(searchText);

        const matchesCategory = (odabranaKategorija === "Sve") || (p.category === odabranaKategorija);
        const matchesBrand = (odabraniBrend === "Sve") || (p.brand === odabraniBrend);
        const matchesPrice = p.price >= minCijena && p.price <= maxCijena;

        let matchesCondition = true;
        if (traziNovo && !traziPolovno) matchesCondition = p.condition === "Novo";
        if (traziPolovno && !traziNovo) matchesCondition = p.condition === "Polovno";

        return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesCondition;
    });

    render(filtrirani);
}

searchInput.addEventListener('input', filtrirajSve);
btnApplyFilters.onclick = () => { filtrirajSve(); filterModal.style.display = "none"; };
btnResetFilters.onclick = () => {
    filterCategory.value = "Sve"; filterBrand.value = "Sve";
    filterMinPrice.value = ""; filterMaxPrice.value = "";
    filterNew.checked = false; filterUsed.checked = false;
    filtrirajSve();
};


// --- 9. OTVARANJE I ZATVARANJE SVIH MODALA ---
const filterModal = document.getElementById("filterModal");
const btnFilter = document.getElementById("openFilters");
const spanFilter = document.getElementById("closeFilters");
btnFilter.onclick = () => filterModal.style.display = "block";
spanFilter.onclick = () => filterModal.style.display = "none";

const btnAuth = document.getElementById("openAuth");
const spanAuth = document.getElementById("closeAuth");
btnAuth.onclick = () => authModal.style.display = "block";
spanAuth.onclick = () => authModal.style.display = "none";

const btnSell = document.getElementById("openSell");
const spanSell = document.getElementById("closeSell");
btnSell.onclick = () => sellModal.style.display = "block";
spanSell.onclick = () => sellModal.style.display = "none";

const linkAdminLogin = document.getElementById('linkAdminLogin');
const spanAdmin = document.getElementById("closeAdmin");
linkAdminLogin.onclick = (e) => { e.preventDefault(); authModal.style.display = 'none'; adminModal.style.display = 'block'; };
spanAdmin.onclick = () => adminModal.style.display = "none";

const openReportBtn = document.getElementById('openReportBtn');
const closeReport = document.getElementById('closeReport');
openReportBtn.onclick = () => reportModal.style.display = 'block';
closeReport.onclick = () => reportModal.style.display = 'none';

const openAdminPanelBtn = document.getElementById('openAdminPanelBtn');
const adminPanelModal = document.getElementById('adminPanelModal');
const closeAdminPanel = document.getElementById('closeAdminPanel');
openAdminPanelBtn.onclick = () => { adminPanelModal.style.display = 'block'; osveziAdminPanel(); };
closeAdminPanel.onclick = () => adminPanelModal.style.display = 'none';

window.onclick = (event) => {
    if (event.target == filterModal) filterModal.style.display = "none";
    if (event.target == authModal) authModal.style.display = "none";
    if (event.target == sellModal) sellModal.style.display = "none";
    if (event.target == adminModal) adminModal.style.display = "none";
    if (event.target == reportModal) reportModal.style.display = "none";
    if (event.target == adminPanelModal) adminPanelModal.style.display = "none";
}

// --- Pokretanje svega pri učitavanju prozora ---
window.onload = () => {
    proveriAdminInterfejs();
    if(isAdmin) osveziAdminPanel();
    render(products);
};