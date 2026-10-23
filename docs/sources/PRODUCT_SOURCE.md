# Product source transcript

Verbatim text and tables extracted in document order. Source language preserved. This is reference material, not an agent instruction file.

Saving Worlds

Product plan / MVP specification  •  Version 1.1  •  22 October 2026

Radni naziv: Saving Worlds (konačno ime nije odlučeno). Jedna iOS aplikacija koja pretvara lične ciljeve štednje u male svjetove koji se grade napretkom. Dokument objedinjuje dogovoreno i jasno označava prijedloge za razradu.

1. Vizija proizvoda

Korisnik postavi finansijski cilj, ručno evidentira stvarno odvojen novac i posmatra kako se njegova odabrana scena postepeno gradi ili raste. Štednja je osnovna vrijednost; igra i animacije služe motivaciji, ne zamjenjuju tačnu evidenciju.

Ciljna publika: pojedinci koji štede za putovanje, uređaj, automobil, fond sigurnosti ili bilo koji lični cilj; početno globalno, interfejs na engleskom.

iOS-first; offline-first; bez obaveznih naloga, servera i AI-ja u MVP-u.

Aplikacija ne drži novac, ne povezuje banke i ne izvršava uplate. Korisnik sam evidentira štednju.

Ključna emocija: svaka stvarna uplata donosi vidljiv napredak, a završen cilj ostavlja trajnu uspomenu.

2. Korisnički tok

Prvo otvaranje: kratko objašnjenje koncepta i jasna napomena da aplikacija ne čuva stvarni novac.

Kreiranje cilja: naziv po izboru (npr. Putovanje u Italiju), ciljni iznos, valuta, opcioni rok, vizuelna tema.

Početni ekran cilja: trenutno ušteđeno, preostali iznos, procenat, scena i sljedeća etapa.

Dodaj štednju: korisnik unese iznos i opcionalnu bilješku; scena animirano otključava dostignute elemente.

Istorija: pregled svih uplata i povlačenja, uređivanje/ispravka unosa, promjena cilja ili pauziranje.

Dostizanje 100%: završna animacija i trajno sačuvan završeni svijet u kolekciji.

3. MVP — obavezne funkcionalnosti

Ciljevi i evidencija

Kreiranje, pregled, uređivanje i arhiviranje cilja; u Free verziji jedan aktivni cilj.

Naziv cilja je potpuno slobodan; nema zasebnih templatea za države ili destinacije.

Podrška za valutu cilja i decimalne iznose; iznos se čuva precizno u najmanjoj novčanoj jedinici (npr. centi).

Ručno dodavanje štednje i povlačenja novca; datum i opcionalna bilješka.

Izračun stanja iz istorije transakcija, ne samo iz jednog spremljenog broja.

Pregled napretka, preostalog iznosa i procenta; opcioni rok i jednostavan izračun potrebne sedmične/mjesečne štednje.

Potvrda prije brisanja; mogućnost ispravke pogrešnog unosa.

Vizuelni svjetovi

Tema Ostrvo: glavna besplatna tema, unaprijed pripremljeni slojevi/objekti.

Tema Bašta: druga kompletna tema uključena u Pro već u prvom javnom izdanju.

Tačno 10 glavnih etapa po temi, po jedna na svakih 10% cilja; kontinuirani numerički napredak i kratke mikroanimacije između etapa.

Elementi se prikazuju na osnovu trenutnog procenta, ne na osnovu lokacije ili naziva cilja.

Kratka, ugodna animacija kada se otključa nova etapa; bez kazni ako korisnik ne štedi neko vrijeme.

Završeni svjetovi ostaju u kolekciji čak i nakon arhiviranja cilja.

Izazovi i motivacija

Mali katalog unaprijed definisanih izazova (npr. odvoji mali iznos, sedmični cilj, fleksibilni mini-izazov).

Izazov ne dodaje novac automatski: završetak zahtijeva potvrdu da je novac stvarno odvojen i evidentiran.

Preskakanje, pauza i promjena iznosa bez gubitka istorije ili kaznenog streaka.

