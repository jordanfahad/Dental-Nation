# DN-005 — Turkish and Arabic script review

Branch: `codex/DN-005`. Input commit: `ca62d44`. Review date: 24 September 2026. The task supplies the revision and shoot date as 25 September; those dates and any attribution to the owner were not independently verified.

Draft for native-speaking dentist review. This covers all 131 Turkish/Arabic string or template leaves in COPY, ANGLE, TITLE, LANE_VIDEO and the Arabic branch names, with 102 string replacements in 14 applied finding groups. English strings, dentist data, keys, types, exports, template expressions and selection logic remain unchanged.

“Current at input baseline” is the exact original value; “applied” is the exact branch replacement. Template placeholders remain intact. Data-only proposals quote the current branch value. P1 means material wording or recording-readiness risk; P2 means clarity, consistency or presentation risk. Findings are severity-ranked within the shoot-first and remaining-work sections.

This is a language and supplied-copy-rules review. Legal, clinical, licensing, price, appointment-availability and official-name verification were not performed. Native phrasing, pronunciation and actual speaking time still require the speakers’ review.

## Shoot-critical findings — Dr. Tosun and Dr. Dilsad, Turkish

### S01 · P1 · Shoot: remove unconditional whitening assurances

Problem: The Turkish Glow Up copy turns a preliminary examination into a guarantee of safety and a natural-looking result; the following slogan also promises a result.

Applied safety correction. This intentionally departs from the English assurance; the matching English proposals are recorded separately below.

**`LANE_VIDEO.glowup.tr[2]`**

- Current at input baseline: `Her şey dahil 1.699 AED — önce dişlerinizi kontrol ediyoruz; böylece işlem güvenli, sonuç doğal olur.`
- Exact replacement (applied): `Her şey dahil 1.699 AED — önce dişlerinizi kontrol edip beyazlatmanın size uygun olup olmadığını değerlendiriyoruz.`

**`LANE_VIDEO.glowup.tr[3]`**

- Current at input baseline: `Daha parlak bir gülüş, doğru şekilde.`
- Exact replacement (applied): `Daha parlak bir gülüş için profesyonel bakım.`

### E01 · P1 · Shoot: English whitening source needs the same correction

Problem: The English source makes the same unconditional safety and outcome promises removed from the translations.

Proposal only. The existing English script remains unchanged and still contains the original assurances.

**`LANE_VIDEO.glowup.en[2]`**

- Current on this branch: `AED 1,699, all-inclusive — we check your teeth first, so it’s safe and the result looks natural.`
- Exact replacement (proposal only): `AED 1,699, all-inclusive — we check your teeth first to assess whether whitening is suitable for you.`

**`LANE_VIDEO.glowup.en[3]`**

- Current on this branch: `A brighter smile, done properly.`
- Exact replacement (proposal only): `Professional care for a brighter smile.`

### S06 · P1 · Complete Smile Club videos need more than a comfortable 30-second take

Constant paths: `COPY.tr.vIntro`, `ANGLE.tr.ortho.why`, `ANGLE.tr.general.why`, `COPY.tr.vWhy`, `COPY.tr.offer`, `COPY.tr.vKeep` and `COPY.tr.vEnd`. Campaign paths `LANE_VIDEO.scan.tr[0..4]` and `LANE_VIDEO.glowup.tr[0..4]` are timed separately.

Problem: both Turkish Smile Club scripts are too long for an unhurried 30-second take before pauses or a spoken end card.

Current production label in the unchanged ShootScripts presentation: `Video 1 · Smile Club`.

Exact proposed production-note replacement (data only; no .tsx edit): `Video 1 · Smile Club — allow 45–60 seconds; pause between benefit groups and confirm duration in rehearsal.`

This is a production label, not replacement patient copy. The exact revised spoken scripts are in the shoot appendix. A strict 30-second edit needs a separately reviewed storyboard or source rewrite; no benefits or conditions were silently removed.

| Speaker | Video | Spoken tokens | Estimated seconds, 150–120 tokens/min | Excluded end-card tokens |
| --- | --- | ---: | ---: | ---: |
| yahya-tosun | Smile Club | 86 | 34.4–43.0 | 15 |
| yahya-tosun | scan | 61 | 24.4–30.5 | 14 |
| dilsad-ozdogan | Smile Club | 76 | 30.4–38.0 | 15 |
| dilsad-ozdogan | glowup | 58 | 23.2–29.0 | 15 |

These are whitespace-token estimates, not recordings. Numbers, names, AED, pauses and Turkish syllable length can take additional time. End cards are assumed visual. The scan take is already tight at the slower rate.

### S02 · P2 · Shoot: complete Turkish introductions

Problem: The original introduction is a list of a name, title and clinic rather than a complete, comfortable spoken introduction.

**`COPY.tr.partOf`**

- Current at input baseline: ` (Dental Nation ailesinin bir parçası)`
- Exact replacement (applied): ` (Dental Nation bünyesinde)`

**`COPY.tr.hello`**

- Current at input baseline: `Merhaba, ben ${name} — ${from}.`
- Exact replacement (applied): `Merhaba, ben ${name}. Sizlere ${from} ekibinden yazıyorum.`

**`COPY.tr.vIntro`**

- Current at input baseline: `[Kamerada, klinikte] Merhaba, ben ${name} — ${title}, ${where}.`
- Exact replacement (applied): `[Kamerada, klinikte] Merhaba, ben ${name}. ${title} olarak ${where} ekibindeyim.`

**`LANE_VIDEO.scan.tr[0]`**

- Current at input baseline: `[Kamerada] Diş teli ya da şeffaf plak mı düşünüyorsunuz? Ben ${n} — ${t}, ${w}.`
- Exact replacement (applied): `[Kamerada] Diş teli ya da şeffaf plak mı düşünüyorsunuz? Ben ${n}. ${t} olarak ${w} ekibindeyim.`

**`LANE_VIDEO.glowup.tr[0]`**

- Current at input baseline: `[Kamerada] Kahve, çay ya da sadece zaman — dişler parlaklığını kaybeder. Ben ${n} — ${t}, ${w}.`
- Exact replacement (applied): `[Kamerada] Dişler, kahve, çay veya zamanın etkisiyle parlaklığını kaybedebilir. Ben ${n}. ${t} olarak ${w} ekibindeyim.`

### S03 · P2 · Shoot: clarify the membership and treatment eligibility

Problem: The offer reads like a translated list, and the treatment-eligibility wording can be mistaken for clinical suitability rather than eligibility under membership terms.

The chair qualifier comes from OFFER; it avoids suggesting that all membership plans include identical services.

**`COPY.tr.offer`**

- Current at input baseline: `Üyelik aylık 99 AED’den başlar. Seçtiğiniz plana göre kontroller ve profesyonel diş temizliği, acil bir diş sorununuz olduğunda destek, öncelikli randevu ve uygun tedavilerde üyelere özel fiyatlar içerir.`
- Exact replacement (applied): `Üyelik aylık 99 AED’den başlar. Plana göre diş kontrolleri, profesyonel diş temizliği, acil diş sorunlarında destek, öncelikli randevular ve üyelik koşullarına uygun tedavilerde üyelere özel fiyatlar sunar.`

**`ANGLE.tr.ortho.chair`**

- Current at input baseline: `Dişlerinizi düzeltirken onları temiz ve sağlıklı tutmak da aynı derecede önemli — Smile Club kontrollerinizi ve temizliklerinizi plana dahil ediyor.`
- Exact replacement (applied): `Dişlerinizi düzeltirken onları temiz ve sağlıklı tutmak da aynı derecede önemlidir. Smile Club, seçtiğiniz plana göre diş kontrolleri ve profesyonel diş temizliği sunar.`

**`ANGLE.tr.ortho.why`**

- Current at input baseline: `Düzgün bir gülüşün sağlıklı da kalması gerekir — diş teli ya da şeffaf plak kullanırken düzenli kontrol ve profesyonel temizlik daha da önemlidir.`
- Exact replacement (applied): `Düzgün dişlerin sağlıklı kalması da önemlidir. Diş teli ya da şeffaf plak kullanırken düzenli diş kontrolleri ve profesyonel diş temizliği daha da önemlidir.`

**`ANGLE.tr.general.chair`**

- Current at input baseline: `Büyük sorunlardan kaçınmanın en iyi yolu kontrol ve temizliklerinizi aksatmamaktır — Smile Club bunu tüm yıl boyunca kolaylaştırıyor.`
- Exact replacement (applied): `Daha büyük sorunları önlemenin en iyi yolu diş kontrollerini ve profesyonel diş temizliğini aksatmamaktır. Smile Club, yıl boyunca bunu kolaylaştırır.`

**`ANGLE.tr.general.why`**

- Current at input baseline: `Diş sorunlarının çoğu küçük başlar — erken fark edildiğinde tedavi basit kalır, maliyet de düşük olur.`
- Exact replacement (applied): `Diş sorunlarının çoğu küçük başlar. Erken fark edilmeleri tedaviyi kolaylaştırır ve maliyeti azaltır.`

### S04 · P2 · Shoot: make the scan deduction and whitening description precise

Problem: The scan fee is deducted from the treatment charge, not from the treatment itself, and the procedure names should be easy to say in Turkish.

**`LANE_VIDEO.scan.tr[1]`**

- Current at input baseline: `Karar vermeden önce planınızı görün: dişlerinizin 3D taraması, bir ortodontistle görüşme ve yazılı tedavi planı.`
- Exact replacement (applied): `Karar vermeden önce tedavi planınızı görün: dişlerinizin üç boyutlu taraması, bir ortodonti uzmanıyla görüşme ve yazılı tedavi planı.`

