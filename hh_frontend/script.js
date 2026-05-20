// === 1. SUPABASE KONFIGURACIJA ===
const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";

// Inicijalizacija Supabase klijenta
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lokalne varijable za aplikaciju
let products = [];
let users = [];
let reports = [];
let chats = [];

let isAdmin = sessionStorage.getItem('isAdminActive') === 'true';
let currentUser = JSON.parse(sessionStorage.getItem('currentUserActive')) || null;
let activeChatUser = null; 

const grid = document.getElementById('productGrid');

// === 2. POVEZIVANJE SA ONLINE BAZOM ===
async function ucitajPodatkeIzBaze() {
    try {
        let { data: artikli, error: err1 } = await _supabase.from('artikli').select('*').order('id', { ascending: false });
        if (err1) throw err1;
        products = artikli || [];

        let { data: korisnici, error: err2 } = await _supabase.from('javni_korisnici').select('*');
        if (err2) throw err2;
        users = korisnici || [];

        let { data: poruke, error: err3 } = await _supabase.from('chats').select('*').order('id', { ascending: true });
        if (err3) throw err3;
        chats = poruke || [];

        let { data: prijava, error: err4 } = await _supabase.from('reporti').select('*');
        if (err4) throw err4;
        reports = prijava || [];

        if (currentUser) {
            const osvezeniJa = users.find(u => u.username === currentUser.username);
            if (osvezeniJa) {
                currentUser = osvezeniJa;
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
            }
        }

        proveriAdminInterfejs();
        render(products);
        if (isAdmin) osveziAdminPanel();
        
        if (document.getElementById('profileModal').style.display === 'block') {
            osveziChatListu(activeChatUser);
        }

    } catch (error) {
        console.error("Greška pri sinhronizaciji:", error.message);
    }
}

// === 3. RENDEROVANJE KARTICA NA FEED-U ===
function render(productsToDisplay, currentCategoryFilter = "Sve") {
    if(!grid) return;
    if(productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    let sortiraniProizvodi = [...productsToDisplay].sort((a, b) => {
        let nivoA = 0; let nivoB = 0;
        if (a.promote === 'main') nivoA = 3;
        else if (a.promote === 'category' && currentCategoryFilter !== "Sve") nivoA = 2;
        else if (a.promote === 'category') nivoA = 1;

        if (b.promote === 'main') nivoB = 3;
        else if (b.promote === 'category' && currentCategoryFilter !== "Sve") nivoB = 2;
        else if (b.promote === 'category') nivoB = 1;

        return nivoB - nivoA; 
    });

    grid.innerHTML = sortiraniProizvodi.map((p) => {
        const adminButtonHTML = isAdmin ? 
            `<button onclick="obrisiArtikalIzBaze(${p.id})" class="btn-action btn-danger full-width" style="margin-top:10px">Obriši oglas (Admin)</button>` : '';

        let klasaIzdvojenog = ''; let bedzIzdvojenog = '';
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
                    <p class="specs">${p.specs || ''}</p>
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

async function obrisiArtikalIzBaze(id) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas sa servera?")) {
        const { error } = await _supabase.from('artikli').delete().eq('id', id);
        if(!error) {
            alert("Oglas uspješno uklonjen.");
            ucitajPodatkeIzBaze();
        }
    }
}

// === 4. PREGLED DETALJA ===
async function otvoriDetaljeArtikla(id) {
    const artikal = products.find(p => p.id === id);
    if(!artikal) return;

    artikal.views = (artikal.views || 0) + 1;
    await _supabase.from('artikli').update({ views: artikal.views }).eq('id', id);

    document.getElementById('detTitle').innerText = artikal.name;
    document.getElementById('detImg').src = artikal.img;
    document.getElementById('detPrice').innerText = `${artikal.price} KM`;
    document.getElementById('detCondition').innerText = artikal.condition;
    document.getElementById('detCategory').innerText = artikal.category;
    document.getElementById('detBrand').innerText = artikal.brand;
    document.getElementById('detSpecs').innerText = artikal.specs || '';
    document.getElementById('detOwner').innerText = `@${artikal.owner}`;
    document.getElementById('detViews').innerText = `👁️ ${artikal.views} pregleda`;

    const chatBtn = document.getElementById('btnOpenChat');
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
}

// === 5. PRIVATNE PORUKE ===
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
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const tekst = input.value.trim();

        if(!tekst || !activeChatUser) return;

        const novaPoruka = { sender: currentUser.username, receiver: activeChatUser, text: tekst };

        const { error } = await _supabase.from('chats').insert([novaPoruka]);
        if(!error) {
            input.value = '';
            ucitajPodatkeIzBaze(); 
        }
    });
}

