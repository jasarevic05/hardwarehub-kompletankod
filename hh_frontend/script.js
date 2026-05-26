// --- 1. POČETNI PODACI (Konfiguracija i Stanja) ---
const roleLimits = {
    basic: 10,
    silver: 25,
    premium: 50
};

const promotionPrices = {
    basic: { category: 40, main: 80 },
    silver: { category: 30, main: 60 },
    premium: { category: 20, main: 40 }
};

const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

const DB_TABLE_ALIASES = {
    products: ['products', 'product', 'oglasi', 'artikli', 'ads'],
    users: ['javni_korisnici', 'korisnici', 'users'],
    reports: ['reports', 'prijave', 'support_reports'],
    chats: ['chats', 'messages', 'poruke']
};

const DB_TABLE_CACHE = {};

if (!supabaseClient) {
    console.error("❌ KRITIČNO: Supabase klijent nije inicijalizovan! Provjerite CDN skriptu.");
}

// Globalna stanja aplikacije
let products = [];
let users = [];
let reports = [];
let chats = [];

let currentUser = JSON.parse(sessionStorage.getItem('currentUserActive')) || null;
let activeChatUser = null; 

const grid = document.getElementById('productGrid');

console.log('🚀 Aplikacija pokrenuta - učitavam podatke iz baze podataka...');

function findLocalUserByEmail(email) {
    return users.find(u => u.email === email) || null;
}

function findLocalUserByUsername(username) {
    return users.find(u => u.username === username) || null;
}

async function resolveTableName(key) {
    if (DB_TABLE_CACHE[key]) return DB_TABLE_CACHE[key];
    if (!supabaseClient) return null;

    const aliases = DB_TABLE_ALIASES[key] || [key];
    for (const alias of aliases) {
        const { error } = await supabaseClient.from(alias).select('*').limit(1);
        if (!error) {
            DB_TABLE_CACHE[key] = alias;
            return alias;
        }
    }
    return null;
}

async function fetchFromSupabase(tableKey) {
    if (!supabaseClient) throw new Error('Supabase klijent nije dostupan.');
    const tableName = await resolveTableName(tableKey);
    if (!tableName) throw new Error(`Tablica za '${tableKey}' nije pronađena u Supabase bazi.`);
    const { data, error } = await supabaseClient.from(tableName).select('*');
    if (error) throw error;
    return data || [];
}

async function loadSupabaseData() {
    try {
        console.log('🔄 Sinhronizacija sa Supabase bazom u toku...');
        
        if (!supabaseClient) {
            alert('❌ GREŠKA: Supabase baza nije dostupna! Pokrenite projekat preko live servera.');
            throw new Error('Supabase nedostupan');
        }
        
        const [productData, userData, reportData, chatData] = await Promise.all([
            fetchFromSupabase('products'),
            fetchFromSupabase('users'),
            fetchFromSupabase('reports'),
            fetchFromSupabase('chats')
        ]);

        products = productData || [];
        users = userData || [];
        reports = reportData || [];
        chats = chatData || [];

        if (currentUser) {
            const svjeziProfil = users.find(u => u.username === currentUser.username);
            if (svjeziProfil) {
                currentUser = {
                    ...svjeziProfil,
                    hhcoins: svjeziProfil.hhcoins ?? 0,
                    role: svjeziProfil.role || 'basic'
                };
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
            }
        }

        console.log(`✅ Sinhronizacija završena: Učitano ${products.length} oglasa.`);
    } catch (error) {
        console.error('❌ Greška pri učitavanju baze:', error.message);
    }
}

async function getUserByUsername(username) {
    if (!supabaseClient) return findLocalUserByUsername(username);
    const tableName = await resolveTableName('users');
    if (!tableName) return findLocalUserByUsername(username);
    const { data, error } = await supabaseClient.from(tableName).select('*').eq('username', username).maybeSingle();
    if (error) return findLocalUserByUsername(username);
    return data || findLocalUserByUsername(username);
}

