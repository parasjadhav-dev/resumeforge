/** Sample resumes used by the visual and accessibility checks. */

export const FULL_RESUME = {
  contact: {
    fullName: "Asha Rao",
    email: "asha.rao@example.com",
    phone: "+91 98765 43210",
    location: "Pune, India",
    linkedin: "linkedin.com/in/asharao",
    github: "github.com/asharao",
  },
  summary:
    "Final-year computer engineering student with hands-on experience building full-stack web applications, " +
    "a strong foundation in data structures, and a record of shipping features used by hundreds of students.",
  experience: [
    {
      id: "exp-intern",
      title: "Software Engineering Intern",
      company: "Acme Corp",
      location: "Remote",
      startDate: "Jun 2024",
      endDate: "Aug 2024",
      bullets: [
        "Built a REST API in Node.js that reduced report generation time by 40%.",
        "Wrote integration tests that raised coverage from 55% to 82%.",
        "Reviewed pull requests and mentored two new interns on the team's workflow.",
      ],
    },
    {
      id: "exp-web",
      title: "Web Developer",
      company: "Campus Tech Club",
      startDate: "Jan 2023",
      current: true,
      bullets: [
        "Maintained the club website used by 800+ students.",
        "Introduced a design system.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "Pune Institute of Computer Technology",
      degree: "B.E.",
      field: "Computer Engineering",
      startDate: "2021",
      endDate: "2025",
      gpa: "9.1/10",
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "ResumeForge",
      link: "github.com/asharao/resumeforge",
      technologies: ["Next.js", "TypeScript", "PostgreSQL"],
      bullets: ["Built an ATS-friendly resume builder with live preview and PDF export."],
    },
  ],
  skills: [
    { id: "skill-1", category: "Languages", items: ["TypeScript", "Python", "SQL", "Java"] },
    { id: "skill-2", category: "Tools", items: ["Git", "Docker", "PostgreSQL", "Linux"] },
  ],
  certifications: [
    { id: "cert-1", name: "AWS Cloud Practitioner", issuer: "Amazon", date: "Mar 2025" },
  ],
};

export const FRESHER_RESUME = {
  contact: { fullName: "Rohan Mehta", email: "rohan@example.com", location: "Mumbai, India" },
  summary: "Computer science student looking for a software internship.",
  education: [
    {
      id: "edu-f",
      institution: "Mumbai University",
      degree: "B.Sc.",
      field: "Computer Science",
      startDate: "2022",
      endDate: "2025",
    },
  ],
  skills: [{ id: "skill-f", category: "Skills", items: ["Python", "HTML", "CSS"] }],
};

/** A name the PDF font cannot render, to show the unsupported-characters warning. */
export const UNSUPPORTED_RESUME = {
  contact: { fullName: "आशा राव", email: "asha@example.com" },
  summary: "Shipped features on time 🚀",
};

/** Content for the "just imported" screen. The entry ids match IMPORT_REVIEW below. */
export const IMPORTED_RESUME = {
  contact: { fullName: "Asha Rao", location: "Pune, India" },
  summary: "Final-year computer engineering student who builds full-stack web applications.",
  experience: [
    {
      id: "imp-exp-1",
      title: "Software Engineering Intern",
      company: "Acme Corp",
      startDate: "Jun 2024",
      endDate: "Aug 2024",
      bullets: ["Built a REST API in Node.js that reduced report generation time by 40%."],
    },
    {
      id: "imp-exp-2",
      title: "Web Developer",
      company: "Campus Club",
      bullets: ["Maintained the club website used by 800+ students."],
    },
  ],
  skills: [{ id: "imp-skill-1", category: "Languages", items: ["TypeScript", "Python"] }],
};

export const IMPORT_SOURCE_TEXT = [
  "Asha Rao",
  "Pune, India",
  "SUMMARY",
  "Final-year computer engineering student who builds full-stack web applications.",
  "EXPERIENCE",
  "Software Engineering Intern, Acme Corp    Jun 2024 - Aug 2024",
  "Built a REST API in Node.js that reduced report generation time by 40%.",
  "Web Developer, Campus Club",
  "Maintained the club website used by 800+ students.",
  "SKILLS",
  "Languages: TypeScript, Python",
].join("\n");

export const IMPORT_REVIEW = {
  contact: ["No email was found."],
  summary: [],
  entries: { "imp-exp-2": ["No dates were found."] },
};
