// --- 1. POČETNI PODACI (Baze) ---
const defaultProducts = [
    { id: 1, name: "NVIDIA RTX 4070 Ti", price: 1650, category: "GPU", brand: "NVIDIA", condition: "Novo", owner: "pro_gamer", specs: "12GB GDDR6X, vrhunska kartica za 1440p i 4K gaming. Kupljena nova, garancija 2 godine.", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704", views: 42, promote: "main" },
    { id: 2, name: "Ryzen 7 7800X3D", price: 850, category: "CPU", brand: "AMD", condition: "Novo", owner: "hardware_fan", specs: "8 jezgri, 16 threadova, najbolji procesor za gaming na svijetu trenutno. Fabričko pakovanje.", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141", views: 19, promote: "none" }
];

const defaultUsers = [
    { name: "Amar Softić", username: "pro_gamer", email: "amar@test.com", password: "123", coins: 250 },
    { name: "Emina Spahić", username: "hardware_fan", email: "emina@test.com", password: "123", coins: 120 }
];

let products = JSON.parse(localStorage.getItem('hardware_products')) || defaultProducts;
let users = JSON.parse(localStorage.getItem('hardware_users')) || defaultUsers;
let reports = JSON.parse(localStorage.getItem('hardware_reports')) || [];
let chats = JSON.parse(localStorage.getItem('hardware_chats')) || [];

let isAdmin = sessionStorage.getItem('isAdminActive') === 'true';
let currentUser = JSON.parse(sessionStorage.getItem('currentUserActive')) || null;
let activeChatUser = null; 

const grid = document.getElementById('productGrid');

// --- 2. RENDEROVANJE KARTICA NA FEED-U SA IZDVAJANJEM ---
function render(productsToDisplay, currentCategoryFilter = "Sve") {
    if(!grid) return;
    if(productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    // SORTIRANJE: Prvo idu izdvajanja na Main Page, pa onda izdvajanja u kategoriji (ako se podudara sa filterom), pa obični oglasi
    let sortiraniProizvodi = [...productsToDisplay].sort((a, b) => {
        let nivoA = 0;
        let nivoB = 0;

        if (a.promote === 'main') nivoA = 3;
        else if (a.promote === 'category' && currentCategoryFilter !== "Sve") nivoA = 2;
        else if (a.promote === 'category') nivoA = 1;

        if (b.promote === 'main') nivoB = 3;
        else if (b.promote === 'category' && currentCategoryFilter !== "Sve") nivoB = 2;
        else if (b.promote === 'category') nivoB = 1;

        return nivoB - nivoA; 
    });

    grid.innerHTML = sortiraniProizvodi.map((p) => {
        const indexUBazi = products.findIndex(realP => realP.id === p.id);
        const adminButtonHTML = isAdmin ? 
            `<button onclick="obrisiArtikal(${indexUBazi})" class="btn-action btn-danger full-width" style="margin-top:10px">Obriši oglas (Admin)</button>` : '';

        let klasaIzdvojenog = '';
        let bedzIzdvojenog = '';
        if(p.promote === 'main') {
            klasaIzdvojenog = 'featured-main';
            bedzIzdvojenog = `<span class="badge-featured">⭐ TOP Ponuda</span>`;
        } else if (p.promote === 'category') {
            klasaIzdvojenog = 'featured-category';
            bedzIzdvojenog = `<span class="badge-featured" style="background:#a855f7; color:white;">💎 Izdvojeno</span>`;
        }

        return `
            <div class="card ${klasaIzdvojenog}">
                ${bedzIzdvojenog}
                <div>
                    <img src="${p.img}">
                    <h4>${p.name}</h4>
                    <div class="card-meta">
                        <span>Objavio: <b style="color:#3b82f6;">@${p.owner || 'Gost'}</b></span>
                        <span class="badge-condition">${p.condition}</span>
                    </div>
                    <p class="specs">${p.specs}</p>
                </div>
                <div>
                    <p class="price">${p.price} KM</p>
                    <button onclick="otvoriDetaljeArtikla(${p.id})" class="btn-action secondary full-width" style="margin-top:15px">Pogledaj detalje</button>
                    ${adminButtonHTML}
                </div>
            </div>
        `;
    }).join('');
}

function obrisiArtikal(index) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas?")) {
        products.splice(index, 1);
        localStorage.setItem('hardware_products', JSON.stringify(products));
        render(products);
        if(isAdmin) osveziAdminPanel();
    }
}

// --- 3. LOGIKA ZA PREGLED DETALJA ARTIKLA ---
function otvoriDetaljeArtikla(id) {
    const artikal = products.find(p => p.id === id);
    if(!artikal) return;

    // Povećaj broj pregleda
    artikal.views = (artikal.views || 0) + 1;
    localStorage.setItem('hardware_products', JSON.stringify(products));

    // Popuni podatke u modalu
    document.getElementById('detTitle').innerText = artikal.name;
    document.getElementById('detImg').src = artikal.img;
    document.getElementById('detPrice').innerText = `${artikal.price} KM`;
    document.getElementById('detCondition').innerText = artikal.condition;
    document.getElementById('detCategory').innerText = artikal.category;
    document.getElementById('detBrand').innerText = artikal.brand;
    document.getElementById('detSpecs').innerText = artikal.specs;
    document.getElementById('detOwner').innerText = `@${artikal.owner}`;
    document.getElementById('detViews').innerText = `👁️ ${artikal.views} pregleda`;

    const chatBtn = document.getElementById('btnOpenChat');
    
    // Ako je korisnik vlasnik svog oglasa, sakrij dugme za chat sa samim sobom
    if(currentUser && currentUser.username === artikal.owner) {
        chatBtn.style.display = 'none';
    } else {
        chatBtn.style.display = 'block';
        chatBtn.onclick = () => {
            if(!currentUser) {
                alert("Morate se prijaviti da biste poslali poruku vlasniku!");
                document.getElementById('detailsModal').style.display = 'none';
                document.getElementById('authModal').style.display = 'block';
                return;
            }
            document.getElementById('detailsModal').style.display = 'none';
            otvoriProfilIKomunikaciju(artikal.owner);
        };
    }

    document.getElementById('detailsModal').style.display = 'block';
    render(products);
}

// --- 4. PRIVATNE PORUKE I PROFIL ---
function otvoriProfilIKomunikaciju(saKorisnikom = null) {
    if(!currentUser) return;

    document.getElementById('profName').innerText = currentUser.name;
    document.getElementById('profUsername').innerText = `@${currentUser.username}`;
    document.getElementById('profEmail').innerText = currentUser.email;
    document.getElementById('profCoins').innerText = `💰 ${currentUser.coins} Coins`;

    document.getElementById('profileModal').style.display = 'block';
    osveziChatListu(saKorisnikom);
}

function osveziChatListu(selektujKorisnika = null) {
    const listContainer = document.getElementById('chatUsersList');
    if(!listContainer) return;

    // Pronađi sve ljude s kojima trenutni korisnik ima istoriju poruka
    let kontakti = [];
    chats.forEach(c => {
        if(c.sender === currentUser.username && !kontakti.includes(c.receiver)) kontakti.push(c.receiver);
        if(c.receiver === currentUser.username && !kontakti.includes(c.sender)) kontakti.push(c.sender);
    });

    if(selektujKorisnika && !kontakti.includes(selektujKorisnika)) {
        kontakti.unshift(selektujKorisnika);
    }

    if(kontakti.length === 0) {
        listContainer.innerHTML = `<p style="color:var(--text-dim); font-size:0.8rem; text-align:center; padding:10px;">Nemate otvorenih razgovora.</p>`;
        prikaziPorukeZaKorisnika(null);
        return;
    }

    if(!activeChatUser || selektujKorisnika) {
        activeChatUser = selektujKorisnika || kontakti[0];
    }

    listContainer.innerHTML = kontakti.map(k => `
        <div class="chat-user-item ${k === activeChatUser ? 'active' : ''}" onclick="promijeniAktivniChat('${k}')">
            👤 @${k}
        </div>
    `).join('');

    prikaziPorukeZaKorisnika(activeChatUser);
}

function promijeniAktivniChat(korisnik) {
    activeChatUser = korisnik;
    osveziChatListu();
}

function prikaziPorukeZaKorisnika(sagovornik) {
    const msgContainer = document.getElementById('chatMessages');
    if(!msgContainer) return;

    if(!sagovornik) {
        msgContainer.innerHTML = `<p style="color:var(--text-dim); text-align:center; margin-top:50px;">Odaberite chat da biste započeli razgovor.</p>`;
        return;
    }

    // Filtriraj poruke između nas dvoje
    const filtriranePoruke = chats.filter(c => 
        (c.sender === currentUser.username && c.receiver === sagovornik) ||
        (c.sender === sagovornik && c.receiver === currentUser.username)
    );

    msgContainer.innerHTML = filtriranePoruke.map(m => {
        const klasa = m.sender === currentUser.username ? 'sent' : 'received';
        return `<div class="msg-bubble ${klasa}">${m.text}</div>`;
    }).join('');

    msgContainer.scrollTop = msgContainer.scrollHeight;
}

const chatForm = document.getElementById('chatForm');
if(chatForm) {
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const tekst = input.value.trim();

        if(!tekst || !activeChatUser) return;

        const novaPoruka = {
            sender: currentUser.username,
            receiver: activeChatUser,
            text: tekst
        };

        chats.push(novaPoruka);
        localStorage.setItem('hardware_chats', JSON.stringify(chats));
        input.value = '';
        prikaziPorukeZaKorisnika(activeChatUser);
    });
}