async function getUserByEmail(email) {
    if (!supabaseClient) return findLocalUserByEmail(email);
    const tableName = await resolveTableName('users');
    if (!tableName) return findLocalUserByEmail(email);
    const { data, error } = await supabaseClient.from(tableName).select('*').eq('email', email).maybeSingle();
    if (error) return findLocalUserByEmail(email);
    return data || findLocalUserByEmail(email);
}

// --- 2. RENDEROVANJE KARTICA ---
function render(productsToDisplay, currentCategoryFilter = "Sve") {
    if(!grid) return;
    if(productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    let sortiraniProizvodi = [...productsToDisplay].sort((a, b) => {
        let nivoA = 0, nivoB = 0;
        if (a.promote === 'main') nivoA = 3;
        else if (a.promote === 'category' && currentCategoryFilter !== "Sve") nivoA = 2;
        else if (a.promote === 'category') nivoA = 1;

        if (b.promote === 'main') nivoB = 3;
        else if (b.promote === 'category' && currentCategoryFilter !== "Sve") nivoB = 2;
        else if (b.promote === 'category') nivoB = 1;

        return nivoB - nivoA; 
    });

    const cards = sortiraniProizvodi.map((p) => {
        let klasaIzdvojenog = '';
        let bedzIzdvojenog = '';
        if(p.promote === 'main') {
            klasaIzdvojenog = 'featured-main';
            bedzIzdvojenog = `<span class="badge-featured">⭐ TOP Ponuda</span>`;
        } else if (p.promote === 'category') {
            klasaIzdvojenog = 'featured-category';
            bedzIzdvojenog = `<span class="badge-featured" style="background:#a855f7; color:white;">💎 Izdvojeno</span>`;
        }

        const thumb = p.images && p.images.length ? p.images[0] : (p.img || "https://images.unsplash.com/photo-1591488320449-011701bb6704");

        return `
            <div class="card ${klasaIzdvojenog}">
                ${bedzIzdvojenog}
                <div onclick="otvoriDetaljeArtikla(${p.id})" style="cursor:pointer;">
                    <img src="${thumb}">
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
                </div>
            </div>
        `;
    });

    if (cards.length > 2) {
        const adIndex = Math.max(1, Math.min(cards.length - 1, Math.floor(Math.random() * cards.length)));
        cards.splice(adIndex, 0, `
            <div class="card ad-card">
                <div>
                    <h4>Sponzorisani oglas</h4>
                    <p style="color:var(--text-dim);">Povećajte vidljivost svog oglasa uz HHCoins promociju. Ovaj prostor je rezervisan za najatraktivnije objave.</p>
                </div>
                <div>
                    <p class="price" style="color:#facc15;">Izdvojite sada</p>
                    <button onclick="alert('Za sponzorisanje posetite svoj profil.')" class="btn-action primary full-width" style="margin-top:15px">Saznaj više</button>
                </div>
            </div>
        `);
    }

    grid.innerHTML = cards.join('');
}

async function obrisiArtikal(index) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas?")) {
        const artikal = products[index];
        if (artikal?.id && supabaseClient) {
            const tableName = await resolveTableName('products');
            if (!tableName) {
                alert('Greška: tabela za proizvode nije pronađena.');
                return;
            }
            const { error } = await supabaseClient.from(tableName).delete().eq('id', artikal.id);
            if (error) {
                alert('Greška pri brisanju sa servera: ' + error.message);
                return;
            }
        }
        await loadSupabaseData();
        render(products);
        if(document.getElementById('profileModal').style.display === 'block') {
            renderMyListings();
        }
    }
}

