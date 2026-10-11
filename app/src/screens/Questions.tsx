import { FAQS, FAQ_CATS } from "../domain/content";
import { useApp } from "../state/store";

export function Questions() {
  const { ui, setUi, goTab } = useApp();
  const faq = ui.faqOpen !== null ? FAQS[ui.faqOpen] : null;

  if (faq) {
    return (
      <div className="pad">
        <button type="button" className="btn-back" onClick={() => setUi({ faqOpen: null })}>
          ← All questions
        </button>
        <div className="kicker-sm" style={{ marginBottom: 8 }}>
          {faq.cat}
        </div>
        <h2 className="h2" style={{ fontSize: 25, lineHeight: 1.1, marginBottom: 14 }}>
          {faq.q}
        </h2>
        <div className="rule mb-16" />
        <p className="mb-16" style={{ fontSize: 14, lineHeight: 1.55 }}>
          {faq.a}
        </p>
        <div className="focus-box mb-16" style={{ display: "block", fontSize: 13, lineHeight: 1.5, fontWeight: 400 }}>
          <strong>Usually expected: </strong>
          {faq.e}
        </div>
        <div className="card-red" style={{ padding: 14, fontSize: 13, lineHeight: 1.5, color: "var(--color-accent-800)", fontWeight: 600 }}>
          {faq.h}
        </div>
        <button type="button" className="btn btn-red btn-sm mt-16" onClick={() => goTab("emergency")}>
          Open emergency instructions
        </button>
      </div>
    );
  }

  const q = ui.faqQuery.trim().toLowerCase();
  const list = FAQS.map((f, i) => ({ f, i })).filter(
    ({ f }) => (ui.faqCat === "All" || f.cat === ui.faqCat) && (!q || (f.q + " " + f.a).toLowerCase().includes(q)),
  );

  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <label className="sr-only" htmlFor="faq-search">
          Search questions
        </label>
        <input id="faq-search" type="search" className="input" value={ui.faqQuery} onChange={(e) => setUi({ faqQuery: e.target.value })} placeholder="Search questions" />
      </div>
      <div className="cat-chips">
        {FAQ_CATS.map((c) => (
          <button key={c} type="button" className={"chip" + (ui.faqCat === c ? " on" : "")} aria-pressed={ui.faqCat === c} onClick={() => setUi({ faqCat: c })}>
            {c}
          </button>
        ))}
      </div>
      <div className="list">
        {list.map(({ f, i }) => (
          <button key={f.q} type="button" className="faq-row" onClick={() => setUi({ faqOpen: i })}>
            <span className="stack" style={{ gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: f.cat === "Bleeding" ? "var(--color-accent)" : "var(--color-neutral-700)",
                }}
              >
                {f.cat}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{f.q}</span>
            </span>
            <span style={{ flex: "none", fontSize: 16, fontWeight: 800, opacity: 0.4 }} aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 && (
        <div style={{ padding: "24px 16px", fontSize: 13.5, lineHeight: 1.5 }}>
          No questions match that search. If you are worried about your child, contact your treating team — or use SOS for bleeding.
        </div>
      )}
    </>
  );
}
