import { useEffect, useState } from 'react';
import { themeCssVars } from '../../theme.js';
import { article, lede, questions, verdict } from './reportContent.js';
import ArticleHeader from './ArticleHeader.jsx';
import Lede from './Lede.jsx';
import QuickNav from './QuickNav.jsx';
import ArticleSection from './ArticleSection.jsx';
import Conclusion from './Conclusion.jsx';
import ReportFooter from './ReportFooter.jsx';
import styles from './Report.module.css';

const VERDICT_ID = 'verdict';

const NAV_ITEMS = [
  ...questions.map((q) => ({ id: q.id, number: q.number, label: q.railLabel })),
  { id: VERDICT_ID, number: verdict.number, label: verdict.railLabel },
];

const SECTION_IDS = NAV_ITEMS.map((item) => item.id);

/**
 * The whole app: one continuous scrolling article. No router — the five
 * sections and the verdict are anchors inside a single component tree, reached
 * by the sticky "In this piece" rail.
 */
function ReportView() {
  const [activeId, setActiveId] = useState(SECTION_IDS[0]);

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleJump = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  return (
    <div className={styles.page} style={themeCssVars}>
      <a className={styles.skipLink} href="#q1">
        Skip to the analysis
      </a>

      <div className={styles.shell}>
        <QuickNav items={NAV_ITEMS} activeId={activeId} onJump={handleJump} />

        <article className={styles.article}>
          <ArticleHeader article={article} />
          <Lede paragraphs={lede} />

          {questions.map((q) => (
            <ArticleSection
              key={q.id}
              id={q.id}
              number={q.number}
              subhead={q.subhead}
              image={q.image}
              leadIn={q.leadIn}
              caption={q.caption}
              analysis={q.analysis}
              Visual={q.Visual}
            />
          ))}

          <Conclusion id={VERDICT_ID} verdict={verdict} />
          <ReportFooter meta={article.byline} />
        </article>
      </div>
    </div>
  );
}

export default ReportView;