// --- 3. DETALJI ARTIKLA & PREGLEDI ---
async function otvoriDetaljeArtikla(id) {
    const artikal = products.find(p => p.id === id);
    if(!artikal) return;

    artikal.views = (artikal.views || 0) + 1;
    if (artikal.id && supabaseClient) {
        const tableName = await resolveTableName('products');
        if (tableName) {
            await supabaseClient.from(tableName).update({ views: artikal.views }).eq('id', artikal.id);
        }
    }

    document.getElementById('detTitle').innerText = artikal.name;
    const mainImage = artikal.images && artikal.images.length ? artikal.images[0] : (artikal.img || "https://images.unsplash.com/photo-1591488320449-011701bb6704");
    document.getElementById('detImg').src = mainImage;
    document.getElementById('detPrice').innerText = `${artikal.price} KM`;
    document.getElementById('detCondition').innerText = artikal.condition;
    document.getElementById('detCategory').innerText = artikal.category;
    document.getElementById('detBrand').innerText = artikal.brand;
    document.getElementById('detSpecs').innerText = artikal.specs;
    document.getElementById('detOwner').innerText = `@${artikal.owner}`;
    document.getElementById('detViews').innerText = `👁️ ${artikal.views} pregleda`;

    const gallery = document.getElementById('detGallery');
    if (gallery) {
        gallery.innerHTML = (artikal.images || [mainImage]).map((src, index) => {
            return `<img src="${src}" class="${index === 0 ? 'active' : ''}" onclick="document.getElementById('detImg').src='${src}'; document.querySelectorAll('#detGallery img').forEach(i => i.classList.remove('active')); this.classList.add('active');">`;
        }).join('');
    }

    const chatBtn = document.getElementById('btnOpenChat');
    if(currentUser && currentUser.username === artikal.owner) {
        if(chatBtn) chatBtn.style.display = 'none';
    } else {
        if(chatBtn) {
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
    }

    document.getElementById('detailsModal').style.display = 'block';
}

// --- 4. PORUKE I PROFIL ---
function otvoriProfilIKomunikaciju(saKorisnikom = null) {
    if(!currentUser) return;

    const coinsPrikaz = currentUser.hhcoins ?? 0;
    document.getElementById('profName').innerText = currentUser.name;
    document.getElementById('profUsername').innerText = `@${currentUser.username}`;
    document.getElementById('profEmail').innerText = currentUser.email;
    document.getElementById('profCoins').innerText = `💰 ${coinsPrikaz} HHCoins`;
    document.getElementById('profRole').innerText = currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Basic';
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmailEdit').value = currentUser.email;

    renderMyListings();
    document.getElementById('profileModal').style.display = 'block';
    osveziChatListu(saKorisnikom);
}

function renderMyListings() {
    const container = document.getElementById('myListingsContainer');
    if(!container) return;
    const myAds = products.filter(p => p.owner === currentUser.username);
    if(myAds.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim);">Nemate aktivnih oglasa.</p>';
        return;
    }

    container.innerHTML = myAds.map(ad => `
        <div class="profile-listing">
            <h4>${ad.name}</h4>
            <p><strong>Cijena:</strong> ${ad.price} KM | <strong>Stanje:</strong> ${ad.condition}</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-action secondary" onclick="editListing(${ad.id})">Uredi</button>
                <button class="btn-action btn-danger" onclick="obrisiArtikal(${products.findIndex(p => p.id === ad.id)})">Obriši</button>
            </div>
        </div>
    `).join('');
}

async function editListing(id) {
    const ad = products.find(p => p.id === id);
    if(!ad) return;
    const novoIme = prompt('Unesite novi naziv artikla:', ad.name);
    const novaCijena = prompt('Unesite novu cijenu:', ad.price);
    const noviSpecs = prompt('Unesite nove specifikacije:', ad.specs);
    
    if (novoIme || novaCijena || noviSpecs) {
        const updateData = {};
        if (novoIme) updateData.name = novoIme;
        if (novaCijena && !isNaN(Number(novaCijena))) updateData.price = Number(novaCijena);
        if (noviSpecs) updateData.specs = noviSpecs;

        if (supabaseClient) {
            const tableName = await resolveTableName('products');
            if (!tableName) {
                alert('Greška: tabela za proizvode nije pronađena.');
                return;
            }
            await supabaseClient.from(tableName).update(updateData).eq('id', id);
        }
        await loadSupabaseData();
        renderMyListings();
        render(products);
    }
}