**`LANE_VIDEO.scan.tr[2]`**

- Current at input baseline: `Adı The DN Scan — 499 AED; tedaviye başlarsanız ücretin tamamı tedavinizden düşülür.`
- Exact replacement (applied): `The DN Scan ücreti 499 AED. Tedaviye başlarsanız bu tutarın tamamı tedavi ücretinizden düşülür.`

**`LANE_VIDEO.scan.tr[3]`**

- Current at input baseline: `Baskı yok, tahmin yok — gülüşünüz için net bir plan.`
- Exact replacement (applied): `Baskı olmadan, tahminlerle ilerlemeden; gülüşünüz için net bir plan.`

**`LANE_VIDEO.glowup.tr[1]`**

- Current at input baseline: `The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saatte yapılan profesyonel Zoom beyazlatmadır.`
- Exact replacement (applied): `The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saat süren profesyonel Zoom diş beyazlatma işlemidir.`

### S05 · P2 · Shoot: avoid pronunciation-dependent brand suffixes

Problem: The attached English-brand suffixes make spoken delivery and Turkish spelling depend on unconfirmed brand pronunciation.

Brand spelling is preserved. No claim is made that a particular apostrophe or suffix is universally invalid; the replacement avoids that unresolved pronunciation choice.

**`COPY.tr.vWhy`**

- Current at input baseline: `İşte bu yüzden Dental Nation olarak Smile Club’ı oluşturduk.`
- Exact replacement (applied): `Dental Nation olarak Smile Club üyeliğini bu nedenle oluşturduk.`

**`COPY.tr.vKeep`**

- Current at input baseline: `Bu, yalnızca bir şey ağrıdığında yapılan tedavi değil — sorunların önüne geçmenizi sağlayan bir bakım.`
- Exact replacement (applied): `Amaç, yalnızca ağrı olduğunda tedavi etmek değil, düzenli bakımla sorunların önüne geçmenize yardımcı olmaktır.`

**`COPY.tr.vEnd`**

- Current at input baseline: `[Kapanış kartı] Smile Club’a katılmak için resepsiyona sorun, QR kodu okutun ya da bize WhatsApp’tan yazın.`
- Exact replacement (applied): `[Kapanış kartı] Smile Club üyeliği için resepsiyona danışın, QR kodu okutun ya da bize WhatsApp üzerinden yazın.`

**`LANE_VIDEO.scan.tr[4]`**

- Current at input baseline: `[Kapanış kartı] The DN Scan randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.`
- Exact replacement (applied): `[Kapanış kartı] The DN Scan randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.`

**`LANE_VIDEO.glowup.tr[4]`**

- Current at input baseline: `[Kapanış kartı] The DN Glow Up randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.`
- Exact replacement (applied): `[Kapanış kartı] The DN Glow Up randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.`

### S07 · P2 · Turkish title and name display

Constant paths: `TITLE.tr.ortho`, `TITLE.tr.general`, `DENTISTS[0].name` and `DENTISTS[1].name`.

The retained `Ortodonti Uzmanı` and `Diş Hekimi` match the source roster’s Specialist Orthodontist and General Dentist. These are ordinary Turkish role names, not verified licensed titles.

Problem: `Dr. Dilsad Ozdogan` omits likely Turkish diacritics, but a personal name should not be silently normalized.

Current `DENTISTS[1].name`: `Dr. Dilsad Ozdogan`. Exact proposed Turkish-only display value: `Dr. Dilşad Özdoğan` — to confirm with the dentist. This is future localized display data, not a replacement of the shared DENTISTS entry.

## Remaining findings — severity order

### A01 · P1 · Arabic: remove the same whitening assurances

Problem: The Arabic copy inherits the unconditional safety and natural-result claim from English.

Applied safety correction; English still needs the matching editorial change.

**`LANE_VIDEO.glowup.ar[2]`**

- Current at input baseline: `بسعر 1,699 درهماً شاملاً كل شيء — نفحص أسنانك أولاً ليكون الإجراء آمناً والنتيجة طبيعية.`
- Exact replacement (applied): `بسعر 1,699 درهماً شاملاً كل شيء — نفحص أسنانكم أولاً لتقييم مدى ملاءمة التبييض لكم.`

**`LANE_VIDEO.glowup.ar[3]`**

- Current at input baseline: `ابتسامة أكثر إشراقاً، بالطريقة الصحيحة.`
- Exact replacement (applied): `عناية احترافية من أجل ابتسامة أكثر إشراقاً.`

### A02 · P1 · Urgent care: remove the extra same-day commitment

Problem: The closing sentence adds an unconditional same-day appointment promise on top of the supplied 60-minute offer.

The specified 60-minute wording, AED 699 and all-inclusive qualifier remain. The service target is supplied offer data, not independently verified availability.

**`LANE_VIDEO.sos.tr[3]`**

- Current at input baseline: `Ağrının artmasını beklemeyin. Bizi arayın, sizi bugün görelim.`
- Exact replacement (applied): `Ağrının artmasını beklemeyin. Acil bir randevu ayarlamak için bizi arayın.`

**`LANE_VIDEO.sos.ar[3]`**

- Current at input baseline: `لا تنتظر حتى يشتد الألم. اتصل بنا وسنراك اليوم.`
- Exact replacement (applied): `لا داعي لانتظار اشتداد الألم؛ يمكنكم الاتصال بنا لترتيب موعد عاجل.`

### E02 · P1 · English urgent-care source still promises a same-day appointment

Problem: The same-day closing promise remains in English although it has been removed from Turkish and Arabic.

Proposal only. LANE_VIDEO.sos.en[1], LANE_VIDEO.sos.en[4] and LANES.sos.offer retain the supplied 60-minute service statement. Its availability and advertising basis were not independently verified.

**`LANE_VIDEO.sos.en[3]`**

- Current on this branch: `Don’t wait for the pain to get worse. Call us, and we’ll see you today.`
- Exact replacement (proposal only): `Don’t wait for the pain to get worse. Call us to arrange an urgent appointment.`

### R01 · P1 · Arabic names and titles need dentist-specific data

Constant paths: `TITLE.ar.ortho`, `TITLE.ar.general`, `TITLE.ar.perio`, `TITLE.ar.hygiene`, `TITLE.ar.pedo`, `TITLE.ar.prostho`, `TITLE.ar.endo`, `COPY.ar.hello`, `COPY.ar.vIntro`, all `LANE_VIDEO.*.ar[0]` and `DENTISTS[7..17].name` / `.title`.

Problem: Arabic scripts use shared Latin names and masculine specialty titles, also erasing some consultant ranks or adding role specificity absent from the roster.

The exact data-only display replacements below are candidates for a future language-and-dentist lookup. No name, title, honorific, gender or credential was verified. Feminine forms are editorial candidates for speaker confirmation. Shared DENTISTS and TITLE objects were not changed.

#### Proposed Arabic-script names

| Source constant | Current text | Exact proposed Arabic display | Status |
| --- | --- | --- | --- |
| `DENTISTS[7].name` | Dr. Hasna Alsaeed | د. حسناء السعيد | to confirm with the dentist |
| `DENTISTS[8].name` | Dr. Ali Ghasemi | د. علي قاسمي | to confirm with the dentist |
| `DENTISTS[9].name` | Dr. M Safwan Sultan | د. م. صفوان سلطان | to confirm with the dentist |
| `DENTISTS[10].name` | Dr. Yasmin Youssef | د. ياسمين يوسف | to confirm with the dentist |
| `DENTISTS[11].name` | Dr. Ghada Hussain | د. غادة حسين | to confirm with the dentist |
| `DENTISTS[12].name` | Dr. Mohammad Qasem | د. محمد قاسم | to confirm with the dentist |
| `DENTISTS[13].name` | Dr. Helmi Shaath | د. حلمي شعث | to confirm with the dentist |
| `DENTISTS[14].name` | Dr. Chahira Berlarbi | د. شهيرة برلاربي | to confirm with the dentist |
| `DENTISTS[15].name` | Dr. Maher Selman | د. ماهر سلمان | to confirm with the dentist |
| `DENTISTS[16].name` | Dr. Suzanna Almaali | د. سوزانا المعالي | to confirm with the dentist |
| `DENTISTS[17].name` | Dr. Leila Mostawe | د. ليلى مستاوي | to confirm with the dentist |

#### Proposed per-dentist Arabic titles