// --- 5. LOGIKA ZA OBJAVU ARTIKALA (SA PREMIUM COIN IZBOROM) ---
const sellForm = document.getElementById('sellForm');
if(sellForm) {
    sellForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Dupla sigurnosna provjera login stanja
        if(!currentUser) {
            alert("Niste ulogovani! Morate se prijaviti.");
            document.getElementById('sellModal').style.display = "none";
            document.getElementById('authModal').style.display = "block";
            return;
        }

        const promoteTip = document.getElementById('prodPromote').value;
        let cijenaIzdvajanja = 0;
        if(promoteTip === 'category') cijenaIzdvajanja = 30;
        if(promoteTip === 'main') cijenaIzdvajanja = 60;

        // Provjera stanja novčanika
        if(currentUser.coins < cijenaIzdvajanja) {
            alert(`Nemate dovoljno Coins-a za ovu vrstu izdvajanja! Potrebno vam je ${cijenaIzdvajanja} PC, a imate ${currentUser.coins} PC.`);
            return;
        }

        const slikaInput = document.getElementById('prodImgFile');
        const fajl = slikaInput.files[0];

        if (fajl) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Skidanje coina u bazi korisnika
                if(cijenaIzdvajanja > 0) {
                    const uIdx = users.findIndex(u => u.username === currentUser.username);
                    if(uIdx !== -1) {
                        users[uIdx].coins -= cijenaIzdvajanja;
                        currentUser.coins = users[uIdx].coins;
                        localStorage.setItem('hardware_users', JSON.stringify(users));
                        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
                    }
                }

                const noviArtikal = {
                    id: Date.now(), // Unikatan ID za otvaranje detalja
                    name: document.getElementById('prodName').value,
                    price: parseFloat(document.getElementById('prodPrice').value),
                    category: document.getElementById('prodCategory').value,
                    brand: document.getElementById('prodBrand').value,
                    condition: document.querySelector('input[name="prodCondition"]:checked').value,
                    specs: document.getElementById('prodSpecs').value,
                    owner: currentUser.username, // Fiksan username iz sesije
                    img: e.target.result,
                    views: 0,
                    promote: promoteTip
                };

                products.unshift(noviArtikal);
                localStorage.setItem('hardware_products', JSON.stringify(products));
                
                sellForm.reset();
                document.getElementById('sellModal').style.display = "none";
                alert(cijenaIzdvajanja > 0 ? `Uspješno! Oglas je izdvojen i skinuto je ${cijenaIzdvajanja} Coinsa.` : "Vaš oglas je uspješno objavljen besplatno!");
                
                proveriAdminInterfejs();
                render(products);
            };
            reader.readAsDataURL(fajl);
        }
    });
}

