from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem
from reportlab.lib.enums import TA_LEFT, TA_CENTER


def generate_resume_pdf_buffer(profile) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    accent = colors.HexColor("#2563eb")

    name_style = ParagraphStyle("name", parent=styles["Normal"], fontSize=20, textColor=colors.HexColor("#111827"), leading=24, spaceAfter=2, fontName="Helvetica-Bold")
    title_style = ParagraphStyle("title", parent=styles["Normal"], fontSize=11, textColor=accent, leading=14, spaceAfter=4)
    contact_style = ParagraphStyle("contact", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#6b7280"), leading=12, spaceAfter=6)
    section_style = ParagraphStyle("section", parent=styles["Normal"], fontSize=10, textColor=accent, leading=13, fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=2)
    subheader_style = ParagraphStyle("subheader", parent=styles["Normal"], fontSize=9.5, textColor=colors.black, leading=13, fontName="Helvetica-Bold")
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#374151"), leading=12)
    bullet_style = ParagraphStyle("bullet", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#374151"), leading=12, leftIndent=12)

    story = []

    # Header
    pi = profile.personalInfo
    story.append(Paragraph(pi.fullName or "Developer", name_style))
    story.append(Paragraph(pi.jobTitle or "Software Engineer", title_style))
    contacts = []
    if pi.email:
        contacts.append(pi.email)
    if pi.phone:
        contacts.append(pi.phone)
    if pi.location:
        contacts.append(pi.location)
    if pi.githubUrl:
        contacts.append(pi.githubUrl)
    if pi.linkedinUrl:
        contacts.append(pi.linkedinUrl)
    story.append(Paragraph("  |  ".join(contacts), contact_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent))

    # Career Objective
    if profile.careerObjective:
        story.append(Paragraph("SUMMARY", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        story.append(Paragraph(profile.careerObjective, body_style))

    # Experience
    if profile.experience:
        story.append(Paragraph("EXPERIENCE", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        for exp in profile.experience:
            story.append(Spacer(1, 4))
            date_range = f"{exp.startDate} – {'Present' if exp.current else exp.endDate}"
            story.append(Paragraph(f"<b>{exp.role}</b> | {exp.company} | {exp.location or ''} | {date_range}", subheader_style))
            for bullet in exp.bullets:
                story.append(Paragraph(f"• {bullet}", bullet_style))

    # Projects
    if profile.projects:
        story.append(Paragraph("PROJECTS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        for proj in profile.projects:
            story.append(Spacer(1, 4))
            tech_str = ", ".join(proj.technologies[:6]) if proj.technologies else ""
            story.append(Paragraph(f"<b>{proj.name}</b>" + (f" | {proj.githubUrl}" if proj.githubUrl else ""), subheader_style))
            if tech_str:
                story.append(Paragraph(f"<i>Tech: {tech_str}</i>", body_style))
            for bullet in proj.bullets:
                story.append(Paragraph(f"• {bullet}", bullet_style))

    # Skills
    story.append(Paragraph("SKILLS", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 4))
    if profile.skills.technical:
        story.append(Paragraph(f"<b>Languages:</b> {', '.join(profile.skills.technical)}", body_style))
    if profile.skills.frameworks:
        story.append(Paragraph(f"<b>Frameworks:</b> {', '.join(profile.skills.frameworks)}", body_style))
    if profile.skills.tools:
        story.append(Paragraph(f"<b>Tools:</b> {', '.join(profile.skills.tools)}", body_style))

    # Education
    if profile.education:
        story.append(Paragraph("EDUCATION", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        for edu in profile.education:
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"<b>{edu.institution}</b> | {edu.degree} in {edu.fieldOfStudy} | {edu.startYear} – {edu.endYear}", subheader_style))
            if edu.gpa:
                story.append(Paragraph(f"GPA: {edu.gpa}", body_style))

    # Certifications
    if profile.certifications:
        story.append(Paragraph("CERTIFICATIONS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        for cert in profile.certifications:
            story.append(Paragraph(f"• <b>{cert.name}</b> — {cert.issuer}", bullet_style))

    doc.build(story)
    return buffer.getvalue()
