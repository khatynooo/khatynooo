import os, re

files = []
for root, dirs, fnames in os.walk('server'):
    for f in fnames:
        if f.endswith('.ts'):
            files.append(os.path.join(root, f))
files.append('server.ts')

found = []
for fpath in files:
    with open(fpath, 'r', errors='ignore') as f:
        content = f.read()
    # match query, rawQuery, client.query, pool.query with backticks or quotes
    matches = re.finditer(r'(?:query|rawQuery|client\.query|pool\.query)\s*(?:<[^>]+>)?\s*\(\s*([`\'"])(.*?)\1', content, re.DOTALL)
    for m in matches:
        sql = m.group(2)
        line = content[:m.start()].count('\n') + 1
        p1s = re.findall(r'\$1\b', sql)
        if len(p1s) > 1:
            found.append((fpath, line, sql.strip(), len(p1s)))

print(f"Found {len(found)} queries where $1 appears more than once:")
for fpath, line, sql, count in found:
    print(f"\n>>> {fpath}:{line} ($1 count = {count})")
    print(sql)
