// Podaci o proizvodima (ovo bi inače dolazilo iz baze)
const products = [
    { name: "RTX 4090 Rog Strix", price: "3.800 KM", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Ryzen 9 7950X", price: "1.100 KM", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704" },
    { name: "Samsung G9 Odyssey", price: "2.500 KM", img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" },
    { name: "DDR5 RAM 32GB", price: "350 KM", img: "https://images.unsplash.com/photo-1562976540-1502c2145186" }
];

const grid = document.getElementById('productGrid');

// Funkcija za prikaz artikala
function displayProducts() {
    products.forEach(p => {
        const card = `
            <div class="card">
                <img src="${p.img}" alt="${p.name}">
                <div class="card-content">
                    <h4>${p.name}</h4>
                    <p class="price">${p.price}</p>
                    <button class="btn-filter" style="width: 100%; margin-top: 10px;">Pogledaj oglas</button>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });
}

// Pokreni funkciju kad se stranica učita
window.onload = displayProducts;