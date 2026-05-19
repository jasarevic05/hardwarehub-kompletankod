// === 1. SUPABASE KONFIGURACIJA (ZAMIJENI SA TVOJIM PODACIMA) ===
const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";

// Inicijalizacija Supabase klijenta koji radi u pozadini
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lokalne varijable za aplikaciju
let products = [];
let users = [];
let reports = [];
let isAdmin = sessionStorage.getItem('isAdminActive') === 'true';

const grid = document.getElementById('productGrid');

// === 2. POVEZIVANJE SA ONLINE BAZOM (Učitavanje podataka sa interneta) ===
async function ucitajPodatkeIzBaze() {
    try {
        // 1. Povuci sve artikle sa servera
        let { data: artikliIzBaze, error: err1 } = await _supabase.from('artikli').select('*').order('id', { ascending: false });
        if (err1) throw err1;
        products = artikliIzBaze;

        // 2. Povuci sve korisnike sa servera
        let { data: korisniciIzBaze, error: err2 } = await _supabase.from('javni_korisnici').select('*').order('id', { ascending: true });
        if (err2) throw err2;
        users = korisniciIzBaze;

        // 3. Povuci sve reporte sa servera
        let { data: reportiIzBaze, error: err3 } = await _supabase.from('reporti').select('*').order('id', { ascending: false });
        if (err3) throw err3;
        reports = reportiIzBaze;

        // Kada se sve skine sa neta, prikaži na ekranu
        render(products);
        if(isAdmin) osveziAdminPanel();
    } catch (error) {
        console.error("Greška pri povlačenju podataka sa Supabase servera:", error.message);
    }
}

// === 3. RENDEROVANJE KARTICA NA FEED-u ===
function render(productsToDisplay) {
    if(!productsToDisplay || productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    grid.innerHTML = productsToDisplay.map((p) => {
        const adminButtonHTML = isAdmin ? 
            `<button onclick="obrisiArtikalIzBaze(${p.id})" class="btn-action btn-danger full-width" style="margin-top:10px">Obriši oglas (Kršenje pravila)</button>` : '';

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

// Brisanje artikla direktno sa online servera
async function obrisiArtikalIzBaze(id) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas sa online servera?")) {
        const { error } = await _supabase.from('artikli').delete().eq('id', id);
        if(!error) {
            alert("Oglas uspješno obrisan!");
            ucitajPodatkeIzBaze(); // Ponovo povuci svježe stanje sa neta
        } else {
            alert("Greška pri brisanju: " + error.message);
        }
    }
}

// === 4. RENDEROVANJE I LOGIKA ADMIN PANELA ===
function osveziAdminPanel() {
    const tableBody = document.getElementById('adminUsersTableBody');
    const reportsContainer = document.getElementById('adminReportsContainer');

    tableBody.innerHTML = users.map((u) => {
        const brojObjava = products.filter(p => p.owner === u.username).length;
        return `
            <tr>
                <td><b>${u.name}</b></td>
                <td>@${u.username}</td>
                <td>${u.email}</td>
                <td style="text-align:center;"><b>${brojObjava}</b></td>
                <td style="color:#eab308; font-weight:800;">💰 ${u.coins} Coins</td>
                <td>
                    <button onclick="promijeniCoinseOnline(${u.id}, ${u.coins}, 50)" class="btn-coin plus">+50</button>
                    <button onclick="promijeniCoinseOnline(${u.id}, ${u.coins}, -50)" class="btn-coin minus">-50</button>
                    <button onclick="obrisiKorisnikaOnline(${u.id})" class="btn-coin minus" style="background:rgba(239,68,68,0.1); padding:5px 8px;">Ukloni</button>
                </td>
            </tr>
        `;
    }).join('');

    if(reports.length === 0) {
        reportsContainer.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:20px;">Trenutno nema otvorenih tiketa podrške.</p>`;
        return;
    }

    reportsContainer.innerHTML = reports.map((r) => `
        <div class="report-card">
            <div style="width: 80%;">
                <h5>⚠️ ${r.subject}</h5>
                <div class="meta">Od korisnika: @${r.username}</div>
                <p>"${r.message}"</p>
            </div>
            <button onclick="ZatvoriTiketOnline(${r.id})" class="btn-action btn-danger" style="padding: 6px 12px; font-size:0.8rem;">Riješeno</button>
        </div>
    `).join('');
}

async function promijeniCoinseOnline(id, trenutniCoins, iznos) {
    let noviIznos = trenutniCoins + iznos;
    if(noviIznos < 0) noviIznos = 0;
    
    const { error } = await _supabase.from('javni_korisnici').update({ coins: noviIznos }).eq('id', id);
    if(!error) ucitajPodatkeIzBaze();
}

async function obrisiKorisnikaOnline(id) {
    if(confirm("Uklanjanjem korisnika brišete ga iz online baze podataka. Nastaviti?")) {
        const { error } = await _supabase.from('javni_korisnici').delete().eq('id', id);
        if(!error) ucitajPodatkeIzBaze();
    }
}

async function ZatvoriTiketOnline(id) {
    const { error } = await _supabase.from('reporti').delete().eq('id', id);
    if(!error) ucitajPodatkeIzBaze();
}

// === 5. CENTAR ZA PODRŠKU (Slanje reporta na server) ===
const reportForm = document.getElementById('reportForm');
const reportModal = document.getElementById('reportModal');

reportForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const noviReport = {
        username: document.getElementById('repUser').value,
        subject: document.getElementById('repSubject').value,
        message: document.getElementById('repMessage').value
    };

    const { error } = await _supabase.from('reporti').insert([noviReport]);
    if(!error) {
        alert("Vaš zahtjev je poslan na server! Admin tim će ga pregledati.");
        reportForm.reset();
        reportModal.style.display = 'none';
        ucitajPodatkeIzBaze();
    } else {
        alert("Greška: " + error.message);
    }
});

