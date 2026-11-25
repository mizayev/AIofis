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

## Papkalar

```
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

Skelet: soxta AI, soxta Instagram statistikasi, xotiradagi vazifalar taxtasi.
Keyingi qadamlar (har biri sizning tasdig'ingiz bilan): haqiqiy AI → doimiy ma'lumotlar bazasi → login bilan CEO veb-qutisi → Instagram statistikasi.
