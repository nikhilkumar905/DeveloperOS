import React from 'react';
import type { IResumeProfile } from '../types/resume';
import './ResumePreview.css';

/**
 * Live preview of the classic one-page resume.
 * Mirrors fastapi-backend/services/pdf_export_service.py section for section — change both together.
 */

const dateRange = (start?: string, end?: string) => {
  const s = (start || '').trim();
  const e = (end || '').trim();
  return s && e ? `${s} – ${e}` : s || e;
};

const has = (value?: string) => !!value && value.trim().length > 0;

const Row: React.FC<{ left: React.ReactNode; right?: React.ReactNode }> = ({ left, right }) => (
  <div className="rp-row">
    <span className="rp-row-left">{left}</span>
    {right ? <span className="rp-row-right">{right}</span> : null}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rp-section">
    <h3 className="rp-heading">{title.toUpperCase()}</h3>
    {children}
  </section>
);

const Link: React.FC<{ href?: string; children: React.ReactNode }> = ({ href, children }) =>
  has(href) ? <a href={href!.trim()} target="_blank" rel="noopener noreferrer">{children}</a> : <>{children}</>;

const ResumePreview: React.FC<{ profile: IResumeProfile }> = ({ profile }) => {
  const pi = profile.personalInfo || ({} as IResumeProfile['personalInfo']);

  const contactLines: Array<Array<[string, string]>> = [
    [['Email', pi.email], ['Phone', pi.phone]],
    [['LinkedIn', pi.linkedinUrl], ['GitHub', pi.githubUrl]],
    [['Location', pi.location]],
    [['Portfolio', pi.websiteUrl], ...(pi.customLinks || []).map(l => [l.label, l.url] as [string, string])],
  ].map(line => line.filter(([label, value]) => has(label) && has(value)) as Array<[string, string]>)
    .filter(line => line.length > 0);

  const skillRows: Array<[string, string[]]> = (profile.categorizedSkills || [])
    .filter(c => has(c.category) && c.skills?.length)
    .map(c => [c.category, c.skills]);
  if (skillRows.length === 0) {
    const s = profile.skills;
    ([['Programming Languages', s?.technical], ['Frameworks', s?.frameworks], ['Tools', s?.tools]] as Array<[string, string[] | undefined]>)
      .forEach(([label, items]) => { if (items?.length) skillRows.push([label, items]); });
  }

  return (
    <div className="rp-page">
      <header className="rp-header">
        <div className="rp-name">{(pi.fullName?.trim() || 'Your Name').toUpperCase()}</div>
        {contactLines.map((line, i) => (
          <div key={i} className="rp-contact">
            {line.map(([label, value]) => (
              <span key={label}><b>{label}:</b> {value.trim()}</span>
            ))}
          </div>
        ))}
      </header>

      {profile.experience?.length > 0 && (
        <Section title="Work Experience">
          {profile.experience.map((exp, i) => (
            <div key={i} className="rp-entry">
              <Row
                left={<b>{[exp.role, exp.company].filter(has).join(' | ')}</b>}
                right={<b>{dateRange(exp.startDate, exp.current ? 'Present' : exp.endDate)}</b>}
              />
              {exp.bullets?.filter(has).map((b, j) => <div key={j} className="rp-line">{b}</div>)}
            </div>
          ))}
        </Section>
      )}

      {profile.education?.length > 0 && (
        <Section title="Education">
          {profile.education.map((edu, i) => {
            const location = edu.location || edu.highlights?.[0] || '';
            const degree = has(edu.fieldOfStudy) && !edu.degree.includes(edu.fieldOfStudy) ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree;
            return (
              <div key={i} className="rp-entry">
                <Row left={<b>{edu.institution}</b>} right={<b>{location}</b>} />
                <Row left={degree} right={<b>{dateRange(edu.startYear, edu.endYear)}</b>} />
                {has(edu.gpa) && <div className="rp-line">Cumulative GPA: {edu.gpa}</div>}
              </div>
            );
          })}
        </Section>
      )}

      {profile.projects?.length > 0 && (
        <Section title="Projects">
          {profile.projects.map((proj, i) => {
            const bullets = proj.bullets?.filter(has).length ? proj.bullets.filter(has) : has(proj.description) ? [proj.description] : [];
            const links = ([[proj.githubUrl, 'GitHub'], [proj.liveUrl, 'Live']] as Array<[string | undefined, string]>).filter(([url]) => has(url));
            return (
              <div key={i} className="rp-entry">
                <Row
                  left={<b>{proj.name}{proj.technologies?.length ? ` (${proj.technologies.slice(0, 4).join(', ')})` : ''}</b>}
                  right={links.length > 0 && (
                    <b>{links.map(([url, label], j) => (
                      <React.Fragment key={label}>{j > 0 && ' | '}<Link href={url}>{label}</Link></React.Fragment>
                    ))}</b>
                  )}
                />
                <ul className="rp-bullets">
                  {bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            );
          })}
        </Section>
      )}

      {(profile.hackathons?.length ?? 0) > 0 && (
        <Section title="Hackathons">
          {profile.hackathons!.map((h, i) => (
            <Row key={i} left={[h.name, h.achievement].filter(has).join(' | ')} right={h.date} />
          ))}
        </Section>
      )}

      {(profile.certifications?.length ?? 0) > 0 && (
        <Section title="Certifications">
          {profile.certifications!.map((c, i) => (
            <Row
              key={i}
              left={<>•&nbsp;&nbsp;{[c.name, c.issuer].filter(has).join(' | ')}</>}
              right={<b><Link href={c.credentialUrl}>Certificate</Link></b>}
            />
          ))}
        </Section>
      )}

      {(profile.achievements?.length ?? 0) > 0 && (
        <Section title="Achievements">
          <ul className="rp-bullets">
            {profile.achievements!.filter(has).map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Section>
      )}

      {skillRows.length > 0 && (
        <Section title="Skills">
          <div className="rp-skills">
            {skillRows.map(([label, items]) => (
              <React.Fragment key={label}>
                <b>{label}:</b>
                <span>{items.join(', ')}</span>
              </React.Fragment>
            ))}
          </div>
        </Section>
      )}

      {(profile.customSections || []).map((sec, i) => {
        const items = (sec.items || []).filter(item => has(item.title) || item.bullets?.length);
        if (!has(sec.title) || items.length === 0) return null;
        return (
          <Section key={i} title={sec.title}>
            {items.map((item, j) => (
              <div key={j} className="rp-entry">
                <Row left={<b>{[item.title, item.subtitle].filter(has).join(' | ')}</b>} right={<b>{item.date}</b>} />
                <ul className="rp-bullets">
                  {(item.bullets || []).filter(has).map((b, k) => <li key={k}>{b}</li>)}
                </ul>
              </div>
            ))}
          </Section>
        );
      })}
    </div>
  );
};

export default ResumePreview;
