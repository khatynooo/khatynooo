import os
import re

all_files = []
for root, dirs, files in os.walk('.'):
    if any(x in root for x in ['node_modules', '.git', 'dist', '.vscode']):
        continue
    for f in files:
        if f.endswith(('.ts', '.js', '.sql')):
            all_files.append(os.path.join(root, f))

for fpath in all_files:
    with open(fpath, 'r', errors='ignore') as f:
        content = f.read()
    
    # Match any template literal with SQL keywords
    # or any string with SQL keywords
    strings = re.findall(r'`([^`]+)`', content)
    for sql in strings:
        if not re.search(r'\b(SELECT|UPDATE|INSERT|DELETE)\b', sql, re.IGNORECASE):
            continue
        dollar_params = re.findall(r'\$(\d+)', sql)
        counts = {}
        for p in dollar_params:
            counts[p] = counts.get(p, 0) + 1
        multi = {p: c for p, c in counts.items() if c > 1}
        if multi:
            print(f"FILE: {fpath}")
            print(f"MULTI: {multi}")
            # print where clause or relevant lines
            for line in sql.split('\n'):
                if any(f"${p}" in line for p in multi):
                    print("  LINE: ", line.strip())
            print("="*60)