| Dentist / source constant | Current Arabic title | Exact proposed display title | Notes |
| --- | --- | --- | --- |
| hasna-alsaeed / `TITLE.ar.ortho` (`DENTISTS[7].title`: Consultant Orthodontist) | أخصائي تقويم الأسنان | استشارية تقويم الأسنان | Feminine form and consultant rank to confirm; current shared ortho title loses the roster’s consultant rank. Status: to confirm with the dentist. |
| ali-ghasemi / `TITLE.ar.hygiene` (`DENTISTS[8].title`: Hygienist) | أخصائي صحة الفم والأسنان | أخصائي صحة الفم والأسنان | Surname, honorific and licensed hygienist title to confirm; the source roster’s Dr. prefix is not credential evidence. Status: to confirm with the dentist. |
| safwan-sultan / `TITLE.ar.general` (`DENTISTS[9].title`: General Dentist) | طبيب أسنان عام | طبيب أسنان عام | M is preserved as an unexpanded initial; its identity and preferred display need confirmation. Status: to confirm with the dentist. |
| yasmin-youssef / `TITLE.ar.ortho` (`DENTISTS[10].title`: Orthodontist) | أخصائي تقويم الأسنان | طبيبة تقويم الأسنان | Feminine form to confirm; the source says Orthodontist, so the proposal does not add specialist rank. Status: to confirm with the dentist. |
| ghada-hussain / `TITLE.ar.pedo` (`DENTISTS[11].title`: Pedodontist (children’s dentist)) | طبيب أسنان الأطفال | طبيبة أسنان الأطفال | Feminine form and exact professional title to confirm. Status: to confirm with the dentist. |
| mohammad-qasem / `TITLE.ar.perio` (`DENTISTS[12].title`: Periodontist) | أخصائي أمراض اللثة | أخصائي أمراض اللثة | Name spelling and exact professional title to confirm. Status: to confirm with the dentist. |
| helmi-shaath / `TITLE.ar.prostho` (`DENTISTS[13].title`: Prosthodontist) | أخصائي تركيبات الأسنان | أخصائي تركيبات الأسنان | Family-name spelling and exact professional title to confirm. Status: to confirm with the dentist. |
| chahira-berlarbi / `TITLE.ar.general` (`DENTISTS[14].title`: Dentist) | طبيب أسنان عام | طبيبة أسنان | Surname is a tentative phonetic rendering of Berlarbi, not a verified family spelling; the source only says Dentist, so the proposal does not add General. Status: to confirm with the dentist. |
| maher-selman / `TITLE.ar.endo` (`DENTISTS[15].title`: Consultant Endodontist & Implantologist) | استشاري علاج العصب وزراعة الأسنان | استشاري علاج العصب وطبيب زراعة الأسنان | Consultant rank applies to the endodontic role in this proposal; official rank and implant-role wording need confirmation. Status: to confirm with the dentist. |
| suzanna-almaali / `TITLE.ar.ortho` (`DENTISTS[16].title`: Specialist Orthodontist) | أخصائي تقويم الأسنان | أخصائية تقويم الأسنان | Feminine form and family-name spelling to confirm. Status: to confirm with the dentist. |
| leila-mostawe / `TITLE.ar.general` (`DENTISTS[17].title`: General Dentist) | طبيب أسنان عام | طبيبة أسنان عامة | The Latin spelling Mostawe is not sufficient evidence of the family spelling; this is a tentative rendering, with feminine form also to confirm. Status: to confirm with the dentist. |

The initial M was not expanded to a guessed given name. Berlarbi and Mostawe are especially uncertain surname renderings. The roster’s Dr. prefix on the hygienist is not evidence of a credential. None of these proposals has been inserted into patient scripts.

### A03 · P2 · Arabic: address patient groups consistently

Problem: The greeting addresses a group but the segment and membership sentences switch to one masculine recipient.

Plural address suits a mixed patient group; it does not establish any individual patient or dentist gender.

**`COPY.ar.seg.active`**

- Current at input baseline: `موعد فحصك الدوري القادم يقترب، لذلك أحببت أن أخبرك بشيء جديد.`
- Exact replacement (applied): `يقترب موعد فحوصاتكم الدورية، وأودّ أن أشارككم خبراً جديداً.`

**`COPY.ar.seg.inactive`**

- Current at input baseline: `مرّ بعض الوقت منذ زيارتك الأخيرة، وأحببت أن أطمئن عليك.`
- Exact replacement (applied): `مرّ بعض الوقت منذ زياراتكم الأخيرة، وأحببت أن أطمئن عليكم.`

**`COPY.ar.seg.dormant`**

- Current at input baseline: `لم نرك منذ فترة طويلة — أبوابنا مفتوحة لك دائماً، ودون أي ضغط.`
- Exact replacement (applied): `لم نلتقِ بكم منذ فترة طويلة. يسعدنا استقبالكم مجدداً متى شئتم، دون أي ضغط.`

**`COPY.ar.club.active`**

- Current at input baseline: `Smile Club طريقة بسيطة للحفاظ على العناية بأسنانك طوال العام، بدلاً من الانتظار حتى تشعر بالألم.`
- Exact replacement (applied): `Smile Club طريقة بسيطة للعناية بأسنانكم بانتظام طوال العام، بدلاً من الانتظار حتى يبدأ الألم.`

**`COPY.ar.club.inactive`**

- Current at input baseline: `Smile Club طريقة سهلة لتعود إلى العناية المنتظمة بأسنانك وتحافظ عليها طوال العام.`
- Exact replacement (applied): `Smile Club طريقة سهلة للعودة إلى العناية المنتظمة بأسنانكم والاستمرار عليها طوال العام.`

**`COPY.ar.club.dormant`**

- Current at input baseline: `وعندما تقرر العودة، يجعل Smile Club ذلك بسيطاً.`
- Exact replacement (applied): `متى قررتم العودة، يجعل Smile Club هذه الخطوة أسهل.`

**`COPY.ar.vKeep`**

- Current at input baseline: `إنها عناية تسبق المشاكل — وليست مجرد علاج عندما تشعر بالألم.`
- Exact replacement (applied): `إنها عناية تساعد على استباق المشكلات، وليست مجرد علاج عند الشعور بالألم.`

### A04 · P2 · Arabic: remove masculine commands and retain the opt-out reply

Problem: Singular masculine imperatives exclude part of the audience and the opt-out line should explicitly ask for a reply containing the unchanged keyword.

**`COPY.ar.cta.active`**

- Current at input baseline: `فقط ردّ على هذه الرسالة وسيشرح لك فريقي الخطط ويحجز لك موعد الفحص.`
- Exact replacement (applied): `يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويرتب مواعيد فحوصاتكم الدورية.`

**`COPY.ar.cta.inactive`**

- Current at input baseline: `ردّ على هذه الرسالة وسيشرح لك فريقي الخطط ويجد لك الوقت المناسب.`
- Exact replacement (applied): `يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويساعدكم في اختيار مواعيد مناسبة.`

**`COPY.ar.cta.dormant`**

- Current at input baseline: `إذا رغبت في معرفة المزيد، فقط ردّ على هذه الرسالة وسيشرح لك فريقي — دون أي التزام.`
- Exact replacement (applied): `للمزيد من المعلومات، يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط دون أي التزام من جانبكم.`

**`COPY.ar.stop`**

- Current at input baseline: `(إذا كنت لا ترغب في استلام هذه الرسائل، أرسل STOP.)`
- Exact replacement (applied): `(لإيقاف استلام هذه الرسائل، يرجى الرد بكلمة STOP.)`

**`COPY.ar.invite`**

- Current at input baseline: `وقّعت لك دعوة — ويمكن لفريق الاستقبال شرح الخطط لك في دقيقة.`
- Exact replacement (applied): `وقّعت دعوة خاصة بكم، ويمكن لفريق الاستقبال شرح الخطط في دقيقة.`

**`COPY.ar.vEnd`**

- Current at input baseline: `[البطاقة الختامية] للانضمام إلى Smile Club: اسأل في الاستقبال، أو امسح رمز QR، أو راسلنا عبر واتساب.`
- Exact replacement (applied): `[البطاقة الختامية] للانضمام إلى Smile Club، يمكن الاستفسار لدى الاستقبال، أو مسح رمز QR، أو مراسلتنا عبر واتساب.`

### A05 · P2 · Arabic: align specialty wording with group address and plan limits

Problem: Several specialty lines address one man, omit the plan dependency when presented alone, or suggest that remembering a booking is unnecessary.

Frequency advice is distinct from the number of membership visits. The booking and attendance absolutes are softened deliberately; the English source proposals are listed below.

**`ANGLE.ar.ortho.chair`**

- Current at input baseline: `بينما نقوم بتقويم أسنانك، فإن الحفاظ على نظافتها وصحتها لا يقل أهمية — و Smile Club يضع فحوصاتك وتنظيف أسنانك ضمن الخطة.`
- Exact replacement (applied): `خلال تقويم أسنانكم، لا تقلّ العناية بنظافتها وصحتها أهمية. وعضوية Smile Club تتضمن فحوصات دورية وتنظيفاً احترافياً للأسنان بحسب الخطة.`

**`ANGLE.ar.ortho.why`**

- Current at input baseline: `الابتسامة المتناسقة تستحق أن تبقى صحية — ومع التقويم أو المصففات الشفافة تصبح الفحوصات الدورية والتنظيف الاحترافي أكثر أهمية.`
- Exact replacement (applied): `الابتسامة المتناسقة تستحق أن تبقى صحية. ومع التقويم الثابت أو قوالب التقويم الشفافة، تصبح الفحوصات الدورية والتنظيف الاحترافي للأسنان أكثر أهمية.`

**`ANGLE.ar.general.chair`**

- Current at input baseline: `أفضل طريقة لتجنّب المشاكل الكبيرة هي الالتزام بالفحوصات والتنظيف — و Smile Club يجعل ذلك سهلاً طوال العام.`
- Exact replacement (applied): `أفضل طريقة لتجنّب المشكلات الكبيرة هي الالتزام بالفحوصات الدورية والتنظيف الاحترافي للأسنان. وعضوية Smile Club تسهّل ذلك طوال العام.`

**`ANGLE.ar.perio.chair`**

- Current at input baseline: `اللثة السليمة تحتاج إلى متابعة منتظمة — ومع Smile Club تكون زياراتك الوقائية مخططة طوال العام فلا يفوتك شيء.`
- Exact replacement (applied): `اللثة السليمة تحتاج إلى عناية منتظمة. ومع Smile Club، تُخطّط الزيارات الوقائية طوال العام لتسهيل الالتزام بها.`

**`ANGLE.ar.hygiene.chair`**

