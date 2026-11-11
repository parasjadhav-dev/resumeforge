import type { ResumeContent } from "./schema";

/**
 * A fictional resume used to show the real templates on the landing page.
 * Ids are fixed (not generated) so the page can be prerendered.
 */
export const SAMPLE_RESUME: ResumeContent = {
  contact: {
    fullName: "Asha Rao",
    email: "asha.rao@example.com",
    phone: "+91 98765 43210",
    location: "Pune, India",
    linkedin: "linkedin.com/in/asharao",
    github: "",
    website: "",
  },
  summary:
    "Final-year computer engineering student with hands-on experience building full-stack web applications used by hundreds of students.",
  experience: [
    {
      id: "sample-exp-1",
      title: "Software Engineering Intern",
      company: "Acme Corp",
      location: "",
      startDate: "Jun 2024",
      endDate: "Aug 2024",
      current: false,
      bullets: [
        "Built a REST API in Node.js that reduced report generation time by 40%.",
        "Wrote integration tests that raised coverage from 55% to 82%.",
      ],
    },
    {
      id: "sample-exp-2",
      title: "Web Developer",
      company: "Campus Tech Club",
      location: "",
      startDate: "Jan 2023",
      endDate: "",
      current: true,
      bullets: ["Maintained the club website used by 800+ students."],
    },
  ],
  education: [
    {
      id: "sample-edu-1",
      institution: "Pune Institute of Computer Technology",
      degree: "B.E.",
      field: "Computer Engineering",
      location: "",
      startDate: "2021",
      endDate: "2025",
      gpa: "9.1/10",
      details: [],
    },
  ],
  projects: [
    {
      id: "sample-proj-1",
      name: "Campus Events App",
      link: "",
      technologies: ["Next.js", "TypeScript", "PostgreSQL"],
      bullets: ["Shipped an events app with 1,200 sign-ups in its first semester."],
    },
  ],
  skills: [
    { id: "sample-skill-1", category: "Languages", items: ["TypeScript", "Python", "SQL"] },
    { id: "sample-skill-2", category: "Tools", items: ["Git", "Docker", "PostgreSQL"] },
  ],
  certifications: [],
};