// --- 6. REGISTRACIJA I SLANJE EMAILJS ---
emailjs.init("ulfQJccZt4N0kFq78"); 
const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');

if(registerForm) {
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        btnRegister.innerText = "Slanje...";
        btnRegister.disabled = true;

        const templateParams = {
            ime: document.getElementById('regName').value,
            prezime: document.getElementById('regSurname').value,
            username: document.getElementById('regUsername').value.trim(),
            email_korisnika: document.getElementById('regEmail').value,
            datum: document.getElementById('regDob').value
        };

        emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
            .then(function() {
                alert("Uspješna registracija! Poklon 100 PC uračunat.");
                
                const noviUser = {
                    name: templateParams.ime + " " + templateParams.prezime,
                    username: templateParams.username,
                    email: templateParams.email_korisnika,
                    password: document.getElementById('regPassword').value,
                    coins: 100 
                };

                if(!users.some(u => u.username === noviUser.username)) {
                    users.push(noviUser);
                    localStorage.setItem('hardware_users', JSON.stringify(users));
                }

                registerForm.reset();
                document.getElementById('authModal').style.display = "none";
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
                
                currentUser = noviUser;
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
                proveriAdminInterfejs();
            }, function(error) {
                alert("Greška pri slanju maila: " + error.text);
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
            });
    });
}

