

## Plan: Terms of Service and Privacy Policy Pages

### New Files

**1. `src/pages/TermsOfService.tsx`**
- Static public page with full Terms of Service content (provided by user)
- Layout: creme background, `max-w-4xl mx-auto`, `px-6 py-12`
- Header: RhitmoLogo linking to `/`, "← Voltar" button linking to `/`
- Footer: links to both legal pages + copyright
- All content rendered as styled JSX (headings, paragraphs, lists)

**2. `src/pages/PrivacyPolicy.tsx`**
- Same layout/structure as Terms page
- Full Privacy Policy content (provided by user)

### Modified Files

**3. `src/App.tsx`**
- Add two new public routes: `/terms-of-service` and `/privacy-policy`

**4. `src/pages/Landing.tsx`**
- Add legal links (Termos de Serviço | Política de Privacidade) in footer before copyright
- Update copyright year to 2026
- Add i18n entries for both languages

### Shared Layout
Both legal pages will use a common structure with:
- Dark mode support via existing theme system
- Mobile-friendly responsive layout
- `mailto:support@rhitmo.co` links rendered as clickable `<a>` tags
- External link to ANPD website in privacy policy