async function purchaseMembership(level) {
    const prices = { silver: 200, premium: 400 };
    const cost = prices[level];
    if (!currentUser || !cost) return;
    
    let trenutniSalda = currentUser.hhcoins ?? 0;
    if (trenutniSalda < cost) {
        alert('Nemate dovoljno HHCoins za ovu nadogradnju.');
        return;
    }
    trenutniSalda -= cost;

    if (supabaseClient) {
        const tableName = await resolveTableName('users');
        if (!tableName) {
            alert('Greška: tabela korisnika nije pronađena.');
            return;
        }
        await supabaseClient.from(tableName).update({ hhcoins: trenutniSalda, role: level }).eq('username', currentUser.username);
    }
    
    await loadSupabaseData();
    alert(`Uspješno ste postali ${level.charAt(0).toUpperCase() + level.slice(1)} korisnik!`);
    proveriAdminInterfejs();
    otvoriProfilIKomunikaciju();
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

        const novaPoruka = {
            sender: currentUser.username,
            receiver: activeChatUser,
            text: tekst
        };

        if (supabaseClient) {
            const tableName = await resolveTableName('chats');
            if (!tableName) {
                alert('Greška: tabela chata nije pronađena.');
                return;
            }
            await supabaseClient.from(tableName).insert([novaPoruka]);
        }
        
        input.value = '';
        await loadSupabaseData();
        prikaziPorukeZaKorisnika(activeChatUser);
    });
}

// --- 5. LOGIKA ZA OBJAVU OGLASA ---
const sellForm = document.getElementById('sellForm');
if(sellForm) {
    sellForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        if(!currentUser) {
            alert("Niste ulogovani! Morate se prijaviti.");
            document.getElementById('sellModal').style.display = "none";
            document.getElementById('authModal').style.display = "block";
            return;
        }

        const promoteTip = document.getElementById('prodPromote').value;
        const role = currentUser.role || 'basic';
        const cijenaIzdvajanja = promotionPrices[role]?.[promoteTip] || 0;
        const ownedCount = products.filter(p => p.owner === currentUser.username).length;
        const maxAllowed = roleLimits[role] || roleLimits.basic;

        if (ownedCount >= maxAllowed) {
            alert(`Vaša trenutna rola ${role.charAt(0).toUpperCase() + role.slice(1)} ima limit ${maxAllowed} oglasa. Nadogradite rolu za više.`);
            return;
        }

        let trenutniSaldo = currentUser.hhcoins ?? 0;
        if(trenutniSaldo < cijenaIzdvajanja) {
            alert(`Nemate dovoljno HHCoins! Potrebno vam je ${cijenaIzdvajanja} HHCoins.`);
            return;
        }

        const slikaInput = document.getElementById('prodImgFile');
        const fajlovi = Array.from(slikaInput.files);
        if (fajlovi.length === 0) {
            alert('Odaberite najmanje jednu sliku artikla.');
            return;
        }

        const submitBtn = sellForm.querySelector('button[type="submit"]');
        if(submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Objavljivanje na server...";
        }

        const readFilesAsDataUrls = (files) => Promise.all(
            files.slice(0, 4).map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            }))
        );

        try {
            const Base64Slike = await readFilesAsDataUrls(fajlovi);

            if(cijenaIzdvajanja > 0) {
                trenutniSaldo -= cijenaIzdvajanja;
                if (supabaseClient) {
                    const tableName = await resolveTableName('users');
                    if (!tableName) {
                        alert('Greška: tabela korisnika nije pronađena.');
                        return;
                    }
                    const { error } = await supabaseClient.from(tableName).update({ hhcoins: trenutniSaldo }).eq('username', currentUser.username);
                    if (error) {
                        alert('Greška pri ažuriranju HHCoina: ' + error.message);
                        return;
                    }
                }
            }

            const noviArtikal = {
                name: document.getElementById('prodName').value,
                price: parseFloat(document.getElementById('prodPrice').value),
                category: document.getElementById('prodCategory').value,
                brand: document.getElementById('prodBrand').value,
                condition: document.querySelector('input[name="prodCondition"]:checked').value,
                specs: document.getElementById('prodSpecs').value,
                owner: currentUser.username,
                images: Base64Slike.filter(Boolean),
                views: 0,
                promote: promoteTip,
                created_at: new Date().toISOString()
            };

            if (supabaseClient) {
                const tableName = await resolveTableName('products');
                if (!tableName) {
                    alert('Greška: tabela proizvoda nije pronađena.');
                    return;
                }
                const { error } = await supabaseClient.from(tableName).insert([noviArtikal]);
                if (error) {
                    alert('Greška pri objavi oglasa: ' + error.message);
                    return;
                }
            }

            sellForm.reset();
            document.getElementById('sellModal').style.display = "none";
            alert(cijenaIzdvajanja > 0 ? `Uspješno! Oglas je izdvojen (-${cijenaIzdvajanja} Coinsa).` : "Vaš oglas je uspješno objavljen na server!");
            
            await loadSupabaseData();
            proveriAdminInterfejs();
            render(products);

        } catch (fileError) {
            console.error("Greška pri slanju oglasa:", fileError);
            alert("Došlo je do greške prilikom slanja na server: " + fileError.message);
        } finally {
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Objavi Oglas";
            }
        }
    });
}