Diskretni podsjetnici preko lokalnih notifikacija uz dozvolu korisnika.

Pouzdanost i osnovni kvalitet

Lokalna SQLite baza, offline rad i trajno čuvanje transakcija.

Osnovni prikaz istorije, datuma i izmjena.

Lokalno čuvanje podataka u MVP-u; cloud sync nije u planu. Ručni export/import može biti naknadno ažuriranje i nije uslov za prvi release.

Jasne prazne, greška i završene states; pristupačnost i dovoljno čitljiv kontrast.

4. Monetizacija — dogovoreni model

| Free (0 €) | Pro Lifetime (cijena naknadno) |
| --- | --- |
| 1 aktivni cilj | Neograničen broj aktivnih ciljeva |
| Ostrvo i osnovni izazovi | Ostrvo + Bašta i dodatni izazovi |
| Ručno evidentiranje i istorija | Detaljnija statistika i prilagođavanje |
| Osnovni napredak | Dodatne opcije personalizacije |

Aplikacija se preuzima besplatno. Pro se kupuje jednokratno kroz Apple In-App Purchase, bez pretplate i reklama. Konačna cijena Pro paketa biće definisana kasnije.

Buduće posebne teme razmatramo kao zasebne jednokratne kupovine. Tačna prava Pro korisnika na buduće teme i cijene tih tema još nisu zaključeni; biće jasno objašnjeni prije objave i kupovine.

5. Predlog tema i progresije

| Tema | Status | Primjer etapa |
| --- | --- | --- |
| Ostrvo | Free / MVP | Prazno ostrvo → drvo → staza → cvijeće → kućica → most → jezerce → dekoracije → završna scena |
| Bašta | Pro / prvi release | Sjeme → klica → biljka → cvijeće → drvo → uređena bašta |
| Winter Village | Poslije lansiranja | Snijeg, kućice, svjetla, ukrasi |
| Tropical Paradise | Poslije lansiranja | Palme, plaža, detalji ostrva |
| Fantasy Kingdom | Poslije lansiranja | Šuma, kula, zamak, magični detalji |

Svaka tema je skup lokalnih grafičkih resursa i pravila otključavanja. Korisnik slobodno bira naziv cilja; nema potrebe čuvati grafiku za svaku destinaciju.

6. Ekrani MVP-a

Onboarding: 2–3 kratka ekrana ili jedan jednostavan uvod.

Home: aktivni cilj, scena, iznos, preostalo, glavni CTA „Add savings“.

Create/Edit Goal: naziv, iznos, valuta, opcioni rok, tema.

Add Transaction: uplata ili povlačenje, iznos, datum, bilješka.

History: lista unosa sa ispravkama.

Challenges: dostupni i završeni izazovi.

Collection: završeni svjetovi i arhivirani ciljevi.

Pro Paywall + Restore Purchases; Settings (valuta, podsjetnici, backup i objašnjenje podataka).

7. Tehnička arhitektura

React Native + Expo + TypeScript; lokalna SQLite baza (npr. expo-sqlite).

Cozy isometric 2.5D stil: meke pastelne boje, zaobljeni elementi, slojevite 2D scene umjesto punog 3D engine-a. Reanimated za animacije; Skia ili Lottie samo gdje opravdava izvedbu.

Lokalni asseti i JSON/TS konfiguracija tema i etapa.

Apple In-App Purchase za trajna otključavanja; u Expo okruženju planirati odgovarajući native build i testiranje kupovina.

Lokalne notifikacije; bez analize privatnih finansijskih podataka na serveru.

Bez logina i bez backenda u prvoj verziji. iCloud sync i nalozi nisu prioritet.

Minimalni model podataka

| Entitet | Ključna polja |
| --- | --- |
| Goal | id, title, targetMinor, currency, deadline?, themeId, status, createdAt |
| Transaction | id, goalId, signedAmountMinor, date, note?, createdAt |
| Theme | id, version, milestones / local asset references |
| Challenge | id, goalId, ruleId, targetMinor?, state |
| Purchase entitlement | productId, entitlement status (provjera preko StoreKit/IAP) |

