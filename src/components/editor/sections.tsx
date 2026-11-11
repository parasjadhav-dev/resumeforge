"use client";

import {
  newCertification,
  newEducation,
  newExperience,
  newProject,
  newSkillGroup,
  type ResumeContent,
} from "@/shared/schema";
import {
  BulletsField,
  CheckboxField,
  EntryList,
  Section,
  TagField,
  TextArea,
  TextField,
} from "./fields";
import { ReviewNote, useSectionReview } from "./review-context";

type SectionProps<K extends keyof ResumeContent> = {
  value: ResumeContent[K];
  onChange: (value: ResumeContent[K]) => void;
};

export function ContactSection({ value, onChange }: SectionProps<"contact">) {
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  const { reasons, markChecked } = useSectionReview("contact");
  return (
    <Section title="Contact" description="How recruiters reach you.">
      <ReviewNote reasons={reasons} onChecked={markChecked} what="your contact details" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Full name"
          value={value.fullName}
          onChange={(fullName) => set({ fullName })}
          autoComplete="name"
          maxLength={200}
        />
        <TextField
          label="Email"
          type="email"
          value={value.email}
          onChange={(email) => set({ email })}
          autoComplete="email"
        />
        <TextField
          label="Phone"
          type="tel"
          value={value.phone}
          onChange={(phone) => set({ phone })}
          autoComplete="tel"
        />
        <TextField
          label="Location"
          value={value.location}
          onChange={(location) => set({ location })}
          placeholder="City, Country"
        />
        <TextField
          label="LinkedIn"
          value={value.linkedin}
          onChange={(linkedin) => set({ linkedin })}
          placeholder="linkedin.com/in/you"
        />
        <TextField
          label="GitHub"
          value={value.github}
          onChange={(github) => set({ github })}
          placeholder="github.com/you"
        />
        <TextField label="Website" value={value.website} onChange={(website) => set({ website })} />
      </div>
    </Section>
  );
}

export function SummarySection({ value, onChange }: SectionProps<"summary">) {
  const { reasons, markChecked } = useSectionReview("summary");
  return (
    <Section title="Summary" description="2–3 sentences about who you are and what you offer.">
      <ReviewNote reasons={reasons} onChecked={markChecked} what="your summary" />
      <TextArea
        label="Professional summary"
        value={value}
        onChange={onChange}
        rows={4}
        maxLength={2000}
        hint={`${value.length}/2000`}
      />
    </Section>
  );
}

export function ExperienceSection({ value, onChange }: SectionProps<"experience">) {
  return (
    <Section title="Experience" description="Most recent first. Start bullets with an action verb.">
      <EntryList
        noun="Experience entry"
        items={value}
        onChange={onChange}
        createItem={newExperience}
        addLabel="Add experience"
        emptyText="No experience yet. Internships and part-time work count."
        max={20}
        renderItem={(item, update) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Job title"
                value={item.title}
                onChange={(title) => update({ title })}
              />
              <TextField
                label="Company"
                value={item.company}
                onChange={(company) => update({ company })}
              />
              <TextField
                label="Location"
                value={item.location}
                onChange={(location) => update({ location })}
              />
              <div />
              <TextField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ startDate })}
                placeholder="Jun 2024"
              />
              <TextField
                label="End date"
                value={item.current ? "" : item.endDate}
                onChange={(endDate) => update({ endDate })}
                placeholder={item.current ? "Present" : "Aug 2024"}
                disabled={item.current}
              />
            </div>
            <CheckboxField
              label="I currently work here"
              checked={item.current}
              onChange={(current) => update({ current })}
            />
            <BulletsField
              label="Bullet"
              bullets={item.bullets}
              onChange={(bullets) => update({ bullets })}
            />
          </>
        )}
      />
    </Section>
  );
}

export function EducationSection({ value, onChange }: SectionProps<"education">) {
  return (
    <Section title="Education">
      <EntryList
        noun="Education entry"
        items={value}
        onChange={onChange}
        createItem={newEducation}
        addLabel="Add education"
        emptyText="No education added yet."
        max={10}
        renderItem={(item, update) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Institution"
                value={item.institution}
                onChange={(institution) => update({ institution })}
              />
              <TextField
                label="Degree"
                value={item.degree}
                onChange={(degree) => update({ degree })}
              />
              <TextField
                label="Field of study"
                value={item.field}
                onChange={(field) => update({ field })}
              />
              <TextField
                label="Location"
                value={item.location}
                onChange={(location) => update({ location })}
              />
              <TextField
                label="Start date"
                value={item.startDate}
                onChange={(startDate) => update({ startDate })}
                placeholder="Aug 2021"
              />
              <TextField
                label="End date"
                value={item.endDate}
                onChange={(endDate) => update({ endDate })}
                placeholder="May 2025"
              />
              <TextField
                label="GPA / grade (optional)"
                value={item.gpa}
                onChange={(gpa) => update({ gpa })}
              />
            </div>
            <BulletsField
              label="Detail"
              bullets={item.details}
              onChange={(details) => update({ details })}
            />
          </>
        )}
      />
    </Section>
  );
}

export function ProjectsSection({ value, onChange }: SectionProps<"projects">) {
  return (
    <Section title="Projects" description="Great for freshers: show what you have built.">
      <EntryList
        noun="Project"
        items={value}
        onChange={onChange}
        createItem={newProject}
        addLabel="Add project"
        emptyText="No projects yet."
        max={20}
        renderItem={(item, update) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Project name"
                value={item.name}
                onChange={(name) => update({ name })}
              />
              <TextField
                label="Link"
                type="url"
                value={item.link}
                onChange={(link) => update({ link })}
                placeholder="github.com/you/project"
              />
            </div>
            <TagField
              label="Technologies"
              values={item.technologies}
              onChange={(technologies) => update({ technologies })}
              placeholder="React, Node.js, PostgreSQL"
            />
            <BulletsField
              label="Bullet"
              bullets={item.bullets}
              onChange={(bullets) => update({ bullets })}
            />
          </>
        )}
      />
    </Section>
  );
}

export function SkillsSection({ value, onChange }: SectionProps<"skills">) {
  return (
    <Section title="Skills" description="Group skills by category, for example Languages or Tools.">
      <EntryList
        noun="Skill group"
        items={value}
        onChange={onChange}
        createItem={newSkillGroup}
        addLabel="Add skill group"
        emptyText="No skills yet."
        max={15}
        renderItem={(item, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Category"
              value={item.category}
              onChange={(category) => update({ category })}
              placeholder="Languages"
            />
            <TagField
              label="Skills"
              values={item.items}
              onChange={(items) => update({ items })}
              placeholder="TypeScript, Python, SQL"
            />
          </div>
        )}
      />
    </Section>
  );
}

export function CertificationsSection({ value, onChange }: SectionProps<"certifications">) {
  return (
    <Section title="Certifications">
      <EntryList
        noun="Certification"
        items={value}
        onChange={onChange}
        createItem={newCertification}
        addLabel="Add certification"
        emptyText="No certifications yet."
        max={20}
        renderItem={(item, update) => (
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Name" value={item.name} onChange={(name) => update({ name })} />
            <TextField
              label="Issuer"
              value={item.issuer}
              onChange={(issuer) => update({ issuer })}
            />
            <TextField
              label="Date"
              value={item.date}
              onChange={(date) => update({ date })}
              placeholder="Mar 2025"
            />
          </div>
        )}
      />
    </Section>
  );
}