// --- 7. PRIJAVA, KONTROLA INTERFEJSA I PREBACIVANJE FORMI ---
const loginForm = document.getElementById('loginForm');
const authModalTitle = document.getElementById('authModalTitle');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');

if(linkToRegister && linkToLogin) {
    linkToRegister.onclick = (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authModalTitle.innerText = "Registracija novog računa"; };
    linkToLogin.onclick = (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; authModalTitle.innerText = "Prijava na sistem"; };
}

if(loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const uName = document.getElementById('loginUsername').value.trim();
        const uPass = document.getElementById('loginPassword').value;

        const pronadjeniKorisnik = users.find(u => u.username === uName);

        if(pronadjeniKorisnik) {
            if(pronadjeniKorisnik.password === uPass) {
                currentUser = pronadjeniKorisnik;
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
                alert(`Dobrodošli nazad, ${currentUser.name}!`);
                loginForm.reset();
                document.getElementById('authModal').style.display = 'none';
                proveriAdminInterfejs();
            } else { alert("Pogrešna lozinka!"); }
        } else { alert("Korisničko ime ne postoji."); }
    });
}

function proveriAdminInterfejs() {
    const adminBadge = document.getElementById('adminBadge');
    const userBadge = document.getElementById('userBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const openAuthBtn = document.getElementById('openAuth');
    const openAdminPanelBtn = document.getElementById('openAdminPanelBtn');
    const prodOwnerInput = document.getElementById('prodOwner');
    const repUserInput = document.getElementById('repUser');

    if (isAdmin) {
        if(adminBadge) adminBadge.style.display = 'block';
        if(userBadge) userBadge.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(openAdminPanelBtn) openAdminPanelBtn.style.display = 'block'; 
        if(openAuthBtn) openAuthBtn.style.display = 'none';
        if(prodOwnerInput) prodOwnerInput.value = "admin";
        if(repUserInput) repUserInput.value = "admin";
    } else if (currentUser) {
        if(adminBadge) adminBadge.style.display = 'none';
        if(userBadge) {
            userBadge.style.display = 'block';
            userBadge.innerHTML = `👤 @${currentUser.username} (${currentUser.coins} PC)`;
        }
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(openAdminPanelBtn) openAdminPanelBtn.style.display = 'none';
        if(openAuthBtn) openAuthBtn.style.display = 'none';
        if(prodOwnerInput) prodOwnerInput.value = currentUser.username;
        if(repUserInput) repUserInput.value = currentUser.username;
    } else {
        if(adminBadge) adminBadge.style.display = 'none';
        if(userBadge) userBadge.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(openAdminPanelBtn) openAdminPanelBtn.style.display = 'none';
        if(openAuthBtn) openAuthBtn.style.display = 'block';
        if(prodOwnerInput) prodOwnerInput.value = "";
        if(repUserInput) repUserInput.value = "";
    }
}

// --- Gumb za kreiranje (Sprečavanje ako niko nije logovan) ---
const btnSell = document.getElementById("openSell");
if(btnSell) {
    btnSell.onclick = () => {
        if(!currentUser && !isAdmin) {
            alert("Morate se prvo prijaviti na sistem da biste objavili oglas!");
            document.getElementById("authModal").style.display = "block";
        } else {
            document.getElementById("sellModal").style.display = "block";
        }
    };
}

// Otvaranje profila klikom na korisnički badge u navbaru
const userBadge = document.getElementById('userBadge');
if(userBadge) {
    userBadge.onclick = () => otvoriProfilIKomunikaciju();
}

// --- Ostatak standardnog koda (Admin, Filteri, Zatvaranja Modala) ---
const adminLoginForm = document.getElementById('adminLoginForm');
if(adminLoginForm) {
    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if(document.getElementById('adminUser').value === "admin" && document.getElementById('adminPass').value === "admin123") {
            isAdmin = true; currentUser = null;
            sessionStorage.setItem('isAdminActive', 'true');
            sessionStorage.removeItem('currentUserActive');
            alert("Dobrodošli nazad, šefe!");
            adminLoginForm.reset();
            document.getElementById('adminModal').style.display = 'none';
            proveriAdminInterfejs(); osveziAdminPanel(); render(products);
        } else { alert("Pogrešni admin podaci!"); }
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = () => {
        isAdmin = false; currentUser = null;
        sessionStorage.removeItem('isAdminActive'); sessionStorage.removeItem('currentUserActive');
        alert("Odjavljeni ste."); proveriAdminInterfejs(); render(products);
    };
}

function osveziAdminPanel() {
    const tableBody = document.getElementById('adminUsersTableBody');
    const reportsContainer = document.getElementById('adminReportsContainer');
    if(tableBody) {
        tableBody.innerHTML = users.map((u, idx) => {
            const brojObjava = products.filter(p => p.owner === u.username).length;
            return `<tr><td><b>${u.name}</b></td><td>@${u.username}</td><td>${u.email}</td><td style="text-align:center;"><b>${brojObjava}</b></td><td style="color:#eab308; font-weight:800;">💰 ${u.coins} Coins</td><td><button onclick="promijeniCoinse(${idx}, 50)" class="btn-coin plus">+50</button><button onclick="promijeniCoinse(${idx}, -50)" class="btn-coin minus">-50</button></td></tr>`;
        }).join('');
    }
}

function promijeniCoinse(index, iznos) {
    users[index].coins = (users[index].coins || 0) + iznos;
    localStorage.setItem('hardware_users', JSON.stringify(users));
    osveziAdminPanel();
    if(currentUser && currentUser.username === users[index].username) {
        currentUser.coins = users[index].coins;
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        proveriAdminInterfejs();
    }
}

const reportForm = document.getElementById('reportForm');
if(reportForm) {
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        reports.push({ username: document.getElementById('repUser').value, subject: document.getElementById('repSubject').value, message: document.getElementById('repMessage').value });
        localStorage.setItem('hardware_reports', JSON.stringify(reports));
        alert("Poslano podršci!"); reportForm.reset(); document.getElementById('reportModal').style.display = 'none';
    });
}

