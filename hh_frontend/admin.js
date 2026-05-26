const adminPasswords = {
    owner: 'owner123',
    admin: 'admin123'
};
const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!supabaseClient) {
    console.error("❌ Admin greška: Supabase klijent nije inicijalizovan! Provjerite CDN skriptu.");
}

const localLogKey = 'hardware_logs';
const adminSessionKey = 'adminPageActive';
const adminUsernameKey = 'currentAdminUsername';

const DB_TABLE_ALIASES = {
    products: ['products', 'product', 'oglasi', 'artikli', 'ads', 'items', 'proizvodi', 'item', 'hardware_products', 'hardware_items', 'public.products', 'public.oglasi', 'public.artikli', 'public.items'],
    users: ['javni_korisnici', 'korisnici', 'users', 'hardware_users', 'public.javni_korisnici', 'public.korisnici', 'public.users'],
    reports: ['reports', 'prijave', 'support_reports', 'hardware_reports', 'public.reports', 'public.prijave']
};

const DB_TABLE_CACHE = {};

let products = [];
let users = [];
let reports = [];
let logs = JSON.parse(localStorage.getItem(localLogKey)) || [];

// Čišćenje niza odmah u startu od potencijalnih null elemenata u kešu
users = users.filter(u => u !== null && u !== undefined);
products = products.filter(p => p !== null && p !== undefined);

let currentAdmin = null;
let isAdminPageActive = sessionStorage.getItem(adminSessionKey) === 'true';

async function resolveTableName(key) {
    if (DB_TABLE_CACHE[key]) return DB_TABLE_CACHE[key];
    if (!supabaseClient) return null;
    const aliases = DB_TABLE_ALIASES[key] || [key];
    let lastError = null;
    for (const alias of aliases) {
        const { error } = await supabaseClient.from(alias).select('*').limit(1);
        if (!error) {
            DB_TABLE_CACHE[key] = alias;
            console.log(`✅ Supabase tabela za '${key}' pronađena kao '${alias}'.`);
            return alias;
        }
        lastError = error;
        console.warn(`Supabase tabla '${alias}' nije dostupna:`, error.message);
    }
    console.error(`❌ Nije pronađena Supabase tabela za '${key}'. Probani nazivi: ${aliases.join(', ')}. Zadnja greška: ${lastError?.message || 'nema poruke'}`);
    return null;
}

async function fetchAllData() {
    if (!supabaseClient) {
        alert('❌ Supabase klijent nije dostupan. Podaci se ne mogu učitati.');
        return;
    }
    try {
        const [productsTable, usersTable, reportsTable] = await Promise.all([
            resolveTableName('products'),
            resolveTableName('users'),
            resolveTableName('reports')
        ]);

        if (!productsTable || !usersTable || !reportsTable) {
            throw new Error('Jedna ili više potrebnih tabela nisu pronađene u Supabase bazi.');
        }

        const [prodRes, userRes, repRes] = await Promise.all([
            supabaseClient.from(productsTable).select('*'),
            supabaseClient.from(usersTable).select('*'),
            supabaseClient.from(reportsTable).select('*')
        ]);

        if (prodRes.error) console.error("Greška pri učitavanju proizvoda:", prodRes.error.message);
        if (userRes.error) console.error("Greška pri učitavanju korisnika:", userRes.error.message);
        if (repRes.error) console.error("Greška pri učitavanju prijava:", repRes.error.message);

        products = (prodRes.data || []).filter(p => p !== null);
        users = (userRes.data || []).filter(u => u !== null);
        reports = (repRes.data || []).filter(r => r !== null);

        // Podaci se koriste direktno iz baze, bez lokalnog cache-a.
        console.log("🔄 Podaci uspješno povučeni iz Supabase baze.");
    } catch (err) {
        console.error("Sustavni problem sa povlačenjem podataka:", err);
    }
}

function showLogin() {
    const loginSec = document.getElementById('adminLoginSection');
    const dashSec = document.getElementById('adminDashboardSection');
    const logoutBtn = document.getElementById('adminLogout');

    if (loginSec) loginSec.style.display = 'block';
    if (dashSec) dashSec.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
}

