#!/usr/bin/env node
/*
 * Renders the gallery pages from tools/galleries.json so the shared page chrome
 * and the per-item markup live in exactly one place.
 *
 * Usage:
 *   node tools/build-galleries.mjs           # write the pages
 *   node tools/build-galleries.mjs --check   # fail if the pages are out of date
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolsDir, '..');
const checkOnly = process.argv.includes('--check');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm']);
const MEDIA_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, '.jpg', '.jpeg', '.png', '.webp', '.avif']);

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const render = (template, values) =>
  template.replace(/{{(\w+)}}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${match}`);
    return values[key];
  });

const extensionOf = (fileName) => fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

function listMedia(directory) {
  const absolute = join(repoRoot, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .filter((name) => MEDIA_EXTENSIONS.has(extensionOf(name)))
    .sort();
}

function resolveFiles(directory, explicitOrder) {
  const available = listMedia(directory);
  if (!explicitOrder) return available;

  const missing = available.filter((name) => !explicitOrder.includes(name));
  const unknown = explicitOrder.filter((name) => !available.includes(name));
  if (missing.length || unknown.length) {
    throw new Error(
      `${directory}: "files" is out of sync with the directory` +
        (missing.length ? `\n  not listed: ${missing.join(', ')}` : '') +
        (unknown.length ? `\n  missing on disk: ${unknown.join(', ')}` : '')
    );
  }
  return explicitOrder;
}

function renderMediaItem(directory, fileName) {
  const src = escapeHtml(`${directory}/${fileName}`);
  if (VIDEO_EXTENSIONS.has(extensionOf(fileName))) {
    return (
      `<button class="media-item video" type="button" data-type="video" data-src="${src}">` +
      `<video src="${src}" preload="metadata" muted playsinline></video></button>`
    );
  }
  return (
    `<button class="media-item" type="button" data-type="image" data-src="${src}">` +
    `<img src="${src}" alt="" loading="lazy"></button>`
  );
}

function renderGallery(gallery, template) {
  const sections = gallery.sections ?? [{}];
  const markup = sections
    .flatMap((section) => {
      const directory = section.directory ? `${gallery.assets}/${section.directory}` : gallery.assets;
      const items = resolveFiles(directory, section.files ?? gallery.files).map((fileName) =>
        renderMediaItem(directory, fileName)
      );
      if (!items.length) return [];
      return section.label
        ? [`<div class="masonry-section">${escapeHtml(section.label)}</div>`, ...items]
        : items;
    })
    .join('');

  return render(template, {
    title: escapeHtml(gallery.title),
    description: escapeHtml(gallery.description),
    items: markup,
  });
}

function writePage(page, contents) {
  const target = join(repoRoot, page);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === contents) return false;
  if (!checkOnly) writeFileSync(target, contents);
  return true;
}

const config = JSON.parse(readFileSync(join(toolsDir, 'galleries.json'), 'utf8'));
const galleryTemplate = readFileSync(join(toolsDir, 'templates/gallery.html'), 'utf8');
const redirectTemplate = readFileSync(join(toolsDir, 'templates/redirect.html'), 'utf8');

const changed = [
  ...config.galleries.map((gallery) => [gallery.page, renderGallery(gallery, galleryTemplate)]),
  ...config.redirects.map((redirect) => [
    redirect.page,
    render(redirectTemplate, {
      title: escapeHtml(redirect.title),
      target: escapeHtml(redirect.target),
      linkText: escapeHtml(redirect.linkText),
    }),
  ]),
].filter(([page, contents]) => writePage(page, contents));

if (checkOnly && changed.length) {
  console.error(`Out of date, run "node tools/build-galleries.mjs":\n  ${changed.map(([page]) => page).join('\n  ')}`);
  process.exit(1);
}

console.log(changed.length ? `Updated:\n  ${changed.map(([page]) => page).join('\n  ')}` : 'Pages already up to date.');
