// --- POČETNI PODACI (Ako je localStorage prazan) ---
const defaultProducts = [
    { name: "NVIDIA RTX 4070 Ti", price: 1650, category: "GPU", brand: "NVIDIA", condition: "Novo", specs: "12GB GDDR6X, vrhunska kartica za 1440p i 4K gaming. Kupljena nova, garancija 2 godine.", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Ryzen 7 7800X3D", price: 850, category: "CPU", brand: "AMD", condition: "Novo", specs: "8 jezgri, 16 threadova, najbolji procesor za gaming na svijetu trenutno. Fabričko pakovanje.", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141" },
    { name: "Logitech G Pro X Superlight", price: 220, category: "Periferija", brand: "Logitech", condition: "Novo", specs: "Ultra lagani bežični miš, HERO 25K senzor, bijela boja. Korišten samo 2 dana.", img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" }
];

let products = JSON.parse(localStorage.getItem('hardware_products')) || defaultProducts;
const grid = document.getElementById('productGrid');

// --- RENDERANJE KARTICA ---
function render(productsToDisplay) {
    if(productsToDisplay.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; margin-top: 40px;">Nema pronađenih oglasa.</p>`;
        return;
    }

    grid.innerHTML = productsToDisplay.map(p => `
        <div class="card">
            <div>
                <img src="${p.img}">
                <h4>${p.name}</h4>
                <div class="card-meta">
                    <span>Brend: <b>${p.brand}</b></span>
                    <span class="badge-condition">${p.condition}</span>
                </div>
                <p class="specs">${p.specs}</p>
            </div>
            <div>
                <p class="price">${p.price} KM</p>
                <button class="btn-action secondary full-width" style="margin-top:15px">Pogledaj detalje</button>
            </div>
        </div>
    `).join('');
}

render(products);


// --- LOGIKA ZA DOBIJANJE SLIKE SA RAČUNARA (FileReader) ---
const sellForm = document.getElementById('sellForm');
const sellModal = document.getElementById('sellModal');

sellForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const novoIme = document.getElementById('prodName').value;
    const noviBrend = document.getElementById('prodBrand').value;
    const novaKategorija = document.getElementById('prodCategory').value;
    const novaCijena = parseFloat(document.getElementById('prodPrice').value);
    const noveSpecifikacije = document.getElementById('prodSpecs').value;
    const stanje = document.querySelector('input[name="prodCondition"]:checked').value;
    
    // Hvatanje fajla iz inputa
    const slikaInput = document.getElementById('prodImgFile');
    const fajl = slikaInput.files[0];

    if (fajl) {
        const reader = new FileReader();

        // Čekamo da se fajl uspješno pročita i pretvori u tekstualni kod
        reader.onload = function(e) {
            const slikaBase64 = e.target.result; // Ovo sadrži sliku u obliku teksta

            // Kreiramo objekat sa Base64 slikom
            const noviArtikal = {
                name: novoIme,
                price: novaCijena,
                category: novaKategorija,
                brand: noviBrend,
                condition: stanje,
                specs: noveSpecifikacije,
                img: slikaBase64 
            };

            // Dodavanje u memoriju
            products.unshift(noviArtikal);
            localStorage.setItem('hardware_products', JSON.stringify(products));

            // Osvježi ekran i zatvori formu
            render(products);
            sellForm.reset();
            sellModal.style.display = "none";
            alert("Vaš artikal sa slikom je uspješno objavljen!");
        };

        // Pokretanje procesa čitanja fajla sa računara
        reader.readAsDataURL(fajl);
    }
});


// --- LOGIKA FILTRIRANJA I PRETRAGE ---
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


// --- MODAL LOGIKA ---
const filterModal = document.getElementById("filterModal");
const btnFilter = document.getElementById("openFilters");
const spanFilter = document.getElementById("closeFilters");

btnFilter.onclick = () => filterModal.style.display = "block";
spanFilter.onclick = () => filterModal.style.display = "none";

const authModal = document.getElementById("authModal");
const btnAuth = document.getElementById("openAuth");
const spanAuth = document.getElementById("closeAuth");

btnAuth.onclick = () => authModal.style.display = "block";
spanAuth.onclick = () => authModal.style.display = "none";

const btnSell = document.getElementById("openSell");
const spanSell = document.getElementById("closeSell");

btnSell.onclick = () => sellModal.style.display = "block";
spanSell.onclick = () => sellModal.style.display = "none";

window.onclick = (event) => {
    if (event.target == filterModal) filterModal.style.display = "none";
    if (event.target == authModal) authModal.style.display = "none";
    if (event.target == sellModal) sellModal.style.display = "none";
}

// --- EMAILJS REGISTRACIJA ---
emailjs.init("ulfQJccZt4N0kFq78"); 
const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');

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
        .then(function() {
            alert("Uspješna registracija! Potvrda je poslana na email.");
            registerForm.reset();
            authModal.style.display = "none";
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        }, function(error) {
            alert("Greška: " + error.text);
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        });
});
//  emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
// emailjs.init("ulfQJccZt4N0kFq78"); 