import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JsonFileStore } from '../src/main/storage.ts'
import type { Task } from '../src/renderer/src/types.ts'

const task = (id: string): Task => ({
  id,
  title: `Task ${id}`,
  priority: 1,
  category: 'uni',
  status: 'backlog',
  createdAt: '2026-01-01T00:00:00.000Z'
})

async function setup(): Promise<{ dir: string; file: string; store: JsonFileStore }> {
  const dir = await mkdtemp(join(tmpdir(), 'task-widget-test-'))
  const file = join(dir, 'tasks.json')
  return { dir, file, store: new JsonFileStore(file) }
}

test('first run (no file) loads an empty list', async () => {
  const { store } = await setup()
  assert.deepEqual(await store.load(), [])
})

test('saved tasks survive a reload, with no temp file left behind', async () => {
  const { dir, file, store } = await setup()
  await store.save([task('a'), task('b')])
  assert.deepEqual(await new JsonFileStore(file).load(), [task('a'), task('b')])
  assert.deepEqual(await readdir(dir), ['tasks.json'])
})

test('corrupt JSON loads empty and the file is kept as a backup, not overwritten', async () => {
  const { dir, file, store } = await setup()
  await writeFile(file, '{"oops": [1, 2')
  assert.deepEqual(await store.load(), [])
  const files = await readdir(dir)
  assert.equal(files.length, 1)
  assert.match(files[0], /^tasks\.json\.corrupt-\d+$/)
  assert.equal(await readFile(join(dir, files[0]), 'utf8'), '{"oops": [1, 2')
})

test('invalid entries are skipped, and the original file is backed up', async () => {
  const { dir, file, store } = await setup()
  await writeFile(file, JSON.stringify([task('good'), { id: 'bad' }, null]))
  assert.deepEqual(await store.load(), [task('good')])
  const backups = (await readdir(dir)).filter((f) => f.includes('.corrupt-'))
  assert.equal(backups.length, 1)
})

test('rapid saves never interleave: the last one wins', async () => {
  const { file, store } = await setup()
  await Promise.all([store.save([task('1')]), store.save([task('2')]), store.save([task('3')])])
  assert.deepEqual(await store.load(), [task('3')])
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), [task('3')])
})
