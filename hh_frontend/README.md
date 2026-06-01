# HardwareHub

## 1. Kratki opis
HardwareHub je web frontend aplikacija i marketplace za prodaju i kupovinu hardverskih komponenti u Bosni i Hercegovini. Aplikacija omogućava korisnicima pretragu oglasa, filtriranje po kategorijama i proizvođačima, registraciju i prijavu, objavu oglasa, upravljanje vlastitim profilom, te slanje prijava podršci.

U sklopu projekta postoji i administrativni panel za upravljanje korisnicima, uplatama, prijavama i logovima.

## 2. Članovi tima i doprinos
> Napomena: Zamijenite sljedeće stavke sa stvarnim imenima i doprinosima vašeg tima.

- **Član 1: Nihad Jasarevic**
  - DWS:
    - Dodatna podrska pri razvoju korisničkog sučelja marketplacea
    - Implementacija registracije/prijave i upravljanja oglasima
    - Integracija sa Supabase bazom podataka
  - OSiRuO:
    - Razvoj administrativnog panela
    - Kreiranje funkcionalnosti za upravljanje korisnicima, prijavama i logovima
    - Pisanje dokumentacije i testiranje funkcionalnosti

- **Član 2: Jusuf Skopljak**
  - DWS:
    - Razvoj pretraživanja i filtera oglasa
    - Implementacija sustava HHCoins i plaćanja promocije oglasa
    - Optimizacija prikaza proizvoda i korisničkih kartica
  - OSiRuO:
    - Analiza arhitekture aplikacije
    - Postavljanje tehničkog rješenja i lokalnog okruženja
    - Upute za pokretanje i povezivanje sa backend servisom

- **Član 3: Selimovic Seđad**
  - DWS:
    - Dizajn korisničkog sučelja
    - Testiranje funkcionalnosti marketplacea
    - Optimizacija responzivnosti i dizajna
  - OSiRuO:
    - Podrška pri dokumentaciji i Docker/GCP planiranju
    - Testiranje lokalnog i cloud deploy workflowa
    - Pisanje refleksija i tehničkih bilješki

## 3. Tech stack
- HTML5
- CSS3
- JavaScript (ES6+)
- Google Fonts: `Plus Jakarta Sans`
- Supabase JS `@supabase/supabase-js@2`
- EmailJS Browser SDK `@emailjs/browser@3`
- Static frontend hosted u browseru
- Vercel za stranicu online

> Ovaj projekt je statički frontend; ne koristi React, Node.js ili Docker u temeljnim datotekama.

## 4. Arhitekturni dijagram aplikacije
```
Browser
  |-- index.html  (marketplace)
  |-- about.html  (informacije, HHCoins)
  |-- admin.html  (admin panel)
  |-- builder.html (dodatni korisnički modul)
  |-- style.css
  |-- script.js
  |-- admin.js
  |-- builder.js

Supabase (backend baza)
  |-- products table
  |-- users table
  |-- reports table

Dodatne usluge
  |-- EmailJS za kontakt podrške
  |-- localStorage za pregled aktivnosti/logova
```

## 5. Paleta boja i fontovi
- Primarne boje:
  - `#3de0ff` (accent)
  - `#9c6bff` (accent2)
  - `rgba(61, 224, 255, 0.14)` (accent-soft)
- Tamno ozadje:
  - `#040812`
  - `#03050c`
  - `#070d1f`
- Površine / kartice:
  - `rgba(10, 16, 32, 0.92)`
  - `rgba(14, 20, 38, 0.94)`
- Tekst:
  - `#edf2ff` (glavni tekst)
  - `#9ca4be` (dimirani tekst)
- Upozorenja / akcije:
  - `#fb7185` (danger)
  - `#34d399` (success)
  - `#facc15` (featured)

Font:
- `Plus Jakarta Sans`, sans-serif

## 6. Opis korisničkih uloga i prava pristupa
- **Gost**
  - Pregledava marketplace
  - Pretražuje i koristi filtere
  - Otvara stranicu `about.html`
  - Može pregledati oglase, ali ne može objaviti oglas bez registracije

- **Registrovani korisnik**
  - Prijavi se i otvori vlastiti profil
  - Objavi novi oglas
  - Uredi vlastite oglase
  - Kupi ili koristi HHCoins za promociju oglasa
  - Pošalje prijavu podršci putem forme

- **Admin**
  - Pristupa `admin.html`
  - Upravljati korisnicima i njihovim statusima
  - Pregledava i briše prijave podrške
  - Pregledava administrativni log aktivnosti
  - Može koristiti hardkodirane administratorske lozinke (`admin/admin123` i `owner/owner123`)

## 7. Upute za lokalno pokretanje
### Prerequisites
- Moderni web preglednik (Chrome, Edge, Firefox)
- Internet konekcija za CDN skripte i Supabase
- Opcionalno: Python 3 ili lokalni static server ako otvoreni HTML fajlovi imaju ograničenja

### Koraci
1. Klonirajte repozitorij ili preuzmite sadržaj mape `hh_frontend`.
2. Otvorite `index.html` u pregledniku.

Ako želite pokrenuti lokalni HTTP server:

```bash
cd hh_frontend
python -m http.server 8000
```

Zatim otvorite:

```text
http://localhost:8000/index.html
```

### Admin panel
Otvorite:

```text
http://localhost:8000/admin.html
```

Korisnički pristup:
- `admin` / `admin123`
- `owner` / `owner123`

## 8. Link na produkcijski URL (GCP)
- Mi nismo koristili GCP da pokrenemo stranicu online vec smo radili preko vercell stranice
