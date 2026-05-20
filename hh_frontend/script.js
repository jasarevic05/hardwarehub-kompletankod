// --- 1. POČETNI PODACI (Baze) ---
const defaultProducts = [
    { id: 1, name: "NVIDIA RTX 4070 Ti", price: 1650, category: "GPU", brand: "NVIDIA", condition: "Novo", owner: "pro_gamer", specs: "12GB GDDR6X, vrhunska kartica za 1440p i 4K gaming. Kupljena nova, garancija 2 godine.", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704", views: 42, promote: "main" },
    { id: 2, name: "Ryzen 7 7800X3D", price: 850, category: "CPU", brand: "AMD", condition: "Novo", owner: "hardware_fan", specs: "8 jezgri, 16 threadova, najbolji procesor za gaming na svijetu trenutno. Fabričko pakovanje.", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141", views: 19, promote: "none" }
];

const defaultUsers = [
    { name: "Amar Softić", username: "pro_gamer", email: "amar@test.com", password: "123", hhcoins: 250, role: 'basic' },
    { name: "Emina Spahić", username: "hardware_fan", email: "emina@test.com", password: "123", hhcoins: 120, role: 'basic' }
];

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
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (!supabaseClient) console.error("Supabase client could not be created. Check if the Supabase script loaded correctly.");

let products = JSON.parse(localStorage.getItem('hardware_products')) || defaultProducts;
let users = JSON.parse(localStorage.getItem('hardware_users')) || defaultUsers;
let reports = JSON.parse(localStorage.getItem('hardware_reports')) || [];
let chats = JSON.parse(localStorage.getItem('hardware_chats')) || [];

let currentUser = JSON.parse(sessionStorage.getItem('currentUserActive')) || null;
let activeChatUser = null; 

const grid = document.getElementById('productGrid');

async function fetchFromSupabase(table) {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
        console.warn(`Supabase fetch error (${table}):`, error.message);
        return null;
    }
    return data;
}

async function loadSupabaseData() {
    try {
        const [productData, userData, reportData, chatData] = await Promise.all([
            fetchFromSupabase('products'),
            fetchFromSupabase('users'),
            fetchFromSupabase('reports'),
            fetchFromSupabase('chats')
        ]);

        if (productData && productData.length) products = productData;
        if (userData && userData.length) {
            users = userData.map(user => ({
                ...user,
                hhcoins: user.hhcoins ?? user.coins ?? 0,
                role: user.role || 'basic'
            }));
        }
        if (reportData && reportData.length) reports = reportData;
        if (chatData && chatData.length) chats = chatData;

        if (!products.length) products = defaultProducts;
        if (!users.length) users = defaultUsers;

        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (!sessionError && sessionData?.session?.user?.email) {
            const { data: profile, error: profileError } = await supabaseClient.from('users').select('*').eq('email', sessionData.session.user.email).maybeSingle();
            if (!profileError && profile) {
                currentUser = profile;
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
            }
        }

        localStorage.setItem('hardware_products', JSON.stringify(products));
        localStorage.setItem('hardware_users', JSON.stringify(users));
        localStorage.setItem('hardware_reports', JSON.stringify(reports));
        localStorage.setItem('hardware_chats', JSON.stringify(chats));
    } catch (error) {
        console.warn('Supabase initialization error:', error);
    }
}

async function getUserByUsername(username) {
    const { data, error } = await supabaseClient.from('users').select('*').eq('username', username).maybeSingle();
    if (error) return null;
    return data;
}

async function getUserByEmail(email) {
    const { data, error } = await supabaseClient.from('users').select('*').eq('email', email).maybeSingle();
    if (error) return null;
    return data;
}

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

    const cards = sortiraniProizvodi.map((p) => {
        const indexUBazi = products.findIndex(realP => realP.id === p.id);

        let klasaIzdvojenog = '';
        let bedzIzdvojenog = '';
        if(p.promote === 'main') {
            klasaIzdvojenog = 'featured-main';
            bedzIzdvojenog = `<span class="badge-featured">⭐ TOP Ponuda</span>`;
        } else if (p.promote === 'category') {
            klasaIzdvojenog = 'featured-category';
            bedzIzdvojenog = `<span class="badge-featured" style="background:#a855f7; color:white;">💎 Izdvojeno</span>`;
        }

        const thumb = p.images && p.images.length ? p.images[0] : p.img;

        return `
            <div class="card ${klasaIzdvojenog}">
                ${bedzIzdvojenog}
                <div>
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
                    <button onclick="alert('Za sponzorisanje posetite svoj profil ili administraciju.')" class="btn-action primary full-width" style="margin-top:15px">Sažmi ponudu</button>
                </div>
            </div>
        `);
    }

    grid.innerHTML = cards.join('');
}