// === 6. LOGIKA ZA OBJAVU ARTIKALA ===
const sellForm = document.getElementById('sellForm');
if(sellForm) {
    sellForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        if(!currentUser) {
            alert("Niste ulogovani!");
            return;
        }

        const promoteTip = document.getElementById('prodPromote').value;
        let cijenaIzdvajanja = 0;
        if(promoteTip === 'category') cijenaIzdvajanja = 30;
        if(promoteTip === 'main') cijenaIzdvajanja = 60;

        if(currentUser.coins < cijenaIzdvajanja) {
            alert(`Nemate dovoljno Coins-a! Potrebno vam je ${cijenaIzdvajanja} PC.`);
            return;
        }

        const slikaInput = document.getElementById('prodImgFile');
        const fajl = slikaInput.files[0];

        if (fajl) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                if(cijenaIzdvajanja > 0) {
                    let noviKolicnikCoinsa = currentUser.coins - cijenaIzdvajanja;
                    await _supabase.from('javni_korisnici').update({ coins: noviKolicnikCoinsa }).eq('username', currentUser.username);
                }

                const noviArtikal = {
                    name: document.getElementById('prodName').value,
                    price: parseFloat(document.getElementById('prodPrice').value),
                    category: document.getElementById('prodCategory').value,
                    brand: document.getElementById('prodBrand').value,
                    condition: document.querySelector('input[name="prodCondition"]:checked').value,
                    specs: document.getElementById('prodSpecs').value,
                    owner: currentUser.username,
                    img: e.target.result,
                    views: 0,
                    promote: promoteTip
                };

                const { error } = await _supabase.from('artikli').insert([noviArtikal]);
                if(!error) {
                    alert(cijenaIzdvajanja > 0 ? `Uspješno! Oglas je izdvojen i skinuto je ${cijenaIzdvajanja} Coinsa.` : "Vaš oglas je uspješno objavljen na serveru!");
                    sellForm.reset();
                    document.getElementById('sellModal').style.display = "none";
                    ucitajPodatkeIzBaze(); 
                } else {
                    alert("Greška pri spremanju artikla: " + error.message);
                }
            };
            reader.readAsDataURL(fajl);
        }
    });
}

// === 7. REGISTRACIJA ===
emailjs.init("ulfQJccZt4N0kFq78"); 
const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');

if(registerForm) {
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const testniUsername = document.getElementById('regUsername').value.trim();
        
        if(users.some(u => u.username.toLowerCase() === testniUsername.toLowerCase())) {
            alert("Korisničko ime je već zauzeto na serveru!");
            return;
        }

        btnRegister.innerText = "Slanje...";
        btnRegister.disabled = true;

        const templateParams = {
            ime: document.getElementById('regName').value,
            prezime: document.getElementById('regSurname').value,
            username: testniUsername,
            email_korisnika: document.getElementById('regEmail').value,
            datum: document.getElementById('regDob').value
        };

        emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
            .then(async function() {
                const noviUser = {
                    name: templateParams.ime + " " + templateParams.prezime,
                    username: templateParams.username,
                    email: templateParams.email_korisnika,
                    password: document.getElementById('regPassword').value,
                    coins: 100 
                };

                const { error } = await _supabase.from('javni_korisnici').insert([noviUser]);
                if(!error) {
                    alert("Uspješna registracija na server! Poklon 100 PC uračunat.");
                    registerForm.reset();
                    document.getElementById('authModal').style.display = "none";
                    currentUser = noviUser;
                    sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
                    ucitajPodatkeIzBaze();
                } else {
                    alert("Greška baze pri registraciji: " + error.message);
                }
                
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
            }, function(error) {
                alert("Greška pri slanju maila: " + error.text);
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
            });
    });
}

// === 8. PRIJAVA KORISNIKA ===
const loginForm = document.getElementById('loginForm');
const authModalTitle = document.getElementById('authModalTitle');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');

