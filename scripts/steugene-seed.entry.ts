// What the seeder needs to know about the year. Bundled by `loadTs`.
import { seAllSubtopics } from '../src/logic/steugene'

export function curriculum() {
  return seAllSubtopics().map(({ subject, strand, subtopic }) => ({
    id: subtopic.id,
    title: subtopic.title,
    sample: subtopic.sample,
    plain: subtopic.plain,
    emoji: subtopic.emoji,
    subject: subject.name,
    subjectId: subject.id,
    skin: subject.skin,
    strand: strand.title,
  }))
}