// --- 6. REGISTRACIJA I SLANJE EMAILJS ---
if(typeof emailjs !== 'undefined') {
    emailjs.init("ulfQJccZt4N0kFq78"); 
}

const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');

if(registerForm) {
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        btnRegister.innerText = "Slanje...";
        btnRegister.disabled = true;

        const naziv = document.getElementById('regName').value.trim();
        const prezime = document.getElementById('regSurname').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const lozinka = document.getElementById('regPassword').value;

        if (!naziv || !prezime || !username || !email || !lozinka) {
            alert("Molimo popunite sva polja.");
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            return;
        }

        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            alert("Korisničko ime je već zauzeto.");
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            return;
        }

        const existingEmail = await getUserByEmail(email);
        if (existingEmail) {
            alert("Email je već registriran.");
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            return;
        }

        const noviUserProfil = {
            name: `${naziv} ${prezime}`,
            username,
            email,
            password: lozinka,
            hhcoins: 100,
            role: 'basic'
        };

        if (supabaseClient) {
            const tableName = await resolveTableName('users');
            if (!tableName) {
                alert('Greška: tabela korisnika nije pronađena.');
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
                return;
            }
            const { error } = await supabaseClient.from(tableName).insert([noviUserProfil]);
            if (error) {
                alert("Greška pri registraciji: " + error.message);
                btnRegister.innerText = "Registruj se";
                btnRegister.disabled = false;
                return;
            }
        }

        const templateParams = {
            ime: naziv,
            prezime: prezime,
            username: username,
            email_korisnika: email,
            datum: document.getElementById('regDob')?.value || ''
        };

        try {
            if(typeof emailjs !== 'undefined') await emailjs.send("service_th1lfel", "template_63qqwfw", templateParams);
        } catch(error) {
            console.warn("EmailJS error:", error);
        }

        registerForm.reset();
        document.getElementById('authModal').style.display = "none";
        btnRegister.innerText = "Registruj se";
        btnRegister.disabled = false;

        currentUser = { ...noviUserProfil };
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        
        await loadSupabaseData();
        proveriAdminInterfejs();
        render(products);
    });
}

// --- 7. PRIJAVA, ODJAVA I INTERFEJS ---
const loginForm = document.getElementById('loginForm');
const authModalTitle = document.getElementById('authModalTitle');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');

if(linkToRegister && linkToLogin) {
    linkToRegister.onclick = (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authModalTitle.innerText = "Registracija novog računa"; };
    linkToLogin.onclick = (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; authModalTitle.innerText = "Prijava na sistem"; };
}

const openAuthBtn = document.getElementById('openAuth');
if (openAuthBtn) {
    openAuthBtn.onclick = () => {
        document.getElementById('authModal').style.display = 'block';
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (authModalTitle) authModalTitle.innerText = "Prijava na sistem";
    };
}

