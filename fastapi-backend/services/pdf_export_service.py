"""Classic one-page resume PDF.

Layout (mirrored exactly by the Resume Studio preview):
centered bold name, contact lines with bold labels, then sections with a bold
uppercase heading over a black rule, in the order
Work Experience, Education, Projects, Hackathons, Certifications, Achievements, Skills, custom sections.
"""
from io import BytesIO
from xml.sax.saxutils import escape, quoteattr
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle

FRAME_PADDING = 6  # SimpleDocTemplate's frame adds this inside the page margins
MARGIN = 0.5 * inch - FRAME_PADDING  # so text starts exactly 0.5in from the edge
CONTENT_WIDTH = letter[0] - 2 * (MARGIN + FRAME_PADDING)
FONT, BOLD = "Helvetica", "Helvetica-Bold"
SKILL_LABEL_WIDTH = 1.95 * inch

NAME = ParagraphStyle("name", fontName=BOLD, fontSize=17, leading=20, alignment=TA_CENTER)
CONTACT = ParagraphStyle("contact", fontName=FONT, fontSize=9, leading=11, alignment=TA_CENTER)
HEADING = ParagraphStyle("heading", fontName=BOLD, fontSize=12, leading=14, spaceBefore=7)
BODY = ParagraphStyle("body", fontName=FONT, fontSize=9.8, leading=12)
BODY_RIGHT = ParagraphStyle("body_right", parent=BODY, alignment=TA_RIGHT)
BULLET = ParagraphStyle("bullet", parent=BODY, leftIndent=11, bulletIndent=3, spaceBefore=1)

GAP = "&nbsp;" * 4


def e(value) -> str:
    """Escape user text: Paragraph parses markup, so a bare '&' or '<' would crash the export."""
    return escape(str(value or "").strip())


def link(url: str, label: str) -> str:
    url = (url or "").strip()
    return f"<link href={quoteattr(url)}>{label}</link>" if url else label


def _row(left: str, right: str = "") -> Table:
    """Left-aligned text with right-aligned detail on the same line (dates, locations, links)."""
    table = Table(
        [[Paragraph(left, BODY), Paragraph(right, BODY_RIGHT)]],
        colWidths=[CONTENT_WIDTH * 0.7, CONTENT_WIDTH * 0.3],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _heading(story: list, title: str) -> None:
    story.append(Paragraph(e(title.upper()), HEADING))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceBefore=1, spaceAfter=3))


def _date_range(start: str, end: str) -> str:
    start, end = (start or "").strip(), (end or "").strip()
    return f"{start} – {end}" if start and end else start or end


def _contact_lines(pi) -> list[str]:
    def field(label, value):
        return f"<b>{label}:</b> {e(value)}" if (value or "").strip() else ""

    extra = [field("Portfolio", pi.websiteUrl)] + [field(e(l.get("label")), l.get("url")) for l in pi.customLinks if l.get("label") and l.get("url")]
    lines = [
        [field("Email", pi.email), field("Phone", pi.phone)],
        [field("LinkedIn", pi.linkedinUrl), field("GitHub", pi.githubUrl)],
        [field("Location", pi.location)],
        extra,
    ]
    return [GAP.join(p for p in parts if p) for parts in lines if any(parts)]