// --- FILTRIRANJE ---
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const filterBrand = document.getElementById('filterBrand');
const filterMinPrice = document.getElementById('filterMinPrice');
const filterMaxPrice = document.getElementById('filterMaxPrice');
const filterNew = document.getElementById('filterNew');
const filterUsed = document.getElementById('filterUsed');

function filtrirajSve() {
    const searchText = searchInput.value.toLowerCase();
    const odabranaKategorija = filterCategory.value;
    const odabraniBrend = filterBrand.value;
    const minCijena = parseFloat(filterMinPrice.value) || 0;
    const maxCijena = parseFloat(filterMaxPrice.value) || Infinity;

    const filtrirani = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchText) || p.specs.toLowerCase().includes(searchText);
        const matchesCategory = (odabranaKategorija === "Sve") || (p.category === odabranaKategorija);
        const matchesBrand = (odabraniBrend === "Sve") || (p.brand === odabraniBrend);
        const matchesPrice = p.price >= minCijena && p.price <= maxCijena;
        return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });

    render(filtrirani, odabranaKategorija);
}

if(searchInput) searchInput.addEventListener('input', filtrirajSve);
if(document.getElementById('btnApplyFilters')) document.getElementById('btnApplyFilters').onclick = () => { filtrirajSve(); document.getElementById("filterModal").style.display = "none"; };