if(loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const loginValue = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!loginValue || !password) {
            alert("Molimo unesite korisničko ime/email i lozinku.");
            return;
        }

        let korisnickiProfil = loginValue.includes('@') ? await getUserByEmail(loginValue) : await getUserByUsername(loginValue);

        if (!korisnickiProfil || korisnickiProfil.password !== password) {
            alert("Pogrešno korisničko ime/email ili lozinka.");
            return;
        }

        currentUser = {
            ...korisnickiProfil,
            hhcoins: korisnickiProfil.hhcoins ?? 0,
            role: korisnickiProfil.role || 'basic'
        };
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        alert(`Dobrodošli nazad, ${currentUser.name}!`);
        loginForm.reset();
        document.getElementById('authModal').style.display = 'none';
        
        await loadSupabaseData();
        proveriAdminInterfejs();
        render(products);
    });
}

function proveriAdminInterfejs() {
    const userBadge = document.getElementById('userBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const openAuthBtn = document.getElementById('openAuth');
    const openProfileBtn = document.getElementById('openProfileBtn');
    const prodOwnerInput = document.getElementById('prodOwner');
    const repUserInput = document.getElementById('repUser');

    if (currentUser) {
        const saldoBadge = currentUser.hhcoins ?? 0;
        if(userBadge) {
            userBadge.style.display = 'block';
            userBadge.innerHTML = `👤 @${currentUser.username} (${saldoBadge} HHCoins)`;
        }
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(openProfileBtn) openProfileBtn.style.display = 'block';
        if(openAuthBtn) openAuthBtn.style.display = 'none';
        if(prodOwnerInput) prodOwnerInput.value = currentUser.username;
        if(repUserInput) repUserInput.value = currentUser.username;
    } else {
        if(userBadge) userBadge.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(openProfileBtn) openProfileBtn.style.display = 'none';
        if(openAuthBtn) openAuthBtn.style.display = 'block';
        if(prodOwnerInput) prodOwnerInput.value = "";
        if(repUserInput) repUserInput.value = "";
    }
}

const btnSell = document.getElementById("openSell");
if(btnSell) {
    btnSell.onclick = () => {
        if(!currentUser) {
            alert("Morate se prvo prijaviti na sistem da biste objavili oglas!");
            document.getElementById("authModal").style.display = "block";
        } else {
            document.getElementById("sellModal").style.display = "block";
        }
    };
}

const openProfileBtnElement = document.getElementById('openProfileBtn');
if(openProfileBtnElement) {
    openProfileBtnElement.onclick = () => otvoriProfilIKomunikaciju();
}

const saveProfileBtn = document.getElementById('saveProfileBtn');
if(saveProfileBtn) {
    saveProfileBtn.onclick = async () => {
        const newName = document.getElementById('profileName').value.trim();
        const newEmail = document.getElementById('profileEmailEdit').value.trim();
        if (!newName || !newEmail) {
            alert('Molimo unesite ispravno ime i email.');
            return;
        }

        if (supabaseClient) {
            const tableName = await resolveTableName('users');
            if (!tableName) {
                alert('Greška: tabela korisnika nije pronađena.');
                return;
            }
            await supabaseClient.from(tableName).update({ name: newName, email: newEmail }).eq('username', currentUser.username);
        }
        
        await loadSupabaseData();
        alert('Profil je uspješno ažuriran.');
        proveriAdminInterfejs();
        otvoriProfilIKomunikaciju();
    };
}

const btnBuySilver = document.getElementById('btnBuySilver');
if(btnBuySilver) btnBuySilver.onclick = () => purchaseMembership('silver');
const btnBuyPremium = document.getElementById('btnBuyPremium');
if(btnBuyPremium) btnBuyPremium.onclick = () => purchaseMembership('premium');

const userBadgeElement = document.getElementById('userBadge');
if(userBadgeElement) {
    userBadgeElement.onclick = () => otvoriProfilIKomunikaciju();
}

const logoutBtnElement = document.getElementById('logoutBtn');
if(logoutBtnElement) {
    logoutBtnElement.onclick = async () => {
        currentUser = null;
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.removeItem('currentUserActive');
        alert("Odjavljeni ste."); 
        proveriAdminInterfejs(); 
        render(products);
    };
}

const reportForm = document.getElementById('reportForm');
if(reportForm) {
    reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const noviReport = {
            username: document.getElementById('repUser').value,
            subject: document.getElementById('repSubject').value,
            message: document.getElementById('repMessage').value,
            created_at: new Date().toISOString()
        };
        if (supabaseClient) {
            const tableName = await resolveTableName('reports');
            if (!tableName) {
                alert('Greška: tabela prijava nije pronađena.');
                return;
            }
            const { error } = await supabaseClient.from(tableName).insert([noviReport]);
            if (error) {
                alert('Greška pri slanju prijave: ' + error.message);
                return;
            }
        }
        await loadSupabaseData();
        alert("Poslano podršci!"); 
        reportForm.reset(); 
        document.getElementById('reportModal').style.display = 'none';
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
    const searchText = searchInput ? searchInput.value.toLowerCase() : "";
    const odabranaKategorija = filterCategory ? filterCategory.value : "Sve";
    const odabraniBrend = filterBrand ? filterBrand.value : "Sve";
    const minCijena = filterMinPrice ? (parseFloat(filterMinPrice.value) || 0) : 0;
    const maxCijena = filterMaxPrice ? (parseFloat(filterMaxPrice.value) || Infinity) : Infinity;

    const selectedStates = [];
    if (filterNew && filterNew.checked) selectedStates.push('Novo');
    if (filterUsed && filterUsed.checked) selectedStates.push('Polovno');

    const filtrirani = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchText) || p.specs.toLowerCase().includes(searchText);
        const matchesCategory = (odabranaKategorija === "Sve") || (p.category === odabranaKategorija);
        const matchesBrand = (odabraniBrend === "Sve") || (p.brand === odabraniBrend);
        const matchesPrice = p.price >= minCijena && p.price <= maxCijena;
        const matchesCondition = selectedStates.length === 0 || selectedStates.includes(p.condition);
        return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesCondition;
    });

    render(filtrirani, odabranaKategorija);
}