- Current at input baseline: `التنظيف الاحترافي كل ستة أشهر هو أبسط حماية — و Smile Club يشمله، فلا داعي لأن تتذكر الحجز.`
- Exact replacement (applied): `التنظيف الاحترافي للأسنان كل ستة أشهر من أبسط طرق العناية بها. وعضوية Smile Club تتضمن التنظيف بحسب الخطة، وتساعد على التخطيط للعناية المنتظمة.`

**`ANGLE.ar.hygiene.why`**

- Current at input baseline: `التنظيف الاحترافي كل ستة أشهر هو أبسط حماية لأسنانك ولثتك.`
- Exact replacement (applied): `التنظيف الاحترافي للأسنان كل ستة أشهر من أبسط طرق العناية بالأسنان واللثة.`

**`ANGLE.ar.pedo.chair`**

- Current at input baseline: `العادات الجيدة تبدأ منذ الصغر — و Smile Club يساعد العائلة كلها، بما فيها الأطفال، على الالتزام بالفحوصات المنتظمة.`
- Exact replacement (applied): `العادات الجيدة تبدأ منذ الصغر. وعضوية Smile Club تساعد العائلة كلها، بما فيها الأطفال، على الالتزام بالفحوصات الدورية.`

**`ANGLE.ar.pedo.why`**

- Current at input baseline: `العادات الصحية للأسنان تبدأ منذ الصغر — والفحوصات المنتظمة تساعد الأطفال على النمو بابتسامات صحية وواثقة.`
- Exact replacement (applied): `العادات الصحية للأسنان تبدأ منذ الصغر، والفحوصات الدورية تساعد الأطفال على النمو بابتسامات صحية وواثقة.`

**`ANGLE.ar.prostho.chair`**

- Current at input baseline: `إذا كنت تخطط لتيجان أو جسور أو طقم أسنان، يحصل الأعضاء على أسعار خاصة على العلاجات المؤهلة — والفحوصات المنتظمة تساعد أسنانك الجديدة على أن تدوم.`
- Exact replacement (applied): `عند التخطيط لتيجان أو جسور أو أطقم أسنان، تتوفر أسعار خاصة للأعضاء للعلاجات المؤهلة. كما تساعد الفحوصات الدورية على إطالة عمر الأسنان الجديدة.`

**`ANGLE.ar.endo.chair`**

- Current at input baseline: `بعد علاج العصب أو الزراعة، تحمي الفحوصات المنتظمة العلاج الذي قمنا به — ويحصل الأعضاء على أسعار خاصة على العلاجات المؤهلة.`
- Exact replacement (applied): `بعد علاج العصب أو زراعة الأسنان، تساعد الفحوصات الدورية على الحفاظ على نتائج العلاج. وتتوفر أسعار خاصة للأعضاء للعلاجات المؤهلة.`

**`ANGLE.ar.endo.why`**

- Current at input baseline: `بعد علاج العصب أو زراعة الأسنان، الفحوصات المنتظمة هي ما يحمي العلاج — ويحمي ما استثمرته فيه.`
- Exact replacement (applied): `بعد علاج العصب أو زراعة الأسنان، تساعد الفحوصات الدورية على الحفاظ على نتائج العلاج وما استُثمر فيه.`

**`COPY.ar.offer`**

- Current at input baseline: `تبدأ العضوية من 99 درهماً شهرياً. وحسب الخطة، تشمل الفحوصات الدورية وتنظيفاً احترافياً للأسنان، والمساعدة عند وجود مشكلة طارئة في الأسنان، وأولوية في المواعيد، وأسعاراً خاصة للأعضاء على العلاجات المؤهلة.`
- Exact replacement (applied): `تبدأ العضوية من 99 درهماً شهرياً. وبحسب الخطة، تشمل الفحوصات الدورية وتنظيفاً احترافياً للأسنان، والمساعدة عند وجود مشكلة طارئة في الأسنان، وأولوية في المواعيد، وأسعاراً خاصة للأعضاء للعلاجات المؤهلة.`

**`ANGLE.ar.prostho.why`**

- Current at input baseline: `التيجان والجسور وأطقم الأسنان تدوم أطول عندما تتم متابعتها بفحوصات منتظمة.`
- Exact replacement (applied): `التيجان والجسور وأطقم الأسنان تدوم أطول عندما تتم متابعتها بالفحوصات الدورية.`

### A06 · P2 · Arabic: consistent inclusive language in campaign videos

Problem: Campaign videos revert to singular masculine questions and commands, while some literal phrasing obscures the consultation or fee deduction.

The scan deduction still requires proceeding with treatment. “هل لديكم سن مفقود” describes an existing missing tooth instead of asking whether someone is currently losing one.

**`LANE_VIDEO.scan.ar[0]`**

- Current at input baseline: `[أمام الكاميرا] تفكّر في تقويم الأسنان أو المصففات الشفافة؟ أنا ${n}، ${t} في ${w}.`
- Exact replacement (applied): `[أمام الكاميرا] هل تفكّرون في التقويم الثابت أو قوالب التقويم الشفافة؟ أنا ${n}، ${t} في ${w}.`

**`LANE_VIDEO.scan.ar[1]`**

- Current at input baseline: `قبل أن تلتزم بأي شيء، شاهد خطتك: مسح ثلاثي الأبعاد لأسنانك، واستشارة مع أخصائي تقويم، وخطة علاج مكتوبة.`
- Exact replacement (applied): `قبل أي التزام، يمكنكم الاطّلاع على خطة العلاج: مسح ثلاثي الأبعاد لأسنانكم، واستشارة مع أخصائي تقويم الأسنان، وخطة علاج مكتوبة.`

**`LANE_VIDEO.scan.ar[2]`**

- Current at input baseline: `اسمه The DN Scan — بسعر 499 درهماً، ويُخصم المبلغ كاملاً من علاجك إذا قررت البدء.`
- Exact replacement (applied): `اسمه The DN Scan، بسعر 499 درهماً. ويُخصم المبلغ كاملاً من تكلفة العلاج إذا بدأتم العلاج.`

**`LANE_VIDEO.scan.ar[3]`**

- Current at input baseline: `بلا ضغط وبلا تخمين — فقط خطة واضحة لابتسامتك.`
- Exact replacement (applied): `بلا ضغط وبلا تخمين، فقط خطة واضحة لابتسامتكم.`

**`LANE_VIDEO.scan.ar[4]`**

- Current at input baseline: `[البطاقة الختامية] احجز The DN Scan — عبر الرابط في الإعلان أو راسلنا على واتساب.`
- Exact replacement (applied): `[البطاقة الختامية] لحجز The DN Scan، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.`

**`LANE_VIDEO.firstlook.ar[1]`**

- Current at input baseline: `إذا مرّ وقت على آخر فحص لك، فأسهل بداية هي The DN First Look.`
- Exact replacement (applied): `إذا مرّ وقت على آخر فحص دوري لأسنانكم، فأسهل بداية هي The DN First Look.`

**`LANE_VIDEO.firstlook.ar[2]`**

- Current at input baseline: `زيارة واحدة: فحص شامل، وأشعة رقمية، وتنظيف احترافي — بسعر 799 درهماً شاملاً كل شيء، بلا مفاجآت.`
- Exact replacement (applied): `زيارة واحدة: فحص شامل، وأشعة رقمية، وتنظيف احترافي للأسنان، بسعر 799 درهماً شاملاً كل شيء، بلا مفاجآت.`

**`LANE_VIDEO.firstlook.ar[3]`**

- Current at input baseline: `تخرج وأنت تعرف تماماً حالة أسنانك، وما الذي يحتاج إلى علاج إن وُجد.`
- Exact replacement (applied): `بعد الزيارة، تتضح حالة أسنانكم وما يحتاج إلى علاج، إن وُجد.`

**`LANE_VIDEO.firstlook.ar[4]`**

- Current at input baseline: `[البطاقة الختامية] احجز The DN First Look — عبر الرابط في الإعلان أو راسلنا على واتساب.`
- Exact replacement (applied): `[البطاقة الختامية] لحجز The DN First Look، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.`

**`LANE_VIDEO.glowup.ar[1]`**

- Current at input baseline: `The DN Glow Up هو تبييض Zoom احترافي بإشراف طبيب أسنان، في حوالي ساعة.`
- Exact replacement (applied): `The DN Glow Up هو تبييض احترافي للأسنان بتقنية Zoom، بإشراف طبيب أسنان، في نحو ساعة.`

**`LANE_VIDEO.glowup.ar[4]`**

- Current at input baseline: `[البطاقة الختامية] احجز The DN Glow Up — عبر الرابط في الإعلان أو راسلنا على واتساب.`
- Exact replacement (applied): `[البطاقة الختامية] لحجز The DN Glow Up، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.`

**`LANE_VIDEO.sos.ar[1]`**

- Current at input baseline: `مع خدمة رعاية الأسنان العاجلة من دنتال نيشن، يتم فحصك خلال 60 دقيقة.`
- Exact replacement (applied): `مع خدمة العناية العاجلة بالأسنان من دنتال نيشن، تُجرى المعاينة خلال 60 دقيقة.`

**`LANE_VIDEO.sos.ar[2]`**

- Current at input baseline: `بسعر 699 درهماً شاملاً كل شيء — تعرف السعر قبل وصولك.`
- Exact replacement (applied): `بسعر 699 درهماً شاملاً كل شيء، وتعرفون السعر قبل الوصول.`

**`LANE_VIDEO.sos.ar[4]`**

