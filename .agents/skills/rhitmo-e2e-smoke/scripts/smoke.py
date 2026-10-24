import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path("/tmp/browser/smoke/shots"); SHOTS.mkdir(parents=True, exist_ok=True)
PUBLIC = ["/", "/blog", "/blog/vies-de-recencia-avaliacao-de-desempenho", "/integracoes", "/recursos", "/ferramentas/calculadora-custo-avaliacao"]
AUTH = ["/lider/inicio", "/lider/pessoas", "/lider/diario", "/lider/conectores"]
results = []

def load_session():
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        return (os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"), os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON"),
                json.loads(os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON") or "[]"))
    p = Path(os.path.expanduser("~/.cache/lovable-auth/session.json"))
    if p.exists():
        m = json.loads(p.read_text()); return m["storage_key"], json.dumps(m["session"]), m.get("cookies") or []
    return None

async def check(page, path, name, auth=False):
    errs = []
    page.on("console", lambda m: errs.append(m.text[:160]) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)[:160]))
    ok = True; note = ""
    try:
        await page.goto(BASE + path, wait_until="networkidle", timeout=30000)
        if auth:
            await page.wait_for_function("!document.querySelector('[data-loading-screen], .animate-spin')", timeout=15000)
            if "/auth" in page.url: ok, note = False, "redirecionou p/ login"
        else:
            if await page.locator("h1").count() == 0: ok, note = False, "sem H1"
        overflow = await page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
        if overflow: ok, note = False, (note + " overflow horizontal").strip()
    except Exception as e:
        ok, note = False, str(e)[:120]
    if errs: ok = False; note = (note + " console: " + errs[0]).strip()
    if not ok: await page.screenshot(path=str(SHOTS / f"{name}.png"))
    results.append(("✅" if ok else "❌", path, note))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800}, locale="pt-BR")
        for i, r in enumerate(PUBLIC):
            pg = await ctx.new_page(); await check(pg, r, f"pub{i}"); await pg.close()
        m = await b.new_context(viewport={"width": 492, "height": 835}, locale="pt-BR")
        pg = await m.new_page()
        try:
            await pg.goto(BASE + "/", wait_until="networkidle")
            await pg.get_by_label("Menu").first.click()
            await pg.get_by_role("link", name="Como funciona").first.click()
            await pg.wait_for_timeout(1200)
            y = await pg.evaluate("window.scrollY")
            results.append(("✅" if y > 200 else "❌", "mobile menu → Como funciona", f"scrollY={y}"))
        except Exception as e:
            await pg.screenshot(path=str(SHOTS / "mobile.png")); results.append(("❌", "mobile menu", str(e)[:120]))
        s = load_session()
        if s:
            key, sess, cookies = s
            actx = await b.new_context(viewport={"width": 1280, "height": 1800}, locale="pt-BR")
            if cookies: await actx.add_cookies([{**c, "url": BASE} for c in cookies])
            pg = await actx.new_page(); await pg.goto(BASE)
            await pg.evaluate("([k, v]) => window.localStorage.setItem(k, v)", [key, sess]); await pg.close()
            for i, r in enumerate(AUTH):
                pg = await actx.new_page(); await check(pg, r, f"auth{i}", auth=True); await pg.close()
        else:
            results.append(("⚠️", "rotas autenticadas", "sem sessão; pulado"))
        await b.close()
    for st, path, note in results: print(f"{st} {path} {note}")

asyncio.run(main())
