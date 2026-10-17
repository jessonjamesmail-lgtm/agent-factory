import os, json, pathlib
from datetime import datetime, timezone
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("GEMINI_API_KEY"), # This grabs your GitHub Secret key automatically!
)

APP_ROOT = pathlib.Path("./output_app")
REGISTRY_PATH = APP_ROOT / "tools_registry.json"
STRIPE_PAYMENT_LINK = "https://buy.stripe.com/YOUR_LIVE_STRIPE_LINK"

AGENTS = {
    "1_orchestrator": ("deepseek/deepseek-chat", "You are Agent 1 (Orchestrator). Ensure the tool spec is 100% stateless and requires zero database."),
    "2_seo_scout": ("deepseek/deepseek-chat", "You are Agent 2 (SEO Scout). Output ONE high-traffic, low-competition micro-tool niche (calculator, converter, formatter). Do NOT repeat existing slugs."),
    "3_pm_spec": ("deepseek/deepseek-chat", "You are Agent 3 (PM). Turn the SEO niche into a strict functional specification for a single-page web tool."),
    "4_architect": ("deepseek/deepseek-chat", "You are Agent 4 (Architect). Define component state, inputs, outputs, and edge cases."),
    "5_algo_designer": ("deepseek/deepseek-chat", "You are Agent 5 (Algorithm Designer). Write exact formulas and transformation logic."),
    "6_ui_designer": ("deepseek/deepseek-chat", "You are Agent 6 (UI/UX). Specify a clean dark-mode Tailwind CSS layout with a '← Back to All Tools' link to `/`."),
    "7_frontend_lead": ("deepseek/deepseek-chat", "You are Agent 7 (Frontend Lead). Write a complete Next.js App Router React page (`page.tsx`) using `'use client'` and Tailwind CSS. No external icon libraries. Write 100% working code."),
    "8_api_lead": ("deepseek/deepseek-chat", "You are Agent 8 (API Lead). Write a matching Next.js API route (`route.ts`) exporting `POST` using `NextResponse`."),
    "9_monetization": ("deepseek/deepseek-chat", f"You are Agent 9 (Monetization). Inject a localStorage freemium gate (3 free uses in `micro_tools_uses`, unless `micro_tools_pro` is 'true', then show modal linking to {STRIPE_PAYMENT_LINK}) and AdSense slots. Return ONLY valid TSX code."),
    "10_seo_writer": ("deepseek/deepseek-chat", "You are Agent 10 (SEO). Add an FAQ section and JSON-LD schema inside the React component. Return ONLY the complete TSX code."),
    "11_qa_tester": ("deepseek/deepseek-chat", "You are Agent 11 (QA). Check for syntax or TypeScript errors. Output 'PASS' if flawless, or list bugs."),
    "12_security": ("deepseek/deepseek-chat", "You are Agent 12 (Security). Check for XSS or unsafe eval. Output 'PASS' or list issues."),
    "13_debugger": ("deepseek/deepseek-chat", "You are Agent 13 (Debugger). Fix all reported bugs and return ONLY the complete TSX code inside a ```tsx codeblock."),
    "14_devops": ("deepseek/deepseek-chat", "You are Agent 14 (DevOps). Output ONLY raw JSON with keys: `slug` (lowercase hyphenated), `title`, `tagline`, and `category`."),
    "15_growth_copy": ("deepseek/deepseek-chat", "You are Agent 15 (Growth). Write a launch tweet and Reddit post.")
}

from openai import OpenAI
import os

# Initialize OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("GEMINI_API_KEY"),
)

def ask_agent(agent_id: str, prompt: str) -> str:
    model_name, sys_inst = AGENTS[agent_id]
    print(f"🤖 Running {agent_id}...")
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": sys_inst},
            {"role": "user", "content": prompt}
        ],
        extra_headers={
            "HTTP-Referer": "https://github.com/jessonjamesmail-lgtm/agent-factory",
            "X-Title": "Agent Factory",
        }
    )
    return response.choices[0].message.content.strip()
    
    