def generate_resume_pdf_buffer(profile) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.45 * inch, bottomMargin=0.45 * inch,
                            title=f"{profile.personalInfo.fullName or 'Resume'}", author=profile.personalInfo.fullName or "")
    story = []

    # Header
    pi = profile.personalInfo
    story.append(Paragraph(e((pi.fullName or "Your Name").upper()), NAME))
    for line in _contact_lines(pi):
        story.append(Paragraph(line, CONTACT))

    # Work experience: plain lines under each role (no bullet glyphs)
    if profile.experience:
        _heading(story, "Work Experience")
        for exp in profile.experience:
            title = " | ".join(p for p in (e(exp.role), e(exp.company)) if p)
            story.append(_row(f"<b>{title}</b>", f"<b>{e(_date_range(exp.startDate, 'Present' if exp.current else exp.endDate))}</b>"))
            for bullet in exp.bullets:
                if bullet.strip():
                    story.append(Paragraph(e(bullet), BODY))
            story.append(Spacer(1, 3))

    # Education: institution / location, then degree / years, then GPA
    if profile.education:
        _heading(story, "Education")
        for edu in profile.education:
            location = edu.location or (edu.highlights[0] if edu.highlights else "")
            story.append(_row(f"<b>{e(edu.institution)}</b>", f"<b>{e(location)}</b>"))
            degree = f"{edu.degree} in {edu.fieldOfStudy}" if edu.fieldOfStudy and edu.fieldOfStudy not in edu.degree else edu.degree
            story.append(_row(e(degree), f"<b>{e(_date_range(edu.startYear, edu.endYear))}</b>"))
            if edu.gpa:
                story.append(Paragraph(f"Cumulative GPA: {e(edu.gpa)}", BODY))
            story.append(Spacer(1, 3))

    # Projects: "Name (Tech, Tech)" with GitHub | Live links on the right, bulleted details
    if profile.projects:
        _heading(story, "Projects")
        for proj in profile.projects:
            tech = f" ({e(', '.join(proj.technologies[:4]))})" if proj.technologies else ""
            links = " | ".join(link(url, label) for url, label in ((proj.githubUrl, "GitHub"), (proj.liveUrl, "Live")) if (url or "").strip())
            story.append(_row(f"<b>{e(proj.name)}{tech}</b>", f"<b>{links}</b>"))
            bullets = [b for b in proj.bullets if b.strip()] or ([proj.description] if proj.description else [])
            for bullet in bullets:
                story.append(Paragraph(e(bullet), BULLET, bulletText="•"))
            story.append(Spacer(1, 2))

    if profile.hackathons:
        _heading(story, "Hackathons")
        for h in profile.hackathons:
            text = " | ".join(p for p in (e(h.name), e(h.achievement)) if p)
            story.append(_row(text, e(h.date)))

    if profile.certifications:
        _heading(story, "Certifications")
        for cert in profile.certifications:
            text = " | ".join(p for p in (e(cert.name), e(cert.issuer)) if p)
            story.append(_row(f"•&nbsp;&nbsp;{text}", f"<b>{link(cert.credentialUrl, 'Certificate')}</b>"))

    if profile.achievements:
        _heading(story, "Achievements")
        for item in profile.achievements:
            story.append(Paragraph(e(item), BULLET, bulletText="•"))

    # Skills: two-column table (bold category, comma-separated values)
    skill_rows = [(c.category, c.skills) for c in profile.categorizedSkills if c.category and c.skills]
    if not skill_rows:
        skill_rows = [(label, items) for label, items in (
            ("Programming Languages", profile.skills.technical), ("Frameworks", profile.skills.frameworks), ("Tools", profile.skills.tools),
        ) if items]
    if skill_rows:
        _heading(story, "Skills")
        table = Table(
            [[Paragraph(f"<b>{e(label)}:</b>", BODY), Paragraph(e(", ".join(items)), BODY)] for label, items in skill_rows],
            colWidths=[SKILL_LABEL_WIDTH, CONTENT_WIDTH - SKILL_LABEL_WIDTH],
        )
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(table)

    for section in profile.customSections:
        items = [i for i in section.items if i.title or i.bullets]
        if not section.title or not items:
            continue
        _heading(story, section.title)
        for item in items:
            title = " | ".join(p for p in (e(item.title), e(item.subtitle)) if p)
            story.append(_row(f"<b>{title}</b>", f"<b>{e(item.date)}</b>"))
            for bullet in item.bullets:
                if bullet.strip():
                    story.append(Paragraph(e(bullet), BULLET, bulletText="•"))
            story.append(Spacer(1, 2))

    doc.build(story)
    return buffer.getvalue()