async function obrisiArtikal(index) {
    if(confirm("Da li ste sigurni da želite obrisati ovaj oglas?")) {
        const artikal = products[index];
        if (artikal?.id) {
            const { error } = await supabaseClient.from('products').delete().eq('id', artikal.id);
            if (error) {
                console.warn('Greška pri brisanju oglasa:', error.message);
            }
        }
        products.splice(index, 1);
        localStorage.setItem('hardware_products', JSON.stringify(products));
        render(products);
    }
}

// --- 3. LOGIKA ZA PREGLED DETALJA ARTIKLA ---
function otvoriDetaljeArtikla(id) {
    const artikal = products.find(p => p.id === id);
    if(!artikal) return;

    // Povećaj broj pregleda
    artikal.views = (artikal.views || 0) + 1;
    if (artikal.id) {
        supabaseClient.from('products').update({ views: artikal.views }).eq('id', artikal.id).then(({ error }) => {
            if (error) console.warn('Greška pri ažuriranju pregleda:', error.message);
        });
    }
    localStorage.setItem('hardware_products', JSON.stringify(products));

    // Popuni podatke u modalu
    document.getElementById('detTitle').innerText = artikal.name;
    const mainImage = artikal.images && artikal.images.length ? artikal.images[0] : artikal.img;
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
    document.getElementById('profCoins').innerText = `💰 ${currentUser.hhcoins} HHCoins`;
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
        container.innerHTML = '<p style="color:var(--text-dim);">Nemate aktivnih oglasa. Objavite svoj prvi oglas sada.</p>';
        return;
    }

    container.innerHTML = myAds.map(ad => `
        <div class="profile-listing">
            <h4>${ad.name}</h4>
            <p><strong>Cijena:</strong> ${ad.price} KM | <strong>Stanje:</strong> ${ad.condition} | <strong>Kategorija:</strong> ${ad.category}</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-action secondary" onclick="editListing(${ad.id})">Uredi</button>
                <button class="btn-action btn-danger" onclick="obrisiArtikal(${products.findIndex(p => p.id === ad.id)})">Obriši</button>
            </div>
        </div>
    `).join('');
}

function editListing(id) {
    const ad = products.find(p => p.id === id);
    if(!ad) return;
    const novoIme = prompt('Unesite novi naziv artikla:', ad.name);
    if (novoIme) ad.name = novoIme;
    const novaCijena = prompt('Unesite novu cijenu:', ad.price);
    if (novaCijena && !isNaN(Number(novaCijena))) ad.price = Number(novaCijena);
    const noviSpecs = prompt('Unesite nove specifikacije:', ad.specs);
    if (noviSpecs) ad.specs = noviSpecs;
    localStorage.setItem('hardware_products', JSON.stringify(products));
    renderMyListings();
    render(products);
}

function purchaseMembership(level) {
    const prices = { silver: 200, premium: 400 };
    const cost = prices[level];
    if (!currentUser || !cost) return;
    if (currentUser.hhcoins < cost) {
        alert('Nemate dovoljno HHCoins za ovu nadogradnju.');
        return;
    }
    currentUser.hhcoins -= cost;
    currentUser.role = level;
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if(userIndex !== -1) users[userIndex] = currentUser;
    localStorage.setItem('hardware_users', JSON.stringify(users));
    sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
    alert(`Uspješno ste postali ${level.charAt(0).toUpperCase() + level.slice(1)} korisnik!`);
    proveriAdminInterfejs();
    otvoriProfilIKomunikaciju();
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

        const { data: insertedChat, error } = await supabaseClient.from('chats').insert([novaPoruka]).select().single();
        if (error) {
            console.warn('Greška pri slanju poruke:', error.message);
        }

        chats.push(insertedChat || novaPoruka);
        localStorage.setItem('hardware_chats', JSON.stringify(chats));
        input.value = '';
        prikaziPorukeZaKorisnika(activeChatUser);
    });
}

