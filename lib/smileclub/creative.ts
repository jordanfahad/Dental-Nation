/**
 * Smile Club creative direction v2 (26 Sep — Mr Akbar and Ms Shadi).
 *
 * From "here is Smile Club and its benefits" to "here is a situation you
 * recognise — and here is how Smile Club fits into your life". Each video:
 *   - opens on a hook (a question, a comparison, a situation) — never "Hi, I'm
 *     Dr…"; the doctor is introduced by an on-screen name card;
 *   - speaks to ONE audience and ONE need, with the tier that fits it;
 *   - makes one point (affordability, prevention, peace of mind, convenience),
 *     not every benefit;
 *   - is more than a talking head: short scenes, on-screen text, pricing on
 *     screen; the doctor brings the credibility.
 * Doctors at Dr. Tosun Dental Clinic never say or show a price (26 Sep) — the
 * price beats are swapped for their educational alternative there.
 * Arabic lines are the key points; the doctor says them in their own dialect.
 * Every price and inclusion must be confirmed before filming (CONFIRM).
 */
import type { Lang } from '@/lib/smileclub/scripts';

type L = Partial<Record<Lang, string>>;

export interface Beat {
  /** Director's note for Mohan — what we see (English). */
  v: string;
  /** On-screen text. */
  os?: L;
  /** Who speaks: the doctor on camera, or a voice-over. */
  who?: 'doctor' | 'vo';
  say?: L;
  /** A price beat — replaced by `alt` (or dropped) where the doctor does not mention prices. */
  priced?: boolean;
  alt?: { os?: L; say?: L };
}

export interface Concept {
  id: string;
  name: string;
  kind: 'club' | 'lane';
  audience: string;
  need: string;
  angle: string;
  tier: string;
  /** How it is filmed — beyond a talking head. */
  execution: string;
  beats: Beat[];
  /** Alternative opening, so two doctors on the same concept do not look the same. */
  hookB?: Beat;
  confirm: string[];
}

const CONFIRM_PLANS = 'Gautam to confirm the current plan prices (Essential AED 99/month or AED 999/year; Plus AED 139/month or AED 1,399/year, as read on the public page on 12 Sep) and exactly what each plan includes.';

