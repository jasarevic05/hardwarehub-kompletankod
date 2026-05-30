// --- 1. KONFIGURACIJA I GLOBALNA STANJA ---
const SUPABASE_URL = "https://gvwmkqqhpdklikkbciol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d21rcXFocGRrbGlra2JjaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODg2OTEsImV4cCI6MjA5NDc2NDY5MX0.X5URdWNvIez_jiuT4uyhBtTAi9Vcr2SDf9KyKE5YdE0";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

// TAČNO MAPIRANJE prema tvojoj slici iz baze podataka (kategorija sa velikim/malim slovima)
const categoryMapping = {
    cpu: "Procesori",
    mb: "Matična Ploča",
    ram: "RAM Memorija",
    gpu: "Grafičke Kartice",
    storage: "SSD/HDD",
    psu: "Napajanja",
    case: "Kućišta"
};

const buildCategories = [
    { id: 'cpu', name: 'Procesor (CPU)', icon: '⚙️' },
    { id: 'mb', name: 'Matična ploča', icon: '🎛️' },
    { id: 'ram', name: 'RAM Memorija', icon: '📻' },
    { id: 'gpu', name: 'Grafička kartica (GPU)', icon: '🎮' },
    { id: 'storage', name: 'Skladište (SSD/HDD)', icon: '💾' },
    { id: 'psu', name: 'Napajanje (PSU)', icon: '🔌' },
    { id: 'case', name: 'Kućište', icon: '📦' }
];

const DB_TABLE_ALIASES = {
    products: ['products', 'product', 'oglasi', 'artikli', 'ads', 'items', 'proizvodi', 'item', 'hardware_products', 'hardware_items'],
    users: ['javni_korisnici', 'korisnici', 'users', 'hardware_users']
};

const DB_TABLE_CACHE = {};
let allProducts = []; 
let currentBuild = {}; 
let currentSelectedSlot = 'cpu'; 

console.log('🏗️ PC Builder Modul pokrenut sa mapiranjem baze...');

// --- 2. SUPABASE LOGIKA ZA REZOLUCIJU TABELA ---
async function resolveTableName(key) {
    if (DB_TABLE_CACHE[key]) return DB_TABLE_CACHE[key];
    if (!supabaseClient) return null;

    const aliases = DB_TABLE_ALIASES[key] || [key];
    for (const alias of aliases) {
        const { error } = await supabaseClient.from(alias).select('*').limit(1);
        if (!error) {
            DB_TABLE_CACHE[key] = alias;
            console.log(`✅ Builder: Pronađena tabela za '${key}' pod nazivom '${alias}'.`);
            return alias;
        }
    }
    return null;
}