// --- 5. LOGIKA ZA OBJAVU ARTIKALA (SA PREMIUM COIN IZBOROM) ---
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
            alert(`Vaša trenutna rola ${role.charAt(0).toUpperCase() + role.slice(1)} ima limit ${maxAllowed} oglasa. Nadogradite rolu da dodate više.`);
            return;
        }

        if((currentUser.hhcoins || currentUser.coins || 0) < cijenaIzdvajanja) {
            alert(`Nemate dovoljno HHCoins za ovu vrstu izdvajanja! Potrebno vam je ${cijenaIzdvajanja} HHCoins, a imate ${currentUser.hhcoins || currentUser.coins || 0} HHCoins.`);
            return;
        }

        const slikaInput = document.getElementById('prodImgFile');
        const fajlovi = Array.from(slikaInput.files);
        if (fajlovi.length === 0) {
            alert('Odaberite najmanje jednu sliku artikla.');
            return;
        }

        const readFilesAsDataUrls = (files) => Promise.all(files.slice(0, 4).map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));

        const images = await readFilesAsDataUrls(fajlovi);

        if(cijenaIzdvajanja > 0) {
            const remaining = (currentUser.hhcoins || currentUser.coins || 0) - cijenaIzdvajanja;
            const { data: updatedUser, error: updateError } = await supabaseClient.from('users').update({ coins: remaining }).eq('username', currentUser.username).select().single();
            if (updateError) {
                console.warn('Greška pri ažuriranju HHCoins-a:', updateError.message);
            } else if (updatedUser) {
                currentUser = {
                    ...updatedUser,
                    hhcoins: updatedUser.hhcoins ?? updatedUser.coins ?? remaining,
                    role: updatedUser.role || currentUser.role || 'basic'
                };
                const uIdx = users.findIndex(u => u.username === currentUser.username);
                if(uIdx !== -1) users[uIdx] = currentUser;
                sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
                localStorage.setItem('hardware_users', JSON.stringify(users));
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
            images,
            views: 0,
            promote: promoteTip
        };

        const { data: insertedProduct, error: insertError } = await supabaseClient.from('products').insert([noviArtikal]).select().single();
        if (insertError) {
            alert('Greška pri objavi oglasa: ' + insertError.message);
            return;
        }

        if (insertedProduct) {
            products.unshift(insertedProduct);
        } else {
            products.unshift({ id: Date.now(), ...noviArtikal });
        }

        localStorage.setItem('hardware_products', JSON.stringify(products));
        sellForm.reset();
        document.getElementById('sellModal').style.display = "none";
        alert(cijenaIzdvajanja > 0 ? `Uspješno! Oglas je izdvojen i skinuto je ${cijenaIzdvajanja} HHCoins.` : "Vaš oglas je uspješno objavljen besplatno!");
        proveriAdminInterfejs();
        render(products);
    });
}

// --- 6. REGISTRACIJA I SLANJE EMAILJS ---
emailjs.init("ulfQJccZt4N0kFq78"); 
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

        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email,
            password: lozinka
        });

        if (signUpError) {
            alert("Greška pri registraciji: " + signUpError.message);
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            return;
        }

        const noviUserProfil = {
            name: `${naziv} ${prezime}`,
            username,
            email,
            coins: 100,
            hhcoins: 100,
            role: 'basic'
        };

        const { data: insertedUser, error: insertError } = await supabaseClient.from('users').insert([noviUserProfil]).select().single();
        if (insertError) {
            alert("Greška pri kreiranju korisničkog profila: " + insertError.message);
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
            return;
        }

        users.push(insertedUser);
        localStorage.setItem('hardware_users', JSON.stringify(users));

        const templateParams = {
            ime: naziv,
            prezime: prezime,
            username: username,
            email_korisnika: email,
            datum: document.getElementById('regDob').value
        };

        emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
            .catch(function(error) {
                console.warn("EmailJS error:", error);
            });

        registerForm.reset();
        document.getElementById('authModal').style.display = "none";
        btnRegister.innerText = "Registruj se";
        btnRegister.disabled = false;

        currentUser = {
            ...insertedUser,
            hhcoins: insertedUser.hhcoins ?? insertedUser.coins ?? 0,
            role: insertedUser.role || 'basic'
        };
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        proveriAdminInterfejs();
        render(products);
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

