const adminPasswords = {
    owner: 'owner123',
    admin: 'admin123'
};
const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (!supabaseClient) console.error("Supabase client could not be created. Check if the Supabase script loaded correctly.");
const localProductKey = 'hardware_products';
const localUserKey = 'hardware_users';
const localReportKey = 'hardware_reports';
const localLogKey = 'hardware_logs';
const adminSessionKey = 'adminPageActive';
const adminUsernameKey = 'currentAdminUsername';

let products = JSON.parse(localStorage.getItem(localProductKey)) || [];
let users = JSON.parse(localStorage.getItem(localUserKey)) || [];
let reports = JSON.parse(localStorage.getItem(localReportKey)) || [];
let logs = JSON.parse(localStorage.getItem(localLogKey)) || [];
let isAdminPageActive = sessionStorage.getItem(adminSessionKey) === 'true';
let currentAdmin = null;

function persistAdminState() {
    localStorage.setItem(localProductKey, JSON.stringify(products));
    localStorage.setItem(localUserKey, JSON.stringify(users));
    localStorage.setItem(localReportKey, JSON.stringify(reports));
    localStorage.setItem(localLogKey, JSON.stringify(logs));
}

async function fetchFromSupabase(table) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
        console.warn(`Supabase fetch error (${table}):`, error.message);
        return null;
    }
    return data;
}

async function ensureOwnerAdminUsers() {
    if (!supabaseClient) return;
    const missing = [];
    if (!users.some(u => u.username === 'owner')) {
        missing.push({ name: 'Glavni Vlasnik', username: 'owner', email: 'owner@hardwarehub.ba', hhcoins: 1000, role: 'owner' });
    }
    if (!users.some(u => u.username === 'admin')) {
        missing.push({ name: 'Administrator', username: 'admin', email: 'admin@hardwarehub.ba', hhcoins: 500, role: 'admin' });
    }
    if (missing.length) {
        const { data, error } = await supabaseClient.from('users').upsert(missing, { onConflict: 'username' }).select();
        if (error) {
            console.warn('Supabase upsert owner/admin error:', error.message);
        } else if (data) {
            data.forEach(user => {
                if (!users.some(u => u.username === user.username)) {
                    users.push({ ...user, hhcoins: user.hhcoins ?? user.coins ?? 0, role: user.role || 'basic' });
                }
            });
        }
    }
}

function createLog(action, detail) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('bs-BA'),
        action,
        detail
    };
    logs.unshift(entry);
    persistAdminState();
    renderLogs();
}

function loadFallbackData() {
    if (!users.length) {
        users = [
            { name: "Glavni Vlasnik", username: "owner", email: "owner@hardwarehub.ba", hhcoins: 1000, role: 'owner' },
            { name: "Administrator", username: "admin", email: "admin@hardwarehub.ba", hhcoins: 500, role: 'admin' },
            { name: "Amar Softić", username: "pro_gamer", email: "amar@test.com", password: "123", hhcoins: 250, role: 'basic' },
            { name: "Emina Spahić", username: "hardware_fan", email: "emina@test.com", password: "123", hhcoins: 120, role: 'basic' }
        ];
    }
    const ensureAdminUser = (user) => {
        if (!users.some(u => u.username === user.username)) {
            users.push(user);
        }
    };
    ensureAdminUser({ name: "Glavni Vlasnik", username: "owner", email: "owner@hardwarehub.ba", hhcoins: 1000, role: 'owner' });
    ensureAdminUser({ name: "Administrator", username: "admin", email: "admin@hardwarehub.ba", hhcoins: 500, role: 'admin' });
    if (!products.length) {
        products = [
            { id: 1, name: "NVIDIA RTX 4070 Ti", price: 1650, category: "GPU", brand: "NVIDIA", condition: "Novo", owner: "pro_gamer", specs: "12GB GDDR6X, vrhunska kartica za 1440p i 4K gaming.", images: ["https://images.unsplash.com/photo-1591488320449-011701bb6704"], views: 42, promote: "main" },
            { id: 2, name: "Ryzen 7 7800X3D", price: 850, category: "CPU", brand: "AMD", condition: "Novo", owner: "hardware_fan", specs: "8 jezgri, 16 threadova, najbolji procesor.", images: ["https://images.unsplash.com/photo-1591405351990-4726e331f141"], views: 19, promote: "none" }
        ];
    }
}

