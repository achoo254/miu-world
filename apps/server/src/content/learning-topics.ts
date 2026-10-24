import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { QuestDefinition } from '@miu/schema/content';
import { Topic, topicIssues, type Objective } from '@miu/schema/learning';

/** An objective with the topic it belongs to. */
export interface TopicObjective {
  objective: Objective;
  topic: Topic;
}

export interface LearningTopics {
  /** Topics by id, ordered by subject then `order`. */
  topics: ReadonlyMap<string, Topic>;
  objectives: ReadonlyMap<string, TopicObjective>;
}

/**
 * Every topic file of `<dir>/<subject>/<topic>.json` (content/learning/topics): the folder is the topic's subject and
 * the file is named after its id. Problems are returned, not thrown, so the content gate can list them all.
 */
export function readTopicFiles(dir: string): { topics: Topic[]; issues: string[] } {
  const topics: Topic[] = [];
  const issues: string[] = [];
  if (!existsSync(dir)) return { topics, issues };
  for (const subject of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    for (const name of readdirSync(path.join(dir, subject)).filter((f) => f.endsWith('.json')).sort()) {
      const where = `content/learning/topics/${subject}/${name}`;
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(path.join(dir, subject, name), 'utf8'));
      } catch (error) {
        issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const parsed = Topic.safeParse(raw);
      if (!parsed.success) {
        issues.push(`${where}: ${parsed.error.message}`);
        continue;
      }
      if (parsed.data.subject !== subject) issues.push(`${where}: a topic of ${parsed.data.subject} belongs in topics/${parsed.data.subject}/`);
      if (name !== `${parsed.data.id}.json`) issues.push(`${where}: file name must be ${parsed.data.id}.json`);
      topics.push(parsed.data);
    }
  }
  return { topics, issues };
}

export function indexTopics(topics: readonly Topic[]): LearningTopics {
  const sorted = [...topics].sort((a, b) => a.subject.localeCompare(b.subject) || a.order - b.order);
  return {
    topics: new Map(sorted.map((t) => [t.id, t])),
    objectives: new Map(sorted.flatMap((topic) => topic.objectives.map((objective) => [objective.id, { objective, topic }] as const))),
  };
}

/**
 * Quests point at known topics and objectives: a quest's `topic` exists, every step's `objective` exists and is an
 * objective of the quest's subject. Any topic of that subject will do, on purpose: spelling, writing, speaking and
 * listening have topics of their own that no quest is mainly about, practised by steps of every Vietnamese quest.
 */
export function learningQuestIssues(quests: Iterable<QuestDefinition>, learning: LearningTopics): string[] {
  const issues: string[] = [];
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const topic = quest.topic === undefined ? undefined : learning.topics.get(quest.topic);
    if (quest.topic !== undefined && !topic) issues.push(`quest ${quest.id} names unknown topic ${quest.topic}`);
    for (const step of quest.steps) {
      const id = 'objective' in step ? step.objective : undefined;
      if (id === undefined) continue;
      const entry = learning.objectives.get(id);
      if (!entry) issues.push(`quest ${quest.id} step ${step.id} names unknown objective ${id}`);
      else if (!topic) {
        // An unknown topic is reported once, above.
        if (quest.topic === undefined) issues.push(`quest ${quest.id} step ${step.id} names objective ${id}, but the quest names no topic`);
      }
      else if (entry.topic.subject !== topic.subject) issues.push(`quest ${quest.id} step ${step.id}: objective ${id} is a ${entry.topic.subject} objective, the quest teaches ${topic.subject}`);
    }
  }
  return issues;
}

/** Topics of `dir`, checked against the subjects and the quests; anything that does not fit fails the boot. */
export function loadLearningTopics(
  dir: string,
  subjects: ReadonlyArray<{ id: string; skills: ReadonlyArray<{ id: string }> }>,
  quests: Iterable<QuestDefinition>,
): LearningTopics {
  const { topics, issues } = readTopicFiles(dir);
  const learning = indexTopics(topics);
  issues.push(...topicIssues(topics, subjects), ...learningQuestIssues(quests, learning));
  if (issues.length > 0) throw new Error(`invalid learning topics: ${issues.join('; ')}`);
  return learning;
}