// Modali otvaranja / zatvaranja kros prozor dugmad
const spanFilter = document.getElementById("closeFilters"); if(spanFilter) spanFilter.onclick = () => document.getElementById("filterModal").style.display = "none";
if(document.getElementById("openFilters")) document.getElementById("openFilters").onclick = () => document.getElementById("filterModal").style.display = "block";
if(document.getElementById("closeSell")) document.getElementById("closeSell").onclick = () => document.getElementById("sellModal").style.display = "none";
if(document.getElementById("closeAuth")) document.getElementById("closeAuth").onclick = () => document.getElementById("authModal").style.display = "none";
if(document.getElementById("closeDetails")) document.getElementById("closeDetails").onclick = () => document.getElementById("detailsModal").style.display = "none";
if(document.getElementById("closeProfile")) document.getElementById("closeProfile").onclick = () => document.getElementById("profileModal").style.display = "none";
if(document.getElementById("closeAdmin")) document.getElementById("closeAdmin").onclick = () => document.getElementById("adminModal").style.display = "none";
if(document.getElementById("closeReport")) document.getElementById("closeReport").onclick = () => document.getElementById("reportModal").style.display = "none";
if(document.getElementById("closeAdminPanel")) document.getElementById("closeAdminPanel").onclick = () => document.getElementById("adminPanelModal").style.display = "none";
if(document.getElementById('openAdminPanelBtn')) document.getElementById('openAdminPanelBtn').onclick = () => { document.getElementById('adminPanelModal').style.display = 'block'; osveziAdminPanel(); };
if(document.getElementById('openReportBtn')) document.getElementById('openReportBtn').onclick = () => document.getElementById('reportModal').style.display = 'block';
if(document.getElementById('linkAdminLogin')) document.getElementById('linkAdminLogin').onclick = (e) => { e.preventDefault(); document.getElementById('authModal').style.display = 'none'; document.getElementById('adminModal').style.display = 'block'; };

window.onclick = (e) => {
    if(e.target.classList.contains('modal')) e.target.style.display = 'none';
}

window.onload = () => { proveriAdminInterfejs(); render(products); };