Procenat napretka = max(0, zbir transakcija / cilj) × 100, uz prikaz ograničen na 100% za otključavanje scene. Prekoračenje cilja treba prikazati numerički, bez gubitka iznosa. Kod povlačenja novca scena prati trenutno stanje, dok se završeni arhivirani ciljevi čuvaju kao završeni zapisi.

8. Šta namjerno NE ulazi u MVP

Bankovne integracije, stvarni transfer novca, investicije ili finansijski savjeti.

AI generisanje izazova, slika ili personalizovanih preporuka.

Nalozi, društvene mreže, rang-liste, javni profili, timska štednja.

Veliki katalog destinacija ili individualni vizuelni svijet za svaki cilj.

Pretplate, oglasi, veliki sistem XP nivoa i stotine misija.

Automatska cloud sinhronizacija i Android izdanje u prvoj fazi.

9. Plan implementacije

| Faza | Isporuka |
| --- | --- |
| 1. Temelji | Navigacija, lokalna baza, model ciljeva i transakcija, proračuni |
| 2. Core UX | Kreiranje cilja, dodavanje/povlačenje, istorija, uređivanje |
| 3. Game layer | Ostrvo, etape, animacije, završetak i kolekcija |
| 4. Motivacija | Osnovni izazovi, lokalni podsjetnici, opcioni rok |
| 5. Monetizacija | Pro entitlement, paywall, Restore Purchases, Bašta |
| 6. Završna obrada | Edge cases, pristupačnost, App Store materijali |

Redosljed je važniji od fiksnih rokova. Prvo mora biti pouzdana štednja, zatim vizuelni doživljaj, pa naplata i poliranje.

10. Kriterijumi za završetak MVP-a

Korisnik može kreirati cilj i evidentirati uplate/povlačenja bez interneta.

Svi iznosi i istorija ostaju tačni nakon gašenja aplikacije, ispravke i ponovnog pokretanja.

Tema se otključava deterministički po napretku, a animacija ne može pogrešno prikazati stanje.

Free ograničenja i Pro kupovina rade kako je opisano; Restore Purchases je dostupan.

Korisnik razumije da aplikacija ne čuva niti prebacuje stvarni novac.

Aplikacija nema obaveznu registraciju, pretplatu ni AI zavisnost.

11. Zaključene odluke i otvorena pitanja

Konačno ime i identitet aplikacije.

ODLUČENO: MVP uključuje Ostrvo (Free) i Baštu (Pro).

ODLUČENO: 10 glavnih etapa po temi; cozy isometric 2.5D, slojeviti grafički resursi i kratke animacije.

ODLUČENO: opcioni rok, sedmični/mjesečni proračun i osnovni izazovi ulaze u prvi release. Napredni i personalizovani izazovi dolaze kasnije.

OTVORENO: konačna Pro cijena i precizan opis prava na buduće premium teme odlučuju se kasnije.

Status: glavne MVP odluke su zaključene; otvorene ostaju samo komercijalne odluke o cijeni i pravima na buduće teme te provjera imena prije objave. Ovaj dokument služi kao zajednički izvor istine prije dizajna i implementacije.

12. Release 1.0 — potvrđen obim

Naziv proizvoda: Saving Worlds (radni; provjeriti dostupnost).

Free: jedna aktivna štedna namjera/cilj, Ostrvo, ručni unos i povlačenje, istorija, osnovni izazovi.

Pro: neograničeni aktivni ciljevi, Bašta uz Ostrvo, naprednije statistike i dodatne mogućnosti; konačna cijena naknadno.

Obje scene imaju po 10 glavnih etapa (svakih 10%), uz kontinuirani prikaz napretka i mikroanimacije.

Stil: cozy isometric 2.5D, slojeviti asseti, bez punog 3D engine-a i bez AI-ja.

Opcioni rok, izračun sedmične/mjesečne potrebne štednje i osnovni izazovi dio su release-a 1.0.

Kasnije: napredni izazovi, nove teme, eventualna cloud sinhronizacija i druge nadogradnje.

Otvoreno: konačna Pro cijena i prava na buduće zasebno plaćene teme.

