#!/usr/bin/env python3
"""Adds a batch's new quest NPCs to content/world/targets.json, safely while other batches do the same.

Usage: python3 add-npcs.py <batch-npcs.json>
The batch file is {"<id>": {"name": "...", "look": "..."}, ...}. Ids must be new (a clash fails and changes
nothing); looks must exist in content/world/looks.json and be NPC looks. Re-running with the same entries
is a no-op, so a batch can call it again after editing its file (changed entries are updated).
"""
import fcntl, json, os, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
CATALOGUE = os.path.join(ROOT, 'content/world/targets.json')
LOOKS = os.path.join(ROOT, 'content/world/looks.json')
LOCK = os.path.join(os.path.dirname(__file__), 'npcs.lock')


def main() -> None:
    batch = json.load(open(sys.argv[1], encoding='utf8'))
    looks = json.load(open(LOOKS, encoding='utf8'))['looks']
    owner = os.path.basename(sys.argv[1])
    original = set(json.load(open(os.path.join(os.path.dirname(__file__), 'existing-ids.json'))))
    with open(LOCK, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        data = json.load(open(CATALOGUE, encoding='utf8'))
        entries = data['targets']
        for key, entry in batch.items():
            if set(entry) - {'name', 'look'} or not entry.get('name') or not entry.get('look'):
                sys.exit(f'{key}: an NPC entry is exactly {{"name", "look"}}')
            if looks.get(entry['look'], {}).get('kind') != 'npc':
                sys.exit(f'{key}: look {entry["look"]} is not an NPC look in looks.json')
            if key in original:
                sys.exit(f'{key}: id already used by an existing entry; new NPCs need new ids')
        for key, entry in batch.items():
            entries[key] = entry
        data['targets'] = dict(sorted(entries.items()))
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(CATALOGUE))
        with os.fdopen(fd, 'w', encoding='utf8') as out:
            out.write(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        os.replace(tmp, CATALOGUE)
    print(f'added/updated {len(batch)} NPCs from {owner}')


main()
