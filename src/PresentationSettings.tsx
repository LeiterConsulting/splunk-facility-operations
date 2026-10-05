import { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import { audiences, verticals, getVertical, getUsecase, usecasesFor } from './catalogue';
import { uiClass } from './classes';
import type { Presentation } from './presentation';

export function Picker({ label, value, options, onChange }: { label: string; value: string; options: readonly { id: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className={uiClass('picker')}><span>{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}

export function PresentationSettings({ value, onApply }: { value: Presentation; onApply: (value: Presentation) => void }) {
  const [draft, setDraft] = useState(value);
  const vertical = getVertical(draft.vertical);
  const scenario = getUsecase(draft.usecase, draft.vertical);
  const audience = audiences.find((item) => item.id === draft.audience)!;
  return <section className={uiClass('panel presentation-settings')} aria-labelledby="presentation-settings-heading">
    <div className={uiClass('panel-heading')}><div><span className={uiClass('eyebrow')}>PRESENTATION CONTEXT</span><h2 id="presentation-settings-heading">Presentation setup</h2></div></div>
    <form onSubmit={(event) => { event.preventDefault(); onApply(draft); }}>
      <div className={uiClass('presentation-fields')}>
        <p className={uiClass('panel-description')}>Choose the audience, industry and incident story before presenting. Apply them together to update the workspace. These preferences are remembered in this browser.</p>
        <Picker label="Audience" value={draft.audience} options={audiences} onChange={(audience) => setDraft({ ...draft, audience })} />
        <Picker label="Industry / vertical" value={draft.vertical} options={verticals} onChange={(vertical) => setDraft({ ...draft, vertical })} />
        <Picker label="Use case" value={draft.usecase} options={usecasesFor(draft.vertical)} onChange={(usecase) => setDraft({ ...draft, usecase })} />
        <div className={uiClass('presentation-apply')}><Button appearance="primary" type="submit">Apply presentation</Button><span>Returns to the selected audience's workspace.</span></div>
        <p className={uiClass('small-note')}>Presentation preferences are personal. Splunk roles still govern access; only an administrator can change provider connections below. In Live, the industry sets the search scope and the use case supplies illustrative runbook context.</p>
      </div>
      <aside className={uiClass('presentation-preview')} aria-label="Presentation preview">
        <span className={uiClass('eyebrow')}>YOUR PRESENTATION</span><h3>{vertical.label}</h3><p>{vertical.description}</p>
        <dl><dt>Audience question</dt><dd>{audience.question}</dd><dt>Business functions</dt><dd>{vertical.services.join(' · ')}</dd><dt>Incident story</dt><dd>{scenario.label}</dd><dt>Initial symptom</dt><dd>{scenario.symptom}</dd><dt>Decision to explore</dt><dd>{scenario.why}</dd></dl>
        <p className={uiClass('small-note')}>Demo evidence is synthetic. Scenario relationships suggest investigation paths; they do not independently prove cause.</p>
      </aside>
    </form>
  </section>;
}
