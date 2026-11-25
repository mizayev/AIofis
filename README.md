# AI OFFICE

Instagram uchun kontent tayyorlaydigan, **6 ta mustaqil AI agentdan** iborat marketing ofisi.
Kontentni **faqat CEO (siz)** tasdiqlaydi. **Nashr o'chirilgan.**

## Agentlar

| # | Agent | Vazifasi |
|---|---|---|
| 1 | Marketing Strategist | Strategiya, auditoriya, maqsadlar, asosiy xabarlar, kontent reja |
| 2 | Copywriter | Caption, sarlavha, hook, Stories matni, Reel ssenariysi, xeshteg, CTA |
| 3 | Graphic Designer | Post, Stories va Reels uchun vizual dizayn |
| 4 | Social Media Manager | Instagram paketi, talablarni tekshirish, joylash vaqti |
| 5 | Marketing Analyst | Natijalar tahlili va keyingi strategiya uchun xulosalar |
| 6 | Quality Control Manager | Sifat, imlo, brend, aniqlik va qoidalarni tekshirish |

## Ish jarayoni

```
CEO brief → Strateg → Kopirayter → Dizayner → SMM menejer → Sifat nazorati → CEO qutisi
                ↑                                                      │
           Tahlilchi                                       rad etilsa → Kopirayter (2 martagacha)
```

Agentlar bir-biri bilan to'g'ridan-to'g'ri gaplashmaydi. Hammasi **umumiy vazifalar taxtasi** orqali ishlaydi.

## Xavfsizlik

- Tasdiqlash va rad etish faqat CEO'ga ruxsat etilgan.
- Hech bir agent tasdiqlay yoki nashr qila olmaydi.
- `PUBLISHED` holatiga hech kim o'ta olmaydi.
- `publisher.ts` har doim xato qaytaradi. `PUBLISHING_ENABLED=false`.
- Sifat nazoratidan o'tgan kontentni hech kim o'zgartira olmaydi.

Bu qoidalarni `tests/safety.test.ts` va `tests/architecture.test.ts` tekshiradi.

## Ishga tushirish (Claude Code cloud session ichida)

Claude'dan so'rang:

> `npm install` qil, keyin `npm run check` va `npm run demo` ni ishga tushir va natijani o'zbekcha tushuntir.

## Ilova (iPhone)

`app/` papkasida iPhone'da ilova kabi ochiladigan veb-ilova bor (Next.js + Tailwind + shadcn/ui, PWA).
Hozircha unda faqat xush kelibsiz ekrani bor: AI, ma'lumotlar bazasi, login va Instagram yo'q.

Claude'dan so'rang:

> `npm run build` va `npm run dev` ni ishga tushir va iPhone o'lchamida ekran rasmini ko'rsat.

Vercel ulangandan keyin: Safari'da havolani oching → **Ulashish** → **Bosh ekranga qo'shish**.

## Papkalar

```
app/             iPhone ilovasi ekranlari va PWA sozlamalari
components/      ilova tugmalari va boshqa qismlari (shadcn/ui)
public/icons/    ilova ikonkalari
src/core/        umumiy qoidalar, vazifalar taxtasi, AI interfeysi
src/agents/      6 ta agent (har birida agent.ts, instructions.md, agent.test.ts)
src/ceo/         CEO tasdiqlash qutisi
src/publishing/  nashr (O'CHIQ)
src/dev/         test va demo uchun soxta ma'lumotlar
tests/           xavfsizlik, arxitektura, to'liq zanjir testlari
docs/            arxitektura hujjatlari
.claude/agents/  Claude Code uchun 6 ta yordamchi quruvchi
```

## Hozirgi bosqich

PDF rejasi bo'yicha **1-bosqich — iPhone'da bo'sh ilova**: kod tayyor, iPhone'dagi tekshiruv Vercel ulanishini kutmoqda.
`src/` dagi agentlar mantig'i keyingi bosqichlar uchun tayyor asos: soxta AI, soxta Instagram statistikasi, xotiradagi vazifalar taxtasi.
Keyingi bosqichlar (har biri sizning tasdig'ingiz bilan): 2 — login va Face ID → 3 — ma'lumotlar bazasi va qulflar → 4 — ekranlar → 5 — agent dvigateli …