function showDashboard() {
    const loginSec = document.getElementById('adminLoginSection');
    const dashSec = document.getElementById('adminDashboardSection');
    const logoutBtn = document.getElementById('adminLogout');

    if (loginSec) loginSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    // Ispisivanje dobrodošlice ako element postoji
    const welcomeText = document.getElementById('adminWelcome');
    if (welcomeText && currentAdmin) {
        welcomeText.innerText = `Dobrodošli nazad, @${currentAdmin.username} (${currentAdmin.role.toUpperCase()})`;
    }

    renderStats();
    renderUsersTable();
    renderReports();
    renderLogs();
}

// POPRAVLJENO I SIGURNO: Koristi tačne ID-eve iz tvog admin.html
function renderStats() {
    const pStat = document.getElementById('statAds');       
    const uStat = document.getElementById('statUsers');     
    const rStat = document.getElementById('statReports');   

    if (pStat) pStat.innerText = products.length;
    if (uStat) uStat.innerText = users.length;
    if (rStat) rStat.innerText = reports.length;
}

function renderUsersTable() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim);">Nema registriranih korisnika u tabeli 'javni_korisnici'.</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        if (!u) return '';
        const brojOglasa = products.filter(p => p && p.owner === u.username).length;
        const saldoCoins = u.hhcoins ?? 0;
        return `
            <tr>
                <td><strong>${u.name || 'Nema imena'}</strong></td>
                <td style="color:var(--accent);">@${u.username || 'nepoznato'}</td>
                <td>${u.email || 'Nema emaila'}</td>
                <td><span class="badge-condition" style="background:${u.role !== 'basic' ? '#a855f7' : 'rgba(255,255,255,0.05)'}">${u.role ? u.role.toUpperCase() : 'BASIC'}</span></td>
                <td><b style="color:#facc15;">${saldoCoins} HHC</b></td>
                <td>${brojOglasa}</td>
                <td>
                    <button class="btn-coin plus" onclick="modifikujCoins('${u.username}', 50)">+50</button>
                    <button class="btn-coin minus" onclick="modifikujCoins('${u.username}', -50)">-50</button>
                    <button class="btn-action btn-danger" style="padding:4px 8px; font-size:0.75rem; margin-left:5px;" onclick="obrisiKorisnika('${u.username}')">Ukloni</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function modifikujCoins(username, iznos) {
    const korisnik = users.find(u => u && u.username === username);
    if (!korisnik) return;
    
    let trenutniCoins = korisnik.hhcoins ?? 0;
    let noviSaldo = Math.max(0, trenutniCoins + iznos);

    if (supabaseClient) {
        const usersTable = await resolveTableName('users');
        if (!usersTable) {
            alert('Greška: tabela korisnika nije pronađena.');
            return;
        }
        const { error } = await supabaseClient
            .from(usersTable)
            .update({ hhcoins: noviSaldo })
            .eq('username', username);
            
        if (error) {
            alert("Greška pri ažuriranju HHCoinsa na serveru: " + error.message);
            return;
        }
    }

    createLog('Izmjena stanja', `Izmijenjeno stanje za @${username} (${iznos > 0 ? '+' : ''}${iznos} HHCoins)`);
    await fetchAllData();
    showDashboard();
}

async function obrisiKorisnika(username) {
    if (!confirm(`Da li ste sigurni da želite trajno obrisati korisnika @${username} i sve njegove oglase?`)) return;
    
    if (supabaseClient) {
            const productsTable = await resolveTableName('products');
            const usersTable = await resolveTableName('users');
            if (!productsTable || !usersTable) {
                alert('Greška: potrebne tabele nisu pronađene u bazi.');
                return;
            }

            const { error: productError } = await supabaseClient.from(productsTable).delete().eq('owner', username);
            if (productError) {
                alert("Greška pri brisanju oglasa korisnika: " + productError.message);
                return;
            }

            const { error } = await supabaseClient.from(usersTable).delete().eq('username', username);
            if (error) {
                alert("Greška pri brisanju korisnika: " + error.message);
                return;
            }
        }
    createLog('Uklanjanje korisnika', `Korisnik @${username} je trajno obrisan.`);
    await fetchAllData();
    showDashboard();
}

function renderReports() {
    const container = document.getElementById('adminReportsContainer');
    if (!container) return;
    
    if (reports.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:20px;">Inbox prijava je prazan.</p>`;
        return;
    }

    container.innerHTML = reports.map(r => `
        <div class="report-item" style="border-left: 3px solid #ef4444; background: rgba(239,68,68,0.02); padding: 12px; margin-bottom: 10px; border-radius: 4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="color:var(--accent); font-weight:600;">@${r.username}</span>
                <small style="color:var(--text-dim); font-size:0.75rem;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</small>
            </div>
            <h4 style="margin:5px 0; color:white;">${r.subject}</h4>
            <p style="margin:0; font-size:0.85rem; color:var(--text-dim); line-height:1.4;">${r.message}</p>
            <button class="btn-action secondary" style="padding:3px 8px; font-size:0.7rem; margin-top:8px;" onclick="ZatvoriPrijavu(${r.id})">Označi kao riješeno</button>
        </div>
    `).join('');
}

