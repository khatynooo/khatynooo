import os, re

# Parse all CREATE TABLE statements in migrations/ and schema.sql
schema_files = sorted([os.path.join('migrations', f) for f in os.listdir('migrations') if f.endswith('.sql')])
schema_files.append('schema.sql')

table_columns = {} # table_name -> {col_name: col_type}

for sf in schema_files:
    with open(sf, 'r', errors='ignore') as f:
        content = f.read()
    
    # Simple regex for CREATE TABLE
    tables = re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\((.*?)\);', content, re.DOTALL | re.IGNORECASE)
    for t in tables:
        tname = t.group(1).lower()
        body = t.group(2)
        if tname not in table_columns:
            table_columns[tname] = {}
        for line in body.split('\n'):
            line = line.strip()
            if not line or line.startswith('--') or line.upper().startswith('CONSTRAINT') or line.upper().startswith('PRIMARY KEY') or line.upper().startswith('FOREIGN KEY') or line.upper().startswith('UNIQUE'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                col_name = parts[0].strip('",')
                col_type = parts[1].strip('",')
                table_columns[tname][col_name.lower()] = col_type.lower()

# Also parse ALTER TABLE ADD COLUMN
for sf in schema_files:
    with open(sf, 'r', errors='ignore') as f:
        content = f.read()
    alters = re.finditer(r'ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\(\)]+)', content, re.IGNORECASE)
    for a in alters:
        tname = a.group(1).lower()
        cname = a.group(2).lower()
        ctype = a.group(3).lower()
        if tname in table_columns:
            table_columns[tname][cname] = ctype

print("Tables found:", len(table_columns))
for t, cols in sorted(table_columns.items()):
    # print columns with integer/serial vs varchar/text
    int_cols = [c for c, ty in cols.items() if any(k in ty for k in ['int', 'serial', 'numeric', 'bigint'])]
    text_cols = [c for c, ty in cols.items() if any(k in ty for k in ['char', 'text', 'uuid'])]
    print(f"Table {t}:")
    print(f"  INTEGER/NUMERIC: { {c: cols[c] for c in int_cols} }")
    print(f"  TEXT/VARCHAR:    { {c: cols[c] for c in text_cols} }")
