import os
import re

target_dir = 'server'
files = []
for root, dirs, fnames in os.walk(target_dir):
    for f in fnames:
        if f.endswith('.ts') or f.endswith('.js'):
            files.append(os.path.join(root, f))
files.append('server.ts')

for fpath in sorted(files):
    with open(fpath, 'r', errors='ignore') as f:
        content = f.read()

    # Find any SQL query block that contains $1
    # We look for lines containing query( or `SELECT or `UPDATE or `DELETE or `INSERT
    # Let's inspect all lines
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '$1' in line:
            # check 15 lines before and after
            start = max(0, i - 10)
            end = min(len(lines), i + 10)
            window = '\n'.join(lines[start:end])
            
            # Check if $1 is used more than once in this window
            occurrences = [l for l in lines[start:end] if '$1' in l]
            if len(occurrences) > 1:
                print(f"=== {fpath}:{i+1} ===")
                for l in lines[start:end]:
                    if '$1' in l or 'WHERE' in l or 'SELECT' in l:
                        print(f"  {l.strip()}")
                print()