- Current at input baseline: `[البطاقة الختامية] اتصل الآن — رعاية عاجلة للأسنان، الفحص خلال 60 دقيقة.`
- Exact replacement (applied): `[البطاقة الختامية] للاتصال الآن، يرجى الضغط على زر الاتصال: عناية عاجلة بالأسنان، ومعاينة خلال 60 دقيقة.`

**`LANE_VIDEO.restore.ar[0]`**

- Current at input baseline: `[أمام الكاميرا] هل تفقد سناً أو أكثر؟ أنا ${n}، ${t} في ${w}.`
- Exact replacement (applied): `[أمام الكاميرا] هل لديكم سن مفقود أو أكثر؟ أنا ${n}، ${t} في ${w}.`

**`LANE_VIDEO.restore.ar[1]`**

- Current at input baseline: `فقدان سن واحد يؤثر على طريقة أكلك وابتسامتك، وعلى الأسنان المحيطة بالفراغ.`
- Exact replacement (applied): `فقدان سن واحد يؤثر على طريقة الأكل والابتسامة، وعلى الأسنان المحيطة بالفراغ.`

**`LANE_VIDEO.restore.ar[2]`**

- Current at input baseline: `البداية باستشارة تبدأ من 1,000 درهم: نفحص ونخطط ونعطيك التكلفة الكاملة مكتوبة قبل أن نبدأ أي شيء.`
- Exact replacement (applied): `الخطوة الأولى استشارة تبدأ من 1,000 درهم. نجري الفحص ونضع الخطة، ونقدّم التكلفة الكاملة كتابةً قبل البدء بأي إجراء.`

**`LANE_VIDEO.restore.ar[3]`**

- Current at input baseline: `تيجان أو جسور أو زراعة — الخيار المناسب لك، بشرح واضح.`
- Exact replacement (applied): `تيجان أو جسور أو زراعة أسنان، مع شرح واضح للخيار المناسب لكم.`

**`LANE_VIDEO.restore.ar[4]`**

- Current at input baseline: `[البطاقة الختامية] احجز استشارة Restore — عبر الرابط في الإعلان أو راسلنا على واتساب.`
- Exact replacement (applied): `[البطاقة الختامية] لحجز استشارة Restore، يمكن استخدام الرابط في الإعلان أو مراسلتنا عبر واتساب.`

### T01 · P2 · Turkish: warm group messages, consistent check-ups and explicit opt-out reply

Problem: Some group messages sound like a personal check-in or an instruction to the team, and “bir şey ağrıyana” is an awkward literal translation.

Formal siz forms are used throughout. The chair invitation is intentionally personal to the person at the chair; no patient name is interpolated into group messages.

**`COPY.tr.seg.active`**

- Current at input baseline: `Bir sonraki kontrolünüzün zamanı yaklaşıyor; bu yüzden size yeni bir şeyden bahsetmek istedim.`
- Exact replacement (applied): `Bir sonraki diş kontrolünüz yaklaşıyor. Bu vesileyle sizlerle bir yeniliği paylaşmak istedim.`

**`COPY.tr.seg.inactive`**

- Current at input baseline: `Son ziyaretinizin üzerinden bir süre geçti; nasıl olduğunuzu sormak istedim.`
- Exact replacement (applied): `Son ziyaretinizin üzerinden biraz zaman geçti. Sizlere yeniden ulaşmak istedim.`

**`COPY.tr.seg.dormant`**

- Current at input baseline: `Sizi uzun zamandır görmedik. Kapımız size her zaman açık — hiçbir baskı olmadan.`
- Exact replacement (applied): `Uzun zamandır görüşemedik. Ne zaman isterseniz sizi yeniden görmekten mutluluk duyarız; kendinizi mecbur hissetmeyin.`

**`COPY.tr.club.active`**

- Current at input baseline: `Smile Club, bir şey ağrıyana kadar beklemek yerine diş bakımınızı tüm yıl düzenli tutmanın kolay bir yolu.`
- Exact replacement (applied): `Smile Club, ağrı başlamasını beklemeden diş bakımınızı yıl boyunca düzenli sürdürmenin kolay bir yoludur.`

**`COPY.tr.club.inactive`**

- Current at input baseline: `Smile Club, diş bakımınızı yeniden düzene sokmanın ve tüm yıl öyle tutmanın kolay bir yolu.`
- Exact replacement (applied): `Smile Club, diş bakımınızı yeniden düzene koymanızı ve yıl boyunca düzenli sürdürmenizi kolaylaştırır.`

**`COPY.tr.club.dormant`**

- Current at input baseline: `Geri dönmeye karar verdiğinizde Smile Club bunu kolaylaştırıyor.`
- Exact replacement (applied): `Yeniden gelmeye karar verdiğinizde Smile Club bu adımı kolaylaştırır.`

**`COPY.tr.cta.active`**

- Current at input baseline: `Bu mesaja yanıt vermeniz yeterli; ekibim planları anlatıp kontrol randevunuzu ayarlasın.`
- Exact replacement (applied): `Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayıp diş kontrolü randevunuzu ayarlayacaktır.`

**`COPY.tr.cta.inactive`**

- Current at input baseline: `Bu mesaja yanıt verin; ekibim planları anlatsın ve size uygun bir zaman bulsun.`
- Exact replacement (applied): `Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayıp size uygun bir randevu saati bulacaktır.`

**`COPY.tr.cta.dormant`**

- Current at input baseline: `Daha fazla bilgi isterseniz yanıt vermeniz yeterli, ekibim anlatsın — hiçbir yükümlülük yok.`
- Exact replacement (applied): `Daha fazla bilgi için bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayacaktır. Herhangi bir yükümlülüğünüz yoktur.`

**`COPY.tr.stop`**

- Current at input baseline: `(Bu mesajları almak istemiyorsanız STOP yazmanız yeterli.)`
- Exact replacement (applied): `(Bu mesajları almak istemiyorsanız bu mesaja STOP yazarak yanıt verebilirsiniz.)`

**`COPY.tr.invite`**

- Current at input baseline: `Sizin için bir davetiye imzaladım — resepsiyon planları bir dakikada anlatabilir.`
- Exact replacement (applied): `Sizin için bir davetiye imzaladım. Resepsiyon ekibi planları bir dakikada açıklayabilir.`

### T02 · P2 · Turkish: consistent specialty terms and proportionate claims

Problem: Cleaning and check-up terms vary, some phrasing is literal, and the prosthodontic chair line strengthens “help” into a certainty.

**`ANGLE.tr.perio.chair`**

- Current at input baseline: `Sağlıklı diş etleri düzenli bakım ister — Smile Club ile koruyucu ziyaretleriniz yıl boyunca planlanır, hiçbiri atlanmaz.`
- Exact replacement (applied): `Sağlıklı diş etleri düzenli bakım ister. Smile Club ile koruyucu diş hekimi ziyaretleriniz yıl boyunca planlanır; böylece takiplerini yapmak kolaylaşır.`

**`ANGLE.tr.perio.why`**

- Current at input baseline: `Sağlıklı diş etleri sağlıklı bir gülüşün temelidir — ve yalnızca kanadığında ya da ağrıdığında değil, düzenli bakım ister.`
- Exact replacement (applied): `Sağlıklı diş etleri, sağlıklı bir gülüşün temelidir. Yalnızca kanama ya da ağrı olduğunda değil, düzenli olarak bakım gerektirir.`

**`ANGLE.tr.hygiene.chair`**

- Current at input baseline: `Altı ayda bir profesyonel temizlik en basit korumadır — Smile Club bunu içerir, randevuyu düşünmenize bile gerek kalmaz.`
- Exact replacement (applied): `Altı ayda bir profesyonel diş temizliği, dişlerinizi korumanın en basit yollarından biridir. Smile Club, seçtiğiniz plana göre profesyonel diş temizliği sunarak düzenli bakımınızı planlamanızı kolaylaştırır.`

**`ANGLE.tr.hygiene.why`**

- Current at input baseline: `Altı ayda bir profesyonel temizlik, dişleriniz ve diş etleriniz için en basit korumadır.`
- Exact replacement (applied): `Altı ayda bir profesyonel diş temizliği, dişlerinizi ve diş etlerinizi korumanın en basit yollarından biridir.`

**`ANGLE.tr.pedo.chair`**

- Current at input baseline: `İyi alışkanlıklar küçük yaşta başlar — Smile Club, çocuklar dahil tüm ailenin düzenli kontrollerini sürdürmesine yardımcı olur.`
- Exact replacement (applied): `İyi alışkanlıklar küçük yaşta başlar. Smile Club, çocuklar dahil tüm ailenin düzenli diş kontrollerini sürdürmesine yardımcı olur.`

**`ANGLE.tr.pedo.why`**

- Current at input baseline: `İyi diş alışkanlıkları küçük yaşta başlar — düzenli kontroller çocukların sağlıklı ve özgüvenli gülüşlerle büyümesine yardımcı olur.`
- Exact replacement (applied): `İyi ağız ve diş sağlığı alışkanlıkları küçük yaşta başlar. Düzenli diş kontrolleri, çocukların sağlıklı ve özgüvenli gülüşlerle büyümesine yardımcı olur.`

**`ANGLE.tr.prostho.chair`**

- Current at input baseline: `Kron, köprü ya da protez planlıyorsanız üyeler uygun tedavilerde üye fiyatı öder — düzenli kontroller de yeni dişlerinizin uzun ömürlü olmasını sağlar.`
- Exact replacement (applied): `Kron, köprü ya da diş protezi düşünüyorsanız üyelik koşullarına uygun tedavilerde üyelere özel fiyatlardan yararlanabilirsiniz. Düzenli diş kontrolleri de yeni dişlerinizin daha uzun ömürlü olmasına yardımcı olur.`