if(linkToRegister && linkToLogin) {
    linkToRegister.onclick = (e) => { 
        e.preventDefault(); 
        loginForm.style.display = 'none'; 
        registerForm.style.display = 'block'; 
        authModalTitle.innerText = "Registracija novog računa"; 
    };
    linkToLogin.onclick = (e) => { 
        e.preventDefault(); 
        registerForm.style.display = 'none'; 
        loginForm.style.display = 'block'; 
        authModalTitle.innerText = "Prijava na sistem"; 
    };
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
                ucitajPodatkeIzBaze();
            } else { alert("Pogrešna lozinka!"); }
        } else { alert("Korisničko ime ne postoji na sistemu."); }
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

// Otvaranje glavnog Auth modala preko navbar dugmeta
const openAuthBtn = document.getElementById('openAuth');
if(openAuthBtn) {
    openAuthBtn.onclick = () => {
        document.getElementById('authModal').style.display = 'block';
        if(loginForm) loginForm.style.display = 'block';
        if(registerForm) registerForm.style.display = 'none';
        if(authModalTitle) authModalTitle.innerText = "Prijava na sistem";
    };
}

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

const userBadge = document.getElementById('userBadge');
if(userBadge) {
    userBadge.onclick = () => otvoriProfilIKomunikaciju();
}

// === 9. ADMINISTRACIJA ===
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
            ucitajPodatkeIzBaze();
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
    if(tableBody) {
        tableBody.innerHTML = users.map((u) => {
            const brojObjava = products.filter(p => p.owner === u.username).length;
            return `<tr><td><b>${u.name}</b></td><td>@${u.username}</td><td>${u.email}</td><td style="text-align:center;"><b>${brojObjava}</b></td><td style="color:#eab308; font-weight:800;">💰 ${u.coins} Coins</td><td><button onclick="promijeniCoinseNaServeru(${u.id}, ${u.coins}, 50)" class="btn-coin plus">+50</button><button onclick="promijeniCoinseNaServeru(${u.id}, ${u.coins}, -50)" class="btn-coin minus">-50</button></td></tr>`;
        }).join('');
    }
}

async function promijeniCoinseNaServeru(id, trenutniCoins, iznos) {
    let noviIznos = trenutniCoins + iznos; // Ovdje je bila greška i tipfeler (trenchesCoins)! Sada je popravljeno.
    if(noviIznos < 0) noviIznos = 0;
    
    const { error } = await _supabase.from('javni_korisnici').update({ coins: noviIznos }).eq('id', id);
    if(!error) ucitajPodatkeIzBaze();
}

const reportForm = document.getElementById('reportForm');
if(reportForm) {
    reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const noviReport = { username: document.getElementById('repUser').value, subject: document.getElementById('repSubject').value, message: document.getElementById('repMessage').value };
        
        const { error } = await _supabase.from('reporti').insert([noviReport]);
        if(!error) {
            alert("Poslano podršci na server!"); 
            reportForm.reset(); 
            document.getElementById('reportModal').style.display = 'none';
            ucitajPodatkeIzBaze();
        }
    });
}

// === 10. FILTRIRANJE ===
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const filterBrand = document.getElementById('filterBrand');
const filterMinPrice = document.getElementById('filterMinPrice');
const filterMaxPrice = document.getElementById('filterMaxPrice');

function filtrirajSve() {
    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const odabranaKategorija = filterCategory ? filterCategory.value : "Sve";
    const odabraniBrend = filterBrand ? filterBrand.value : "Sve";
    const minCijena = filterMinPrice ? (parseFloat(filterMinPrice.value) || 0) : 0;
    const maxCijena = filterMaxPrice ? (parseFloat(filterMaxPrice.value) || Infinity) : Infinity;

    const filtrirani = products.filter(p => {
        const matchesSearch = (p.name?.toLowerCase() || "").includes(searchText) || (p.specs?.toLowerCase() || "").includes(searchText);
        const matchesCategory = (odabranaKategorija === "Sve") || (p.category === odabranaKategorija);
        const matchesBrand = (odabraniBrend === "Sve") || (p.brand === odabraniBrend);
        const matchesPrice = p.price >= minCijena && p.price <= maxCijena;
        return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });

    render(filtrirani, odabranaKategorija);
}

if(searchInput) searchInput.addEventListener('input', filtrirajSve);
if(document.getElementById('btnApplyFilters')) document.getElementById('btnApplyFilters').onclick = () => { filtrirajSve(); document.getElementById("filterModal").style.display = "none"; };

// Event handleri za zatvaranje/otvaranje svih prozora
if(document.getElementById("closeFilters")) document.getElementById("closeFilters").onclick = () => document.getElementById("filterModal").style.display = "none";
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

window.onload = () => { 
    ucitajPodatkeIzBaze(); 
};