async function loadAdminData() {
    try {
        const [productData, userData, reportData] = await Promise.all([
            fetchFromSupabase('products'),
            fetchFromSupabase('users'),
            fetchFromSupabase('reports')
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

        if (!users.length) loadFallbackData();
        await ensureOwnerAdminUsers();
        if (!products.length) loadFallbackData();
        if (!reports.length) reports = reports || [];

        persistAdminState();
    } catch (error) {
        console.warn('Greška pri učitavanju admin podataka:', error.message);
        loadFallbackData();
        persistAdminState();
    }
}

function showLogin() {
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminLogout').style.display = 'none';
}

function showDashboard() {
    loadFallbackData();
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminDashboardSection').style.display = 'block';
    document.getElementById('adminLogout').style.display = 'inline-flex';
    document.getElementById('adminWelcome').innerText = currentAdmin ? `Prijavljen kao ${currentAdmin.name} (${currentAdmin.role})` : '';
    renderAdminSummary();
    renderAdminUsers();
    renderReports();
    renderLogs();
}

function renderAdminSummary() {
    document.getElementById('statUsers').innerText = users.length;
    document.getElementById('statAds').innerText = products.length;
    document.getElementById('statReports').innerText = reports.length;
}

function renderAdminUsers() {
    const body = document.getElementById('adminUsersTableBody');
    if (!body) return;
    body.innerHTML = users.map((user, index) => {
        const adCount = products.filter(p => p.owner === user.username).length;
        const roleAction = currentAdmin && currentAdmin.role === 'owner' && user.username !== currentAdmin.username ?
            `<button class="btn-coin" onclick="toggleAdminRole(${index})">${user.role === 'admin' ? 'Ukloni admin' : 'Postavi admin'}</button>` : '';
        return `<tr>
            <td>${user.name}</td>
            <td>@${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role || 'basic'}</td>
            <td style="color:#eab308; font-weight:800;">💰 ${user.hhcoins || 0}</td>
            <td style="text-align:center;">${adCount}</td>
            <td>
                <button class="btn-coin plus" onclick="openAdjustCoins(${index})">HHCoins</button>
                <button class="btn-coin" onclick="openSetRole(${index})">Rola</button>
                ${roleAction}
                <button class="btn-coin minus" onclick="deleteUser(${index})">Obriši</button>
            </td>
        </tr>`;
    }).join('');
}

function renderReports() {
    const container = document.getElementById('adminReportsContainer');
    if (!container) return;
    if (!reports.length) {
        container.innerHTML = '<p style="color:var(--text-dim);">Nema novih prijava.</p>';
        return;
    }
    container.innerHTML = reports.map(rep => `
        <div class="report-card">
            <strong>${rep.subject}</strong>
            <p>${rep.message}</p>
            <small>@${rep.username}</small>
        </div>
    `).join('');
}

function renderLogs() {
    const container = document.getElementById('adminLogsContainer');
    if (!container) return;
    if (!logs.length) {
        container.innerHTML = '<p style="color:var(--text-dim);">Nema administrativnih zapisa.</p>';
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="report-card">
            <strong>${log.action}</strong>
            <p>${log.detail}</p>
            <small>${log.timestamp}</small>
        </div>
    `).join('');
}

async function openAdjustCoins(index) {
    const amount = prompt('Unesite broj HHCoins (+/-) za korisnika:');
    const parsed = parseInt(amount, 10);
    if (isNaN(parsed)) return;
    users[index].hhcoins = (users[index].hhcoins || 0) + parsed;
    if (supabaseClient) {
        const { error } = await supabaseClient.from('users').update({ hhcoins: users[index].hhcoins }).eq('username', users[index].username);
        if (error) console.warn('Greška pri ažuriranju HHCoins-a u Supabase:', error.message);
    }
    persistAdminState();
    createLog('Izmjena HHCoins-a', `${currentAdmin ? '@' + currentAdmin.username : 'Sistem'} je promijenio HHCoins korisniku @${users[index].username} za ${parsed}`);
    renderAdminUsers();
}

async function openSetRole(index) {
    const role = prompt('Unesite novu rolu (basic, silver, premium):', users[index].role || 'basic');
    if (!role || !['basic', 'silver', 'premium'].includes(role.toLowerCase())) return;
    users[index].role = role.toLowerCase();
    if (supabaseClient) {
        const { error } = await supabaseClient.from('users').update({ role: users[index].role }).eq('username', users[index].username);
        if (error) console.warn('Greška pri ažuriranju role u Supabase:', error.message);
    }
    persistAdminState();
    createLog('Promjena role', `${currentAdmin ? '@' + currentAdmin.username : 'Sistem'} je korisniku @${users[index].username} postavio rolu ${role}`);
    renderAdminUsers();
}

async function toggleAdminRole(index) {
    if (!currentAdmin || currentAdmin.role !== 'owner') {
        return alert('Samo owner može postaviti ili ukloniti admina.');
    }
    const target = users[index];
    if (target.username === currentAdmin.username) return;
    target.role = target.role === 'admin' ? 'basic' : 'admin';
    if (supabaseClient) {
        const { error } = await supabaseClient.from('users').update({ role: target.role }).eq('username', target.username);
        if (error) console.warn('Greška pri promjeni admin role u Supabase:', error.message);
    }
    persistAdminState();
    createLog('Promjena admin role', `@${currentAdmin.username} je ${target.role === 'admin' ? 'postavio' : 'uklonio'} @${target.username} kao admin`);
    renderAdminUsers();
}

async function deleteUser(index) {
    if (!confirm('Da li ste sigurni da želite obrisati ovog korisnika?')) return;
    const deleted = users.splice(index, 1)[0];
    products = products.filter(p => p.owner !== deleted.username);
    reports = reports.filter(r => r.username !== deleted.username);
    if (supabaseClient) {
        const [{ error: userError }, { error: prodError }, { error: reportError }] = await Promise.all([
            supabaseClient.from('users').delete().eq('username', deleted.username),
            supabaseClient.from('products').delete().eq('owner', deleted.username),
            supabaseClient.from('reports').delete().eq('username', deleted.username)
        ]);
        if (userError) console.warn('Greška pri brisanju korisnika iz Supabase:', userError.message);
        if (prodError) console.warn('Greška pri brisanju oglasa iz Supabase:', prodError.message);
        if (reportError) console.warn('Greška pri brisanju prijava iz Supabase:', reportError.message);
    }
    persistAdminState();
    createLog('Brisanje korisnika', `${currentAdmin ? '@' + currentAdmin.username : 'Sistem'} je obrisao korisnika @${deleted.username}`);
    renderAdminUsers();
    renderReports();
    renderAdminSummary();
}

async function initAdminPage() {
    const loginForm = document.getElementById('adminLoginForm');
    const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    
    // Onemogući klikanje na login dugme dok podaci ne stignu iz Supabase
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Učitavanje podataka...";
    }

    await loadAdminData();

    // Omogući formu ponovo kada su podaci spremni u nizovima
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Prijavi se";
    }

    const savedAdminUsername = sessionStorage.getItem(adminUsernameKey);
    if (savedAdminUsername) {
        currentAdmin = users.find(u => u.username === savedAdminUsername && ['admin', 'owner'].includes(u.role)) || null;
        if (currentAdmin) {
            showDashboard();
            return;
        }
    }
    if (isAdminPageActive) {
        showDashboard();
    } else {
        showLogin();
    }

    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('adminLoginUser').value.trim();
        const password = document.getElementById('adminLoginPass').value.trim();
        
        const adminUser = users.find(u => u.username === username && ['admin', 'owner'].includes(u.role));
        if (!adminUser || adminPasswords[username] !== password) {
            alert('Pogrešno korisničko ime ili lozinka za admin panel.');
            return;
        }
        currentAdmin = adminUser;
        isAdminPageActive = true;
        sessionStorage.setItem(adminSessionKey, 'true');
        sessionStorage.setItem(adminUsernameKey, currentAdmin.username);
        sessionStorage.removeItem('currentUserActive');
        createLog('Admin prijava', `@${currentAdmin.username} (${currentAdmin.role}) se prijavio na panel`);
        showDashboard();
    });

    document.getElementById('adminLogout').addEventListener('click', function() {
        isAdminPageActive = false;
        currentAdmin = null;
        sessionStorage.removeItem(adminSessionKey);
        sessionStorage.removeItem(adminUsernameKey);
        createLog('Admin odjava', 'Administrator se odjavio sa panela');
        showLogin();
    });
}

window.addEventListener('load', initAdminPage);