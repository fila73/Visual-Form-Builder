# Best Practices pro implementaci podpory více jazyků (i18n)

Tento dokument popisuje doporučené postupy pro implementaci vícejazyčnosti v moderních webových aplikacích (React).

## 1. Externalizace textů
Všechny texty, které vidí uživatel, by měly být odděleny od kódu.
- **NE:** `<button>Uložit</button>`
- **ANO:** `<button>{t('btn.save')}</button>`

Texty ukládejte do strukturovaných souborů (JSON, YAML, JS objekty), jeden soubor pro každý jazyk.
Příklad struktury:
```
/src/locales/
  cs.json
  en.json
```

## 2. Použití klíčů
Používejte hierarchické klíče, které popisují kontext.
- `btn.save` (tlačítko uložit)
- `msg.success` (zpráva o úspěchu)
- `settings.language` (nastavení jazyka)

## 3. Interpolace (Parametry)
Texty často obsahují proměnné hodnoty. Nepoužívejte spojování řetězců v kódu.
- **NE:** `t('hello') + ' ' + name`
- **ANO:** `t('hello', { name: name })`
- V překladu: `"hello": "Ahoj {name}"`

## 4. Správa stavu (Context)
Použijte React Context (nebo state management knihovnu) pro uložení aktuálně zvoleného jazyka.
- Změna jazyka by měla okamžitě překreslit celou aplikaci.
- Vytvořte `LanguageProvider`, který obalí celou aplikaci.
- Vytvořte hook `useTranslation` (nebo `useLanguage`), který zpřístupní funkci `t` a aktuální jazyk komponentám.

## 5. Detekce jazyka
Při prvním načtení aplikace se pokuste detekovat preferovaný jazyk uživatele z prohlížeče (`navigator.language`) a nastavte jej jako výchozí, pokud je podporován.

## 6. Fallback (Záložní jazyk)
Vždy mějte definovaný záložní jazyk (např. angličtinu). Pokud překlad pro daný klíč v aktuálním jazyce chybí, zobrazte text ze záložního jazyka nebo samotný klíč, aby aplikace nespadla.

## 7. Knihovny
Pro produkční a rozsáhlé aplikace zvažte použití ověřených knihoven, které řeší složitější problémy (množná čísla, formátování dat a měn, lazy loading):
- **react-i18next**: Standard v React světě, velmi robustní.
- **react-intl**: Zaměřuje se na formátování (čísla, data).

## 8. Formátování
Datum, čas a čísla se v různých jazycích liší. Používejte `Intl.DateTimeFormat` a `Intl.NumberFormat` nebo pomocné knihovny, které berou v úvahu aktuální locale.

## 9. Type Safety (TypeScript)
Pokud používáte TypeScript, definujte typy pro vaše klíče, abyste předešli překlepům a zajistili, že všechny klíče mají překlad.