// === 6. LOGIKA ZA OBJAVU ARTIKALA (Slanje artikla na server) ===
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
        reader.onload = async function(e) {
            const noviArtikal = {
                name: novoIme, price: novaCijena, category: novaKategorija, owner: vlasnik,
                brand: noviBrend, condition: stanje, specs: noveSpecifikacije, img: e.target.result 
            };
            
            // Šaljemo direktno u Supabase bazu na internetu
            const { error } = await _supabase.from('artikli').insert([noviArtikal]);
            if(!error) {
                alert("Artikal uspješno sačuvan na online serveru!");
                sellForm.reset();
                sellModal.style.display = "none";
                ucitajPodatkeIzBaze(); // Osvježi feed za sve
            } else {
                alert("Greška na serveru: " + error.message);
            }
        };
        reader.readAsDataURL(fajl);
    }
});

// === 7. REGISTRACIJA I SLANJE EMAILJS ===
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

    emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
        .then(async function() {
            alert("Uspješna registracija! Potvrda je poslana na email.");
            
            const noviUser = {
                name: templateParams.ime + " " + templateParams.prezime,
                username: templateParams.username,
                email: templateParams.email_korisnika,
                coins: 100 
            };

            // Spasi korisnika na online Supabase server
            const { error } = await _supabase.from('javni_korisnici').insert([noviUser]);
            if(error) console.log("Korisnik već postoji ili je baza odbila: ", error.message);

            registerForm.reset();
            authModal.style.display = "none";
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            ucitajPodatkeIzBaze();
        }, function(error) {
            alert("Greška pri slanju maila: " + error.text);
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        });
});

// === 8. ADMIN LOGIN I INTERFEJS ===
const adminLoginForm = document.getElementById('adminLoginForm');
const adminModal = document.getElementById('adminModal');
const logoutBtn = document.getElementById('logoutBtn');

function proveriAdminInterfejs() {
    const adminBadge = document.getElementById('adminBadge');
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

// === 9. FILTRIRANJE I PRETRAGA ===
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

// === 10. OTVARANJE I ZATVARANJE MODALA ===
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

// Pokretanje aplikacije i povlačenje podataka sa neta
window.onload = () => {
    proveriAdminInterfejs();
    ucitajPodatkeIzBaze(); 
};