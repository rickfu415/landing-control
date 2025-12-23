# Internationalization (i18n)

This directory contains the internationalization setup for the Falcon Lander application.

## Supported Languages

- **English (en)** - Default language
- **中文 (zh)** - Chinese

## Files

- `translations.js` - Contains all translation strings for both languages

## Usage

### In Components

```javascript
import useLanguageStore from '../stores/languageStore'
import { useTranslation } from '../i18n/translations'

function MyComponent() {
  const { language } = useLanguageStore()
  const t = useTranslation(language)
  
  return <div>{t.menu.title}</div>
}
```

### Language Selector

The `LanguageSelector` component is displayed in the top-right corner of the app and allows users to switch between English and Chinese. The selected language is persisted in localStorage.

## Adding New Translations

1. Open `translations.js`
2. Add your new key-value pairs to both `en` and `zh` objects
3. Use the translation in your component with `t.yourKey.subKey`

## Translation Structure

```javascript
{
  en: {
    menu: { ... },
    hud: { ... },
    controls: { ... },
    gameOver: { ... },
    connection: { ... }
  },
  zh: {
    menu: { ... },
    hud: { ... },
    controls: { ... },
    gameOver: { ... },
    connection: { ... }
  }
}
```

