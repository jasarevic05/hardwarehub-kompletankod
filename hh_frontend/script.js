// --- PODACI ZA PROIZVODE ---
const products = [
    { name: "NVIDIA RTX 4070 Ti", price: "1.650 KM", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Ryzen 7 7800X3D", price: "850 KM", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141" },
    { name: "Logitech G Pro X", price: "220 KM", img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" },
    { name: "NZXT H9 Flow White", price: "320 KM", img: "https://images.unsplash.com/photo-1547082299-de196ea013d6" }
];

// Renderanje proizvoda
const grid = document.getElementById('productGrid');

function render() {
    grid.innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.img}">
            <div class="card-info">
                <h4>${p.name}</h4>
                <p class="price">${p.price}</p>
                <button class="btn-action secondary full-width" style="margin-top:15px">Pogledaj</button>
            </div>
        </div>
    `).join('');
}
window.onload = render;

// --- LOGIKA ZA FILTER MODAL ---
const filterModal = document.getElementById("filterModal");
const btnFilter = document.getElementById("openFilters");
const spanFilter = document.getElementById("closeFilters");

btnFilter.onclick = () => filterModal.style.display = "block";
spanFilter.onclick = () => filterModal.style.display = "none";

// --- LOGIKA ZA MODAL REGISTRACIJE ---
const authModal = document.getElementById("authModal");
const btnAuth = document.getElementById("openAuth");
const spanAuth = document.getElementById("closeAuth");

btnAuth.onclick = () => authModal.style.display = "block";
spanAuth.onclick = () => authModal.style.display = "none";

// Zatvori modale ako korisnik klikne bilo gdje van njih
window.onclick = (event) => {
    if (event.target == filterModal) filterModal.style.display = "none";
    if (event.target == authModal) authModal.style.display = "none";
}

// --- EMAILJS LOGIKA ZA SLANJE POTVRDE ---

// 1. OVDJE UNESI SVOJ PUBLIC KEY (Kopiraj sa EmailJS Account stranice)
emailjs.init("ulfQJccZt4N0kFq78"); 

const registerForm = document.getElementById('registerForm');
const btnRegister = document.getElementById('btnRegister');

registerForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Sprječava refresh stranice prilikom klika na submit

    // Promjena izgleda dugmeta da korisnik zna da se nešto dešava
    btnRegister.innerText = "Slanje...";
    btnRegister.disabled = true;

    // Skupljamo podatke iz forme, ključevi moraju odgovarati varijablama u EmailJS template-u
    const templateParams = {
        ime: document.getElementById('regName').value,
        prezime: document.getElementById('regSurname').value,
        username: document.getElementById('regUsername').value,
        email_korisnika: document.getElementById('regEmail').value, // Email na koji se šalje
        datum: document.getElementById('regDob').value
    };

    // 2. OVDJE UNESI SVOJ SERVICE ID i TEMPLATE ID
    emailjs.send("service_th1lfel", "template_63qqwfw", templateParams)
        .then(function(response) {
            alert("Uspješna registracija! Potvrda je poslana na vaš email.");
            registerForm.reset(); // Očisti formu
            authModal.style.display = "none"; // Zatvori modal
            
            // Vrati dugme u normalu
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        }, function(error) {
            console.error("Greška:", error);
            alert("Došlo je do greške prilikom slanja emaila. Provjerite konzolu za detalje.");
            
            // Vrati dugme u normalu
            btnRegister.innerText = "Registruj se";
            btnRegister.disabled = false;
        });
});