if(searchInput) searchInput.addEventListener('input', filtrirajSve);
if(document.getElementById('btnApplyFilters')) document.getElementById('btnApplyFilters').onclick = () => { filtrirajSve(); document.getElementById("filterModal").style.display = "none"; };
if(document.getElementById('btnResetFilters')) document.getElementById('btnResetFilters').onclick = () => {
    if(filterCategory) filterCategory.value = 'Sve';
    if(filterBrand) filterBrand.value = 'Sve';
    if(filterMinPrice) filterMinPrice.value = '';
    if(filterMaxPrice) filterMaxPrice.value = '';
    if(filterNew) filterNew.checked = false;
    if(filterUsed) filterUsed.checked = false;
    if(searchInput) searchInput.value = '';
    filtrirajSve();
};

const spanFilter = document.getElementById("closeFilters"); if(spanFilter) spanFilter.onclick = () => document.getElementById("filterModal").style.display = "none";
if(document.getElementById("openFilters")) document.getElementById("openFilters").onclick = () => document.getElementById("filterModal").style.display = "block";
if(document.getElementById("closeSell")) document.getElementById("closeSell").onclick = () => document.getElementById("sellModal").style.display = "none";
if(document.getElementById("closeAuth")) document.getElementById("closeAuth").onclick = () => document.getElementById("authModal").style.display = "none";
if(document.getElementById("closeDetails")) document.getElementById("closeDetails").onclick = () => document.getElementById("detailsModal").style.display = "none";
if(document.getElementById("closeProfile")) document.getElementById("closeProfile").onclick = () => document.getElementById("profileModal").style.display = "none";
if(document.getElementById("closeReport")) document.getElementById("closeReport").onclick = () => document.getElementById("reportModal").style.display = "none";
if(document.getElementById('openReportBtn')) document.getElementById('openReportBtn').onclick = () => document.getElementById('reportModal').style.display = 'block';

window.onclick = (e) => {
    if(e.target.classList.contains('modal')) e.target.style.display = 'none';
}

// Inicijalizacija aplikacije na loadu
window.addEventListener('load', async () => {
    console.log('📱 Stranica učitana - pokretanje sinhronizacije...');
    await loadSupabaseData();
    proveriAdminInterfejs();
    render(products);
    console.log('✅ Sinhronizacija i prikaz uspješno završeni.');
});