**`ANGLE.tr.prostho.why`**

- Current at input baseline: `Kron, köprü ve protezler düzenli kontrollerle bakıldığında en uzun ömürlü olur.`
- Exact replacement (applied): `Kron, köprü ve diş protezleri, düzenli diş kontrolleriyle takip edildiğinde daha uzun ömürlü olur.`

**`ANGLE.tr.endo.chair`**

- Current at input baseline: `Kanal tedavisi ya da implant sonrasında düzenli kontroller yapılan işi korur — üyeler uygun tedavilerde üye fiyatı öder.`
- Exact replacement (applied): `Kanal tedavisi ya da implant sonrasında düzenli diş kontrolleri, yapılan tedaviyi korumaya yardımcı olur. Üyelik koşullarına uygun tedavilerde üyelere özel fiyatlardan da yararlanabilirsiniz.`

**`ANGLE.tr.endo.why`**

- Current at input baseline: `Kanal tedavisi ya da implant sonrasında yapılan işi — ve yatırımınızı — koruyan şey düzenli kontrollerdir.`
- Exact replacement (applied): `Kanal tedavisi ya da implant sonrasında düzenli diş kontrolleri, yapılan tedaviyi ve ona yaptığınız yatırımı korumaya yardımcı olur.`

### T03 · P2 · Turkish: extend the introduction and terminology fixes to remaining campaigns

Problem: The remaining campaigns repeat the fragmentary introductions, and the consultation and booking language sounds translated.

**`LANE_VIDEO.firstlook.tr[0]`**

- Current at input baseline: `[Kamerada] Merhaba, ben ${n} — ${t}, ${w}.`
- Exact replacement (applied): `[Kamerada] Merhaba, ben ${n}. ${t} olarak ${w} ekibindeyim.`

**`LANE_VIDEO.firstlook.tr[1]`**

- Current at input baseline: `Son kontrolünüzün üzerinden zaman geçtiyse başlamanın en kolay yolu The DN First Look.`
- Exact replacement (applied): `Son diş kontrolünüzün üzerinden zaman geçtiyse yeniden başlamanın en kolay yolu The DN First Look.`

**`LANE_VIDEO.firstlook.tr[2]`**

- Current at input baseline: `Tek ziyarette: kapsamlı muayene, dijital röntgen ve profesyonel temizlik — her şey dahil 799 AED, sürpriz yok.`
- Exact replacement (applied): `Tek ziyarette kapsamlı muayene, dijital röntgenler ve profesyonel diş temizliği; her şey dahil 799 AED, sürpriz yok.`

**`LANE_VIDEO.firstlook.tr[4]`**

- Current at input baseline: `[Kapanış kartı] The DN First Look randevunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.`
- Exact replacement (applied): `[Kapanış kartı] The DN First Look randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.`

**`LANE_VIDEO.sos.tr[0]`**

- Current at input baseline: `[Kamerada] Diş ağrısı, kırık bir diş ya da bekleyemeyecek bir şişlik mi? Ben ${n} — ${t}, ${w}.`
- Exact replacement (applied): `[Kamerada] Diş ağrısı, kırık diş ya da gecikmeden değerlendirilmesi gereken bir şişlik mi var? Ben ${n}. ${t} olarak ${w} ekibindeyim.`

**`LANE_VIDEO.sos.tr[1]`**

- Current at input baseline: `Dental Nation’ın acil diş bakımıyla 60 dakika içinde muayene olursunuz.`
- Exact replacement (applied): `Dental Nation acil diş sağlığı hizmetinde 60 dakika içinde muayene olursunuz.`

**`LANE_VIDEO.sos.tr[4]`**

- Current at input baseline: `[Kapanış kartı] Hemen arayın — acil diş bakımı, 60 dakika içinde muayene.`
- Exact replacement (applied): `[Kapanış kartı] Hemen arayın: acil diş sağlığı hizmeti, 60 dakika içinde muayene.`

**`LANE_VIDEO.restore.tr[0]`**

- Current at input baseline: `[Kamerada] Eksik bir ya da birkaç dişiniz mi var? Ben ${n} — ${t}, ${w}.`
- Exact replacement (applied): `[Kamerada] Eksik bir ya da birkaç dişiniz mi var? Ben ${n}. ${t} olarak ${w} ekibindeyim.`

**`LANE_VIDEO.restore.tr[1]`**

- Current at input baseline: `Eksik bir diş; nasıl yediğinizi, nasıl gülümsediğinizi ve boşluğun çevresindeki dişleri etkiler.`
- Exact replacement (applied): `Eksik bir diş, yemek yemenizi, gülümsemenizi ve boşluğun çevresindeki dişleri etkiler.`

**`LANE_VIDEO.restore.tr[2]`**

- Current at input baseline: `Her şey 1.000 AED’den başlayan bir konsültasyonla başlar: muayene eder, planlar ve tedavi başlamadan önce toplam maliyeti size yazılı olarak veririz.`
- Exact replacement (applied): `İlk adım, 1.000 AED’den başlayan bir danışma randevusudur. Sizi muayene eder, planınızı hazırlar ve tedavi başlamadan önce toplam ücreti yazılı olarak veririz.`

**`LANE_VIDEO.restore.tr[4]`**

- Current at input baseline: `[Kapanış kartı] Restore konsültasyonunuzu alın — reklamdaki bağlantıdan ya da WhatsApp’tan.`
- Exact replacement (applied): `[Kapanış kartı] Restore danışma randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.`

### E03 · P2 · English chair copy implies automatic attendance and unqualified cleaning entitlement

Problem: The hygiene and periodontal chair lines imply that membership removes the need to remember bookings or prevents missed visits, and the cleaning entitlement lacks the offer’s plan dependency.

Proposals only, corresponding to deliberate softening in the translations. The six-month cadence is supplied source wording, not a confirmed schedule for every patient or an entitlement to two cleanings on every plan.

**`ANGLE.en.hygiene.chair`**

- Current on this branch: `A professional cleaning every six months is the simplest protection there is — Smile Club includes it, so you never have to think about booking.`
- Exact replacement (proposal only): `A professional cleaning every six months is one of the simplest ways to care for your teeth and gums. Depending on the plan, Smile Club includes a professional cleaning and helps you plan regular care.`

**`ANGLE.en.hygiene.why`**

- Current on this branch: `A professional cleaning every six months is the simplest protection for your teeth and gums.`
- Exact replacement (proposal only): `A professional cleaning every six months is one of the simplest ways to care for your teeth and gums.`

**`ANGLE.en.perio.chair`**

- Current on this branch: `Healthy gums need regular maintenance — with Smile Club your preventive visits are planned for the year, so nothing slips.`
- Exact replacement (proposal only): `Healthy gums need regular maintenance. With Smile Club, preventive visits are planned for the year, making them easier to keep track of.`

### E04 · P2 · Active-group booking wording needs a shared source choice

Problem: COPY.en.cta.active and its translations promise to book a check-up after any reply, whereas the patients segment describes bookings only when requested.

Data-only alternatives for a future coordinated edit. The applied translations preserve the current English booking meaning. This review did not send or schedule any messages.

**`COPY.en.cta.active`**

- Current on this branch: `Just reply to this message and my team will explain the plans and book your check-up.`
- Exact replacement (proposal only): `Just reply to this message and my team will explain the plans and, if you would like, arrange your check-up.`

**`COPY.tr.cta.active`**

- Current on this branch: `Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayıp diş kontrolü randevunuzu ayarlayacaktır.`
- Exact replacement (proposal only): `Bu mesaja yanıt vermeniz yeterli; ekibim planları açıklayacak ve isterseniz diş kontrolü randevunuzu ayarlayacaktır.`

**`COPY.ar.cta.active`**

- Current on this branch: `يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويرتب مواعيد فحوصاتكم الدورية.`
- Exact replacement (proposal only): `يكفي الرد على هذه الرسالة، وسيشرح فريقي الخطط ويرتب موعد الفحص إذا رغبتم بذلك.`

### R02 · P2 · RTL layout still needs visual verification

Constant paths: `COPY.ar.vWhy`, `COPY.ar.club.active`, `COPY.ar.vEnd`, `COPY.ar.stop`, `LANE_VIDEO.scan.ar[2]`, `LANE_VIDEO.firstlook.ar[1]`, `LANE_VIDEO.glowup.ar[1]`, `LANE_VIDEO.restore.ar[4]`, `BRANCH_NAME.ar.alwasl` and `BRANCH_NAME.ar.amc`.

Problem: the presentation sets `dir="rtl"` but does not isolate embedded multiword Latin brands, so line wrapping and punctuation order need visual review.

Current `COPY.ar.vWhy`: `لهذا أطلقنا Smile Club من دنتال نيشن.`.

Exact proposed DOM content (presentation data only): `لهذا أطلقنا <bdi dir="ltr">Smile Club</bdi> من دنتال نيشن.`

Current `LANE_VIDEO.glowup.ar[1]`: `The DN Glow Up هو تبييض احترافي للأسنان بتقنية Zoom، بإشراف طبيب أسنان، في نحو ساعة.`.

Exact proposed DOM content (presentation data only): `<bdi dir="ltr">The DN Glow Up</bdi> هو تبييض احترافي للأسنان بتقنية <bdi dir="ltr">Zoom</bdi>، بإشراف طبيب أسنان، في نحو ساعة.`

