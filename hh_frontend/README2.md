# HardwareHub - Tehnička dokumentacija za OSiRuO

## 1. Docker setup (korak po korak)
Ovaj projekt je prvenstveno statički frontend, ali u OSiRuO dokumentaciji opisujemo Docker setup koji bi se koristio za pokretanje aplikacije u kontejneru.

### 1.1. Dockerfile primjer
```dockerfile
# Koristimo lagani Nginx image za statički frontend
FROM nginx:stable-alpine

# Uklanjamo defaultni Nginx sadržaj
RUN rm -rf /usr/share/nginx/html/*

# Kopiramo veb fajlove u root folder Nginx servera
COPY . /usr/share/nginx/html

# Izvozimo port 80 za HTTP trafik
EXPOSE 80

# Startujemo Nginx u prvom planu
CMD ["nginx", "-g", "daemon off;"]
```

### 1.2. Objašnjenje Dockerfile-a
- `FROM nginx:stable-alpine` - Koristimo malu i stabilnu Alpine Linux verziju Nginx-a.
- `RUN rm -rf /usr/share/nginx/html/*` - Brišemo defaultni sadržaj koji dolazi uz Nginx.
- `COPY . /usr/share/nginx/html` - Kopiramo sve statičke fajlove projekta u Nginx-ov public direktorij.
- `EXPOSE 80` - Deklarišemo port na kojem će kontejner služiti aplikaciju.
- `CMD ["nginx", "-g", "daemon off;"]` - Pokrećemo Nginx tako da ostane u prvom planu i da ne izađe odmah.

### 1.3. docker-compose.yml primjer
```yaml
version: '3.9'
services:
  hardwarehub:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
    networks:
      - frontend-network

networks:
  frontend-network:
    driver: bridge
```

### 1.4. Pokretanje lokalno s Docker Compose
1. U korijenu projekta dodajte `Dockerfile` i `docker-compose.yml`.
2. Pokrenite:
```bash
docker compose up --build
```
3. Otvorite preglednik na:
```text
http://localhost:8080
```

### 1.5. Docker health check
Za Docker kontejner možete dodati `HEALTHCHECK` direktivu u `Dockerfile` ako želite automatsku provjeru:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider --quiet http://localhost:80 || exit 1
```

## 2. GCP setup procedura
Ovaj dio opisuje tipičnu proceduru za deploy React ili frontend aplikacije na Google Cloud Run koristeći Docker.

### 2.1. Priprema GCP okruženja
1. Autentikacija:
```bash
gcloud auth login
```
2. Postavljanje projekta:
```bash
gcloud config set project YOUR_PROJECT_ID
```
3. Aktiviranje servisa za Cloud Run i Container Registry/Artifact Registry:
```bash
gcloud services enable run.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com
```

### 2.2. Build i push Docker image-a
1. Build image lokalno:
```bash
docker build -t gcr.io/YOUR_PROJECT_ID/hardwarehub-frontend:latest .
```
2. Push image u GCR:
```bash
docker push gcr.io/YOUR_PROJECT_ID/hardwarehub-frontend:latest
```

Ako koristite Artifact Registry:
```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
docker tag hardwarehub-frontend:latest europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/hardwarehub-frontend/hardwarehub-frontend:latest
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/hardwarehub-frontend/hardwarehub-frontend:latest
```

### 2.3. Deploy na Cloud Run
```bash
gcloud run deploy hardwarehub-frontend \
  --image gcr.io/YOUR_PROJECT_ID/hardwarehub-frontend:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory=256Mi
```

Ako koristite Artifact Registry:
```bash
gcloud run deploy hardwarehub-frontend \
  --image europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/hardwarehub-frontend/hardwarehub-frontend:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### 2.4. Verifikacija deploy-a
- Provjerite status deploy-a:
```bash
gcloud run services describe hardwarehub-frontend --platform managed --region europe-west1
```
- Pregledajte URL koji je Cloud Run generirao.

## 3. Primjer izlaza health-check.sh skripte
U OSiRuO dokumentaciji često se traži primjer izlaza. Ovdje je jedan hipotetički output terminala za skriptu koja provjerava odgovore usluge.

### 3.1. Skripta `health-check.sh`
```bash
#!/bin/bash
set -e
URL="http://localhost:8080"

echo "Provjera dostupnosti: $URL"
STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$URL")
if [ "$STATUS" -eq 200 ]; then
  echo "OK: Server je dostupan (HTTP $STATUS)"
else
  echo "GREŠKA: Server nije dostupan (HTTP $STATUS)"
  exit 1
fi
```

### 3.2. Primjer izlaza
```text
$ ./health-check.sh
Provjera dostupnosti: http://localhost:8080
OK: Server je dostupan (HTTP 200)
```

## 4. Refleksija
### Šta je tim naučio
- Tim je naučio kako organizirati statički frontend aplikaciju s realnim ulogama korisnika, admin panelom i vanjskim servisima.
- Razumjeli smo kako frontend može komunicirati sa Supabase bazom podataka koristeći JS SDK i kako dodati sigurnosne fallback mehanizme u korisnički interfejs.
- Naučili smo osnovnu Docker kontejnerizaciju i kako bi se statički frontend mogao dockerizirati i pokrenuti na GCP Cloud Run.

### Izazovi
- Najveći izazov je bio povezivanje frontend logike s backend servisima uz minimalni broj files i bez složenog server-side koda.
- Također je bilo izazovno napraviti admin login koji radi i kada baza nije dostupna, te dodati korisne error poruke za korisnika.
- Upravljanje tablicama i njihova imena u Supabase-u zahtijevalo je fleksibilnost i detekciju više mogućih naziva tabela.

### Šta bismo uradili drugačije
- U budućnosti bismo dodali stvarni `Dockerfile` i `docker-compose.yml` u repo kako bi cijeli deployment workflow bio spreman odmah.
- Bismo koristili pravi backend servis (Node.js / Express) ili serverless funkcije za sigurno upravljanje admin autentikacijom i korisničkim podacima.
- Implementirali bismo CI/CD pipeline u GCP koristeći GitHub Actions ili Cloud Build za automatske deploy-e.

---

> Napomena: Ovaj dokument služi kao tehnička dokumentacija za OSiRuO i opisuje proces Docker i GCP deploy-a. U trenutnom repozitoriju ne postoji stvarni Dockerfile ili Cloud Run deployment konfiguracija, pa je opis dat kao preporučeni workflow.