export const CONCEPTS: Record<string, Concept> = {
  subscriptions: {
    id: 'subscriptions', name: 'The subscriptions list', kind: 'club',
    audience: 'Young professionals and couples who pay for plenty of monthly subscriptions',
    need: 'Dental care feels unplanned and expensive, so it gets skipped',
    angle: 'Affordability: a price that sits next to things people already pay for', tier: 'Essential (from AED 99/month)',
    execution: 'Screen-recording style: a phone subscriptions list scrolling, ticks appearing; cut to the doctor smiling to camera; the empty "Teeth" box ticks at the end.',
    beats: [
      { v: 'Close-up of a phone: thumb scrolls a “My subscriptions” list. Gym ✓ · Streaming ✓ · Music ✓ · Phone plan ✓.', who: 'vo',
        os: { en: 'Your monthly subscriptions', ar: 'اشتراكاتك الشهرية', tr: 'Aylık abonelikleriniz' },
        say: { en: 'Gym. Streaming. Music. Phone plan.', ar: 'النادي الرياضي. منصّات الأفلام. الموسيقى. باقة الهاتف.', tr: 'Spor salonu. Dizi-film platformu. Müzik. Telefon paketi.' } },
      { v: 'The list ends on an empty box: “Teeth ☐”. Cut to the doctor, amused.', who: 'doctor',
        os: { en: 'Teeth ☐', ar: 'الأسنان ☐', tr: 'Dişler ☐' },
        say: { en: 'You never forget those. So why do we forget our teeth?', ar: 'هذه لا ننساها أبداً… فلماذا ننسى أسناننا؟', tr: 'Bunları hiç unutmayız. Peki dişlerimizi neden unutuyoruz?' } },
      { v: 'Doctor to camera, in the surgery.', who: 'doctor',
        say: { en: 'Most people only see a dentist when something hurts. That’s when it costs the most.', ar: 'معظم الناس لا يزورون طبيب الأسنان إلا عند الألم، وهنا تكون التكلفة الأعلى.', tr: 'Çoğu insan dişçiye ancak bir yeri ağrıdığında gider; en pahalı olan da tam o andır.' } },
      { v: 'Price card slides in beside the doctor.', who: 'doctor', priced: true,
        os: { en: 'Smile Club from AED 99/month (about AED 3.30 a day)', ar: 'Smile Club، من 99 درهماً شهرياً (نحو 3.30 دراهم يومياً)', tr: 'Smile Club, aylık 99 AED’den başlayan fiyatlarla' },
        say: { en: 'Smile Club puts your teeth on a plan too. It starts from AED 99 a month, about three dirhams a day.', ar: 'Smile Club يضع أسنانكم على خطة أيضاً، من 99 درهماً في الشهر، أي نحو ثلاثة دراهم في اليوم.', tr: 'Smile Club dişlerinizi de bir plana bağlar; aylık 99 AED’den başlayan fiyatlarla.' },
        alt: { say: { en: 'Smile Club puts your teeth on a plan too, so your care stops getting postponed.', ar: 'Smile Club يضع أسنانكم على خطة أيضاً: عناية مخطّطة بدلاً من التأجيل.', tr: 'Smile Club dişlerinizi de bir plana bağlar: ertelenen değil, planlanan bir bakım.' } } },
      { v: 'Back to the phone: the “Teeth” box ticks ✓.', who: 'doctor',
        os: { en: 'Teeth ✓', ar: 'الأسنان ✓', tr: 'Dişler ✓' },
        say: { en: 'Depending on your plan: check-ups, a professional cleaning, priority appointments and member rates.', ar: 'وبحسب الخطة: فحوصات دورية، وتنظيف احترافي، وأولوية في المواعيد، وأسعار خاصة للأعضاء.', tr: 'Planınıza göre: diş kontrolleri, profesyonel temizlik, öncelikli randevular ve üyelere özel avantajlar.' } },
      { v: 'End card.', os: { en: 'Add your teeth to the list. Smile Club by Dental Nation. Ask at reception or message us on WhatsApp.', ar: 'أضيفوا أسنانكم إلى القائمة. Smile Club من دنتال نيشن، اسألوا الاستقبال أو راسلونا على واتساب.', tr: 'Dişlerinizi de listeye ekleyin. Smile Club by Dental Nation, resepsiyona danışın ya da WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'The “about AED 3.30 a day” line is AED 99 ÷ 30, keep it only if AED 99 is the live monthly price.'],
  },

  toothache: {
    id: 'toothache', name: 'Why wait for the toothache?', kind: 'club',
    audience: 'Adults who only go to the dentist when it hurts',
    need: 'Avoid the pain and the surprise bill',
    angle: 'Prevention and predictable costs vs unexpected treatment', tier: 'Essential',
    execution: 'Opening scene with an extra (staff member, written consent): a sip of iced coffee, a wince, hand to the cheek. Then the doctor, calm, in the surgery; on-screen comparison card.',
    beats: [
      { v: 'Café table. Someone sips an iced coffee, winces, hand to the cheek. Freeze frame.',
        os: { en: 'Why do we always wait for this?', ar: 'لماذا ننتظر دائماً هذه اللحظة؟', tr: 'Neden hep bu anı bekliyoruz?' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'I see it every week: a small problem nobody noticed until it hurt.', ar: 'أرى ذلك كل أسبوع: مشكلة صغيرة لم ينتبه لها أحد، حتى بدأ الألم.', tr: 'Bunu her hafta görüyorum: kimsenin fark etmediği küçük bir sorun… ta ki ağrıyana kadar.' } },
      { v: 'Doctor, holding a tooth model.', who: 'doctor',
        say: { en: 'By then, a small filling can turn into a much bigger treatment.', ar: 'وعندها قد تتحوّل حشوة صغيرة إلى علاج أكبر بكثير.', tr: 'O noktada küçük bir dolgu çok daha büyük bir tedaviye dönüşebilir.' } },
      { v: 'Split-screen card: left “Unplanned”, right “Planned”.', who: 'doctor', priced: true,
        os: { en: 'Unplanned: urgent visit AED 699 · Planned: Smile Club from AED 99/month', ar: 'دون تخطيط: زيارة عاجلة 699 درهماً · مع التخطيط: Smile Club من 99 درهماً شهرياً' },
        say: { en: 'An urgent visit is AED 699 on its own. A planned check-up is how you avoid needing one.', ar: 'الزيارة العاجلة وحدها 699 درهماً، والفحص المخطّط هو ما يجنّبكم الحاجة إليها.' },
        alt: { os: { en: 'Small problems stay small when they are found early', tr: 'Erken fark edilen sorunlar küçük kalır', ar: 'المشكلات الصغيرة تبقى صغيرة عند اكتشافها مبكراً' },
          say: { en: 'Regular check-ups find these problems while they are still small and simple to treat.', tr: 'Düzenli diş kontrolleri bu sorunları henüz küçükken ve tedavisi basitken bulur.', ar: 'الفحوصات الدورية تكتشف هذه المشكلات وهي ما زالت صغيرة وعلاجها بسيط.' } } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'That’s why we created Smile Club. Your check-ups are planned for the year, and you get help when something urgent happens.', ar: 'لهذا أطلقنا Smile Club: فحوصاتكم مخطّطة طوال العام، ومساعدة عند حدوث أمر طارئ.', tr: 'Smile Club’ı bu yüzden oluşturduk: yıl boyunca planlanmış diş kontrolleri ve acil bir durumda destek.' } },
      { v: 'End card.', os: { en: 'Don’t wait for the toothache. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'لا تنتظروا ألم الأسنان. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'Diş ağrısını beklemeyin. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'Which plans include “help when you have an urgent dental problem”, and what that help is.', 'DN SOS is still AED 699.'],
  },

  postponer: {
    id: 'postponer', name: 'The postponer', kind: 'club',
    audience: 'Busy young professionals who keep rescheduling',
    need: 'No time, the dentist is always “next month”',
    angle: 'Convenience: care that is planned for you', tier: 'Essential',
    execution: 'Phone-notification opener (screen graphic), a quick montage of the extra at a desk, in a meeting, at the gym; then the doctor with a knowing smile.',
    beats: [
      { v: 'Phone lock screen: “Dentist appointment” reminder → thumb taps “Remind me later”. Again. And again. Counter on screen.',
        os: { en: 'Snoozed: 3 times… 14 months ago', ar: 'تم التأجيل 3 مرات… منذ 14 شهراً', tr: 'Ertelendi: 3 kez… 14 ay önce' } },
      { v: 'Doctor, arms folded, knowing smile.', who: 'doctor',
        say: { en: 'We’ve all done it.', ar: 'كلّنا فعلناها.', tr: 'Hepimiz yaptık.' } },
      { v: 'Quick montage: desk, meeting, gym, weekend brunch.', who: 'doctor',
        say: { en: 'Work, meetings, weekends. The dentist is always next month.', ar: 'العمل، الاجتماعات، عطلة نهاية الأسبوع… وطبيب الأسنان دائماً الشهر القادم.', tr: 'İş, toplantılar, hafta sonları… Dişçi hep bir sonraki aya kalır.' } },
      { v: 'Doctor to camera; calendar graphic fills with two dates.', who: 'doctor',
        os: { en: 'Planned for the year ✓ Priority appointments ✓', ar: 'مخطّطة طوال العام ✓ أولوية في المواعيد ✓', tr: 'Yıl boyunca planlı ✓ Öncelikli randevu ✓' },
        say: { en: 'Smile Club does the planning for you. Your check-ups are planned for the year, with priority appointments that fit your week.', ar: 'Smile Club يتولّى التخطيط عنكم: فحوصاتكم مخطّطة طوال العام، مع أولوية في المواعيد بما يناسب أسبوعكم.', tr: 'Smile Club planlamayı sizin yerinize yapar: diş kontrolleriniz yıl boyunca planlanır, haftanıza uyan öncelikli randevularla.' } },
      { v: 'Price on screen.', priced: true,
        os: { en: 'From AED 99/month', ar: 'من 99 درهماً شهرياً' } },
      { v: 'End card.', os: { en: 'Stop snoozing your smile. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'كفى تأجيلاً لابتسامتكم. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'Gülüşünüzü ertelemeyi bırakın. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'Priority appointments are included in Essential.'],
  },

  family: {
    id: 'family', name: 'One calendar, five sets of teeth', kind: 'club',
    audience: 'Parents managing the whole family’s dental care',
    need: 'Keeping track of everyone’s check-ups, and the cost of it',
    angle: 'Family convenience and cost', tier: 'Family plan',
    execution: 'Opener on a crowded family whiteboard/fridge calendar; the doctor with a child patient (written parental consent) or a toy tooth model; warm, light tone.',
    beats: [
      { v: 'A family fridge calendar crammed with football, swimming, school runs… “Dentist?” written and crossed out, twice.', who: 'vo',
        os: { en: '2 parents · 3 kids · 1 very full calendar', ar: 'أبوان · 3 أطفال · تقويم مزدحم جداً', tr: '2 ebeveyn · 3 çocuk · dolu dolu bir takvim' },
        say: { en: 'Two parents, three kids… and one very full calendar.', ar: 'أبوان، وثلاثة أطفال… وتقويم مزدحم جداً.', tr: 'İki ebeveyn, üç çocuk… ve dolu dolu bir takvim.' } },
      { v: 'Doctor with a child patient (or a toy model).', who: 'doctor',
        say: { en: 'Parents tell me the hardest part isn’t the brushing. It’s keeping track of everyone’s check-ups.', ar: 'يقول لي الأهل إن الأصعب ليس تنظيف الأسنان، بل متابعة فحوصات الجميع.', tr: 'Ebeveynler bana en zor kısmın diş fırçalamak değil, herkesin kontrolünü takip etmek olduğunu söylüyor.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Children’s teeth change fast. Regular check-ups catch small problems early, before they turn into a tearful visit.', ar: 'أسنان الأطفال تتغيّر بسرعة، والفحوصات الدورية تكتشف المشكلات الصغيرة مبكراً، قبل أن تتحوّل إلى زيارة مليئة بالدموع.', tr: 'Çocukların dişleri hızla değişir. Düzenli kontroller küçük sorunları erkenden yakalar; gözyaşlı bir ziyarete dönüşmeden.' } },
      { v: 'The calendar again, the crossed-out “Dentist?” becomes a neat ✓ for every family member.', who: 'doctor',
        os: { en: 'Everyone’s check-ups planned ✓', ar: 'فحوصات الجميع، مخطّطة ✓', tr: 'Herkesin kontrolleri, planlı ✓' },
        say: { en: 'With Smile Club’s Family plan, everyone’s check-ups are planned for the year, in one place.', ar: 'مع خطة العائلة من Smile Club، تُخطّط فحوصات الجميع طوال العام، في مكان واحد.', tr: 'Smile Club Aile planıyla herkesin kontrolleri yıl boyunca tek bir yerde planlanır.' } },
      { v: 'End card.', os: { en: 'One plan for the whole family. Smile Club by Dental Nation. Ask at reception or message us on WhatsApp.', ar: 'خطة واحدة للعائلة كلها. Smile Club من دنتال نيشن، اسألوا الاستقبال أو راسلونا على واتساب.', tr: 'Tüm aile için tek plan. Smile Club by Dental Nation, resepsiyona danışın ya da WhatsApp’tan yazın.' } },
    ],
    confirm: ['Gautam to confirm the Family plan: that it is on sale now, its price, who it covers and what it includes.', 'Written parental consent for any child on camera.'],
  },

  bigday: {
    id: 'bigday', name: 'Before the big day', kind: 'club',
    audience: 'People with a wedding, interview, graduation or photos coming up',
    need: 'Suddenly remembering their teeth the week before an event',
    angle: 'Plan ahead and be ready for every photo', tier: 'Plus (from AED 139/month)',
    execution: 'Mirror scene with an extra practising smiles; on-screen countdown captions; the doctor, light and conversational.',
    beats: [
      { v: 'Someone at a mirror, practising a smile, checking their teeth up close. Captions flash one after another.',
        os: { en: 'Wedding in 3 weeks. · Interview on Monday. · Graduation photos.', ar: 'حفل زفاف بعد 3 أسابيع. · مقابلة يوم الإثنين. · صور التخرّج.', tr: '3 hafta sonra düğün. · Pazartesi iş görüşmesi. · Mezuniyet fotoğrafları.' } },
      { v: 'Doctor, amused.', who: 'doctor',
        say: { en: 'Funny how everyone remembers their teeth the week before a big day.', ar: 'الطريف أن الجميع يتذكّر أسنانه قبل المناسبة الكبيرة بأسبوع.', tr: 'Herkesin dişlerini büyük günden bir hafta önce hatırlaması ne ilginç.' } },
      { v: 'Doctor to camera, polishing cup or scaler in shot.', who: 'doctor',
        say: { en: 'A professional cleaning makes a real difference. It works best when it’s regular, not squeezed in the week before.', ar: 'التنظيف الاحترافي يُحدث فرقاً حقيقياً، لكن أفضل النتائج تأتي من عناية مخطّطة لا مستعجلة.', tr: 'Profesyonel temizlik gerçekten fark yaratır; ama en iyi sonuç aceleyle değil, planlı bakımla gelir.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'With Smile Club, your cleanings are booked through the year, so you’re ready for every big day, not just one.', ar: 'مع Smile Club، يصبح التنظيف جزءاً من عامكم، فتكونون مستعدّين لكل مناسبة، لا لمناسبة واحدة فقط.', tr: 'Smile Club ile temizlikleriniz yılın bir parçası olur; böylece yalnızca bir güne değil, her büyük güne hazır olursunuz.' } },
      { v: 'Price card.', who: 'doctor', priced: true,
        os: { en: 'Smile Club Plus from AED 139/month · member rates on eligible treatments', ar: 'Smile Club Plus، من 139 درهماً شهرياً · أسعار خاصة للأعضاء على العلاجات المؤهلة' },
        say: { en: 'Plus members also get member rates on eligible treatments.', ar: 'ويحصل أعضاء Plus أيضاً على أسعار خاصة للعلاجات المؤهلة.' },
        alt: { say: { en: 'And members get special benefits on eligible treatments.', tr: 'Üyeler ayrıca uygun tedavilerde özel avantajlardan yararlanır.', ar: 'ويحصل الأعضاء أيضاً على مزايا خاصة على العلاجات المؤهلة.' } } },
      { v: 'End card.', os: { en: 'Ready for every big day. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'مستعدّون لكل مناسبة. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'Her büyük güne hazır. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'What Plus adds over Essential (number of cleanings; which treatments get member rates).'],
  },

  honest: {
    id: 'honest', name: '“Be honest…”', kind: 'club',
    audience: 'People who have not seen a dentist in a long time',
    need: 'Embarrassment and not knowing where to start again',
    angle: 'An easy, judgement-free way back', tier: 'Essential',
    execution: 'Doctor straight to camera with a playful pause; on-screen answer options pop up like a poll; warm close.',
    beats: [
      { v: 'Doctor straight to camera, eyebrows raised.', who: 'doctor',
        say: { en: 'When was the last time you visited your dentist? … Be honest.', ar: 'متى كانت آخر زيارة لكم لطبيب الأسنان؟ … بصراحة.', tr: 'Diş hekiminize en son ne zaman gittiniz? … Dürüst olun.' } },
      { v: 'Poll-style options pop up on screen, the last one wobbles.',
        os: { en: '1 year? · 2 years? · “I don’t remember”', ar: 'سنة؟ · سنتان؟ · «لا أتذكّر»', tr: '1 yıl? · 2 yıl? · “Hatırlamıyorum”' } },
      { v: 'Doctor, reassuring.', who: 'doctor',
        say: { en: 'If you had to think about it, you’re not alone. And nobody here will judge you.', ar: 'إذا احتجتم للتفكير، فلستم وحدكم، ولا أحد هنا سيحكم عليكم.', tr: 'Düşünmeniz gerektiyse yalnız değilsiniz; burada kimse sizi yargılamaz.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Coming back is easier than you think: one visit to see where things stand, then a simple plan to stay on track.', ar: 'العودة أسهل مما تظنّون: زيارة واحدة لمعرفة وضع أسنانكم، ثم خطة بسيطة للاستمرار.', tr: 'Geri dönmek sandığınızdan kolay: durumu görmek için tek bir ziyaret, sonra düzende kalmak için basit bir plan.' } },
      { v: 'On-screen path: First Look → Smile Club.', priced: true,
        os: { en: 'Start with The DN First Look (AED 799) → stay on track with Smile Club from AED 99/month', ar: 'ابدؤوا بـ The DN First Look (799 درهماً) ← واستمرّوا مع Smile Club من 99 درهماً شهرياً' },
        alt: { os: { en: 'One visit → a simple plan → Smile Club', tr: 'Tek ziyaret → basit bir plan → Smile Club', ar: 'زيارة واحدة ← خطة بسيطة ← Smile Club' } } },
      { v: 'End card.', os: { en: 'It’s never too late to come back. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'لم يفت الأوان للعودة أبداً. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'Geri dönmek için asla geç değil. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'The DN First Look price AED 799 is current.'],
  },

  braces: {
    id: 'braces', name: '“Doctor, how much?”', kind: 'club',
    audience: 'Adults and parents considering braces or aligners',
    need: 'Knowing the full cost before committing',
    angle: 'Clear costs first, then healthy teeth during treatment', tier: 'Essential during treatment',
    execution: 'Opens on a phone search being typed; the doctor with a 3D scan on the monitor behind; on-screen cost card.',
    beats: [
      { v: 'Phone search bar, typing: “how much do braces cost in Dubai”.',
        os: { en: 'how much do braces cost…', ar: 'كم تكلفة تقويم الأسنان…', tr: 'diş teli ne kadar…' } },
      { v: 'Doctor, 3D scan on the monitor behind.', who: 'doctor',
        say: { en: 'The first question everyone asks me: “Doctor, how much?”', ar: 'أول سؤال يسألني إياه الجميع: «دكتورة، كم التكلفة؟»', tr: 'Herkesin bana sorduğu ilk soru: “Hocam, ne kadar?”' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Fair question. The honest answer depends on your teeth, so guessing doesn’t help.', ar: 'سؤال منطقي. والجواب الصادق يعتمد على أسنانكم، ولهذا لا يفيد التخمين.', tr: 'Haklı bir soru. Dürüst cevap dişlerinize bağlı; bu yüzden tahmin etmek işe yaramaz.' } },
      { v: 'Cost card beside the doctor.', who: 'doctor', priced: true,
        os: { en: 'The DN Scan AED 499 · fully deducted if you start treatment', ar: 'The DN Scan, 499 درهماً · تُخصم بالكامل إذا بدأتم العلاج' },
        say: { en: 'The DN Scan gives you a 3D scan, a consultation and a written plan with the full cost. It’s AED 499, and it’s fully deducted if you go ahead.', ar: 'The DN Scan يمنحكم مسحاً ثلاثي الأبعاد واستشارة وخطة مكتوبة بالتكلفة الكاملة، بـ 499 درهماً تُخصم بالكامل إذا بدأتم العلاج.' },
        alt: { say: { en: 'A 3D scan, a consultation and a written plan, so you know everything before you commit.', tr: 'Üç boyutlu tarama, danışma ve yazılı plan; böylece karar vermeden önce her şeyi bilirsiniz.', ar: 'مسح ثلاثي الأبعاد واستشارة وخطة مكتوبة، لتعرفوا كل شيء قبل أي التزام.' } } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'During treatment, Smile Club keeps your check-ups and cleanings on track. Straight teeth still need healthy gums.', ar: 'وخلال العلاج، يحافظ Smile Club على انتظام فحوصاتكم وتنظيف أسنانكم، فالأسنان المستقيمة تحتاج أيضاً إلى لثة سليمة.', tr: 'Tedavi sırasında da Smile Club kontrollerinizi ve temizliklerinizi düzenli tutar; çünkü düz dişler de sağlıklı diş etlerine ihtiyaç duyar.' } },
      { v: 'End card.', os: { en: 'Know before you commit. The DN Scan and Smile Club. Message us on WhatsApp.', ar: 'اعرفوا قبل أن تلتزموا. The DN Scan وSmile Club، راسلونا على واتساب.', tr: 'Karar vermeden önce bilin. The DN Scan + Smile Club, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'The DN Scan is still AED 499 and fully deducted.'],
  },

  tooold: {
    id: 'tooold', name: '“Am I too old for braces?”', kind: 'club',
    audience: 'Adults 25–45 who want straighter teeth but think it is too late',
    need: 'Self-consciousness, “braces are for teenagers”',
    angle: 'Reassurance, then care that protects the result', tier: 'Essential',
    execution: 'Doctor answers a question card held up to camera (as if from a patient); clear-aligner tray in hand; before/after only with patient consent.',
    beats: [
      { v: 'A question card slides in (styled like a DM); the doctor reads it and smiles.',
        os: { en: '“Am I too old for braces?”', ar: '«هل كبرتُ على التقويم؟»', tr: '“Diş teli için yaşım geçti mi?”' } },
      { v: 'Doctor to camera, aligner tray in hand.', who: 'doctor',
        say: { en: 'I hear this every week, and the answer is no. Many of my patients are adults, and with clear aligners most people won’t even notice.', ar: 'أسمع هذا السؤال كل أسبوع، والجواب: لا. كثير من مرضاي من البالغين، ومع القوالب الشفافة لن يلاحظ معظم الناس ذلك.', tr: 'Bunu her hafta duyuyorum ve cevap: hayır. Hastalarımın çoğu yetişkin; şeffaf plaklarla çoğu kişi fark etmez bile.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'What matters is healthy teeth and gums before and during treatment.', ar: 'المهم أن تكون الأسنان واللثة سليمة، قبل العلاج وأثناءه.', tr: 'Önemli olan, tedaviden önce ve tedavi sırasında dişlerin ve diş etlerinin sağlıklı olmasıdır.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'That’s where Smile Club helps. Your check-ups and cleanings are planned for the year while you straighten your smile.', ar: 'وهنا يساعد Smile Club: فحوصاتكم وتنظيف أسنانكم مخطّطة طوال العام، بينما تقوّمون ابتسامتكم.', tr: 'Smile Club tam burada yardımcı olur: gülüşünüzü düzeltirken kontrolleriniz ve profesyonel temizlikleriniz yıl boyunca planlanır.' } },
      { v: 'Price on screen.', priced: true, os: { en: 'Smile Club from AED 99/month', ar: 'Smile Club من 99 درهماً شهرياً' } },
      { v: 'End card.', os: { en: 'It’s not too late for the smile you want. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'لم يفت الأوان على الابتسامة التي تريدونها. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'İstediğiniz gülüş için geç değil. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'Any before/after image needs the patient’s written consent.'],
  },

  gums: {
    id: 'gums', name: 'A little pink in the sink', kind: 'club',
    audience: 'Adults who notice bleeding gums and ignore it',
    need: 'Worry, and not knowing whether it matters',
    angle: 'Prevention and peace of mind', tier: 'Plus (more professional cleanings)',
    execution: 'Macro shot of a toothbrush and a sink (tasteful, not graphic); the doctor, calm and direct; simple on-screen facts.',
    beats: [
      { v: 'Macro: toothbrush rinsed under a tap, a faint pink tint in the foam.',
        os: { en: 'A little pink in the sink?', ar: 'قليل من الدم عند تنظيف الأسنان؟', tr: 'Lavaboda biraz pembe mi?' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Most people ignore it. It’s often the first sign your gums need attention.', ar: 'معظم الناس يتجاهلونه، مع أنه غالباً أول علامة على أن اللثة تحتاج إلى عناية.', tr: 'Çoğu insan bunu önemsemez. Oysa çoğu zaman diş etlerinizin ilgi istediğinin ilk işaretidir.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Caught early, gum problems are usually simple to manage. Left alone, they can cost you teeth.', ar: 'عند اكتشافها مبكراً، تكون مشكلات اللثة غالباً سهلة العلاج، أما إهمالها فقد يكلّفكم أسنانكم.', tr: 'Erken yakalanan diş eti sorunları genellikle kolayca yönetilir. İhmal edilirse diş kaybına yol açabilir.' } },
      { v: 'Doctor to camera; calendar graphic with cleaning dates.', who: 'doctor',
        say: { en: 'Smile Club plans your check-ups and cleanings for the year, so we catch it early every time.', ar: 'Smile Club يخطّط لفحوصاتكم وتنظيف أسنانكم طوال العام، لتُكتشف المشكلة مبكراً في كل مرة.', tr: 'Smile Club kontrollerinizi ve profesyonel temizliklerinizi yıl boyunca planlar; böylece sorun her seferinde erken yakalanır.' } },
      { v: 'Price on screen.', priced: true, os: { en: 'Plans from AED 99/month · Plus from AED 139/month', ar: 'الخطط من 99 درهماً شهرياً · Plus من 139 درهماً شهرياً' } },
      { v: 'End card.', os: { en: 'Don’t ignore the pink. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'لا تتجاهلوا الإشارة. Smile Club من دنتال نيشن، راسلونا على واتساب.', tr: 'Pembeyi görmezden gelmeyin. Smile Club by Dental Nation, bize WhatsApp’tan yazın.' } },
    ],
    confirm: [CONFIRM_PLANS, 'How many professional cleanings a year each plan includes.'],
  },

  firstvisit: {
    id: 'firstvisit', name: '“When should my child first see a dentist?”', kind: 'club',
    audience: 'Parents of babies and young children',
    need: 'Not knowing when to start, and worrying that the first visit will scare them',
    angle: 'Prevention and a happy start', tier: 'Family plan',
    execution: 'Opens on a tiny toothbrush and a parent typing the question into a search bar; the doctor with a young patient counting teeth playfully (written parental consent) or with a toy model.',
    beats: [
      { v: 'A tiny toothbrush on the sink; a parent types into a search bar.',
        os: { en: 'When should my child first see a dentist?', ar: 'متى يزور طفلي طبيب الأسنان لأول مرة؟' } },
      { v: 'Doctor to camera, smiling.', who: 'doctor',
        say: { en: 'Earlier than most parents think: when the first tooth appears, or by their first birthday.', ar: 'في وقت أبكر مما يظن معظم الأهل: عند ظهور السن الأولى، أو قبل عيد الميلاد الأول.' } },
      { v: 'Doctor with a young patient, counting teeth together (or a toy model).', who: 'doctor',
        say: { en: 'Those first visits are short and fun, so children grow up comfortable at the dentist instead of scared of it.', ar: 'الزيارات الأولى قصيرة وممتعة، فيكبر الأطفال وهم مرتاحون عند طبيب الأسنان، لا خائفون منه.' } },
      { v: 'Family calendar graphic: the child’s check-ups appear next to the parents’.', who: 'doctor',
        os: { en: 'The whole family’s check-ups on one plan', ar: 'فحوصات العائلة كلها، خطة واحدة' },
        say: { en: 'Smile Club’s Family plan puts everyone’s check-ups on one plan, so the kids’ visits happen on time.', ar: 'خطة العائلة من Smile Club تجمع فحوصات الجميع في خطة واحدة، لتتم زيارات الأطفال في موعدها.' } },
      { v: 'End card.', os: { en: 'Start early. Smile Club by Dental Nation. Message us on WhatsApp.', ar: 'ابدؤوا مبكراً لابتسامة تدوم. Smile Club من دنتال نيشن، راسلونا على واتساب.' } },
    ],
    confirm: ['Gautam to confirm the Family plan: that it is on sale now, its price, who it covers and what it includes.', 'Written parental consent for any child on camera.'],
  },

  /* ── Campaign (lane) videos ── */

  'lane-scan': {
    id: 'lane-scan', name: 'The DN Scan: see it before you start', kind: 'lane',
    audience: 'Anyone thinking about braces or aligners', need: 'Options, time and cost before committing',
    angle: 'Certainty', tier: 'The DN Scan (AED 499, deducted)',
    execution: 'Open on the 3D scan animation rotating on the clinic monitor; the doctor points at it; cost card on screen.',
    beats: [
      { v: 'The clinic monitor: a 3D scan of teeth rotating. Slow push-in.',
        os: { en: 'What if you could see your new smile before you start?', ar: 'ماذا لو رأيتم ابتسامتكم الجديدة قبل أن تبدؤوا؟', tr: 'Ya yeni gülüşünüzü başlamadan önce görebilseydiniz?' } },
      { v: 'Doctor steps in beside the monitor.', who: 'doctor',
        say: { en: 'With a 3D scan, you can.', ar: 'مع المسح ثلاثي الأبعاد، يمكنكم ذلك.', tr: 'Üç boyutlu taramayla görebilirsiniz.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'The DN Scan is a 3D scan of your teeth, a consultation with an orthodontist and a written plan: braces or aligners, and roughly how long it takes.', ar: 'The DN Scan: مسح ثلاثي الأبعاد لأسنانكم، واستشارة مع أخصائي تقويم، وخطة مكتوبة: تقويم ثابت أو شفاف، والمدة التقريبية.', tr: 'The DN Scan: dişlerinizin üç boyutlu taraması, bir ortodonti uzmanıyla görüşme ve yazılı plan; diş teli mi şeffaf plak mı, yaklaşık ne kadar sürer.' } },
      { v: 'Cost card.', who: 'doctor', priced: true,
        os: { en: 'AED 499 · fully deducted if you start treatment', ar: '499 درهماً · تُخصم بالكامل إذا بدأتم العلاج' },
        say: { en: 'It’s AED 499, and it’s fully deducted if you start treatment.', ar: 'بـ 499 درهماً، تُخصم بالكامل إذا بدأتم العلاج.' },
        alt: { say: { en: 'So you know your options before you commit to anything.', tr: 'Böylece herhangi bir karar vermeden önce seçeneklerinizi bilirsiniz.', ar: 'لتعرفوا خياراتكم قبل أي التزام.' } } },
      { v: 'End card.', os: { en: 'Book The DN Scan through the link in the ad, or message us on WhatsApp.', ar: 'احجزوا The DN Scan، الرابط في الإعلان أو راسلونا على واتساب.', tr: 'The DN Scan randevusu için reklamdaki bağlantıyı kullanın ya da WhatsApp’tan yazın.' } },
    ],
    hookB: { v: 'Patient checking their teeth in the phone’s front camera, pressing on a crooked tooth.',
      os: { en: 'Braces or aligners? How long? How much?', ar: 'تقويم ثابت أم شفاف؟ كم يستغرق؟ وكم يكلّف؟', tr: 'Diş teli mi, şeffaf plak mı? Ne kadar sürer?' } },
    confirm: ['The DN Scan is still AED 499 and fully deducted.'],
  },

  'lane-firstlook': {
    id: 'lane-firstlook', name: 'The DN First Look, what I see that you can’t', kind: 'lane',
    audience: 'Anyone overdue a check-up', need: 'Knowing where their teeth stand, with no surprises',
    angle: 'Clarity', tier: 'The DN First Look (AED 799, all-inclusive)',
    execution: 'Open on a digital X-ray lighting up on the monitor; the doctor points out what the eye cannot see; cost card.',
    beats: [
      { v: 'A digital X-ray lights up on the monitor. The doctor’s finger traces a spot.', who: 'doctor',
        os: { en: 'What your dentist sees that you can’t', ar: 'ما يراه طبيب الأسنان ولا ترونه', tr: 'Diş hekiminizin görüp sizin göremedikleriniz' },
        say: { en: 'This is what I see that you can’t.', ar: 'هذا ما أراه ولا ترونه.', tr: 'Bu, benim görüp sizin göremediğiniz şey.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Early decay, a filling starting to fail, changes in the gums. None of it hurts at first.', ar: 'تسوّس في بدايته، حشوة بدأت تتلف، تغيّرات في اللثة… لا شيء منها يؤلم في البداية.', tr: 'Başlangıçtaki çürük, eskiyen bir dolgu, diş eti değişiklikleri… Hiçbiri ilk başta ağrı yapmaz.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'The DN First Look is one visit: a full examination, digital X-rays and a professional clean.', ar: 'The DN First Look زيارة واحدة: فحص شامل وأشعة رقمية وتنظيف احترافي.', tr: 'The DN First Look tek bir ziyarettir: kapsamlı muayene, dijital röntgen ve profesyonel temizlik.' } },
      { v: 'Cost card.', who: 'doctor', priced: true,
        os: { en: 'AED 799 · all-inclusive', ar: '799 درهماً · شاملة كل شيء' },
        say: { en: 'It’s AED 799, all-inclusive, with no surprises.', ar: 'بـ 799 درهماً شاملة كل شيء، بلا مفاجآت.' },
        alt: { say: { en: 'You leave knowing exactly where your teeth stand and what, if anything, needs doing.', tr: 'Dişlerinizin durumunu ve gerekiyorsa neyin yapılması gerektiğini net olarak öğrenirsiniz.', ar: 'وتغادرون وأنتم تعرفون حالة أسنانكم تماماً، وما يحتاج إلى علاج إن وُجد.' } } },
      { v: 'End card.', os: { en: 'Book The DN First Look through the link in the ad, or message us on WhatsApp.', ar: 'احجزوا The DN First Look، الرابط في الإعلان أو راسلونا على واتساب.', tr: 'The DN First Look randevusu için reklamdaki bağlantıyı kullanın ya da WhatsApp’tan yazın.' } },
    ],
    hookB: { v: 'Doctor holds up a calendar page, flipping back through the months.', who: 'doctor',
      os: { en: 'Can’t remember your last check-up?', ar: 'لا تتذكّرون آخر فحص؟', tr: 'Son kontrolünüzü hatırlamıyor musunuz?' },
      say: { en: 'Can’t remember your last check-up? Start here.', ar: 'لا تتذكّرون آخر فحص؟ ابدؤوا من هنا.', tr: 'Son kontrolünüzü hatırlamıyor musunuz? Buradan başlayın.' } },
    confirm: ['The DN First Look is still AED 799 all-inclusive.'],
  },

  'lane-glowup': {
    id: 'lane-glowup', name: 'The DN Glow Up: keep the coffee', kind: 'lane',
    audience: 'Coffee and tea drinkers who want a brighter smile', need: 'Stained teeth, without giving up coffee',
    angle: 'An everyday comparison', tier: 'The DN Glow Up (AED 1,699, all-inclusive)',
    execution: 'Montage of coffee cups stacking up with a counter on screen; the doctor with a shade guide; price card.',
    beats: [
      { v: 'Coffee cups stack up on a counter, fast. On-screen counter rolls up.', who: 'vo',
        os: { en: '2 coffees a day × 365 = 730 cups a year', ar: 'قهوتان يومياً × 365 = 730 فنجاناً في السنة', tr: 'Günde 2 kahve × 365 = yılda 730 fincan' },
        say: { en: 'Two coffees a day… that’s over seven hundred cups a year.', ar: 'قهوتان في اليوم… أي أكثر من سبعمئة فنجان في السنة.', tr: 'Günde iki kahve… yılda yedi yüzden fazla fincan eder.' } },
      { v: 'Doctor holding a shade guide up to the camera.', who: 'doctor',
        say: { en: 'Your teeth notice. Most staining sits in the outer layer of the tooth, which is why professional whitening works.', ar: 'وأسنانكم تلاحظ ذلك. معظم التصبّغات في الطبقة الخارجية، ولهذا ينجح التبييض الاحترافي.', tr: 'Dişleriniz bunu fark eder. Renklenmelerin çoğu dış katmandadır; profesyonel beyazlatmanın işe yaramasının nedeni budur.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'The DN Glow Up is professional Zoom whitening, supervised by a dentist, in about an hour. We check first that it’s right for you.', ar: 'The DN Glow Up تبييض احترافي بتقنية Zoom بإشراف طبيب، في نحو ساعة، ونتأكّد أولاً من أنه مناسب لكم.', tr: 'The DN Glow Up, diş hekimi gözetiminde yaklaşık bir saat süren profesyonel Zoom beyazlatmadır; önce size uygun olup olmadığını kontrol ederiz.' } },
      { v: 'Price card.', priced: true, os: { en: 'AED 1,699 · all-inclusive', ar: '1,699 درهماً · شاملة كل شيء' } },
      { v: 'End card.', os: { en: 'Keep the coffee. Brighten the smile. Book The DN Glow Up through the link in the ad or on WhatsApp.', ar: 'احتفظوا بقهوتكم، وأشرقوا بابتسامتكم. احجزوا The DN Glow Up، الرابط في الإعلان أو واتساب.', tr: 'Kahveden vazgeçmeyin, gülüşünüzü aydınlatın. The DN Glow Up için reklamdaki bağlantıyı kullanın ya da WhatsApp’tan yazın.' } },
    ],
    confirm: ['The DN Glow Up is still AED 1,699 all-inclusive.'],
  },

  'lane-sos': {
    id: 'lane-sos', name: 'Urgent care: pain never books an appointment', kind: 'lane',
    audience: 'Anyone with sudden dental pain', need: 'Be seen fast, and know the cost up front',
    angle: 'Speed and a known price', tier: 'DN SOS (AED 699, all-inclusive)',
    execution: 'Morning-rush scene with an extra: clock on the phone, a big meeting in the calendar, a hand to the jaw; the doctor, calm and fast; tap-to-call end card.',
    beats: [
      { v: 'Phone clock 8:40 am; calendar shows “Big meeting 10:00”. Hand goes to the jaw.',
        os: { en: '8:40 am. Big meeting at 10. And this.', ar: '8:40 صباحاً. اجتماع مهم في العاشرة. وهذا الألم.', tr: 'Saat 08:40. Saat 10’da önemli toplantı. Ve bu ağrı.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'Dental pain never books an appointment.', ar: 'ألم الأسنان لا يحجز موعداً مسبقاً.', tr: 'Diş ağrısı randevu alarak gelmez.' } },
      { v: 'Doctor to camera.', who: 'doctor',
        say: { en: 'With Dental Nation’s urgent dental care, you’re seen within 60 minutes, at Al Maher Medical Centre.', ar: 'مع العناية العاجلة بالأسنان من دنتال نيشن، تُجرى المعاينة خلال 60 دقيقة في مركز الماهر الطبي.', tr: 'Dental Nation acil diş bakımında Al Maher Medical Centre’da 60 dakika içinde muayene olursunuz.' } },
      { v: 'Price card.', who: 'doctor', priced: true,
        os: { en: 'Seen within 60 minutes · AED 699 all-inclusive', ar: 'معاينة خلال 60 دقيقة · 699 درهماً شاملة كل شيء' },
        say: { en: 'It’s AED 699, all-inclusive. You know the price before you arrive.', ar: 'بـ 699 درهماً شاملة كل شيء، وتعرفون السعر قبل الوصول.' } },
      { v: 'End card with a call button.', os: { en: 'Tap to call now. Urgent dental care, seen within 60 minutes.', ar: 'اضغطوا للاتصال الآن، عناية عاجلة ومعاينة خلال 60 دقيقة.', tr: 'Hemen arayın. Acil diş bakımı, 60 dakika içinde muayene.' } },
    ],
    confirm: ['DN SOS price AED 699 and the 60-minute promise hold during the hours the ad runs (Al Maher Medical Centre opening hours).'],
  },
};

/** Which story each doctor films — different stories, matched to specialty, clinic and audience. */
export const CASTING: Record<string, { club: string; lane?: string; hookB?: boolean; why: string }> = {
  // Al Wasl
  'hasna-alsaeed': { club: 'braces', lane: 'tooold', why: 'Consultant orthodontist: the cost question every braces patient asks, then adults who think it is too late. Her first story already sells The DN Scan, so she does not film the Scan ad.' },
  'yasmin-youssef': { club: 'braces', lane: 'lane-scan', hookB: true, why: 'Orthodontist: Video 1 is already filmed; on Sunday she films The DN Scan ad with the second opening.' },
  'safwan-sultan': { club: 'subscriptions', lane: 'lane-firstlook', why: 'General dentist: the affordability story and Al Wasl’s First Look ad.' },
  'chahira-berlarbi': { club: 'postponer', lane: 'honest', why: 'General dentist: the busy professional who keeps rescheduling, and the way back after a long gap.' },
  'ali-ghasemi': { club: 'bigday', lane: 'lane-glowup', why: 'Hygienist: cleanings before the big day, and whitening.' },
  'ghada-hussain': { club: 'family', lane: 'firstvisit', why: 'Children’s dentist: the family story, and when a child should first see a dentist.' },
  'mohammad-qasem': { club: 'gums', lane: 'toothache', why: 'Periodontist: bleeding gums, and why waiting for pain costs more.' },
  // Al Maher Medical Centre
  'maher-selman': { club: 'toothache', lane: 'lane-sos', why: 'Endodontist: he sees what waiting for the toothache costs. Also the urgent care ad.' },
  'suzanna-almaali': { club: 'tooold', lane: 'lane-scan', hookB: true, why: 'Specialist orthodontist: adults who think they are too old for braces, and The DN Scan ad.' },
  'leila-mostawe': { club: 'honest', lane: 'lane-firstlook', why: 'General dentist: the judgement-free way back, and Al Maher’s First Look ad.' },
  // Dr. Tosun Dental Clinic — no prices
  'yahya-tosun': { club: 'tooold', lane: 'lane-scan', why: 'Specialist orthodontist: adults and aligners, and The DN Scan ad (no prices).' },
  'dilsad-ozdogan': { club: 'bigday', lane: 'lane-glowup', why: 'Glow Up doctor: the big day, and whitening (no prices).' },
  'bulent-ozdogan': { club: 'toothache', lane: 'lane-firstlook', why: 'General dentist: prevention before pain, and the clinic’s First Look ad in Turkish (no prices).' },
  'sevinc-behruzoglu': { club: 'postponer', lane: 'family', why: 'General dentist: the postponer and the family story, for Turkish-speaking patients (no prices).' },
  'maysoon-abdelmajeed': { club: 'honest', lane: 'subscriptions', why: 'General dentist: the way back after a long gap, and planned care, for Arabic-speaking patients (no prices).' },
  'maysoun-ahmad': { club: 'family', lane: 'postponer', why: 'General dentist: the family story and the postponer, for Arabic-speaking patients (no prices).' },
  'sathyapriya-surendar': { club: 'gums', lane: 'bigday', why: 'Periodontist: gums and prevention, and cleanings before the big day, for English-speaking patients (no prices).' },
};

/** What the second video is: a campaign ad, or a second Smile Club story. */
export function video2(id: string): { name: string; story: boolean } | null {
  const c = CASTING[id]?.lane ? CONCEPTS[CASTING[id].lane!] : null;
  return c ? { name: c.kind === 'club' ? `Smile Club story 2, ${c.name}` : c.name, story: c.kind === 'club' } : null;
}

const LBL: Record<Lang, { os: string; doctor: string; vo: string; card: string; missing: string }> = {
  en: { os: 'ON SCREEN', doctor: 'DOCTOR', vo: 'VOICE-OVER', card: 'Name card', missing: '' },
  tr: { os: 'EKRANDA', doctor: 'HEKİM', vo: 'DIŞ SES', card: 'İsim kartı', missing: '[TR. İngilizce metin, çeviri gelecek] ' },
  ar: { os: 'على الشاشة', doctor: 'الطبيب', vo: 'تعليق صوتي', card: 'بطاقة الاسم', missing: '[النص بالإنجليزية، الترجمة لاحقاً] ' },
};

const pick = (l: L | undefined, lang: Lang) => (l ? l[lang] ?? (l.en ? `${LBL[lang].missing}${l.en}` : undefined) : undefined);

/** A concept as a shooting script in one language, for one doctor. */
export function renderConcept(c: Concept, lang: Lang, doctor: { name: string; title: string; where: string }, noPrices: boolean, useHookB = false): string {
  const L = LBL[lang];
  const beats = [...c.beats];
  if (useHookB && c.hookB) beats[0] = c.hookB;
  const out: string[] = [`[${c.name} · for: ${c.audience} · need: ${c.need} · angle: ${c.angle}${noPrices ? '' : ` · tier: ${c.tier}`}]`];
  let first = true;
  for (const b of beats) {
    let os = b.os, say = b.say;
    let v = b.v;
    if (b.priced && noPrices) {
      if (!b.alt) continue;
      os = b.alt.os; say = b.alt.say; v = 'Doctor to camera.';
    }
    out.push(`[${v}]`);
    const o = pick(os, lang);
    if (o) out.push(`[${L.os}: ${o}]`);
    if (first && b.who === 'doctor') { out.push(`[${L.card}: ${doctor.name}, ${doctor.title}${lang === 'ar' ? ', ' : ', '}${doctor.where}]`); first = false; }
    const s = pick(say, lang);
    if (s) out.push(`${b.who === 'vo' ? L.vo : L.doctor}: ${s}`);
  }
  return out.join('\n');
}