async function ZatvoriPrijavu(id) {
    if (supabaseClient) {
        const reportsTable = await resolveTableName('reports');
        if (!reportsTable) {
            alert('Greška: tabela prijava nije pronađena.');
            return;
        }
        const { error } = await supabaseClient.from(reportsTable).delete().eq('id', id);
        if (error) {
            alert("Greška pri zatvaranju prijave: " + error.message);
            return;
        }
    }
    createLog('Prijava riješena', `Prijava ID: ${id} je arhivirana.`);
    await fetchAllData();
    showDashboard();
}

function createLog(tip, detalji) {
    const noviLog = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: tip,
        details: detalji
    };
    logs.unshift(noviLog);
    if (logs.length > 30) logs.pop();
    localStorage.setItem(localLogKey, JSON.stringify(logs));
}

function renderLogs() {
    const container = document.getElementById('adminLogsContainer');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:20px;">Nema zabilježenih aktivnosti.</p>`;
        return;
    }

    container.innerHTML = logs.map(l => `
        <div style="font-size:0.8rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="color:var(--text-dim); font-family:monospace;">[${l.time}]</span> 
            <b style="color:var(--accent);">${l.type}:</b> 
            <span style="color:#e2e8f0;">${l.details}</span>
        </div>
    `).join('');
}

window.addEventListener('load', async () => {
    console.log('⚙️ Pokretanje Admin Panela...');
    await fetchAllData();

    if (isAdminPageActive) {
        const savedUsername = sessionStorage.getItem(adminUsernameKey);
        if (savedUsername && users && users.length > 0) {
            currentAdmin = users.find(u => u && u.username === savedUsername) || null;
        }
    }

    if (isAdminPageActive && currentAdmin) {
        showDashboard();
    } else {
        showLogin();
    }

    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('adminLoginUser');
            const passwordInput = document.getElementById('adminLoginPass');
            
            if (!usernameInput || !passwordInput) {
                console.error("❌ Ulazna polja nisu pronađena u HTML-u.");
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!users || users.length === 0) {
                alert('Podaci o korisnicima se još učitavaju sa servera. Molimo sačekajte sekundu.');
                return;
            }

            const adminUser = users.find(u => u && u.username === username && ['admin', 'owner'].includes(u.role));
            const fallbackPasswordMatch = adminPasswords[username] === password;
            const fallbackRole = username === 'owner' ? 'owner' : 'admin';

            if (adminUser) {
                if (adminUser.password !== password) {
                    alert('Pogrešno korisničko ime ili lozinka za admin panel.');
                    return;
                }
                currentAdmin = adminUser;
            } else if (fallbackPasswordMatch) {
                currentAdmin = {
                    username,
                    role: fallbackRole,
                    name: fallbackRole === 'owner' ? 'Administrator' : 'Admin',
                    email: `${username}@hardwarehub.ba`
                };
            } else {
                alert('Pogrešno korisničko ime ili lozinka za admin panel.');
                return;
            }
            
            isAdminPageActive = true;
            sessionStorage.setItem(adminSessionKey, 'true');
            sessionStorage.setItem(adminUsernameKey, currentAdmin.username);
            sessionStorage.removeItem('currentUserActive');
            createLog('Admin prijava', `@${currentAdmin.username} (${currentAdmin.role}) se prijavio na panel`);
            showDashboard();
        });
    }

    const logoutBtn = document.getElementById('adminLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            isAdminPageActive = false;
            currentAdmin = null;
            sessionStorage.removeItem(adminSessionKey);
            sessionStorage.removeItem(adminUsernameKey);
            createLog('Admin odjava', 'Administrator se odjavio sa panela');
            showLogin();
        });
    }
});