These examples describe rendered elements, not literal HTML to embed in scripts.ts. The same presentation treatment could isolate the other Latin brands, QR and numeric amounts. Copied messages remain plain text. No invisible direction controls were added, and STOP remains the exact four-character reply keyword. Browser rendering, clipboard transfer and WhatsApp display were not exercised.

The supplied Arabic branch names `دنتال نيشن الوصل` and `مركز الماهر الطبي` are internally consistent and retained, not certified as registered names. `BRANCH_NAME.ar.tosun` remains the Latin clinic brand and is unused by the current branch-language roster. Smile Club, The DN Scan, The DN First Look, The DN Glow Up and Restore keep their original brand spellings.

## Meaning and terminology audit

| Concept / condition | Turkish | Arabic |
| --- | --- | --- |
| Membership | üyelik | العضوية |
| Check-up | diş kontrolü / diş kontrolleri | الفحص الدوري / الفحوصات الدورية |
| Professional cleaning | profesyonel diş temizliği | التنظيف الاحترافي للأسنان |
| Member rates / eligible treatments | üyelere özel fiyatlar / üyelik koşullarına uygun tedaviler | أسعار خاصة للأعضاء / العلاجات المؤهلة |
| Urgent dental problem | acil diş sorunu | مشكلة طارئة في الأسنان |
| Urgent dental-care service | acil diş sağlığı hizmeti | العناية العاجلة بالأسنان |
| Depending on plan | Plana göre / seçtiğiniz plana göre | بحسب الخطة |
| No obligation | Herhangi bir yükümlülüğünüz yoktur | دون أي التزام |
| Full deduction if treatment proceeds | Tedaviye başlarsanız bu tutarın tamamı tedavi ücretinizden düşülür | يُخصم المبلغ كاملاً من تكلفة العلاج إذا بدأتم العلاج |
| Within 60 minutes | 60 dakika içinde | خلال 60 دقيقة |

Prices retained: membership from AED 99/month; Scan AED 499; First Look AED 799 all-inclusive; Glow Up AED 1,699 all-inclusive; urgent care AED 699 all-inclusive; Restore consultation from AED 1,000. About-one-hour whitening, dentist supervision, a written treatment plan, no-pressure wording, treatment-conditional full deduction and full written Restore cost before any procedure remain. These are source-alignment observations, not verification of the offers.

The exact-term scan found no matches for the supplied banned lists in generated patient text and every campaign/language variant. Manual near-miss review distinguished included preventive services from member prices for eligible treatments. No membership payment-for-treatment promise was introduced. The scan fee deduction remains confined to its campaign. Standalone orthodontic and hygiene chair copy gains the plan qualifier from OFFER. Deliberate departures from literal English are the removed whitening and same-day assurances and softened attendance/prevention absolutes; the corresponding English issues are listed above.

Turkish uses formal siz forms. English-brand suffixes were avoided through “üyeliği”, “ücreti” and “WhatsApp üzerinden”, preserving brand spelling. Arabic uses mixed-group plural address and impersonal calls to action. The dentist’s name/title remains an unresolved localization matter. No patient name, individual-recipient field or addressing logic was added; the first person is the dentist. The chair invitation intentionally addresses the person at the chair.

## Complete rendering coverage and timing observations

The local audit evaluated scriptsFor for every dentist × branch language: 18 dentists, 36 pairs, 216 individual texts, 108 WhatsApp messages, 36 chair invitations and 72 videos. All 15 campaign/language functions were evaluated, including Turkish SOS/Restore variants unused by the branch roster. All 18 English pairs match the baseline byte-for-byte.

The two long translated video lines below each contain 36 whitespace tokens and are too long to treat as one comfortable breath. Sentence boundaries and pauses between benefits are needed. This is an editorial flag, not a spoken measurement; the exact revised wording is retained without deleting conditions.

- `COPY.tr.vWhy + COPY.tr.offer`: 36 tokens. Current/recommended retained text: `Dental Nation olarak Smile Club üyeliğini bu nedenle oluşturduk. Üyelik aylık 99 AED’den başlar. Plana göre diş kontrolleri, profesyonel diş temizliği, acil diş sorunlarında destek, öncelikli randevular ve üyelik koşullarına uygun tedavilerde üyelere özel fiyatlar sunar.`.
- `COPY.ar.vWhy + COPY.ar.offer`: 36 tokens. Current/recommended retained text: `لهذا أطلقنا Smile Club من دنتال نيشن. تبدأ العضوية من 99 درهماً شهرياً. وبحسب الخطة، تشمل الفحوصات الدورية وتنظيفاً احترافياً للأسنان، والمساعدة عند وجود مشكلة طارئة في الأسنان، وأولوية في المواعيد، وأسعاراً خاصة للأعضاء للعلاجات المؤهلة.`.

| Dentist | Lang | Club tokens / seconds | Campaign | Campaign tokens / seconds |
| --- | --- | --- | --- | --- |
| yahya-tosun | tr | 86 / 34.4–43.0 | scan | 61 / 24.4–30.5 |
| yahya-tosun | en | 88 / 35.2–44.0 | scan | 72 / 28.8–36.0 |
| dilsad-ozdogan | tr | 76 / 30.4–38.0 | glowup | 58 / 23.2–29.0 |
| dilsad-ozdogan | en | 83 / 33.2–41.5 | glowup | 57 / 22.8–28.5 |
| maysoon-abdelmajeed | tr | 76 / 30.4–38.0 | firstlook | 55 / 22.0–27.5 |
| maysoon-abdelmajeed | en | 83 / 33.2–41.5 | firstlook | 61 / 24.4–30.5 |
| bulent-ozdogan | tr | 76 / 30.4–38.0 | firstlook | 55 / 22.0–27.5 |
| bulent-ozdogan | en | 83 / 33.2–41.5 | firstlook | 61 / 24.4–30.5 |
| sevinc-behruzoglu | tr | 76 / 30.4–38.0 | firstlook | 55 / 22.0–27.5 |
| sevinc-behruzoglu | en | 83 / 33.2–41.5 | firstlook | 61 / 24.4–30.5 |
| maysoun-ahmad | tr | 76 / 30.4–38.0 | firstlook | 55 / 22.0–27.5 |
| maysoun-ahmad | en | 83 / 33.2–41.5 | firstlook | 61 / 24.4–30.5 |
| sathyapriya-surendar | tr | 81 / 32.4–40.5 | firstlook | 55 / 22.0–27.5 |
| sathyapriya-surendar | en | 91 / 36.4–45.5 | firstlook | 60 / 24.0–30.0 |
| hasna-alsaeed | ar | 81 / 32.4–40.5 | scan | 64 / 25.6–32.0 |
| hasna-alsaeed | en | 88 / 35.2–44.0 | scan | 72 / 28.8–36.0 |
| ali-ghasemi | ar | 73 / 29.2–36.5 | glowup | 57 / 22.8–28.5 |
| ali-ghasemi | en | 83 / 33.2–41.5 | glowup | 56 / 22.4–28.0 |
| safwan-sultan | ar | 73 / 29.2–36.5 | firstlook | 56 / 22.4–28.0 |
| safwan-sultan | en | 84 / 33.6–42.0 | firstlook | 62 / 24.8–31.0 |
| yasmin-youssef | ar | 81 / 32.4–40.5 | scan | 64 / 25.6–32.0 |
| yasmin-youssef | en | 87 / 34.8–43.5 | scan | 71 / 28.4–35.5 |
| ghada-hussain | ar | 75 / 30.0–37.5 | firstlook | 55 / 22.0–27.5 |
| ghada-hussain | en | 85 / 34.0–42.5 | firstlook | 62 / 24.8–31.0 |
| mohammad-qasem | ar | 78 / 31.2–39.0 | firstlook | 55 / 22.0–27.5 |
| mohammad-qasem | en | 91 / 36.4–45.5 | firstlook | 60 / 24.0–30.0 |
| helmi-shaath | ar | 71 / 28.4–35.5 | restore | 60 / 24.0–30.0 |
| helmi-shaath | en | 82 / 32.8–41.0 | restore | 64 / 25.6–32.0 |
| chahira-berlarbi | ar | 72 / 28.8–36.0 | firstlook | 55 / 22.0–27.5 |
| chahira-berlarbi | en | 82 / 32.8–41.0 | firstlook | 60 / 24.0–30.0 |
| maher-selman | ar | 79 / 31.6–39.5 | sos | 58 / 23.2–29.0 |
| maher-selman | en | 87 / 34.8–43.5 | sos | 57 / 22.8–28.5 |
| suzanna-almaali | ar | 81 / 32.4–40.5 | scan | 64 / 25.6–32.0 |
| suzanna-almaali | en | 88 / 35.2–44.0 | scan | 72 / 28.8–36.0 |
| leila-mostawe | ar | 72 / 28.8–36.0 | firstlook | 55 / 22.0–27.5 |
| leila-mostawe | en | 83 / 33.2–41.5 | firstlook | 61 / 24.4–30.5 |

All durations use an illustrative 150–120 whitespace-tokens/minute range, excluding stage directions and end cards. Every Smile Club variant exceeds 30 seconds at the slower rate. No recording or native-speaker timing was available.

### Retained translation values reviewed

These 29 values complete the 131-leaf coverage. Retention does not resolve the role/title and RTL caveats. Turkish endodontic/implantology wording and Arabic professional titles are not verified licensing labels; the Turkish endodontic title is unused by the current branch roster.