def extract_code(text: str) -> str:
    ticks = chr(96) * 3
    if ticks in text:
        for part in text.split(ticks)[1::2]:
            lines = part.splitlines()
            return "\n".join(lines[1:]).strip() if lines and lines[0].strip().isalpha() else part.strip()
    return text.strip()

def update_homepage(registry: list):
    reg_json = json.dumps(registry, indent=2)
    lines = [
        "import Link from 'next/link';",
        f"const TOOLS = {reg_json};",
        "export default function HomePage() {",
        "  return (",
        '    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">',
        '      <div className="max-w-6xl mx-auto">',
        '        <header className="text-center mb-14">',
        '          <h1 className="text-4xl font-extrabold mb-3">Free Instant Web Utilities ({TOOLS.length} Live)</h1>',
        '          <p className="text-slate-400">Fast, browser-based calculators, formatters, and converters.</p>',
        '        </header>',
        '        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">',
        '          {TOOLS.map((t: any) => (',
        '            <Link className="block p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-2xl" href="{`/tools/${t.slug}`}" key="{t.slug}">',
        '              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-indigo-300">{t.category}</span>',
        '              <h2 className="text-xl font-bold text-white mt-3 mb-2">{t.title} →</h2>',
        '              <p className="text-sm text-slate-400">{t.tagline}</p>',
        '            </Link>',
        '          ))}',
        '        </div>',
        '      </div>',
        '    </main>',
        '  );',
        '}'
    ]
    (APP_ROOT / "app" / "page.tsx").write_text("\n".join(lines), encoding="utf-8")

def run():
    reg = json.loads(REGISTRY_PATH.read_text()) if REGISTRY_PATH.exists() else []
    niche = ask_agent("2_seo_scout", f"Avoid existing slugs: {[t['slug'] for t in reg]}")
    spec = ask_agent("1_orchestrator", ask_agent("3_pm_spec", niche))
    arch = ask_agent("4_architect", spec)
    algo = ask_agent("5_algo_designer", arch)
    ui = ask_agent("6_ui_designer", arch)
    code = ask_agent("7_frontend_lead", f"Spec: {arch} | Algo: {algo} | UI: {ui}")
    api = ask_agent("8_api_lead", algo)
    code = ask_agent("10_seo_writer", ask_agent("9_monetization", code))
    qa, sec = ask_agent("11_qa_tester", code), ask_agent("12_security", code)
    if "PASS" not in qa.upper() or "PASS" not in sec.upper():
        code = ask_agent("13_debugger", f"Code: {code} | QA: {qa} | Sec: {sec}")
    try:
        meta = json.loads(extract_code(ask_agent("14_devops", niche)))
    except Exception:
        meta = {"slug": f"tool-{len(reg)+1}", "title": "Web Tool", "tagline": "Instant utility.", "category": "Tool"}
    slug = meta["slug"].strip().lower()
    meta["slug"], meta["created_at"] = slug, datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out, api_dir = APP_ROOT / "app" / "tools" / slug, APP_ROOT / "app" / "api" / slug
    out.mkdir(parents=True, exist_ok=True); api_dir.mkdir(parents=True, exist_ok=True)
    (out / "page.tsx").write_text(extract_code(code), encoding="utf-8")
    (api_dir / "route.ts").write_text(extract_code(api), encoding="utf-8")
    (out / "launch_copy.md").write_text(ask_agent("15_growth_copy", niche), encoding="utf-8")
    reg = [t for t in reg if t["slug"] != slug]
    reg.insert(0, meta)
    REGISTRY_PATH.write_text(json.dumps(reg, indent=2), encoding="utf-8")
    update_homepage(reg)
    print(f"🚀 Built: {meta['title']}")

if __name__ == "__main__":
    run()