async function loadBuilderData() {
    try {
        if (!supabaseClient) {
            console.error("Supabase klijent nije inicijalizovan.");
            return;
        }
        
        // Dinamičko pronalaženje tačnog imena tabele (npr. 'products' ili 'oglasi')
        const tableName = await resolveTableName('products');
        if (!tableName) {
            console.error("❌ Tabela nije pronađena.");
            return;
        }

        // Povlačenje STVARNIH oglasa koje su korisnici objavili
        const { data, error } = await supabaseClient.from(tableName).select('*');
        if (error) throw error;

        // Punjenje globalnog niza isključivo oglasima sa sajta
        allProducts = data || [];
        console.log(`✅ PC Builder uspešno učitao ${allProducts.length} STVARNIH oglasa iz baze.`);
        
        // Pokretanje prikaza na interfejsu
        renderSlots();
        osveziDostupneKomponente();
    } catch (e) {
        console.error("Greška pri učitavanju podataka za builder:", e.message);
    }
}
// --- 3. RENDEROVANJE KORISNIČKOG INTERFEJSA ---
function renderSlots() {
    const container = document.getElementById('slotsContainer');
    if (!container) return;

    container.innerHTML = buildCategories.map(cat => {
        const odabranaKomponenta = currentBuild[cat.id];
        const isActive = cat.id === currentSelectedSlot ? 'active' : '';
        
        return `
            <div class="build-slot ${isActive}" onclick="selektujSlot('${cat.id}')" id="slot-${cat.id}">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.2rem;">${cat.icon}</span>
                        <div>
                            <small style="color:var(--text-dim); display:block;">${cat.name}</small>
                            <strong style="color:white;">${odabranaKomponenta ? odabranaKomponenta.name : 'Nije odabrano'}</strong>
                        </div>
                    </div>
                    <div>
                        ${odabranaKomponenta ? `<span style="color:var(--accent); font-weight:800;">${odabranaKomponenta.price} KM</span>` : `<span style="color:var(--text-dim); font-size:0.85rem;">Dodaj +</span>`}
                    </div>
                </div>
                ${odabranaKomponenta ? `
                    <div style="margin-top:8px; text-align:right;">
                        <button class="btn-coin minus" style="font-size:0.75rem; padding:2px 8px;" onclick="event.stopPropagation(); ukloniIzSlota('${cat.id}')">Ukloni</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function selektujSlot(slotId) {
    currentSelectedSlot = slotId;
    
    const naslov = buildCategories.find(c => c.id === slotId);
    if (naslov) {
        document.getElementById('selectionTitle').innerText = `Odaberi ${naslov.name}`;
    }

    renderSlots();
    osveziDostupneKomponente();
}

function osveziDostupneKomponente() {
    // Tražimo element sa klasom .component-grid (koja se vidi na tvojoj slici) ili .product-grid
    const mainGrid = document.querySelector('.component-grid') || document.querySelector('.product-grid') || document.getElementById('componentSelectionGrid');
    
    if (!mainGrid) {
        console.error("❌ Greška: CSS Grid kontejner za komponente nije pronađen u HTML-u!");
        return;
    }

    const pojamPretrage = document.getElementById('searchComponent')?.value.toLowerCase().trim() || "";
    const trazenaKategorijaUBazi = categoryMapping[currentSelectedSlot];

    console.log(`🔍 Tražim komponente za slot: ${currentSelectedSlot} -> Kategorija u bazi: "${trazenaKategorijaUBazi}"`);

    // Filtriranje podataka iz baze
    const filtriraneKomponente = allProducts.filter(p => {
        // Safe check u slučaju da je kolona prazna (null)
        const katIzBaze = p.kategorija ? p.kategorija.trim() : "";
        const uKategoriji = katIzBaze === trazenaKategorijaUBazi;
        
        const ime = p.name ? p.name.toLowerCase() : "";
        const specifikacije = p.specifikacije ? p.specifikacije.toLowerCase() : "";
        const uPretrazi = ime.includes(pojamPretrage) || specifikacije.includes(pojamPretrage);
        
        return uKategoriji && uPretrazi;
    });

    if (filtriraneKomponente.length === 0) {
        mainGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; margin-top: 20px; font-style: italic;">Nema dostupnih artikala u bazi za kategoriju "${trazenaKategorijaUBazi}".</p>`;
        return;
    }

    // Renderovanje kartica unutar grida
    mainGrid.innerHTML = filtriraneKomponente.map(p => {
        let slikaUrl = "https://images.unsplash.com/photo-1591488320449-011701bb6704";
        if (p.slika) {
            slikaUrl = p.slika;
        } else if (p.images && p.images.length) {
            slikaUrl = p.images[0];
        }

        return `
            <div class="card" style="padding:15px; background:rgba(255,255,255,0.02); border:1px solid var(--border); display:flex; flex-direction:column; justify-content:space-between; border-radius:12px;">
                <div>
                    <img src="${slikaUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:10px;">
                    <h4 style="margin:10px 0 5px 0; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:white;">${p.name}</h4>
                    <p style="font-size:0.8rem; color:var(--text-dim); height:35px; overflow:hidden; line-height:1.3;">${p.specifikacije || 'Nema opisa'}</p>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <span style="color:var(--accent); font-weight:800;">${p.price} KM</span>
                    <button class="btn-action primary" style="padding:6px 12px; font-size:0.8rem; cursor:pointer;" onclick="dodajUBuild(${p.id})">Odaberi</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- 4. LOGIKA ZA UPRAVLJANJE BUILDOM ---
function dodajUBuild(proizvodId) {
    const proizvod = allProducts.find(p => p.id === proizvodId);
    if (!proizvod) return;

    currentBuild[currentSelectedSlot] = proizvod;
    
    renderSlots();
    azurirajSumuIPreracun();
}

function ukloniIzSlota(slotId) {
    if (currentBuild[slotId]) {
        delete currentBuild[slotId];
        renderSlots();
        azurirajSumuIPreracun();
    }
}

function azurirajSumuIPreracun() {
    let ukupnaCijena = 0;
    let ukupnaPotrosnja = 0;

    Object.values(currentBuild).forEach(komponenta => {
        ukupnaCijena += parseFloat(komponenta.price) || 0;
        
        // Čitanje potrošnje iz kolone 'specifikacije'
        if (komponenta.specifikacije) {
            const match = komponenta.specifikacije.match(/(\d+)\s*W/i);
            if (match) {
                ukupnaPotrosnja += parseInt(match[1]) || 0;
            }
        }
    });

    document.getElementById('totalCost').innerText = `${ukupnaCijena} KM`;
    document.getElementById('totalPower').innerText = `${ukupnaPotrosnja} W`;

    const budgetInput = document.getElementById('budgetInput');
    const budgetBar = document.getElementById('budgetBar');
    if (budgetInput && budgetBar) {
        const limit = parseFloat(budgetInput.value) || 0;
        if (limit > 0) {
            const procenat = Math.min((ukupnaCijena / limit) * 100, 100);
            budgetBar.style.width = `${procenat}%`;
            budgetBar.style.background = ukupnaCijena > limit ? 'var(--danger)' : 'var(--accent)';
        } else {
            budgetBar.style.width = '0%';
        }
    }

    provjeriKompatibilnost(ukupnaPotrosnja);
}

function provjeriKompatibilnost(watts) {
    const statusDiv = document.getElementById('compatStatus');
    if (!statusDiv) return;

    statusDiv.style.display = 'block';
    const imaPSU = !!currentBuild.psu;

    if (imaPSU) {
        let snagaNapajanja = 0;
        const psuSpecs = currentBuild.psu.name + " " + (currentBuild.psu.specifikacije || "");
        const match = psuSpecs.match(/(\d+)\s*W/i);
        if (match) snagaNapajanja = parseInt(match[1]);

        if (snagaNapajanja > 0 && watts > snagaNapajanja) {
            statusDiv.className = 'compat-alert compat-warn';
            statusDiv.style.background = 'rgba(239, 68, 68, 0.15)';
            statusDiv.style.color = 'var(--danger)';
            statusDiv.innerHTML = `⚠️ Nedovoljno napajanje! Sistem troši <b>${watts}W</b>, a napajanje nudi <b>${snagaNapajanja}W</b>.`;
            return;
        }
    }

    const brojKomponenti = Object.keys(currentBuild).length;
    if (brojKomponenti === buildCategories.length) {
        statusDiv.className = 'compat-alert compat-ok';
        statusDiv.style.background = 'rgba(16, 185, 129, 0.15)';
        statusDiv.style.color = 'var(--success)';
        statusDiv.innerHTML = `✅ Konfiguracija je kompletna!`;
    } else {
        statusDiv.className = 'compat-alert';
        statusDiv.style.background = 'rgba(255, 255, 255, 0.05)';
        statusDiv.style.color = 'var(--text-dim)';
        statusDiv.innerHTML = `ℹ️ Dodano komponenata: ${brojKomponenti}/${buildCategories.length}.`;
    }
}

// --- 5. EVENT LISTENERS & INICIJALIZACIJA ---
document.getElementById('searchComponent')?.addEventListener('input', osveziDostupneKomponente);
document.getElementById('budgetInput')?.addEventListener('input', azurirajSumuIPreracun);

document.getElementById('btnSaveBuild')?.addEventListener('click', () => {
    if (Object.keys(currentBuild).length === 0) {
        alert("Nemate dodanih komponenti!");
        return;
    }
    alert("🎉 Konfiguracija sačuvana!");
    localStorage.setItem('savedHardwareBuild', JSON.stringify(currentBuild));
});

window.addEventListener('load', loadBuilderData);