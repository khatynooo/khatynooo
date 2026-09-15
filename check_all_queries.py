import os, re

files = []
for root, dirs, fnames in os.walk('server'):
    for f in fnames:
        if f.endswith('.ts'):
            files.append(os.path.join(root, f))
files.append('server.ts')

queries = []

for fpath in files:
    with open(fpath, 'r', errors='ignore') as f:
        content = f.read()

    # match query(...) or client.query(...)
    # Let's find all occurrences of query
    matches = re.finditer(r'(?:query|client\.query|rawQuery)\s*(?:<[^>]+>)?\s*\(\s*`([^`]+)`', content)
    for m in matches:
        sql = m.group(1)
        line = content[:m.start()].count('\n') + 1
        queries.append((fpath, line, sql))

    # Also string literals with SELECT / UPDATE / INSERT / DELETE
    str_matches = re.finditer(r'["\']((?:SELECT|UPDATE|INSERT|DELETE)[^"\']+)["\']', content, re.IGNORECASE)
    for m in str_matches:
        sql = m.group(1)
        line = content[:m.start()].count('\n') + 1
        queries.append((fpath, line, sql))

print(f"Total queries found: {len(queries)}")

# Now filter queries where $1 appears more than once, OR where $1 is used with ANY/IN/COALESCE/CASE/OR
suspicious = []
for fpath, line, sql in queries:
    p1_count = len(re.findall(r'\$1\b', sql))
    if p1_count > 1:
        suspicious.append((fpath, line, sql, f"$1 appears {p1_count} times"))

for fpath, line, sql, reason in suspicious:
    print(f"=== {fpath}:{line} ({reason}) ===")
    print(sql.strip())
    print()