const openAuthBtn = document.getElementById('openAuth');
if (openAuthBtn) {
    openAuthBtn.onclick = () => {
        document.getElementById('authModal').style.display = 'block';
        if (loginForm) {
            loginForm.style.display = 'block';
        }
        if (registerForm) {
            registerForm.style.display = 'none';
        }
        if (authModalTitle) {
            authModalTitle.innerText = "Prijava na sistem";
        }
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

        let email = loginValue;
        if (!loginValue.includes('@')) {
            const korisnik = await getUserByUsername(loginValue);
            if (!korisnik) {
                alert("Korisničko ime ne postoji.");
                return;
            }
            email = korisnik.email;
        }

        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            alert("Pogrešna prijava: " + signInError.message);
            return;
        }

        const korisnickiProfil = await getUserByEmail(email);
        if (!korisnickiProfil) {
            alert("Korisnik nije pronađen u sistemu.");
            return;
        }

        currentUser = {
            ...korisnickiProfil,
            hhcoins: korisnickiProfil.hhcoins ?? korisnickiProfil.coins ?? 0,
            role: korisnickiProfil.role || 'basic'
        };
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        alert(`Dobrodošli nazad, ${currentUser.name}!`);
        loginForm.reset();
        document.getElementById('authModal').style.display = 'none';
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
        if(userBadge) {
            userBadge.style.display = 'block';
            userBadge.innerHTML = `👤 @${currentUser.username} (${currentUser.hhcoins || currentUser.coins || 0} HHCoins)`;
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

// --- Gumb za kreiranje (Sprečavanje ako niko nije logovan) ---
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

const openProfileBtn = document.getElementById('openProfileBtn');
if(openProfileBtn) {
    openProfileBtn.onclick = () => otvoriProfilIKomunikaciju();
}

const heroSellBtn = document.getElementById('heroSellBtn');
if(heroSellBtn) {
    heroSellBtn.onclick = () => {
        if(!currentUser) {
            document.getElementById('authModal').style.display = 'block';
        } else {
            document.getElementById('sellModal').style.display = 'block';
        }
    };
}

const saveProfileBtn = document.getElementById('saveProfileBtn');
if(saveProfileBtn) {
    saveProfileBtn.onclick = () => {
        const newName = document.getElementById('profileName').value.trim();
        const newEmail = document.getElementById('profileEmailEdit').value.trim();
        if (!newName || !newEmail) {
            alert('Molimo unesite ispravno ime i email.');
            return;
        }
        currentUser.name = newName;
        currentUser.email = newEmail;
        const index = users.findIndex(u => u.username === currentUser.username);
        if(index !== -1) users[index] = currentUser;
        localStorage.setItem('hardware_users', JSON.stringify(users));
        sessionStorage.setItem('currentUserActive', JSON.stringify(currentUser));
        alert('Profil je uspješno ažuriran.');
        proveriAdminInterfejs();
        otvoriProfilIKomunikaciju();
    };
}

const btnBuySilver = document.getElementById('btnBuySilver');
if(btnBuySilver) btnBuySilver.onclick = () => purchaseMembership('silver');
const btnBuyPremium = document.getElementById('btnBuyPremium');
if(btnBuyPremium) btnBuyPremium.onclick = () => purchaseMembership('premium');

// Otvaranje profila klikom na korisnički badge u navbaru
const userBadge = document.getElementById('userBadge');
if(userBadge) {
    userBadge.onclick = () => otvoriProfilIKomunikaciju();
}

// --- Ostatak standardnog koda (Filteri, Zatvaranja Modala) ---
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = async () => {
        isAdmin = false; currentUser = null;
        await supabaseClient.auth.signOut();
        sessionStorage.removeItem('isAdminActive'); sessionStorage.removeItem('currentUserActive');
        alert("Odjavljeni ste."); proveriAdminInterfejs(); render(products);
    };
}

const reportForm = document.getElementById('reportForm');
if(reportForm) {
    reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const noviReport = {
            username: document.getElementById('repUser').value,
            subject: document.getElementById('repSubject').value,
            message: document.getElementById('repMessage').value
        };
        const { data: insertedReport, error } = await supabaseClient.from('reports').insert([noviReport]).select().single();
        if (error) {
            console.warn('Greška pri slanju prijave:', error.message);
        }
        reports.push(insertedReport || noviReport);
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

    const selectedStates = [];
    if (filterNew.checked) selectedStates.push('Novo');
    if (filterUsed.checked) selectedStates.push('Polovno');

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
    filterCategory.value = 'Sve';
    filterBrand.value = 'Sve';
    filterMinPrice.value = '';
    filterMaxPrice.value = '';
    filterNew.checked = false;
    filterUsed.checked = false;
    searchInput.value = '';
    filtrirajSve();
};

// Modali otvaranja / zatvaranja kros prozor dugmad
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

window.onload = async () => {
    await loadSupabaseData();
    proveriAdminInterfejs();
    render(products);
};