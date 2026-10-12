import { useEffect, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import { uiClass } from './classes';
import { guideEvidence, type GuideStep } from './demoStory';
import type { Signal } from './catalogue';
import type { Presentation } from './presentation';

type Point = { x: number; y: number };
type FocusPosition = { start: Point; end: Point };
export function GuidedDemo({ steps, index, context, signals, ready, activeView, searchError, busy, agentHasActivity, onStep, onExit, onRestart, onRetry, onExport }: {
  steps: GuideStep[]; index: number; context: Presentation; signals: Signal[];
  ready: boolean; activeView: string; searchError: string; busy: boolean; agentHasActivity: boolean;
  onStep: (index: number) => void; onExit: () => void; onRestart: () => void; onRetry: () => void; onExport: () => void;
}) {
  const step = steps[index];
  const activeTarget = step.id === 'assistant' && agentHasActivity ? 'assistant-activity' : step.target;
  const card = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [position, setPosition] = useState<FocusPosition | null>(null);
  const [found, setFound] = useState(false);
  const [reveal, setReveal] = useState(0);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    setPosition(null); setFound(false);
    if (!ready) return;
    const target = document.querySelector<HTMLElement>('#facility-operations-root [data-demo-target="' + CSS.escape(activeTarget) + '"]');
    if (!target) return;
    setFound(true);
    target.classList.add('fo-guide-highlight');
    const previousDescription = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', [previousDescription, 'guided-demo-description'].filter(Boolean).join(' '));
    const canvas = document.getElementById('facility-operations-main');
    if (canvas) canvas.scrollTo({ top: canvas.scrollTop + target.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 24, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!card.current) return;
        const focus = target.getBoundingClientRect();
        const coach = card.current.getBoundingClientRect();
        if (window.innerWidth < 800 || focus.bottom < 70 || focus.top > window.innerHeight - 80) { setPosition(null); return; }
        const end = { x: Math.min(window.innerWidth - 22, focus.right - 12), y: Math.max(90, Math.min(coach.top - 24, focus.top + Math.min(focus.height / 2, 100))) };
        setPosition({ start: { x: coach.right - 24, y: coach.top - 6 }, end });
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(target); if (card.current) observer.observe(card.current);
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update);
      target.classList.remove('fo-guide-highlight');
      if (previousDescription === null) target.removeAttribute('aria-describedby'); else target.setAttribute('aria-describedby', previousDescription);
    };
  }, [index, activeTarget, ready, activeView, reveal]);
  const evidence = ready ? guideEvidence(step, signals, context) : [];
  return <>
    {position && <svg className={uiClass('guide-arrow')} aria-hidden="true"><defs><marker id="fo-guide-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#137c8b" /></marker></defs><path d={'M' + position.start.x + ',' + position.start.y + ' C' + position.start.x + ',' + (position.start.y - 50) + ' ' + position.end.x + ',' + (position.end.y + 50) + ' ' + position.end.x + ',' + position.end.y} markerEnd="url(#fo-guide-arrowhead)" /></svg>}
    <aside ref={card} className={uiClass('guided-demo')} aria-label="Guided demo controls" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onExit(); } }}>
      <div className={uiClass('guide-topline')}><span role="status">GUIDED STORY · STEP {index + 1} OF {steps.length}</span><Button appearance="subtle" onClick={onExit}>Exit guide</Button></div>
      <nav aria-label="Guided story steps">{steps.map((item, at) => <button key={item.id} aria-label={'Step ' + (at + 1) + ': ' + item.label} aria-current={at === index ? 'step' : undefined} disabled={busy || !ready} onClick={() => onStep(at)}>{at + 1}</button>)}</nav>
      <h2 ref={heading} tabIndex={-1}>{step.title}</h2>
      <div className={uiClass('guide-body')}>
        {!ready ? <div className={uiClass('guide-wait')}><p role={searchError ? 'alert' : 'status'}>{searchError ? 'This stage could not load. Retry its search or exit the guide.' : 'Loading this stage’s evidence… Complete stage evidence is required before advancing.'}</p><Button appearance="subtle" onClick={onRetry}>Retry stage search</Button></div> : <ul aria-label="Evidence for this step">{evidence.map(item => <li key={item}>{item}</li>)}</ul>}
        {busy && <p role="status">The investigation is running. Wait for the answer or use Stop before changing steps.</p>}
        <p id="guided-demo-description">{step.summary}</p><details><summary>Presenter notes</summary><p>{step.explanation}</p></details>
      </div>
      {ready && <Button appearance="subtle" onClick={() => { onStep(index); setReveal(value => value + 1); }}>{found ? 'Show highlighted evidence' : 'Return to this step'}</Button>}
      <div className={uiClass('guide-navigation')}><Button disabled={index === 0 || busy || !ready} onClick={() => onStep(index - 1)}>Back</Button><Button appearance="primary" disabled={busy || !ready} onClick={() => index === steps.length - 1 ? onExit() : onStep(index + 1)}>{index === steps.length - 1 ? 'Finish walkthrough' : 'Next: ' + steps[index + 1].label}</Button></div>
      {index === steps.length - 1 && <div className={uiClass('guide-completion')}><Button disabled={!ready} onClick={onExport}>Download story evidence</Button><Button appearance="subtle" onClick={onRestart}>Restart story</Button></div>}
    </aside>
  </>;
}