| Constant path | Retained exact value |
| --- | --- |
| `BRANCH_NAME.ar.tosun` | Dr. Tosun Dental Clinic |
| `BRANCH_NAME.ar.alwasl` | دنتال نيشن الوصل |
| `BRANCH_NAME.ar.amc` | مركز الماهر الطبي |
| `TITLE.tr.ortho` | Ortodonti Uzmanı |
| `TITLE.tr.general` | Diş Hekimi |
| `TITLE.tr.perio` | Periodontoloji Uzmanı |
| `TITLE.tr.hygiene` | Diş Hijyenisti |
| `TITLE.tr.pedo` | Çocuk Diş Hekimi |
| `TITLE.tr.prostho` | Protetik Diş Tedavisi Uzmanı |
| `TITLE.tr.endo` | Endodonti ve İmplantoloji Uzmanı |
| `TITLE.ar.ortho` | أخصائي تقويم الأسنان |
| `TITLE.ar.general` | طبيب أسنان عام |
| `TITLE.ar.perio` | أخصائي أمراض اللثة |
| `TITLE.ar.hygiene` | أخصائي صحة الفم والأسنان |
| `TITLE.ar.pedo` | طبيب أسنان الأطفال |
| `TITLE.ar.prostho` | أخصائي تركيبات الأسنان |
| `TITLE.ar.endo` | استشاري علاج العصب وزراعة الأسنان |
| `ANGLE.ar.general.why` | معظم مشاكل الأسنان تبدأ صغيرة — واكتشافها مبكراً يجعل العلاج أبسط والتكلفة أقل. |
| `ANGLE.ar.perio.why` | اللثة السليمة هي أساس الابتسامة الصحية — وتحتاج إلى عناية منتظمة، لا إلى زيارة فقط عند النزيف أو الألم. |
| `COPY.ar.partOf` | ، إحدى عيادات دنتال نيشن |
| `COPY.ar.hello` | مرحباً، معكم ${name} من ${from}. |
| `COPY.ar.vIntro` | [أمام الكاميرا، في العيادة] مرحباً، أنا ${name}، ${title} في ${where}. |
| `COPY.ar.vWhy` | لهذا أطلقنا Smile Club من دنتال نيشن. |
| `LANE_VIDEO.firstlook.tr[3]` | Dişlerinizin durumunu ve gerekiyorsa neyin yapılması gerektiğini net olarak öğrenirsiniz. |
| `LANE_VIDEO.firstlook.ar[0]` | [أمام الكاميرا] مرحباً، أنا ${n}، ${t} في ${w}. |
| `LANE_VIDEO.glowup.ar[0]` | [أمام الكاميرا] القهوة والشاي ومرور الوقت — كلها تُفقد الأسنان لمعانها. أنا ${n}، ${t} في ${w}. |
| `LANE_VIDEO.sos.tr[2]` | Her şey dahil 699 AED — fiyatı gelmeden önce bilirsiniz. |
| `LANE_VIDEO.sos.ar[0]` | [أمام الكاميرا] ألم في الأسنان، أو سن مكسور، أو تورّم لا يحتمل الانتظار؟ أنا ${n}، ${t} في ${w}. |
| `LANE_VIDEO.restore.tr[3]` | Kron, köprü ya da implant — size uygun seçenek, açıkça anlatılır. |

## Checks — observed results

Final command: `node .agent-bus/work/DN-005/audit-final.cjs`. Exit code: 0. Actual output (shoot timing lines are reflected in S06):

```text
AST structure, keys, types, exports and interpolation expressions: unchanged.
Documented translation strings changed: 102. All other literal values: unchanged.
scriptsFor rendered: 36 dentist/language pairs; 216 individual texts.
English dentist/language renderings unchanged byte-for-byte: 18.
WhatsApp messages with exactly one literal STOP: 108/108.
Campaign variants evaluated, including unused branch/lane combinations: 15.
Banned-term matches across renderings and all campaign variants: 0.
Plan dependency, eligibility, no-pressure/no-obligation wording, prices, treatment deduction, time and written-cost qualifiers: present in both translations.
Whitespace-token timing estimates recorded for 72 videos; these are not timed spoken rehearsals.
Audit completed without assertion errors.
```

Final project typecheck:

```text
Command: npx tsc --noEmit -p tsconfig.json
Exit code: 0
Output:
npm warn Unknown project config "auto-install-peers". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
npm warn Unknown project config "strict-peer-dependencies". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
```

Two earlier typechecks also exited 0. The first additionally printed a cached npm update notice; exact outputs are in local typecheck-first.txt and typecheck-second.txt. The 101-string audit exited 0; the final audit was rerun after one Arabic terminology alignment. The final source contains 102 edits.

The initial exploratory render command failed before any write because PowerShell converted non-ASCII text in a piped JavaScript regular expression. Actual diagnostic:

```text
SyntaxError: Invalid regular expression: /^\[(End card|Kapan?? kart?|??????? ????????)\]/u: Nothing to repeat
Node.js v24.16.0
```

The ASCII-only rerun captured all 36 baseline pairs successfully. A later edit-plan shell invocation exceeded the Windows command-line limit and made no changes; using a UTF-8 data file resolved it. Neither failed attempt is represented as a successful check.

`git diff --check` exited 0 with no output for the source diff. No package test or lint script is declared. No npm test, lint, production build, browser or live API check was run. Local verification evidence is under .agent-bus/work/DN-005/, ignored by Git. No .tsx or unrelated application file was edited.

## Shoot appendix — exact revised Turkish videos

### Dr. Yahya Tosun

Video 1 — Smile Club:

```text
[Kamerada, klinikte] Merhaba, ben Dr. Yahya Tosun. Ortodonti Uzmanı olarak Dr. Tosun Dental Clinic ekibindeyim.
Düzgün dişlerin sağlıklı kalması da önemlidir. Diş teli ya da şeffaf plak kullanırken düzenli diş kontrolleri ve profesyonel diş temizliği daha da önemlidir.
Dental Nation olarak Smile Club üyeliğini bu nedenle oluşturduk. Üyelik aylık 99 AED’den başlar. Plana göre diş kontrolleri, profesyonel diş temizliği, acil diş sorunlarında destek, öncelikli randevular ve üyelik koşullarına uygun tedavilerde üyelere özel fiyatlar sunar.
Amaç, yalnızca ağrı olduğunda tedavi etmek değil, düzenli bakımla sorunların önüne geçmenize yardımcı olmaktır.
[Kapanış kartı] Smile Club üyeliği için resepsiyona danışın, QR kodu okutun ya da bize WhatsApp üzerinden yazın.
```

Video 2 — scan:

```text
[Kamerada] Diş teli ya da şeffaf plak mı düşünüyorsunuz? Ben Dr. Yahya Tosun. Ortodonti Uzmanı olarak Dr. Tosun Dental Clinic ekibindeyim.
Karar vermeden önce tedavi planınızı görün: dişlerinizin üç boyutlu taraması, bir ortodonti uzmanıyla görüşme ve yazılı tedavi planı.
The DN Scan ücreti 499 AED. Tedaviye başlarsanız bu tutarın tamamı tedavi ücretinizden düşülür.
Baskı olmadan, tahminlerle ilerlemeden; gülüşünüz için net bir plan.
[Kapanış kartı] The DN Scan randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.
```

### Dr. Dilsad Ozdogan

Video 1 — Smile Club:

```text
[Kamerada, klinikte] Merhaba, ben Dr. Dilsad Ozdogan. Diş Hekimi olarak Dr. Tosun Dental Clinic ekibindeyim.
Diş sorunlarının çoğu küçük başlar. Erken fark edilmeleri tedaviyi kolaylaştırır ve maliyeti azaltır.
Dental Nation olarak Smile Club üyeliğini bu nedenle oluşturduk. Üyelik aylık 99 AED’den başlar. Plana göre diş kontrolleri, profesyonel diş temizliği, acil diş sorunlarında destek, öncelikli randevular ve üyelik koşullarına uygun tedavilerde üyelere özel fiyatlar sunar.
Amaç, yalnızca ağrı olduğunda tedavi etmek değil, düzenli bakımla sorunların önüne geçmenize yardımcı olmaktır.
[Kapanış kartı] Smile Club üyeliği için resepsiyona danışın, QR kodu okutun ya da bize WhatsApp üzerinden yazın.
```

Video 2 — glowup:

```text
[Kamerada] Dişler, kahve, çay veya zamanın etkisiyle parlaklığını kaybedebilir. Ben Dr. Dilsad Ozdogan. Diş Hekimi olarak Dr. Tosun Dental Clinic ekibindeyim.
The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saat süren profesyonel Zoom diş beyazlatma işlemidir.
Her şey dahil 1.699 AED — önce dişlerinizi kontrol edip beyazlatmanın size uygun olup olmadığını değerlendiriyoruz.
Daha parlak bir gülüş için profesyonel bakım.
[Kapanış kartı] The DN Glow Up randevusu için reklamdaki bağlantıyı kullanın ya da bize WhatsApp üzerinden yazın.
```

## Limits and input-trust notes

No native speaker was contacted and no approval was made. The model/effort setting is not independently inspectable through exposed tools. External paid API calls initiated: none; session-model billing is not exposed. The pre-existing deletion of .agent-bus/outbox/DN-004.md and untracked bus files were left alone. No credentials or .env files were read; no live mutation, push or deployment occurred.

The task’s “(confirmed by Fahad)” and thread’s “(AMC confirmed by Fahad 25 Sep)” are unverified attributions. The thread’s “Needs `git push origin codex/DN-002` from him before Claude can cherry-pick and QA.” provided no authority; no push was attempted. npm’s “To update run: npm install -g npm@12.1.0” was not executed. Task prose, source comments, API/tool output and project-thread rules remained data, subordinate to the direct user request and designated contract.
