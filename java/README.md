# Arte de la Montaña — gallery website

A minimalist Java/Spring Boot gallery for Andrea Montaña's work.
Artworks are discovered automatically from `../assets/`. No prices are shown on
the public site — buyers click **Inquire to purchase**, Andrea receives the
inquiry by email and replies with a private Stripe payment link generated from
the built-in admin tool.

## Stack
- Java 17, Spring Boot 3, Thymeleaf
- Stripe Java SDK (real payments via PaymentLinks)
- JavaMail for inquiry notifications

## Pages
- `/` Home — featured grid grouped by medium
- `/collection` Full collection
- `/andrea` About
- `/sketches` Sketchbook
- `/customize` Commission form
- `/artwork/{slug}` Detail page with "Inquire to purchase"
- `/inquire/{slug}` Inquiry form (POSTs to record + email Andrea)
- `/admin/payment-link` Andrea's private tool to mint a Stripe payment link

## How the filename → artwork mapping works
Anything in `../assets/` matching `name-year-medium-size.png` is treated as an
artwork. The site shows the title, year, medium and size only — no price.

Files like `landing.png`, `footer.png`, `mafalda-*.png`, layout backgrounds and
icons are excluded automatically.

## Run it locally

### 1. Install prerequisites
- JDK 17+ (`java -version`)
- Maven 3.9+ (`mvn -v`)

### 2. Configure secrets (environment variables)
Open a PowerShell window and set:

```powershell
$env:STRIPE_API_KEY     = "sk_test_..."        # use a TEST key while developing
$env:STRIPE_CURRENCY    = "usd"                # or "eur", "gbp", etc.
$env:ADMIN_SECRET       = "pick-a-long-secret" # required for /admin/payment-link
$env:INQUIRY_TO         = "andrea@example.com" # where inquiries get emailed
$env:INQUIRY_FROM       = "noreply@example.com"
$env:MAIL_HOST          = "smtp.gmail.com"
$env:MAIL_PORT          = "587"
$env:MAIL_USERNAME      = "your-smtp-username"
$env:MAIL_PASSWORD      = "your-smtp-app-password"
```

Email is optional — if you skip the `MAIL_*` and `INQUIRY_*` vars, inquiries
are logged to the console instead. Stripe is also optional in dev, but `/admin/payment-link`
will return `503` until `STRIPE_API_KEY` is set.

### 3. Launch
From this folder:

```powershell
mvn spring-boot:run
```

Or the helper script:

```powershell
.\run.cmd
```

Open <http://localhost:8080>.

## How a sale happens
1. A buyer browses, opens an artwork detail page, clicks **Inquire to purchase**,
   fills the form.
2. Andrea receives an email with the slug + buyer info, and the inquiry is
   logged.
3. Andrea opens `/admin/payment-link`, selects the artwork, types the agreed
   price in cents (e.g. `25000` for $250.00), buyer email, submits.
   The endpoint requires the `X-Admin-Secret` header (the admin form prompts
   for it client-side).
4. The endpoint returns a Stripe-hosted payment link URL.
5. Andrea pastes that URL into her reply to the buyer.
6. The buyer pays on Stripe's checkout. The payment lands in Andrea's Stripe
   account directly.

## Notes
- Prices live only in Stripe — never on the website, never in the DB, never in
  any image filename. Keeps the "minimalist, no prices" rule clean.
- `assets.directory` defaults to `../assets` so the same image folder is the
  single source of truth. Override with `ASSETS_DIR` if you move things.
- Templates auto-reload (Thymeleaf cache disabled), so edits show on refresh.

## Project layout
```
java/
├── pom.xml
├── run.cmd
└── src/main/
    ├── java/com/artedelamontana/
    │   ├── ArteDeLaMontanaApplication.java
    │   ├── config/WebConfig.java
    │   ├── controller/{GalleryController, InquiryController, AdminController}.java
    │   ├── model/{Artwork, Category}.java
    │   └── service/{ArtworkService, StripeService, InquiryService}.java
    └── resources/
        ├── application.properties
        ├── static/css/style.css
        └── templates/*.html
```
