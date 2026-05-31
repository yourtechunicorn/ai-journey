#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { select, input, confirm } from '@inquirer/prompts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POSTS_FILE = join(__dirname, 'posts.json');

const PILLARS = [
  'AI tools & automation',
  'Funnels & marketing automation',
  'Coding journey (honest in-progress)',
  'New tool experiments',
  'Personal / behind the scenes',
  'Recruitment automation',
];

const SYSTEM_PROMPT = `You write LinkedIn posts for Pam, a builder and automation specialist who helps businesses grow through smart systems and AI.

Audience: Builders, SaaS operators, and marketers who love automation. Global audience.

Voice: First person, conversational, a little raw and honest. Shows the process, not just the wins. Not polished corporate — real and direct.

Hard rules:
- Do NOT start the post with "I" as the very first word
- No "excited to announce", "thrilled to share", or any corporate speak
- No em dashes (—) — use commas or short sentences instead
- Max 2-3 hashtags at the end, only if genuinely relevant. Otherwise no hashtags at all.
- Output ONLY the post text. No preamble, no explanation, no commentary before or after the post.
- Short format: 3-5 punchy lines, no fluff, no filler
- Long format: up to 1300 characters, structured but still conversational, with a clear payoff at the end

Content pillars and what they mean:
- AI tools & automation: specific tools, workflows, results — show what actually works
- Funnels & marketing automation: strategy, mistakes, wins — what moves the needle
- Coding journey: honest, in-progress, share the learning not the polished outcome
- New tool experiments: first impressions, real tests, what surprised you
- Personal / behind the scenes: the human side, the decision, the why
- Recruitment automation: systems for hiring, sourcing, screening — what works at scale`;

function loadPosts() {
  if (!existsSync(POSTS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(POSTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePosts(posts) {
  writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function printPost(post, index) {
  console.log(`\n--- Post ${index + 1} (${formatDate(post.date)}) ---`);
  console.log(`Pillar: ${post.pillar} | Format: ${post.format.toUpperCase()}`);
  console.log();
  console.log(post.text);
  console.log('---');
}

async function generateDraft(client, pillar, format, idea) {
  const formatGuide =
    format === 'short'
      ? 'Write a SHORT post: 3-5 punchy lines, no fluff.'
      : 'Write a LONG post: up to 1300 characters, structured, conversational, with a clear payoff at the end.';

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Pillar: ${pillar}\nFormat: ${format}\nCore idea: ${idea}\n\n${formatGuide}\n\nWrite the post now.`,
      },
    ],
  });

  return response.content[0].text;
}

async function openInEditor(text) {
  const tmpFile = join(tmpdir(), `linkedin-draft-${Date.now()}.txt`);
  writeFileSync(tmpFile, text, 'utf8');

  const editor =
    process.env.EDITOR ||
    (process.platform === 'win32' ? 'notepad' : 'nano');

  try {
    execSync(`"${editor}" "${tmpFile}"`, { stdio: 'inherit' });
    return readFileSync(tmpFile, 'utf8').trim();
  } catch {
    return null;
  }
}

async function readUntilEnd() {
  console.log('\nPaste your edited post below. Type END on a new line when done:');
  const rl = createInterface({ input: process.stdin });
  const lines = [];
  for await (const line of rl) {
    if (line.trim() === 'END') break;
    lines.push(line);
  }
  rl.close();
  return lines.join('\n').trim();
}

async function main() {
  console.log('\nLinkedIn Draft Generator\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const posts = loadPosts();

  // Show last 2 posts
  if (posts.length > 0) {
    console.log('Your last 2 posts:\n');
    const recent = posts.slice(-2);
    recent.forEach((p, i) => printPost(p, i));
  } else {
    console.log('No posts yet. Starting fresh.\n');
  }

  // Check consecutive long-form rule
  const lastPost = posts[posts.length - 1];
  const secondLastPost = posts[posts.length - 2];
  const recentLongCount =
    [lastPost, secondLastPost].filter((p) => p?.format === 'long').length;

  // Select pillar
  const pillar = await select({
    message: 'Which content pillar?',
    choices: PILLARS.map((p) => ({ name: p, value: p })),
  });

  // Select format
  const format = await select({
    message: 'Format?',
    choices: [
      { name: 'Short (3-5 lines)', value: 'short' },
      { name: 'Long (up to 1300 chars)', value: 'long' },
    ],
  });

  // Warn about consecutive long-form
  if (format === 'long' && lastPost?.format === 'long') {
    console.log(
      '\nWarning: Your last post was also long-form. The rule says no two consecutive long posts.'
    );
    const proceed = await confirm({
      message: 'Proceed anyway?',
      default: false,
    });
    if (!proceed) {
      console.log('Switching to short format.\n');
      // Reassign format to short — we need a let here, so we use a wrapper
      return main(); // restart
    }
  }

  // Get core idea
  const idea = await input({
    message: 'What\'s the core idea or hook for this post?',
    validate: (v) => v.trim().length > 0 || 'Please enter an idea.',
  });

  console.log('\nGenerating draft...\n');

  let draft = await generateDraft(client, pillar, format, idea);

  // Review loop
  while (true) {
    console.log('\n=== DRAFT ===\n');
    console.log(draft);
    console.log('\n=============\n');

    const action = await select({
      message: 'What do you want to do?',
      choices: [
        { name: 'Save this post', value: 'save' },
        { name: 'Regenerate (new draft)', value: 'regenerate' },
        { name: 'Edit in editor', value: 'edit' },
        { name: 'Exit without saving', value: 'exit' },
      ],
    });

    if (action === 'save') {
      const newPost = {
        date: new Date().toISOString(),
        pillar,
        format,
        text: draft,
      };
      posts.push(newPost);
      savePosts(posts);
      console.log('\nPost saved to posts.json.\n');
      break;
    }

    if (action === 'regenerate') {
      console.log('\nRegenerating...\n');
      draft = await generateDraft(client, pillar, format, idea);
      continue;
    }

    if (action === 'edit') {
      const edited = await openInEditor(draft);
      if (edited) {
        draft = edited;
      } else {
        const fallback = await readUntilEnd();
        if (fallback) draft = fallback;
      }
      continue;
    }

    if (action === 'exit') {
      console.log('\nExiting without saving.\n');
      break;
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
