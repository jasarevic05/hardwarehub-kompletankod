// Podaci
const products = [
    { name: "NVIDIA RTX 4070 Ti", price: "1.650 KM", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Ryzen 7 7800X3D", price: "850 KM", img: "https://images.unsplash.com/photo-1591405351990-4726e331f141" },
    { name: "Logitech G Pro X", price: "220 KM", img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" },
    { name: "NZXT H9 Flow White", price: "320 KM", img: "https://images.unsplash.com/photo-1547082299-de196ea013d6" }
];

// Modal Logika
const modal = document.getElementById("filterModal");
const btn = document.getElementById("openFilters");
const span = document.getElementById("closeFilters");

btn.onclick = () => modal.style.display = "block";
span.onclick = () => modal.style.display = "none";

// Zatvori modal ako korisnik klikne bilo gdje van njega
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
}

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